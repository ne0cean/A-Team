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
const CACHE_DIR = join(homedir(), '.ateam')
const CACHE_FILE = join(CACHE_DIR, 'usage-cache.json')
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
 * Returns { utilization: 0-100, resets_at: ISO8601, raw: object } or null on error.
 */
export async function fetchUsageForToken(accessToken, { timeoutMs = 5000 } = {}) {
  if (!accessToken) return null
  try {
    const res = await fetch(USAGE_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'a-team-auto-switch/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const data = await res.json()
    const fiveHour = data?.five_hour ?? {}
    return {
      utilization: typeof fiveHour.utilization === 'number' ? fiveHour.utilization : 0,
      resets_at: fiveHour.resets_at ?? null,
      raw: data,
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

/**
 * Update cache for a single account. Called from trigger.mjs each cycle for
 * the active account; inactive accounts use the last cached value since we
 * can't hit the API with their tokens without a keychain swap.
 */
export async function updateUsageForAccount(account) {
  const token = extractAccessToken(account.oauthToken)
  if (!token) return null
  const result = await fetchUsageForToken(token)
  if (!result) return null
  const cache = loadUsageCache()
  cache[account.id] = { data: result.raw, fetchedAt: Date.now() }
  saveUsageCache(cache)
  return result
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
