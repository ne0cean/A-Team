#!/usr/bin/env node
/**
 * trigger.mjs — Entry point called every 60 seconds by launchd.
 *
 * Decision tree:
 *   1. Load accounts state (migrate from legacy if first run)
 *   2. Must have ≥ 2 OAuth accounts with tokens
 *   3. Cooldown check (10 min since last switch)
 *   4. Fetch usage for active account (and warm cache for inactives via last-known)
 *   5. Trigger if util ≥ 96% OR rate_limit detected via cache
 *   6. Pick candidate: lowest-usage OAuth account, must be < 80%
 *   7. If claude-remote server is up → delegate to POST /internal/auto-switch
 *      (server owns the PTY session and can inject the autosave prompt)
 *   8. Otherwise → send Telegram alert ("manual switch required")
 *   9. Update state file with cooldown timestamp
 *
 * Exit codes:
 *   0  — nothing to do (no accounts, no trigger, cooldown)
 *   10 — triggered via server
 *   11 — triggered via Telegram (manual fallback)
 *   20 — abort: no suitable target (both accounts exhausted)
 *   1  — unrecoverable error
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  getAccountsState,
  saveAccountsState,
  getOAuthAccounts,
  getActiveAccount,
  cleanupLegacyIfExpired,
  PATHS,
} from './accounts-state.mjs'
import {
  updateUsageForAccount,
  loadUsageCache,
} from './check-usage.mjs'
import { writeKeychainToken } from './swap-keychain.mjs'

const STATE_DIR = join(homedir(), '.ateam')
const STATE_FILE = join(STATE_DIR, 'auto-switch-state.json')
const COOLDOWN_MS = 10 * 60_000
const USAGE_THRESHOLD = 96
const CANDIDATE_MAX_UTIL = 80
const SERVER_HEALTH_URL = 'http://localhost:3001/health'
const SERVER_TRIGGER_URL = 'http://localhost:3001/internal/auto-switch'
const SERVER_PING_TIMEOUT_MS = 1500

function ensureDir() {
  mkdirSync(STATE_DIR, { recursive: true })
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { lastSwitchAt: 0, lastTriggerAt: 0 }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return { lastSwitchAt: 0, lastTriggerAt: 0 }
  }
}

function saveState(state) {
  ensureDir()
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function logInfo(msg) {
  console.log(`[auto-switch ${new Date().toISOString()}] ${msg}`)
}

function logWarn(msg) {
  console.warn(`[auto-switch ${new Date().toISOString()}] WARN: ${msg}`)
}

function logError(msg, err) {
  console.error(`[auto-switch ${new Date().toISOString()}] ERROR: ${msg}`, err?.message ?? err ?? '')
}

// ──────── Telegram ────────

function getTelegramBotToken() {
  // Prefer env var (used by claude-remote .env), fallback to keychain-ish file
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN
  // claude-remote stashes it in ~/.claude-remote (and via dotenv in its server dir)
  const candidates = [
    join(homedir(), 'Projects', 'claude-remote', 'packages', 'server', '.env'),
    join(homedir(), '.claude-remote', '.env'),
    join(homedir(), '.ateam', 'telegram.env'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      const lines = readFileSync(p, 'utf-8').split('\n')
      for (const line of lines) {
        const m = line.match(/^TELEGRAM_BOT_TOKEN=(.+)$/)
        if (m) return m[1].trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* ignore */ }
  }
  return null
}

function getTelegramChatIds() {
  try {
    const accessFile = join(homedir(), '.claude', 'channels', 'telegram', 'access.json')
    if (!existsSync(accessFile)) return []
    const access = JSON.parse(readFileSync(accessFile, 'utf-8'))
    return Array.isArray(access.allowFrom) ? access.allowFrom : []
  } catch {
    return []
  }
}

async function sendTelegram(text) {
  const token = getTelegramBotToken()
  const chatIds = getTelegramChatIds()
  if (!token || chatIds.length === 0) {
    logWarn(`Telegram skipped (token=${!!token}, chats=${chatIds.length})`)
    return false
  }
  let ok = true
  for (const chatId of chatIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) ok = false
    } catch (e) {
      ok = false
      logWarn(`Telegram send failed: ${e.message}`)
    }
  }
  return ok
}

// ──────── Server ping ────────

