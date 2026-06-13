/**
 * monthGuard.js
 * Cross-month clobber guard.
 *
 * A month payload carries `data.month` (the month it actually belongs to).
 * If that disagrees with the target storage key `ym`, a client desync is about
 * to clone one month over another (root cause of the 2026-06 → 2026-07 clone:
 * save() read ym() after week-boundary nav advanced currentMonth, while
 * monthData still held the previous month).
 *
 * @param {string|undefined} dataMonth - data.month field of the payload
 * @param {string} ym - target storage key (YYYY-MM)
 * @returns {boolean} true when the save must be blocked
 */
export function isCrossMonthClobber(dataMonth, ym) {
  return Boolean(dataMonth) && dataMonth !== ym;
}
