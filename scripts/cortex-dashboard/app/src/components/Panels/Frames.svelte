<script>
  import { dayFrames, ym, CATS, CAT_NAMES, CAT_COLORS } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  const FRAME_TYPES = ['weekday', 'flow', 'block'];
  const FRAME_TYPE_LABELS = { weekday: 'Weekday (평일)', flow: 'Flow Day (토/HF)', block: 'Block Day (일)' };

  async function save() { await api.saveDayFrames($dayFrames); }

  function toggleCatType(ftype, cat) {
    const catData = $dayFrames[ftype].categories[cat];
    catData.type = catData.type === 'routine' ? 'todo' : 'routine';
    save(); $dayFrames = $dayFrames;
  }

  function getItemText(rawItem) { return typeof rawItem === 'object' ? rawItem.text : rawItem; }

  function editItem(ftype, cat, idx, text) {
    const raw = $dayFrames[ftype].categories[cat].items[idx];
    if (typeof raw === 'object') { raw.text = text.trim(); }
    else { $dayFrames[ftype].categories[cat].items[idx] = text.trim(); }
    save();
  }

  function addItem(ftype, cat, text) {
    if (!text?.trim()) return;
    if (!$dayFrames[ftype].categories[cat]) $dayFrames[ftype].categories[cat] = { type: 'routine', items: [] };
    $dayFrames[ftype].categories[cat].items.push(text.trim());
    save(); $dayFrames = $dayFrames;
  }

  function delItem(ftype, cat, idx) {
    $dayFrames[ftype].categories[cat].items.splice(idx, 1);
    save(); $dayFrames = $dayFrames;
  }

  export let onReload;

  async function inject() {
    const today = new Date().getDate();
    const [y, m] = $ym.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    const res = await api.injectFrames($ym, today, dim);
    if (onReload) onReload();
  }
</script>

{#if $dayFrames}
<div class="frames-grid">
  {#each FRAME_TYPES as ftype}
    {@const frame = $dayFrames[ftype] || { label: ftype, categories: {} }}
    <div class="frame-section frame-type-{ftype}">
      <div class="frame-section-header">
        <span class="frame-section-title">{frame.label || FRAME_TYPE_LABELS[ftype]}</span>
      </div>
      {#each CATS as cat}
        {@const catData = frame.categories?.[cat] || { type: 'routine', items: [] }}
        <div class="frame-cat" style="border-left:2px solid {CAT_COLORS[cat]};padding-left:6px">
          <div class="frame-cat-header">
            <span class="cl-{cat}">{CAT_NAMES[cat]}</span>
            <span class="frame-cat-type {catData.type}" on:click={() => toggleCatType(ftype, cat)}
              style="cursor:pointer" title="Click to toggle">{catData.type}</span>
          </div>
          {#each catData.items || [] as rawItem, idx}
            <div class="frame-item">
              <span class="idx">{idx + 1}</span>
              <input value={getItemText(rawItem)} on:change={(e) => editItem(ftype, cat, idx, e.target.value)}>
              <span class="frame-del" on:click={() => delItem(ftype, cat, idx)}>×</span>
            </div>
          {/each}
          <div class="frame-add">
            <input placeholder="Add item..." on:keydown={(e) => { if (e.key === 'Enter') { addItem(ftype, cat, e.target.value); e.target.value = ''; } }}>
            <button on:click={(e) => { const inp = e.target.previousElementSibling; addItem(ftype, cat, inp.value); inp.value = ''; }}>+</button>
          </div>
        </div>
      {/each}
    </div>
  {/each}
</div>
<div class="frame-actions">
  <button class="frame-btn-inject" on:click={inject}>Apply to remaining days</button>
</div>
{/if}

<style>
  .frames-grid { display: flex; gap: 12px; flex-wrap: wrap; }
  .frame-section { flex: 1; min-width: 280px; padding: 8px; background: #0d1117; border-radius: 4px; border: 1px solid #21262d; }
  .frame-section-header { margin-bottom: 6px; }
  .frame-section-title { font-size: 13px; font-weight: 600; }
  .frame-type-weekday .frame-section-title { color: #c9d1d9; }
  .frame-type-flow .frame-section-title { color: #56d364; }
  .frame-type-block .frame-section-title { color: #58a6ff; }
  .frame-cat { margin-bottom: 6px; }
  .frame-cat-header { display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 600; margin-bottom: 2px; }
  .cl-ritual { color: #f0c040; } .cl-input { color: #58a6ff; } .cl-work { color: #56d364; } .cl-outcome { color: #bc8cff; }
  .frame-cat-type { font-size: 9px; padding: 1px 5px; border-radius: 3px; }
  .frame-cat-type.routine { background: #1c3a1c; color: #56d364; }
  .frame-cat-type.todo { background: #3a3000; color: #f0c040; }
  .frame-item { display: flex; align-items: center; gap: 4px; padding: 2px 0; font-size: 11px; }
  .idx { color: #484f58; font-size: 9px; }
  .frame-item input { background: #161b22; border: 1px solid #30363d; color: #e0e0e0; font-size: 11px; padding: 2px 4px; border-radius: 2px; flex: 1; }
  .frame-del { color: #484f58; cursor: pointer; font-size: 11px; }
  .frame-del:hover { color: #f85149; }
  .frame-add { display: flex; gap: 4px; margin-top: 3px; }
  .frame-add input { background: #0d1117; border: 1px solid #30363d; color: #e0e0e0; font-size: 11px; padding: 2px 4px; border-radius: 2px; flex: 1; }
  .frame-add button { background: #238636; border: none; color: #fff; padding: 2px 8px; border-radius: 2px; cursor: pointer; font-size: 10px; }
  .frame-actions { margin-top: 12px; }
  .frame-btn-inject { background: #238636; border: none; color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; }
  .frame-btn-inject:hover { background: #2ea043; }
</style>