async function isServerUp() {
  try {
    const res = await fetch(SERVER_HEALTH_URL, {
      signal: AbortSignal.timeout(SERVER_PING_TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
  }
}

async function delegateToServer(payload) {
  try {
    const res = await fetch(SERVER_TRIGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      logWarn(`Server /internal/auto-switch returned ${res.status}`)
      return { ok: false, status: res.status }
    }
    const data = await res.json().catch(() => ({}))
    return { ok: true, ...data }
  } catch (e) {
    logWarn(`Server delegation failed: ${e.message}`)
    return { ok: false, error: e.message }
  }
}

// ──────── Swap execution ────────

async function executeSwap(active, candidate, activeUtil, candidateUtil, state, now) {
  logInfo(`Trigger: ${active.label} ${activeUtil.toFixed(0)}% → ${candidate.label} ${candidateUtil.toFixed(0)}%`)
  if (await isServerUp()) {
    logInfo('claude-remote server up — delegating')
    const result = await delegateToServer({
      outgoingAccountId: active.id,
      incomingAccountId: candidate.id,
      outgoingLabel: active.label,
      incomingLabel: candidate.label,
      outgoingUtil: activeUtil,
      incomingUtil: candidateUtil,
    })
    saveState({ ...state, lastSwitchAt: now, lastTriggerAt: now })
    return result.ok ? 10 : 1
  }
  logInfo('claude-remote server down — sending Telegram alert')
  await sendTelegram(
    `🔔 <b>계정 전환 필요 (수동)</b>\n` +
    `활성: ${active.label} (${Math.round(activeUtil)}% 소진)\n` +
    `여유: ${candidate.label} (${Math.round(candidateUtil)}%)\n` +
    `claude-remote 서버가 꺼져 있어 자동 전환 불가. 앱에서 수동 전환하세요.`
  )
  saveState({ ...state, lastSwitchAt: now, lastTriggerAt: now })
  return 11
}

// ──────── Main ────────

async function main() {
  // Periodic cleanup of the legacy accounts.json backup (90-day retention)
  try {
    const cleanup = cleanupLegacyIfExpired()
    if (cleanup.deleted) logInfo(`Legacy backup removed (age ${cleanup.ageDays}d)`)
  } catch { /* non-fatal */ }

  const oauthAccounts = getOAuthAccounts()
  if (oauthAccounts.length < 2) {
    logInfo(`Only ${oauthAccounts.length} oauth accounts — nothing to switch between`)
    return 0
  }

  const state = loadState()
  const now = Date.now()
  if (now - state.lastSwitchAt < COOLDOWN_MS) {
    const remainSec = Math.round((COOLDOWN_MS - (now - state.lastSwitchAt)) / 1000)
    logInfo(`Cooldown active (${remainSec}s remaining)`)
    return 0
  }

  const active = getActiveAccount()
  if (!active) {
    logInfo('No active account selected')
    return 0
  }

  // Fetch fresh usage for active account; candidates use last-known cache.
  // On 401, updateUsageForAccount auto-refreshes the OAuth token. We persist
  // the rotated blob back to accounts.json (and keychain if it's the active).
  const onTokenRefreshed = async (acc, newInner) => {
    const updatedBlob = JSON.stringify({ claudeAiOauth: newInner })
    const state = getAccountsState()
    const target = state.accounts.find(a => a.id === acc.id)
    if (target) {
      target.oauthToken = updatedBlob
      saveAccountsState(state)
    }
    if (state.active === acc.id) {
      try { writeKeychainToken(updatedBlob) } catch (e) { logWarn(`keychain rewrite failed: ${e.message}`) }
    }
    logInfo(`OAuth token refreshed for ${acc.label}`)
  }

  const freshActive = await updateUsageForAccount(active, { onTokenRefreshed })

  // ──── Fallback: usage API itself rate-limited or unreachable ────
  // If the active token failed (401-after-refresh, 429, network), this strongly
  // suggests the account is exhausted. Fall through to candidate selection
  // using last-known cache, but only if a candidate looks healthy.
  if (!freshActive.ok) {
    logWarn(`Active usage fetch failed (${active.label}): ${freshActive.error} status=${freshActive.status}`)
    const cache = loadUsageCache()
    const candidates = oauthAccounts
      .filter(a => a.id !== active.id)
      .map(a => {
        const cached = cache[a.id]
        const util = cached?.data?.five_hour?.utilization
        return { acc: a, util: typeof util === 'number' ? util : null }
      })
    const usable = candidates.find(c => c.util !== null && c.util < CANDIDATE_MAX_UTIL)
    if (usable) {
      logInfo(`Active fetch failed but candidate ${usable.acc.label} cached at ${usable.util.toFixed(0)}% — switching`)
      const fakeActiveUtil = 100  // assume exhausted
      return await executeSwap(active, usable.acc, fakeActiveUtil, usable.util, state, now)
    }
    // No usable candidate via cache — alert once, then cooldown
    if (freshActive.status === 429 || freshActive.status === 401) {
      const last = state.lastNoCacheAlertAt ?? 0
      if (now - last > 30 * 60_000) {
        await sendTelegram(
          `⚠️ <b>계정 전환 진단 불가</b>\n` +
          `활성: ${active.label} usage API ${freshActive.status} (${freshActive.error})\n` +
          `타 계정 cache도 없음 — 수동으로 swap-keychain 실행 필요.`
        )
        saveState({ ...state, lastNoCacheAlertAt: now })
      }
    }
    return 0
  }

  const activeUtil = freshActive.utilization
  logInfo(`Active ${active.label}: ${activeUtil.toFixed(1)}%${freshActive.refreshed ? ' (token just refreshed)' : ''}`)

  // TODO(rate-limit): The server stores modelRateLimitCache in its own process.
  // When delegating, server re-checks this. For standalone trigger, we rely on
  // usage utilization only — good enough for the threshold-based path.
  const shouldTrigger = activeUtil >= USAGE_THRESHOLD
  if (!shouldTrigger) {
    saveState({ ...state, lastTriggerAt: now })
    return 0
  }

  // Pick candidate: lowest cached usage among other oauth accounts, must be < 80%
  const cache = loadUsageCache()
  const candidates = oauthAccounts
    .filter(a => a.id !== active.id)
    .map(a => {
      const cached = cache[a.id]
      const util = cached?.data?.five_hour?.utilization ?? 100
      return { acc: a, util }
    })
    .sort((x, y) => x.util - y.util)
  const best = candidates[0]

  if (!best || best.util >= CANDIDATE_MAX_UTIL) {
    logWarn(`No suitable target (active=${activeUtil.toFixed(0)}%, best=${best?.util ?? 'n/a'}%)`)
    await sendTelegram(
      `⚠️ <b>계정 자동 전환 실패</b>\n` +
      `활성: ${active.label} (${Math.round(activeUtil)}%)\n` +
      `양 계정 모두 소진 직전. 리셋 대기 또는 수동 개입 필요.`
    )
    saveState({ ...state, lastSwitchAt: now, lastTriggerAt: now })  // cooldown to prevent spam
    return 20
  }

  return await executeSwap(active, best.acc, activeUtil, best.util, state, now)
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    logError('Unhandled error', err)
    process.exit(1)
  })
