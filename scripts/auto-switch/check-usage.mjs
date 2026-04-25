/**
 * check-usage.mjs — Poll Anthropic usage API for an account's 5-hour tier usage.
 *
 * Public API:
 *   fetchUsageForToken(accessToken) → { utilization, resets_at, raw } | null
 *   loadUsageCache() → Record<accountId, { data, fetchedAt }>
 *   saveUsageCache(cache)
 *   updateUsageForActive(activeAccount) → fetch + persist
 *
 * Cache file: ~/.ateam/usage-cache.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage'
const TOKEN_REFRESH_URL = 'https://console.anthropic.com/v1/oauth/token'
const CACHE_DIR = join(homedir(), '.ateam')
const CACHE_FILE = join(CACHE_DIR, 'usage-cache.json')
const DEAD_REFRESH_FILE = join(CACHE_DIR, 'dead-refresh-tokens.json')
const CACHE_TTL_MS = 60_000

function ensureDir() {
  mkdirSync(CACHE_DIR, { recursive: true })
}

export function loadUsageCache() {
  if (!existsSync(CACHE_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

export function saveUsageCache(cache) {
  ensureDir()
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
}

/**
 * Fetch usage for a single OAuth access token.
 * Returns { utilization: 0-100, resets_at: ISO8601, raw: object, status: number }
 * or { error, status } on failure. Status disambiguates rate-limit (429) from
 * auth failure (401) so callers can retry differently.
 */
export async function fetchUsageForToken(accessToken, { timeoutMs = 5000 } = {}) {
  if (!accessToken) return { error: 'no-token', status: 0 }
  try {
    const res = await fetch(USAGE_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'a-team-auto-switch/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      return { error: `http-${res.status}`, status: res.status }
    }
    const data = await res.json()
    const fiveHour = data?.five_hour ?? {}
    return {
      utilization: typeof fiveHour.utilization === 'number' ? fiveHour.utilization : 0,
      resets_at: fiveHour.resets_at ?? null,
      raw: data,
      status: 200,
    }
  } catch (e) {
    return { error: e?.message || 'network', status: 0 }
  }
}

function loadDeadRefreshTokens() {
  if (!existsSync(DEAD_REFRESH_FILE)) return new Set()
  try {
    return new Set(JSON.parse(readFileSync(DEAD_REFRESH_FILE, 'utf-8')))
  } catch {
    return new Set()
  }
}

function markRefreshTokenDead(refreshToken) {
  ensureDir()
  const set = loadDeadRefreshTokens()
  set.add(refreshToken)
  writeFileSync(DEAD_REFRESH_FILE, JSON.stringify([...set], null, 2))
}

/**
 * Refresh an OAuth access token using its refreshToken.
 * Returns the updated inner OAuth object on success, or null on failure.
 * Marks the refreshToken dead on 400/401/403 to stop hammering.
 */
export async function refreshAccessToken(refreshToken, { timeoutMs = 8000 } = {}) {
  if (!refreshToken) return null
  if (loadDeadRefreshTokens().has(refreshToken)) return null
  try {
    const res = await fetch(TOKEN_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        markRefreshTokenDead(refreshToken)
      }
      return null
    }
    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 0) * 1000,
    }
  } catch {
    return null
  }
}

/**
 * Extract accessToken from an account's stored oauthToken blob.
 * claude-remote stores it as JSON.stringify({ claudeAiOauth: { accessToken, refreshToken, ... } })
 * but some historical shapes stored the inner object directly.
 */
export function extractAccessToken(oauthTokenBlob) {
  if (!oauthTokenBlob) return null
  try {
    const parsed = JSON.parse(oauthTokenBlob)
    const inner = parsed.claudeAiOauth ?? parsed
    return inner.accessToken ?? null
  } catch {
    return null
  }
}

/** Extract the refreshToken from a stored oauthToken blob. */
export function extractRefreshToken(oauthTokenBlob) {
  if (!oauthTokenBlob) return null
  try {
    const parsed = JSON.parse(oauthTokenBlob)
    const inner = parsed.claudeAiOauth ?? parsed
    return inner.refreshToken ?? null
  } catch {
    return null
  }
}

/**
 * Update cache for a single account. Called from trigger.mjs each cycle for
 * the active account; inactive accounts use the last cached value since we
 * can't hit the API with their tokens without a keychain swap.
 *
 * On 401, attempts an OAuth refresh and a single retry. Returns:
 *   { ok: true, utilization, resets_at, raw, refreshed?: true }
 *   { ok: false, status, error }   ← caller decides next action
 *
 * `onTokenRefreshed(account, newInner)` is invoked when a refresh succeeds so
 * the caller can persist the rotated token (and rewrite keychain for active).
 */
export async function updateUsageForAccount(account, { onTokenRefreshed } = {}) {
  const token = extractAccessToken(account.oauthToken)
  if (!token) return { ok: false, status: 0, error: 'no-access-token' }

  let result = await fetchUsageForToken(token)

  if (result.status === 401) {
    const rt = extractRefreshToken(account.oauthToken)
    const refreshed = await refreshAccessToken(rt)
    if (refreshed) {
      if (typeof onTokenRefreshed === 'function') {
        try { await onTokenRefreshed(account, refreshed) } catch { /* non-fatal */ }
      }
      result = await fetchUsageForToken(refreshed.accessToken)
      if (result.status === 200) {
        const cache = loadUsageCache()
        cache[account.id] = { data: result.raw, fetchedAt: Date.now() }
        saveUsageCache(cache)
        return { ok: true, ...result, refreshed: true }
      }
    }
    return { ok: false, status: 401, error: 'auth-failed-after-refresh' }
  }

  if (result.status !== 200) {
    return { ok: false, status: result.status, error: result.error }
  }

  const cache = loadUsageCache()
  cache[account.id] = { data: result.raw, fetchedAt: Date.now() }
  saveUsageCache(cache)
  return { ok: true, ...result }
}

/** Is the cached usage for an account fresh enough? */
export function isCacheFresh(cacheEntry) {
  if (!cacheEntry) return false
  return Date.now() - cacheEntry.fetchedAt < CACHE_TTL_MS
}

export const USAGE_CONST = {
  USAGE_API_URL,
  CACHE_FILE,
  CACHE_TTL_MS,
}
