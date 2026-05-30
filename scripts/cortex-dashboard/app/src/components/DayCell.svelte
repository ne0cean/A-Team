<script>
  import { createEventDispatcher } from 'svelte';
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
    // Yearly
    ($standingData.yearly || []).forEach(y => {
      if (y.month === +$ym.split('-')[1] && y.day === day) items.push({ ...y, _src: 'yearly', _color: SRC_COLORS.yearly });
    });
    // Monthly recurring
    const dim = new Date($ym.split('-')[0], $ym.split('-')[1], 0).getDate();
    ($standingData.monthly_recurring || []).forEach(m => {
      if (m.day === day || (m.day === 0 && day === dim)) items.push({ ...m, _src: 'monthly', _color: SRC_COLORS.monthly });
    });
    // Weekly
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

  async function onToggle(e) {
    const { index } = e.detail;
    await api.toggleItem($ym, String(d), e.detail.category || currentCat, index);
    dispatch('reload');
  }

  let currentCat = '';
  let itemRefs = {};

  async function onSplit(e, cat) {
    const { index, before, after } = e.detail;
    await api.splitItem($ym, String(d), cat, index, before, after);
    dispatch('reload');
  }

  async function onEdit(e, cat) {
    const { index, text } = e.detail;
    const item = dayData[cat]?.[index];
    await api.editItem($ym, String(d), cat, index, text, item?.url || '');
  }

  async function onDelete(e, cat) {
    const idx = e.detail.index;
    await api.deleteItem($ym, String(d), cat, idx);
    dispatch('reload');
    // Focus previous item after DOM update
    setTimeout(() => {
      const items = document.querySelectorAll(`.day-cell.today .cat-${cat} .item-text, .day-cell .cat-${cat} .item-text`);
      const targetIdx = idx > 0 ? idx - 1 : 0;
      const allInDay = document.querySelectorAll(`[data-day="${d}"] .cat-${cat} .item-text`);
      if (allInDay.length === 0) return;
      const target = allInDay[Math.min(targetIdx, allInDay.length - 1)];
      target?.focus({ preventScroll: true });
    }, 80);
  }

  async function onItemToggle(e, cat) {
    await api.toggleItem($ym, String(d), cat, e.detail.index);
    dispatch('reload');
  }

  function onLink(e, cat) {
    dispatch('openlink', { d, cat, index: e.detail.index });
  }

  function onNavigate(e, cat) {
    // Arrow key navigation between items
  }

  async function saveOneThing(e) {
    const text = e.target.textContent.trim();
    await api.saveOneThing($ym, String(d), text);
  }

  let newInputs = {};
  function showNewInput(cat) { newInputs[cat] = true; newInputs = newInputs; }

  async function addNewItem(cat, value) {
    if (!value.trim()) return;
    await api.addItem($ym, String(d), cat, value.trim());
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

    {#each recurringItems as rec}
      <div class="item rec-item" style="border-left:2px solid {rec._color};padding-left:4px">
        <span class="item-text" style="color:{rec._color}">{rec.text}</span>
      </div>
    {/each}

    {#each CATS as cat}
      {@const items = dayData[cat] || []}
      {#if items.length > 0 || isToday}
        <div class="category cat-{cat}">
          <div class="cat-label cl-{cat}">
            <span>{CAT_NAMES[cat]}</span>
            <span class="cat-add" on:click={() => showNewInput(cat)}>+</span>
          </div>
          {#each items as item, idx (idx)}
            <Item {item} index={idx} day={d} category={cat}
              on:toggle={(e) => onItemToggle(e, cat)}
              on:split={(e) => onSplit(e, cat)}
              on:edit={(e) => onEdit(e, cat)}
              on:delete={(e) => onDelete(e, cat)}
              on:link={(e) => onLink(e, cat)}
              on:navigate={(e) => onNavigate(e, cat)}
              on:dragstart={(e) => onDragStart(e.detail.e, cat, idx)}
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
  {/if}
</div>

<!-- styles in global app.css -->
