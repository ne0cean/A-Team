/**
 * Cortex month data merge logic — pure functions, testable without Cloudflare env.
 *
 * Extracted from worker/src/index.js POST /api/month handler.
 * Import this in index.js to keep server logic DRY and to allow unit testing.
 */

const SCALAR_FIELDS = ['one_thing', 'day_type', 'notes'];
const normText = t => (t || '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Merges stale incoming month data with the authoritative server state.
 *
 * Rules:
 *  1. Scalar fields (one_thing, day_type, notes): restored from server only if
 *     incoming key is undefined. Empty string = intentional delete, respected.
 *  2. Array fields: detected dynamically from server data — any key whose value
 *     is an array and whose name does not start with '_' (internal markers).
 *     - If server has items and incoming is empty/missing → restore server's array.
 *     - If both have items → preserve done=true from server by text-key matching.
 *  3. Internal fields (prefix '_', e.g. _dismissed) are never merged.
 *
 * @param {Object} existing - Server's authoritative month data { days: { '1': {...}, ... } }
 * @param {Object} incoming - Client's (potentially stale) payload — mutated in-place
 * @returns {Object} incoming after merge
 */
export function mergeMonthData(existing, incoming) {
  for (const [day, serverDay] of Object.entries(existing.days || {})) {
    if (!incoming.days?.[day]) continue;
    const incomingDay = incoming.days[day];

    // 1. Scalar fields
    for (const key of SCALAR_FIELDS) {
      if (serverDay[key] !== undefined && incomingDay[key] === undefined) {
        incomingDay[key] = serverDay[key];
      }
    }

    // 2. Array fields — dynamic detection, no hardcoded whitelist
    const arrayKeys = Object.keys(serverDay).filter(
      k => Array.isArray(serverDay[k]) && !k.startsWith('_')
    );

    for (const key of arrayKeys) {
      if (!serverDay[key].length) continue;

      if (!incomingDay[key]?.length) {
        // Incoming is empty — restore server's non-carried items only
        // _carried items are ephemeral: if client cleared them, respect that
        const toRestore = serverDay[key].filter(i => !i._carried);
        if (toRestore.length) incomingDay[key] = toRestore;
      } else {
        // Client sends explicit data — trust it, but preserve done:true from server.
        // Stale browser saves must not wipe checked items.
        // _unchecked:true on an incoming item = intentional uncheck by user, respected.
        const serverByText = new Map(serverDay[key].map(i => [normText(i.text), i]));
        for (const item of incomingDay[key]) {
          const serverItem = serverByText.get(normText(item.text));
          if (serverItem?.done && !item.done && !item._unchecked) {
            item.done = true; // preserve server's checked state
          }
          delete item._unchecked; // clean up ephemeral flag before persisting
        }
      }
    }
  }
  return incoming;
}
