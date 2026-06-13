/**
 * Pure restore-plan helpers — no I/O, no Cloudflare env.
 *
 * Used by backup-d1.mjs --restore-month to safely replace a single month
 * in D1 via delete-first (bypassing mergeMonthData).
 */

/**
 * Extract a single month's data from a backup snapshot for clean restoration.
 *
 * Safety guard: if the .month field inside the snapshot entry doesn't match
 * the requested ym key, the entry is corrupt/mislabeled and we refuse to return
 * it. This prevents restoring June data that was accidentally cloned under the
 * July key.
 *
 * @param {Object} snapshot - Full backup snapshot { date, timestamp, data: { "YYYY-MM": {...} } }
 * @param {string} ym       - Target month key, e.g. "2026-07"
 * @returns {Object}        - The month data object
 * @throws {Error}          - If ym is absent or .month field mismatches
 */
export function extractMonthForRestore(snapshot, ym) {
  const monthData = snapshot?.data?.[ym];

  if (!monthData) {
    throw new Error(`Snapshot does not contain key "${ym}". Available: ${Object.keys(snapshot?.data || {}).join(', ')}`);
  }

  if (monthData.month !== ym) {
    throw new Error(
      `Mislabeled backup entry: snapshot key "${ym}" but .month === "${monthData.month}". ` +
      `Refusing to restore — this would write wrong-month data into D1.`
    );
  }

  return monthData;
}

/**
 * Validate that a month data object is safe to POST to D1 as a clean restore.
 *
 * @param {Object} monthData - Month object to validate
 * @param {string} ym        - Expected month key, e.g. "2026-07"
 * @returns {boolean}
 */
export function isRestorePayloadSafe(monthData, ym) {
  if (!monthData || monthData.month !== ym) return false;
  if (!monthData.days || typeof monthData.days !== 'object' || Array.isArray(monthData.days)) return false;
  return true;
}
