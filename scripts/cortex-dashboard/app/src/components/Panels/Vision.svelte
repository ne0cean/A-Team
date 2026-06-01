<script>
  import { visionData } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  async function save() { await api.saveVision($visionData); }

  function editCell(catIdx, year, el) {
    visionData.mutate(s => {
      if (!s.categories[catIdx].cells) s.categories[catIdx].cells = {};
      const raw = s.categories[catIdx].cells[year] || '';
      const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: '', image: null };
      existing.text = el.innerText.trim();
      s.categories[catIdx].cells[year] = existing;
    });
    save();
  }

  function editNotes(text) { visionData.mutate(s => { s.admin_notes = text.trim(); }); save(); }

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
      visionData.mutate(s => {
        if (!s.categories[catIdx].cells) s.categories[catIdx].cells = {};
        const raw = s.categories[catIdx].cells[year] || '';
        const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: raw, image: null };
        existing.image = dataUrl;
        s.categories[catIdx].cells[year] = existing;
      });
      await save();
    };
    input.click();
  }

  async function removeImage(catIdx, year) {
    visionData.mutate(s => {
      const raw = s.categories[catIdx].cells[year] || '';
      const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: raw, image: null };
      existing.image = null;
      s.categories[catIdx].cells[year] = existing;
    });
    await save();
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

<!-- styles in global app.css -->
