<script>
  import { createEventDispatcher, tick } from 'svelte';
  import Item from './Item.svelte';
  import { CATS, CAT_NAMES, CAT_COLORS, TYPES, TYPE_LABELS, TYPE_COLORS, ym, monthData, standingData, dragSource } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let d;
  export let isToday = false;
  export let isCurrent = true;
  export let showPastToggle = false;

  const dispatch = createEventDispatcher();

  $: dayData = isCurrent ? ($monthData.days?.[String(d)] || {}) : {};
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
    const dd = $monthData.days[String(d)];
    if (dd?.[cat]) {
      dd[cat][index].text = before;
      dd[cat].splice(index + 1, 0, { text: after, url: '', done: false });
      $monthData = $monthData;
    }
    // Focus new item after Svelte re-renders
    await tick();
    const el = document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${index + 1}"]`);
    el?.querySelector('.item-text')?.focus({ preventScroll: true });
    // Server sync (don't reload — already updated locally)
    api.splitItem($ym, String(d), cat, index, before, after);
  }

  async function onEdit(e, cat) {
    const { index, text, url } = e.detail;
    await api.editItem($ym, String(d), cat, index, text, url || '');
  }

  async function onDelete(e, cat) {
    const idx = e.detail.index;
    // Optimistic local update
    const dd = $monthData.days[String(d)];
    if (dd?.[cat]) {
      dd[cat].splice(idx, 1);
      $monthData = $monthData;
    }
    // Focus previous item after Svelte re-renders
    await tick();
    const allInDay = document.querySelectorAll(`.item[data-d="${d}"][data-cat="${cat}"]`);
    if (allInDay.length > 0) {
      const targetIdx = idx > 0 ? idx - 1 : 0;
      const target = allInDay[Math.min(targetIdx, allInDay.length - 1)];
      target?.querySelector('.item-text')?.focus({ preventScroll: true });
    }
    // Server sync
    api.deleteItem($ym, String(d), cat, idx);
  }

  async function onItemToggle(e, cat) {
    await api.toggleItem($ym, String(d), cat, e.detail.index);
    dispatch('reload');
  }

  function onLink(e, cat) {
    dispatch('openlink', { d, cat, index: e.detail.index });
  }

  function onNavigate(e, cat) {
    const { direction, index } = e.detail;
    const allInDay = document.querySelectorAll(`.item[data-d="${d}"][data-cat="${cat}"]`);
    const targetIdx = index + direction;
    if (targetIdx >= 0 && targetIdx < allInDay.length) {
      allInDay[targetIdx]?.querySelector('.item-text')?.focus({ preventScroll: true });
    }
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
    const dd = $monthData.days[String(d)] || {};
    if (!dd._recurring) return;
    dd._recurring[idx].done = !dd._recurring[idx].done;
    $monthData = $monthData;
    await api.saveMonth($ym, $monthData);
  }

  function sortItems(items) {
    const indexed = items.map((item, i) => ({ ...item, _origIdx: i }));
    const numbered = indexed.filter(i => /^\d/.test(i.text));
    const others = indexed.filter(i => !/^\d/.test(i.text));
    numbered.sort((a, b) => {
      const na = parseFloat(a.text) || 0;
      const nb = parseFloat(b.text) || 0;
      return nb - na;
    });
    return [...numbered, ...others];
  }

  let newInputs = {};
  function showNewInput(cat) { newInputs[cat] = true; newInputs = newInputs; }

  async function addNewItem(cat, value) {
    if (!value.trim()) return;
    const t = value.trim();
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
    if (!$dragSource || $dragSource.d === d) return;
    await api.moveItem($ym, String($dragSource.d), $dragSource.cat, $dragSource.idx, String(d), $dragSource.cat);
    $dragSource = null;
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

  {#if isCurrent}
    <div class="one-thing" contenteditable="true" on:blur={saveOneThing}
      on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), e.target.blur())}
    >{dayData.one_thing || ''}</div>

    {#each recurringItems as rec, ridx}
      <div class="item rec-item" style="border-left:2px solid {rec._color};padding-left:4px">
        <input type="checkbox" checked={rec.done || false} on:change={() => toggleRecurringItem(ridx)}>
        <span class="item-text" style="color:{rec._color}">{rec.text}</span>
      </div>
    {/each}

    {#each CATS as cat}
      {@const items = dayData[cat] || []}
      {@const sorted = sortItems(items)}
      {#if items.length > 0 || isToday}
        <div class="category cat-{cat}">
          <div class="cat-label cl-{cat}">
            <span>{CAT_NAMES[cat]}</span>
            <span class="cat-add" on:click={() => showNewInput(cat)}>+</span>
          </div>
          {#each sorted as sitem (sitem._origIdx)}
            <Item item={sitem} index={sitem._origIdx} day={d} category={cat}
              on:toggle={(e) => onItemToggle(e, cat)}
              on:split={(e) => onSplit(e, cat)}
              on:edit={(e) => onEdit(e, cat)}
              on:delete={(e) => onDelete(e, cat)}
              on:link={(e) => onLink(e, cat)}
              on:navigate={(e) => onNavigate(e, cat)}
              on:dragstart={(e) => onDragStart(e.detail.e, cat, idx)}
              on:drop={(e) => onItemDrop(e.detail.e, cat, idx)}
            />
          {/each}
          {#if newInputs[cat]}
            <div class="new-item active">
              <input type="text" placeholder="..."
                on:keydown={(e) => e.key === 'Enter' && (addNewItem(cat, e.target.value), e.target.value = '')}
                on:blur={(e) => setTimeout(() => { newInputs[cat] = false; newInputs = newInputs; }, 100)}
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
      >{dayData.notes || ''}</div>
    {/if}
  {/if}
</div>

<!-- styles in global app.css -->
