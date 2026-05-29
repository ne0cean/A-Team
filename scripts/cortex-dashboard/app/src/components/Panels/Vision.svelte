<script>
  import { visionData } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  async function save() { await api.saveVision($visionData); }

  function editCell(catIdx, year, el) {
    if (!$visionData.categories[catIdx].cells) $visionData.categories[catIdx].cells = {};
    const raw = $visionData.categories[catIdx].cells[year] || '';
    const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: '', image: null };
    existing.text = el.innerText.trim();
    $visionData.categories[catIdx].cells[year] = existing;
    save();
  }

  function editNotes(text) { $visionData.admin_notes = text.trim(); save(); }

  function getCellText(cat, year) {
    const raw = cat.cells?.[year] || '';
    return (typeof raw === 'object' && raw !== null) ? raw.text : raw;
  }

  function getCellImage(cat, year) {
    const raw = cat.cells?.[year] || '';
    return (typeof raw === 'object' && raw !== null) ? raw.image : null;
  }

  function resizeImage(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 600;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
          else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(catIdx, year) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await resizeImage(file);
      if (!$visionData.categories[catIdx].cells) $visionData.categories[catIdx].cells = {};
      const raw = $visionData.categories[catIdx].cells[year] || '';
      const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: raw, image: null };
      existing.image = dataUrl;
      $visionData.categories[catIdx].cells[year] = existing;
      await save();
      $visionData = $visionData;
    };
    input.click();
  }

  async function removeImage(catIdx, year) {
    const raw = $visionData.categories[catIdx].cells[year] || '';
    const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: raw, image: null };
    existing.image = null;
    $visionData.categories[catIdx].cells[year] = existing;
    await save();
    $visionData = $visionData;
  }
</script>

{#if $visionData}
<div class="vision-board">
  <div class="vision-header-row">
    <div class="year-col"></div>
    {#each $visionData.categories || [] as cat}
      <div class="vision-header-cell">{cat.label}</div>
    {/each}
  </div>

  {#each $visionData.years || [] as year}
    <div class="vision-year-row">
      <div class="vision-year-label">{year}</div>
      {#each $visionData.categories || [] as cat, ci}
        {@const img = getCellImage(cat, year)}
        <div class="vision-card" class:has-image={!!img}>
          {#if img}
            <img class="vision-card-img" src={img} alt="">
          {/if}
          <div class="vision-card-text" contenteditable="true"
            on:blur={(e) => editCell(ci, year, e.target)}>{getCellText(cat, year)}</div>
          <div class="vision-card-actions">
            <button on:click={() => uploadImage(ci, year)}>📷</button>
            {#if img}<button on:click={() => removeImage(ci, year)}>✕</button>{/if}
          </div>
        </div>
      {/each}
    </div>
  {/each}
</div>

<div class="admin-notes">
  <div class="admin-notes-title">ADMIN NOTES</div>
  <div class="admin-notes-content" contenteditable="true"
    on:blur={(e) => editNotes(e.target.innerText)}>{$visionData.admin_notes || ''}</div>
</div>
{/if}

<style>
  .vision-board { overflow-x: auto; }
  .vision-header-row, .vision-year-row { display: flex; gap: 1px; }
  .year-col { width: 52px; min-width: 52px; }
  .vision-header-cell { flex: 1; background: #21262d; color: #f0c040; font-size: 10px; padding: 6px 8px; text-align: center; font-weight: 600; min-width: 100px; }
  .vision-year-label { width: 52px; min-width: 52px; background: #161b22; color: #f0c040; font-weight: 600; font-size: 10px; display: flex; align-items: center; justify-content: center; }
  .vision-card { flex: 1; min-width: 100px; background: #0d1117; border: 1px solid #21262d; padding: 4px; position: relative; }
  .vision-card-img { width: 100%; border-radius: 2px; margin-bottom: 2px; }
  .vision-card-text { font-size: 10px; color: #c9d1d9; line-height: 1.5; min-height: 20px; white-space: pre-wrap; }
  .vision-card-text:focus { outline: 1px solid #f0c040; background: #111820; }
  .vision-card-actions { display: flex; gap: 2px; margin-top: 2px; }
  .vision-card-actions button { background: #21262d; border: none; color: #8b949e; padding: 1px 4px; border-radius: 2px; cursor: pointer; font-size: 9px; }
  .admin-notes { margin-top: 12px; padding: 8px; background: #0d1117; border: 1px solid #21262d; border-radius: 4px; }
  .admin-notes-title { font-size: 10px; color: #6e7681; font-weight: 600; margin-bottom: 4px; }
  .admin-notes-content { font-size: 11px; color: #8b949e; min-height: 20px; white-space: pre-wrap; }
  .admin-notes-content:focus { outline: 1px solid #30363d; color: #c9d1d9; }
</style>
