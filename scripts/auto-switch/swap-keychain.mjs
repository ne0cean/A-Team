/**
 * swap-keychain.mjs — macOS keychain Claude OAuth token swap.
 *
 * The `security` CLI manages the `Claude Code-credentials` generic password.
 * Swapping means:
 *   1. Read current keychain blob (outgoing token)
 *   2. Cache it back onto the outgoing account's oauthToken field
 *   3. Write incoming account's oauthToken blob into the keychain
 *
 * Also marks the incoming account as `active` and updates lastActiveAt.
 *
 * This module is macOS-only. On other platforms all functions return failure
 * without throwing so callers can gracefully degrade.
 */

import { execSync } from 'node:child_process'
import { platform } from 'node:os'
import { getAccountsState, saveAccountsState, getActiveAccount, setActiveAccount } from './accounts-state.mjs'

const KEYCHAIN_SERVICE = 'Claude Code-credentials'
const IS_MAC = platform() === 'darwin'

export function isSupported() {
  return IS_MAC
}

/** Read the current keychain blob (raw string) or null if missing. */
export function readKeychainToken() {
  if (!IS_MAC) return null
  try {
    const out = execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: 'utf-8', timeout: 3000 }
    ).trim()
    return out || null
  } catch {
    return null
  }
}

/** Write a token blob to the keychain. Overwrites any existing entry. */
export function writeKeychainToken(blob) {
  if (!IS_MAC) throw new Error('Keychain swap supported on macOS only')
  if (!blob || typeof blob !== 'string') throw new Error('Invalid token blob')

  // Delete existing entry (ignore error if it doesn't exist)
  try {
    execSync(
      `security delete-generic-password -s "${KEYCHAIN_SERVICE}" 2>/dev/null`,
      { stdio: 'ignore', timeout: 3000 }
    )
  } catch { /* not found — ok */ }

  // Add the new entry. Use -U (update) as a safety net for race conditions.
  execSync(
    `security add-generic-password -U -s "${KEYCHAIN_SERVICE}" -a "claude-user" -w "${blob.replace(/"/g, '\\"')}"`,
    { timeout: 3000 }
  )
}

/**
 * Swap the active account to `targetId`.
 *
 *   1. Cache outgoing token back onto its account record
 *   2. Write incoming token into keychain
 *   3. Mark incoming as active
 *
 * Returns { ok, outgoingId, incomingId, error? }.
 */
export function swapToAccount(targetId) {
  if (!IS_MAC) return { ok: false, error: 'macos-only' }
  const state = getAccountsState()
  const target = state.accounts.find(a => a.id === targetId)
  if (!target) return { ok: false, error: 'target_not_found' }
  if (target.type !== 'oauth' || !target.oauthToken) return { ok: false, error: 'target_not_oauth' }

  const outgoing = getActiveAccount()

  try {
    // 1. Cache outgoing token from keychain onto its record
    if (outgoing) {
      const currentBlob = readKeychainToken()
      if (currentBlob) {
        outgoing.oauthToken = currentBlob
        outgoing.lastActiveAt = Date.now()
      }
    }

    // 2. Write incoming token to keychain
    writeKeychainToken(target.oauthToken)

    // 3. Mark incoming as active
    state.active = target.id
    target.lastActiveAt = Date.now()
    saveAccountsState(state)

    return { ok: true, outgoingId: outgoing?.id ?? null, incomingId: target.id }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export const KEYCHAIN_CONST = {
  KEYCHAIN_SERVICE,
}
