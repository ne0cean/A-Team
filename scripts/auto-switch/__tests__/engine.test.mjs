#!/usr/bin/env node
import { existsSync, writeFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

let pass = 0, fail = 0
function t(name, fn) {
  try {
    const r = fn()
    if (r === false) { console.log(`FAIL ${name}`); fail++ }
    else { console.log(`PASS ${name}`); pass++ }
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`); fail++
  }
}

const ATEAM = join(homedir(), '.ateam')
const BACKUP = join(homedir(), `.ateam.test-backup-${Date.now()}`)
const hadReal = existsSync(ATEAM)
if (hadReal) spawnSync('mv', [ATEAM, BACKUP])

const { extractAccessToken, extractRefreshToken, loadUsageCache, saveUsageCache, fetchUsageForToken, refreshAccessToken, updateUsageForAccount } = await import('../check-usage.mjs')
const { getAccountsState, saveAccountsState, getOAuthAccounts, getActiveAccount, PATHS } = await import('../accounts-state.mjs')
const { isSupported, swapToAccount } = await import('../swap-keychain.mjs')

t('extractAccessToken null → null', () => extractAccessToken(null) === null)
t('extractAccessToken bad json → null', () => extractAccessToken('{nope') === null)
t('extractAccessToken nested claudeAiOauth', () => extractAccessToken(JSON.stringify({ claudeAiOauth: { accessToken: 'x' } })) === 'x')
t('extractAccessToken root-level', () => extractAccessToken(JSON.stringify({ accessToken: 'y' })) === 'y')

t('extractRefreshToken null → null', () => extractRefreshToken(null) === null)
t('extractRefreshToken nested', () => extractRefreshToken(JSON.stringify({ claudeAiOauth: { refreshToken: 'r1' } })) === 'r1')
t('extractRefreshToken root-level', () => extractRefreshToken(JSON.stringify({ refreshToken: 'r2' })) === 'r2')

// fetchUsageForToken now returns {error,status} on failure (not null)
t('fetchUsageForToken empty → error shape', async () => {
  const r = await fetchUsageForToken('')
  return r && r.error === 'no-token' && r.status === 0
})

// refreshAccessToken null guard
t('refreshAccessToken null → null', async () => (await refreshAccessToken(null)) === null)

// updateUsageForAccount no-token returns ok:false
t('updateUsageForAccount no-token → ok:false', async () => {
  const r = await updateUsageForAccount({ id: 'x', oauthToken: null })
  return r.ok === false && r.error === 'no-access-token'
})

rmSync(PATHS.GLOBAL_FILE, { force: true })
t('getAccountsState returns valid shape', () => {
  const s = getAccountsState()
  return Array.isArray(s.accounts) && ('active' in s)
})

saveAccountsState({
  accounts: [
    { id: 'a', label: 'Alpha', type: 'oauth', oauthToken: JSON.stringify({ claudeAiOauth: { accessToken: 'tok-a' } }) },
    { id: 'b', label: 'Beta', type: 'oauth', oauthToken: JSON.stringify({ claudeAiOauth: { accessToken: 'tok-b' } }) },
  ],
  active: 'a',
})
t('roundtrip: 2 accounts, active=a', () => { const s = getAccountsState(); return s.accounts.length === 2 && s.active === 'a' })
t('getOAuthAccounts filters correctly', () => { const a = getOAuthAccounts(); return a.length === 2 })
t('getActiveAccount returns active', () => getActiveAccount()?.id === 'a')

t('usage cache empty initial', () => Object.keys(loadUsageCache()).length === 0)
saveUsageCache({ acc1: { data: { five_hour: { utilization: 42 } }, fetchedAt: Date.now() } })
t('usage cache roundtrip', () => loadUsageCache().acc1?.data?.five_hour?.utilization === 42)

t('isSupported returns boolean', () => typeof isSupported() === 'boolean')
saveAccountsState({ accounts: [], active: null })
t('swapToAccount target_not_found (or macos-only on non-mac)', () => {
  const r = swapToAccount('nonexistent')
  return r.ok === false && (r.error === 'target_not_found' || r.error === 'macos-only')
})

const triggerPath = join(process.cwd(), 'scripts/auto-switch/trigger.mjs')
saveAccountsState({ accounts: [], active: null })
t('trigger.mjs exit 0 when < 2 accounts', () => spawnSync('node', [triggerPath], { encoding: 'utf-8', timeout: 10000 }).status === 0)

saveAccountsState({
  accounts: [
    { id: 'a', label: 'A', type: 'oauth', oauthToken: JSON.stringify({ claudeAiOauth: { accessToken: 'x' } }) },
    { id: 'b', label: 'B', type: 'oauth', oauthToken: JSON.stringify({ claudeAiOauth: { accessToken: 'y' } }) },
  ],
  active: 'a',
})
writeFileSync(join(ATEAM, 'auto-switch-state.json'), JSON.stringify({ lastSwitchAt: Date.now(), lastTriggerAt: Date.now() }))
t('trigger.mjs exit 0 during cooldown', () => spawnSync('node', [triggerPath], { encoding: 'utf-8', timeout: 10000 }).status === 0)

rmSync(ATEAM, { recursive: true, force: true })
if (hadReal) spawnSync('mv', [BACKUP, ATEAM])

console.log(`\n${pass} pass, ${fail} fail`)
process.exit(fail > 0 ? 1 : 0)
