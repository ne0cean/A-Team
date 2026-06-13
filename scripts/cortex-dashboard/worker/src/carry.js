/**
 * carry.js
 * Pure carry-over logic for "todo" categories, extracted verbatim (in semantics)
 * from app.js getCatItemsForRender(). NO side effects: it never touches globals,
 * never calls ensureDay(), never saves. The caller resolves all date/frame inputs
 * and decides persistence based on the returned { itemsToRender, nextDayItems, changed }.
 *
 * Why this exists: the original logic mutated monthData and triggered save() from
 * inside a render helper, and wrote to the current month even when rendering an
 * adjacent month's cell — cloning one month over another. Making it pure lets the
 * caller (a) keep render side-effect-free and (b) only persist into the month that
 * actually owns the cell.
 */

/** Normalize item text: collapse &nbsp; and whitespace, trim. Single source of truth. */
export function normText(t) {
  return (t || '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function tplText(ti) {
  return typeof ti === 'object' ? (ti.text || '') : String(ti);
}

/**
 * Compute carry + dedup + render list for one (day, category) cell.
 *
 * @param {object}   args
 * @param {Array}    args.dayItems          - current persisted items for this cell (dayData[cat] || [])
 * @param {Array|null} args.prevDayItems    - previous day's items (prevDay[cat] || []); null if no prev day
 * @param {Array}    args.templateItems     - this day's frame template items (catMeta.items || [])
 * @param {Array}    args.prevTemplateItems - previous day's frame template items (for prevFrameTexts)
 * @param {Array}    args.rejects           - this day's carry-reject texts (dayData[`_carry_rejects_${cat}`] || [])
 * @param {boolean}  args.shouldCarry       - caller gate: (d >= today) AND prevDayItems != null
 * @returns {{ itemsToRender: Array, nextDayItems: Array, changed: boolean }}
 *   itemsToRender — array the cell should display (manual + carried + template merge)
 *   nextDayItems  — what dayData[cat] SHOULD become (post stale-removal/inject/dedup)
 *   changed       — true iff nextDayItems differs from dayItems (replaces _pendingCarrySave)
 */
export function computeCarry({
  dayItems = [],
  prevDayItems = null,
  templateItems = [],
  prevTemplateItems = [],
  rejects = [],
  shouldCarry = false,
}) {
  let working = dayItems;
  let changed = false;

  // --- Step 1+2: stale removal + new-carry injection (only when carrying) ---
  if (shouldCarry && prevDayItems) {
    const prevFrameTexts = new Set(prevTemplateItems.map(ti => normText(tplText(ti))));
    const rejected = new Set(rejects.map(normText));
    const prevUndoneTexts = new Set(
      prevDayItems.filter(i => !i.done && !i._frame).map(i => normText(i.text))
    );

    // Stale removal: a _carried item is valid only when prev day still has it as undone.
    const hasStale = working.some(i => i._carried && !prevUndoneTexts.has(normText(i.text)));
    if (hasStale) {
      working = working.filter(i => !i._carried || prevUndoneTexts.has(normText(i.text)));
      changed = true;
    }

    // Inject: prev-day undone, non-frame, non-rejected items not already present today.
    const prevUndone = prevDayItems.filter(i =>
      !i.done && !i._frame && !prevFrameTexts.has(normText(i.text)) && !rejected.has(normText(i.text))
    );
    if (prevUndone.length > 0) {
      const existingTexts = new Set(working.map(i => normText(i.text)));
      const newCarried = prevUndone.filter(i => !existingTexts.has(normText(i.text)));
      if (newCarried.length > 0) {
        const toAdd = newCarried.map(i => ({ text: i.text, url: i.url || '', done: false, _carried: true }));
        const existing = working.filter(i => !i._frame);
        working = [...existing, ...toAdd];
        changed = true;
      }
    }
  }

  // --- Step 3: dedup (always). Drop _frame items and empty-text; keep first occurrence. ---
  const rawItems = working.filter(i => !i._frame);
  const seen = new Set();
  const deduped = rawItems.filter(i => {
    const k = normText(i.text);
    if (!k) return false;            // drop empty-text items
    if (seen.has(k)) return false;   // drop duplicates (keep first)
    seen.add(k);
    return true;
  });
  if (deduped.length !== rawItems.length) {
    working = deduped;
    changed = true;
  }

  // --- Step 4: build render list ---
  const stored = working.filter(i => !i._frame && !i._carried);
  const carriedItems = working.filter(i => i._carried);

  let itemsToRender;
  if (!templateItems.length) {
    itemsToRender = [...stored, ...carriedItems];
  } else {
    const templateTexts = new Set(templateItems.map(ti => normText(tplText(ti))));
    const storedByText = new Map(stored.map(i => [i.text, i]));
    const templateResult = templateItems.map(ti => {
      if (typeof ti === 'object' && ti.type === 'separator') return { ...ti, _frame: true };
      const base = typeof ti === 'object'
        ? { text: ti.text || '', url: ti.url || '' }
        : { text: String(ti), url: '' };
      const s = storedByText.get(base.text);
      if (s) storedByText.delete(base.text);
      return { ...base, done: s ? s.done : false, url: (s && s.url) || base.url, _frame: true };
    });
    const manualOnly = [...storedByText.values()];
    const carriedNotInTemplate = carriedItems.filter(i => !templateTexts.has(normText(i.text)));
    itemsToRender = [...manualOnly, ...carriedNotInTemplate, ...templateResult];
  }

  return { itemsToRender, nextDayItems: working, changed };
}
