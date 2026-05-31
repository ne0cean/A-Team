<script>
  import { createEventDispatcher, tick } from 'svelte';
  import Item from './Item.svelte';
  import { CATS, CAT_NAMES, CAT_COLORS, TYPES, TYPE_LABELS, TYPE_COLORS, ym, monthData, prevMonthData, nextMonthData, standingData, dragSource } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let d;
  export let isToday = false;
  export let isCurrent = true;
  export let showPastToggle = false;
  export let adjacentMonth = null; // 'prev' or 'next' — for week view cross-month days

  const dispatch = createEventDispatcher();

  $: dayData = isCurrent
    ? ($monthData.days?.[String(d)] || {})
    : adjacentMonth === 'prev'
      ? ($prevMonthData?.days?.[String(d)] || {})
      : adjacentMonth === 'next'
        ? ($nextMonthData?.days?.[String(d)] || {})
        : {};
  $: dow = new Date($ym.split('-')[0], $ym.split('-')[1] - 1, d).getDay();
  $: holiday = getHoliday(d);
  $: recurringItems = getRecurring(d);

  function getHoliday(day) {
    if (!$standingData?.holidays) return null;
    const key = `${$ym}-${String(day).padStart(2, '0')}`;
    return $standingData.holidays[key] || null;
  }

  function getRecurring(day) {
    if (!$standingData) return [];
    const items = [];
    const SRC_COLORS = { yearly: '#f0c040', monthly: '#bc8cff', weekly: '#6e7681' };
    ($standingData.yearly || []).forEach(y => {
      if (y.month === +$ym.split('-')[1] && y.day === day) items.push({ ...y, _src: 'yearly', _color: SRC_COLORS.yearly });
    });
    const dim = new Date($ym.split('-')[0], $ym.split('-')[1], 0).getDate();
    ($standingData.monthly_recurring || []).forEach(m => {
      if (m.day === day || (m.day === 0 && day === dim)) items.push({ ...m, _src: 'monthly', _color: SRC_COLORS.monthly });
    });
    ($standingData.weekly_recurring || []).forEach(w => {
      if (w.dow !== dow) return;
      if (w.freq === 'biweekly' && Math.floor((day - 1) / 7) % 2 !== 0) return;
      items.push({ ...w, _src: 'weekly', _color: SRC_COLORS.weekly });
    });
    return items;
  }

  async function cycleDayType() {
    if (!isCurrent) return;
    const current = dayData.day_type || null;
    const idx = current ? TYPES.indexOf(current) : -1;
    const next = idx >= TYPES.length - 1 ? null : TYPES[idx + 1];
    await api.setDayType($ym, String(d), next);
    await api.injectFrames($ym, d, d);
    dispatch('reload');
  }

  async function onSplit(e, cat) {
    const { index, before, after } = e.detail;
    // Optimistic local update
    monthData.mutate(s => {
      const dd = s.days?.[String(d)];
      if (dd?.[cat]) {
        dd[cat][index].text = before;
        dd[cat].splice(index + 1, 0, { text: after, url: '', done: false });
      }
    });
    // Focus new item after Svelte re-renders
    await tick();
    const el = document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${index + 1}"]`);
    el?.querySelector('.item-text')?.focus({ preventScroll: true });
    // Server sync (await to guarantee persistence)
    await api.splitItem($ym, String(d), cat, index, before, after);
  }

  async function onEdit(e, cat) {
    const { index, text, url } = e.detail;
    await api.editItem($ym, String(d), cat, index, text, url || '');
  }

  async function onDelete(e, cat) {
    const idx = e.detail.index;
    // Optimistic local update
    monthData.mutate(s => {
      const dd = s.days?.[String(d)];
      if (dd?.[cat]) dd[cat].splice(idx, 1);
    });
    // Focus previous item after Svelte re-renders
    await tick();
    const allInDay = document.querySelectorAll(`.item[data-d="${d}"][data-cat="${cat}"]`);
    if (allInDay.length > 0) {
      const targetIdx = idx > 0 ? idx - 1 : 0;
      const target = allInDay[Math.min(targetIdx, allInDay.length - 1)];
      target?.querySelector('.item-text')?.focus({ preventScroll: true });
    }
    // Server sync (await to guarantee persistence)
    await api.deleteItem($ym, String(d), cat, idx);
  }

  async function onItemToggle(e, cat) {
    const idx = e.detail.index;
    monthData.mutate(s => {
      const item = s.days?.[String(d)]?.[cat]?.[idx];
      if (item) item.done = !item.done;
    });
    const res = await api.toggleItem($ym, String(d), cat, idx);
    if (!res) {
      // Revert optimistic update on API failure
      monthData.mutate(s => {
        const item = s.days?.[String(d)]?.[cat]?.[idx];
        if (item) item.done = !item.done;
      });
    }
  }

  function onLink(e, cat) {
    dispatch('openlink', { d, cat, index: e.detail.index });
  }

  function _displayPos(allItems, origIdx) {
    for (let i = 0; i < allItems.length; i++) {
      if (+allItems[i].dataset.idx === origIdx) return i;
    }
    return -1;
  }

  function _placeCursor(el, atEnd) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(!atEnd);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function onNavigate(e, cat) {
    const { direction, index } = e.detail;
    const allInDay = document.querySelectorAll(`.item[data-d="${d}"][data-cat="${cat}"]`);
    const dp = _displayPos(allInDay, index);
    const targetPos = dp + direction;
    if (targetPos >= 0 && targetPos < allInDay.length) {
      const el = allInDay[targetPos]?.querySelector('.item-text');
      if (el) {
        el.focus({ preventScroll: true });
        // ArrowDown→커서 맨 앞, ArrowUp→커서 맨 뒤
        requestAnimationFrame(() => _placeCursor(el, direction < 0));
      }
    }
  }

  async function onMergeUp(e, cat) {
    const { index, text } = e.detail;
    const allInDay = document.querySelectorAll(`.item[data-d="${d}"][data-cat="${cat}"]`);
    const dp = _displayPos(allInDay, index);
    if (dp <= 0) return;
    const prevOrigIdx = +allInDay[dp - 1].dataset.idx;
    const prevItem = (dayData[cat] || [])[prevOrigIdx];
    if (!prevItem || prevItem.type === 'separator') return;
    const prevLen = prevItem.text.length;
    const mergedText = prevItem.text + text;

    monthData.mutate(s => {
      const dd = s.days?.[String(d)];
      if (!dd?.[cat]) return;
      dd[cat][prevOrigIdx].text = mergedText;
      dd[cat].splice(index, 1);
    });
    await tick();

    const newIdx = prevOrigIdx > index ? prevOrigIdx - 1 : prevOrigIdx;
    const targetEl = document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${newIdx}"]`);
    const tEl = targetEl?.querySelector('.item-text');
    if (tEl) {
      tEl.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        // 커서를 병합 지점(prevLen)에 배치
        const sel = window.getSelection();
        const range = document.createRange();
        let remaining = prevLen, placed = false;
        for (const node of tEl.childNodes) {
          const len = node.textContent.length;
          if (remaining <= len) {
            const t = node.nodeType === 3 ? node : (node.firstChild || node);
            range.setStart(t, Math.min(remaining, t.length ?? t.textContent.length));
            range.collapse(true);
            placed = true;
            break;
          }
          remaining -= len;
        }
        if (!placed) { range.selectNodeContents(tEl); range.collapse(false); }
        sel.removeAllRanges();
        sel.addRange(range);
      });
    }
    await api.editItem($ym, String(d), cat, prevOrigIdx, mergedText, prevItem.url || '');
    await api.deleteItem($ym, String(d), cat, index);
  }

  async function saveOneThing(e) {
    const text = e.target.textContent.trim();
    await api.saveOneThing($ym, String(d), text);
  }

  async function saveNotes(e) {
    const text = e.target.innerText.trim();
    const dd = $monthData.days[String(d)] || {};
    if (text) dd.notes = text; else delete dd.notes;
    await api.saveNotes($ym, String(d), text);
  }

  async function toggleRecurringItem(idx) {
    const dd = $monthData.days?.[String(d)] || {};
    if (!dd._recurring) return;
    monthData.mutate(s => {
      const r = s.days?.[String(d)]?._recurring;
      if (r?.[idx]) r[idx].done = !r[idx].done;
    });
    await api.saveMonth($ym, $monthData);
  }

  function sortItems(items) {
    const indexed = items.map((item, i) => ({ ...item, _origIdx: i }));
    if (indexed.some(i => i.type === 'separator')) return indexed;
    // 순수 숫자/소수점만 앞에 오는 항목만 정렬 (시간 "8:30", "3시" 등 제외)
    const isScore = t => /^\d+(\.\d+)?(\s|$)/.test(t);
    const numbered = indexed.filter(i => isScore(i.text));
    const others = indexed.filter(i => !isScore(i.text));
    numbered.sort((a, b) => (parseFloat(b.text) || 0) - (parseFloat(a.text) || 0));
    return [...numbered, ...others];
  }

  let sepEls = {};
  async function onSepBlur(e, cat, origIdx) {
    const label = e.target.textContent.trim();
    const items = dayData[cat] || [];
    if (label !== items[origIdx]?.text) {
      await api.editItem($ym, String(d), cat, origIdx, label, '');
    }
  }

  function setOneThing(node, text) {
    function render(text) {
      if (document.activeElement === node) return;
      node.textContent = text || '';
    }
    render(text);
    return { update: render };
  }

  function setNotes(node, text) {
    function render(text) {
      if (document.activeElement === node) return;
      node.innerText = text || '';
    }
    render(text);
    return { update: render };
  }

  let newInputs = {};
  function showNewInput(cat) { newInputs[cat] = true; newInputs = newInputs; }
  function autoFocus(node) { requestAnimationFrame(() => { node.focus(); node.scrollIntoView({ block: 'nearest' }); }); }

  // Multi-select for bulk move
  let selected = new Set();
  function toggleSelect(cat, idx, e) {
    const key = `${cat}:${idx}`;
    if (e.shiftKey) {
      e.preventDefault();
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      selected = new Set(selected);
    }
  }
  async function bulkMove(targetCat) {
    if (!selected.size) return;
    const ops = [...selected].map(k => { const [cat, idx] = k.split(':'); return { cat, idx: +idx }; });
    // Sort descending so splice indices stay valid
    ops.sort((a, b) => b.idx - a.idx);
    for (const op of ops) {
      if (op.cat === targetCat) continue;
      await api.moveItem($ym, String(d), op.cat, op.idx, String(d), targetCat);
    }
    selected = new Set();
    dispatch('reload');
  }

  async function addSeparator(cat) {
    await api.addItem($ym, String(d), cat, '', '', 'separator');
    dispatch('reload');
  }

  async function addNewItem(cat, value) {
    if (!value.trim()) return;
    const t = value.trim();
    // Separator: --- or ---label
    if (/^---/.test(t)) {
      const label = t.replace(/^-{3,}\s*/, '');
      await api.addItem($ym, String(d), cat, label, '', 'separator');
      newInputs[cat] = false;
      newInputs = newInputs;
      dispatch('reload');
      return;
    }
    // Auto-detect URL
    const urlMatch = t.match(/^(https?:\/\/\S+)$/);
    const mixedMatch = !urlMatch && t.match(/^(.+?)\s+(https?:\/\/\S+)$/);
    const embeddedMatch = !urlMatch && !mixedMatch && t.match(/(https?:\/\/\S+)/);
    let text = t, url = '';
    if (urlMatch) { url = t; }
    else if (mixedMatch) { text = mixedMatch[1].trim(); url = mixedMatch[2]; }
    else if (embeddedMatch) { url = embeddedMatch[1]; }
    await api.addItem($ym, String(d), cat, text, url);
    newInputs[cat] = false;
    newInputs = newInputs;
    dispatch('reload');
  }

  // Drag and drop
  function onDragStart(e, cat, idx) {
    $dragSource = { d, cat, idx };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }

  async function onDayDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!$dragSource) return;
    if ($dragSource.d === d && $dragSource.cat === CATS[0]) return; // same day, same default cat → skip
    const targetCat = $dragSource.d === d ? CATS[0] : $dragSource.cat;
    await api.moveItem($ym, String($dragSource.d), $dragSource.cat, $dragSource.idx, String(d), targetCat);
    $dragSource = null;
    dispatch('reload');
  }

  // Category reorder by dragging header
  let catOrder = [...CATS];
  let catDragSource = null;
  function onCatDragStart(cat, e) {
    catDragSource = cat;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cat);
  }
  function onCatDrop(targetCat, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!catDragSource || catDragSource === targetCat) return;
    const fromIdx = catOrder.indexOf(catDragSource);
    const toIdx = catOrder.indexOf(targetCat);
    if (fromIdx < 0 || toIdx < 0) return;
    catOrder.splice(fromIdx, 1);
    catOrder.splice(toIdx, 0, catDragSource);
    catOrder = [...catOrder];
    catDragSource = null;
  }

  async function onMoveCat(e, cat) {
    const { index, direction, target } = e.detail;
    let targetCat;
    if (target) {
      targetCat = target;
    } else {
      const catIdx = catOrder.indexOf(cat);
      const targetIdx = catIdx + direction;
      if (targetIdx < 0 || targetIdx >= catOrder.length) return;
      targetCat = catOrder[targetIdx];
    }
    if (targetCat === cat) return;
    await api.moveItem($ym, String(d), cat, index, String(d), targetCat);
    dispatch('reload');
  }

  async function onItemDrop(e, cat, toIdx) {
    e.preventDefault();
    if (!$dragSource) return;
    if ($dragSource.d === d && $dragSource.cat === cat) {
      if ($dragSource.idx === toIdx) return;
      await api.reorderItem($ym, String(d), cat, $dragSource.idx, toIdx);
    } else {
      await api.moveItem($ym, String($dragSource.d), $dragSource.cat, $dragSource.idx, String(d), cat);
    }
    $dragSource = null;
    dispatch('reload');
  }

  function onDayDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
  function onDayDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
