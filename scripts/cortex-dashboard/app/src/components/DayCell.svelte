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
    await api.deleteItem($ym, String(d), cat, e.detail.index);
    dispatch('reload');
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

<style>
  .day-cell { background: #0d1117; min-height: 110px; padding: 6px; position: relative; overflow-y: auto; max-height: 320px; scrollbar-width: none; }
  .day-cell::-webkit-scrollbar { display: none; }
  .day-cell:hover { background: #111820; scrollbar-width: thin; }
  .day-cell:hover::-webkit-scrollbar { display: block; width: 3px; }
  .day-cell:hover::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
  .day-cell.today { box-shadow: inset 0 0 0 2px #f0c040; background: #0e1c10; scrollbar-width: thin; }
  .day-cell.today::-webkit-scrollbar { display: block; width: 3px; }
  .day-cell.today::-webkit-scrollbar-thumb { background: #f0c040; border-radius: 3px; }
  .day-cell.today .day-num { color: #f0c040; }
  .day-cell.other-month { opacity: 0.4; min-height: 60px; }
  .day-cell.type-block { border-top: 1.5px solid #58a6ff; }
  .day-cell.type-flow { border-top: 1.5px solid #56d364; }
  .day-cell.type-hf { border-top: 1.5px solid #f0c040; }
  .day-cell.type-vacation { border-top: 1.5px solid #bc8cff; }
  .day-cell.is-holiday { background: #1a0d0d; }
  .day-num { font-weight: 700; font-size: 12px; margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: inherit; z-index: 1; padding: 2px 0; }
  .day-num.sun { color: #f85149; }
  .day-num.sat { color: #58a6ff; }
  .add-btn { font-size: 14px; cursor: pointer; color: #484f58; display: none; line-height: 1; }
  .day-cell:hover .add-btn { display: inline; }
  .add-btn:hover { color: #f0c040 !important; }
  .past-toggle { cursor: pointer; color: #484f58; font-size: 10px; }
  .day-type-badge { font-size: 7px; padding: 1px 5px; border-radius: 3px; cursor: pointer; font-weight: 700; margin-left: 3px; letter-spacing: 0.3px; text-transform: uppercase; }
  .badge-block { background: #172238; color: #58a6ff; }
  .badge-flow { background: #12261a; color: #3fb950; }
  .badge-hf { background: #2a2000; color: #d4a017; }
  .badge-vacation { background: #221538; color: #bc8cff; }
  .holiday-name { font-size: 8px; color: #f85149; margin-bottom: 2px; }
  .one-thing { background: #122117; padding: 3px 5px; border-radius: 3px; font-size: 10px; color: #56d364; margin-bottom: 4px; cursor: text; min-height: 16px; font-weight: 500; }
  .one-thing:empty::before { content: 'ONE THING...'; color: #1e3a25; }
  .one-thing:focus { outline: 1px solid #56d364; background: #0d2818; }
  .rec-item { display: flex; align-items: flex-start; gap: 4px; padding: 2px 0; font-size: 11px; line-height: 1.5; }
  .category { margin-bottom: 6px; padding-left: 4px; }
  .cat-ritual { border-left: 2px solid #f0c040; }
  .cat-input { border-left: 2px solid #58a6ff; }
  .cat-work { border-left: 2px solid #56d364; }
  .cat-outcome { border-left: 2px solid #bc8cff; }
  .cat-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; display: flex; justify-content: space-between; }
  .cl-ritual { color: #f0c040; }
  .cl-input { color: #58a6ff; }
  .cl-work { color: #56d364; }
  .cl-outcome { color: #bc8cff; }
  .cat-add { cursor: pointer; color: #484f58; font-size: 10px; display: none; }
  .category:hover .cat-add { display: inline; }
  .new-item { display: none; padding: 2px 0; }
  .new-item.active { display: flex; gap: 3px; align-items: center; }
  .new-item input { background: #0d1117; border: 1px solid #30363d; color: #e0e0e0; font-size: 11px; padding: 2px 4px; border-radius: 2px; width: 100%; }
  .new-item input:focus { outline: 1px solid #f0c040; }
</style>
