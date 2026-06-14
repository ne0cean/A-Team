// AUTO-GENERATED from worker/src/monthUtil.js — do not edit directly. Regenerate via deploy.sh.
/**
 * monthUtil.js — pure month/owner resolution. NO globals, NO side effects.
 *
 * Mirrors the carry.js pattern: the worker imports this ESM file (and tests it),
 * while deploy.sh strips `export` to generate public/js/monthUtil.js (a classic
 * script that defines these as globals, loaded before app.js).
 *
 * Why this exists: full-month overlap weeks render adjacent-month cells. Edits to
 * those cells must save into their OWNER month, never the current month. Resolving
 * the owner ym (with correct year-boundary wrap) is calendar math worth testing once.
 */

// owner: 'cur' | 'prev' | 'next'. Returns the owner month's identity.
// prev of January → December of previous year; next of December → January of next year.
function resolveOwnerYm(year, month, owner) {
  let y = year, m = month;
  if (owner === 'prev') { m -= 1; if (m < 1) { m = 12; y -= 1; } }
  else if (owner === 'next') { m += 1; if (m > 12) { m = 1; y += 1; } }
  return { ym: `${y}-${String(m).padStart(2, '0')}`, year: y, month: m };
}

// Pure mirror of save()'s cross-month clobber guard. Returns a reason string when
// the save must be BLOCKED, else null. dataMonth = the in-memory data's .month SSOT;
// ymKey = the URL key it would be POSTed under.
function saveBlockReason(dataMonth, ymKey, dayCount, itemCount) {
  if (dayCount === 0 && itemCount === 0) return 'empty';
  if (dataMonth && dataMonth !== ymKey) return 'month-mismatch';
  return null;
}