</script>

<div class="day-cell"
  class:today={isToday}
  class:other-month={!isCurrent}
  class:is-holiday={!!holiday}
  class:type-block={dayData.day_type === 'block'}
  class:type-flow={dayData.day_type === 'flow'}
  class:type-hf={dayData.day_type === 'hf'}
  class:type-vacation={dayData.day_type === 'vacation'}
  on:dragover={onDayDragOver}
  on:dragleave={onDayDragLeave}
  on:drop={onDayDrop}
>
  <div class="day-num" class:sun={dow === 0} class:sat={dow === 6}>
    <span on:click={cycleDayType} style="cursor:pointer">
      {d}
      {#if dayData.day_type}
        <span class="day-type-badge badge-{dayData.day_type}">{TYPE_LABELS[dayData.day_type]}</span>
      {/if}
    </span>
    <span>
      {#if showPastToggle}
        <span class="past-toggle" on:click={() => dispatch('togglepast')}>▲</span>
      {/if}
      <span class="add-btn" on:click={() => showNewInput(CATS[0])}>+</span>
    </span>
  </div>

  {#if holiday}
    <div class="holiday-name">{holiday}</div>
  {/if}

  {#if isCurrent || adjacentMonth}
    <div class="one-thing" contenteditable="true" on:blur={saveOneThing}
      on:keydown={(e) => e.key === 'Enter' && !e.isComposing && (e.preventDefault(), e.target.blur())}
      use:setOneThing={dayData.one_thing}
    ></div>

    {#if dayData.events?.length}
      {#each dayData.events as evt}
        <div class="day-event">{evt}</div>
      {/each}
    {/if}

    {#if selected.size > 0}
      <div style="display:flex;gap:2px;margin:4px 0;align-items:center;font-size:9px;color:#58a6ff">
        <span>{selected.size}개 선택</span>
        {#each CATS as c}
          <button style="background:#21262d;border:1px solid #30363d;color:#8b949e;padding:1px 6px;border-radius:3px;cursor:pointer;font-size:8px" on:click={() => bulkMove(c)}>→{CAT_NAMES[c]}</button>
        {/each}
        <button style="background:#21262d;border:1px solid #30363d;color:#484f58;padding:1px 6px;border-radius:3px;cursor:pointer;font-size:8px" on:click={() => { selected = new Set(); }}>취소</button>
      </div>
    {/if}

    {#each recurringItems as rec, ridx}
      <div class="item rec-item" style="border-left:2px solid {rec._color};padding-left:4px">
        <input type="checkbox" checked={rec.done || false} on:change={() => toggleRecurringItem(ridx)}>
        <span class="item-text" style="color:{rec._color}">{rec.text}</span>
      </div>
    {/each}

    {#each catOrder as cat}
      {@const items = dayData[cat] || []}
      {@const sorted = sortItems(items)}
      {@const hasPending = items.some(i => !i.done)}
      {#if items.length > 0 || isToday}
        <div class="category cat-{cat}" class:has-pending={hasPending}
          on:dragover|preventDefault={(e) => { e.stopPropagation(); e.currentTarget.classList.add('drag-over'); }}
          on:dragleave={(e) => e.currentTarget.classList.remove('drag-over')}
          on:drop|preventDefault={(e) => { e.stopPropagation(); e.currentTarget.classList.remove('drag-over'); onItemDrop(e, cat, items.length); }}>
          <div class="cat-label cl-{cat}">
            <span class="cat-drag-handle" draggable="true"
              on:dragstart={(e) => onCatDragStart(cat, e)}
              on:dragover|preventDefault={(e) => e.currentTarget.parentElement.style.background = 'rgba(255,255,255,0.08)'}
              on:dragleave={(e) => e.currentTarget.parentElement.style.background = ''}
              on:drop|preventDefault={(e) => { e.currentTarget.parentElement.style.background = ''; onCatDrop(cat, e); }}
            >⠿</span>
            <span>{CAT_NAMES[cat]}</span>
            <span class="cat-actions">
              <span class="cat-sep-add" on:click={() => addSeparator(cat)}>―</span>
              <span class="cat-add" on:click={() => showNewInput(cat)}>+</span>
            </span>
          </div>
          {#each sorted as sitem (sitem._origIdx)}
            {#if sitem.type === 'separator'}
              <div class="item-sep" draggable="true"
                on:dragstart={(e) => onDragStart(e, cat, sitem._origIdx)}
                on:dragover|preventDefault={(e) => e.currentTarget.classList.add('drag-over')}
                on:dragleave={(e) => e.currentTarget.classList.remove('drag-over')}
                on:drop|preventDefault={(e) => { e.currentTarget.classList.remove('drag-over'); onItemDrop(e, cat, sitem._origIdx); }}
              >
                <span class="sep-label" contenteditable="true" spellcheck="false"
                  on:blur={(e) => onSepBlur(e, cat, sitem._origIdx)}
                  on:keydown={(e) => e.key === 'Enter' && !e.isComposing && (e.preventDefault(), e.target.blur())}
                >{sitem.text}</span>
                <hr class="sep-line">
                <span class="del-btn" on:click={() => onDelete({ detail: { index: sitem._origIdx } }, cat)}>&#215;</span>
              </div>
            {:else}
              <Item item={sitem} index={sitem._origIdx} day={d} category={cat}
                isSelected={selected.has(`${cat}:${sitem._origIdx}`)}
                on:toggle={(e) => onItemToggle(e, cat)}
                on:select={(e) => { const k = `${cat}:${e.detail.index}`; if (selected.has(k)) selected.delete(k); else selected.add(k); selected = new Set(selected); }}
                on:split={(e) => onSplit(e, cat)}
                on:edit={(e) => onEdit(e, cat)}
                on:delete={(e) => onDelete(e, cat)}
                on:link={(e) => onLink(e, cat)}
                on:navigate={(e) => onNavigate(e, cat)}
                on:merge-up={(e) => onMergeUp(e, cat)}
                on:movecat={(e) => onMoveCat(e, cat)}
                on:dragstart={(e) => onDragStart(e.detail.e, cat, sitem._origIdx)}
                on:drop={(e) => onItemDrop(e.detail.e, cat, sitem._origIdx)}
              />
            {/if}
          {/each}
          {#if newInputs[cat]}
            <div class="new-item active">
              <input type="text" placeholder="새 항목..."
                use:autoFocus
                on:keydown={(e) => { if (e.key === 'Enter' && !e.isComposing && e.target.value.trim()) { addNewItem(cat, e.target.value); e.target.value = ''; } if (e.key === 'Escape') { newInputs[cat] = false; newInputs = newInputs; } }}
                on:blur={(e) => { if (!e.target.value.trim()) { newInputs[cat] = false; newInputs = newInputs; } }}
              >
            </div>
          {/if}
        </div>
      {/if}
    {/each}

    {#if dayData.notes || isToday}
      <div class="day-notes" class:has-content={!!dayData.notes}
        contenteditable="true" on:blur={saveNotes}
        on:keydown={(e) => e.key === 'Escape' && e.target.blur()}
        use:setNotes={dayData.notes}
      ></div>
    {/if}
  {/if}
</div>

<!-- styles in global app.css -->
