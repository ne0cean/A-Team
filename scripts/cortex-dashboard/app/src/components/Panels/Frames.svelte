<script>
  import { dayFrames, ym, CATS, CAT_NAMES, CAT_COLORS } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  const FRAME_TYPES = ['weekday', 'flow', 'block'];
  const FRAME_TYPE_LABELS = { weekday: 'Weekday (평일)', flow: 'Flow Day (토/HF)', block: 'Block Day (일)' };

  async function save() { await api.saveDayFrames($dayFrames); }

  function toggleCatType(ftype, cat) {
    dayFrames.mutate(s => {
      const catData = s[ftype].categories[cat];
      catData.type = catData.type === 'routine' ? 'todo' : 'routine';
    });
    save();
  }

  function getItemText(rawItem) { return typeof rawItem === 'object' ? rawItem.text : rawItem; }

  function editItem(ftype, cat, idx, text) {
    dayFrames.mutate(s => {
      const raw = s[ftype].categories[cat].items[idx];
      if (typeof raw === 'object') { raw.text = text.trim(); }
      else { s[ftype].categories[cat].items[idx] = text.trim(); }
    });
    save();
  }

  // Render [text](url) markdown links in contenteditable
  function setFrameText(node, text) {
    function render(text) {
      if (document.activeElement === node) return;
      node.textContent = '';
      if (!text) return;
      const re = /\[([^\]]+)\]\(([^)]+)\)/g;
      let last = 0, match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > last) node.appendChild(document.createTextNode(text.slice(last, match.index)));
        const a = document.createElement('a');
        const target = match[2];
        if (target.startsWith('http://') || target.startsWith('https://')) {
          a.href = target;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        } else {
          a.href = '#';
          a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open-cortex-file', { detail: target }));
          });
        }
        a.textContent = match[1];
        a.style.color = '#58a6ff';
        a.addEventListener('click', (e) => e.stopPropagation());
        node.appendChild(a);
        last = re.lastIndex;
      }
      if (last === 0) node.textContent = text;
      else if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
    }
    render(text);
    return { update: render };
  }

  function addItem(ftype, cat, text) {
    if (!text?.trim()) return;
    dayFrames.mutate(s => {
      if (!s[ftype].categories[cat]) s[ftype].categories[cat] = { type: 'routine', items: [] };
      s[ftype].categories[cat].items.push(text.trim());
    });
    save();
  }

  function delItem(ftype, cat, idx) {
    dayFrames.mutate(s => { s[ftype].categories[cat].items.splice(idx, 1); });
    save();
  }

  function moveItem(ftype, cat, idx, dir) {
    dayFrames.mutate(s => {
      const items = s[ftype].categories[cat].items;
      const target = idx + dir;
      if (target < 0 || target >= items.length) return;
      [items[idx], items[target]] = [items[target], items[idx]];
    });
    save();
  }

  let dragState = { ftype: null, cat: null, idx: null };

  function onDragStart(ftype, cat, idx, e) {
    dragState = { ftype, cat, idx };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    e.currentTarget.classList.add('dragging');
  }
  function onDragEnd(e) { e.currentTarget.classList.remove('dragging'); dragState = { ftype: null, cat: null, idx: null }; }
  function onDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
  function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
  function onDrop(ftype, cat, toIdx, e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (dragState.ftype !== ftype || dragState.cat !== cat || dragState.idx === null || dragState.idx === toIdx) return;
    dayFrames.mutate(s => {
      const items = s[ftype].categories[cat].items;
      const [item] = items.splice(dragState.idx, 1);
      items.splice(toIdx, 0, item);
    });
    save();
  }

  function onFrameKey(ftype, cat, idx, e) {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); moveItem(ftype, cat, idx, -1); focusFrame(e.currentTarget, idx - 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveItem(ftype, cat, idx, 1); focusFrame(e.currentTarget, idx + 1); }
  }
  function focusFrame(el, idx) {
    requestAnimationFrame(() => {
      const items = el.closest('.frame-cat')?.querySelectorAll('.frame-item');
      items?.[idx]?.focus();
    });
  }

  function insertLink(ftype, cat, idx) {
    const url = prompt('URL (https:// 또는 cortex/ 경로)');
    if (!url) return;
    const label = prompt('표시 텍스트', url.split('/').pop() || 'link');
    if (!label) return;
    const raw = $dayFrames[ftype].categories[cat].items[idx];
    const text = typeof raw === 'object' ? raw.text : raw;
    const newText = text + ` [${label}](${url})`;
    editItem(ftype, cat, idx, newText);
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
            <div class="frame-item" tabindex="0" draggable="true"
              on:dragstart={(e) => onDragStart(ftype, cat, idx, e)}
              on:dragend={onDragEnd}
              on:dragover={onDragOver}
              on:dragleave={onDragLeave}
              on:drop={(e) => onDrop(ftype, cat, idx, e)}
              on:keydown={(e) => onFrameKey(ftype, cat, idx, e)}>
              <span class="drag-handle" style="cursor:grab;color:#484f58;font-size:12px;padding:0 2px">⠿</span>
              <span contenteditable="true" class="frame-text" style="flex:1"
                on:blur={(e) => editItem(ftype, cat, idx, e.target.textContent)}
                use:setFrameText={getItemText(rawItem)}></span>
              <span class="link-btn" on:click={() => insertLink(ftype, cat, idx)} title="링크 추가">&#128279;</span>
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

<!-- styles in global app.css -->
