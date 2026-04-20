/**
 * accounts-state.mjs — Global account registry for a-team auto-switch.
 *
 * Single source of truth: ~/.ateam/accounts.json
 *
 * Legacy migration:
 *   ~/.claude-remote/accounts.json (pre-2026-04-20) is mirrored on first run
 *   into ~/.ateam/accounts.json, then the legacy file is marked with a
 *   `superseded_at` field. A cleanup cron removes it after 90 days.
 *
 * Schema (intentionally compatible with claude-remote's existing shape):
 *   {
 *     accounts: [{ id, label, type: 'oauth'|'apikey', oauthToken?, apiKey?, email?, createdAt, lastActiveAt? }],
 *     active: string | null
 *   }
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const GLOBAL_DIR = join(homedir(), '.ateam')
const GLOBAL_FILE = join(GLOBAL_DIR, 'accounts.json')
const LEGACY_FILE = join(homedir(), '.claude-remote', 'accounts.json')
const LEGACY_BACKUP_FILE = join(homedir(), '.claude-remote', 'accounts.json.superseded')
const LEGACY_RETENTION_DAYS = 90

function ensureDir() {
  mkdirSync(GLOBAL_DIR, { recursive: true })
}

function emptyState() {
  return { accounts: [], active: null }
}

/**
 * Migrate from ~/.claude-remote/accounts.json if global file doesn't exist.
 * Returns migration result for logging.
 */
export function migrateFromLegacyIfNeeded() {
  if (existsSync(GLOBAL_FILE)) return { migrated: false, reason: 'global_exists' }
  if (!existsSync(LEGACY_FILE)) return { migrated: false, reason: 'no_legacy' }

  ensureDir()
  const legacy = readFileSync(LEGACY_FILE, 'utf-8')
  writeFileSync(GLOBAL_FILE, legacy)

  // Mark legacy as superseded (rename to .superseded sibling so we don't
  // accidentally re-read it; keep the original in place for human forensics)
  try {
    const parsed = JSON.parse(legacy)
    parsed._superseded_at = new Date().toISOString()
    parsed._superseded_by = GLOBAL_FILE
    writeFileSync(LEGACY_BACKUP_FILE, JSON.stringify(parsed, null, 2))
  } catch (e) {
    // best-effort
  }

  return { migrated: true, from: LEGACY_FILE, to: GLOBAL_FILE }
}

/**
 * Delete the legacy backup if it's older than LEGACY_RETENTION_DAYS.
 * Called by the auto-switch cron for periodic cleanup.
 */
export function cleanupLegacyIfExpired() {
  if (!existsSync(LEGACY_BACKUP_FILE)) return { deleted: false, reason: 'no_backup' }
  const st = statSync(LEGACY_BACKUP_FILE)
  const ageDays = (Date.now() - st.mtimeMs) / 86_400_000
  if (ageDays < LEGACY_RETENTION_DAYS) {
    return { deleted: false, reason: 'not_expired', ageDays: Math.round(ageDays) }
  }
  try {
    // Use unlinkSync via fs require
    import('node:fs').then(fs => fs.unlinkSync(LEGACY_BACKUP_FILE))
    return { deleted: true, ageDays: Math.round(ageDays) }
  } catch (e) {
    return { deleted: false, reason: 'unlink_failed', error: e.message }
  }
}

export function getAccountsState() {
  migrateFromLegacyIfNeeded()
  if (!existsSync(GLOBAL_FILE)) return emptyState()
  try {
    return JSON.parse(readFileSync(GLOBAL_FILE, 'utf-8'))
  } catch {
    return emptyState()
  }
}

export function saveAccountsState(state) {
  ensureDir()
  writeFileSync(GLOBAL_FILE, JSON.stringify(state, null, 2))
}

/** Return the currently active OAuth account, or null. */
export function getActiveAccount() {
  const state = getAccountsState()
  if (!state.active) return null
  return state.accounts.find(a => a.id === state.active) ?? null
}

/** Return OAuth accounts with tokens (eligible for auto-switch). */
export function getOAuthAccounts() {
  const state = getAccountsState()
  return state.accounts.filter(a => a.type === 'oauth' && a.oauthToken)
}

/** Mark an account as the active one (does NOT swap keychain; see swap-keychain.mjs). */
export function setActiveAccount(id) {
  const state = getAccountsState()
  const found = state.accounts.find(a => a.id === id)
  if (!found) throw new Error(`Account ${id} not found`)
  state.active = id
  found.lastActiveAt = Date.now()
  saveAccountsState(state)
  return found
}

export const PATHS = {
  GLOBAL_DIR,
  GLOBAL_FILE,
  LEGACY_FILE,
  LEGACY_BACKUP_FILE,
  LEGACY_RETENTION_DAYS,
}
