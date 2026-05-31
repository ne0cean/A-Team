<script>
  import { dayFrames, ym, CATS, CAT_NAMES, CAT_COLORS } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  const FRAME_TYPES = ['weekday', 'flow', 'block'];
  let frameCatOrder = { weekday: [...CATS], flow: [...CATS], block: [...CATS] };
  const FRAME_TYPE_LABELS = { weekday: 'Weekday (평일)', flow: 'Flow Day (토/HF)', block: 'Block Day (일)' };

  async function save() {
    const res = await api.saveDayFrames($dayFrames);
    if (res?._version) {
      dayFrames.mutate(s => { s._version = res._version; });
    } else if (res === null) {
      // 409 conflict — re-fetch fresh version and retry once
      const fresh = await api.loadDayFrames();
      if (fresh) {
        // Merge: keep current local edits, update _version
        dayFrames.mutate(s => { s._version = fresh._version; });
        const retry = await api.saveDayFrames($dayFrames);
        if (retry?._version) dayFrames.mutate(s => { s._version = retry._version; });
      }
    }
  }

  function toggleCatType(ftype, cat) {
    dayFrames.mutate(s => {
      const catData = s[ftype].categories[cat];
      catData.type = catData.type === 'routine' ? 'todo' : 'routine';
    });
    save();
  }

  function getItemText(rawItem) { return typeof rawItem === 'object' ? rawItem.text : rawItem; }

  // Extract markdown from contenteditable HTML (preserve [text](url) links)
  function htmlToMarkdown(el) {
    let result = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) { result += node.textContent; }
      else if (node.tagName === 'A') { result += `[${node.textContent}](${node.href})`; }
      else { result += node.textContent; }
    }
    return result.trim();
  }

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

  function addSeparator(ftype, cat) {
    dayFrames.mutate(s => {
      if (!s[ftype].categories[cat]) s[ftype].categories[cat] = { type: 'routine', items: [] };
      s[ftype].categories[cat].items.push({ type: 'separator', text: '' });
    });
    save();
  }

  function isSeparator(rawItem) {
    return typeof rawItem === 'object' && rawItem.type === 'separator';
  }

  function editSepLabel(ftype, cat, idx, label) {
    dayFrames.mutate(s => {
      const item = s[ftype].categories[cat].items[idx];
      if (typeof item === 'object') item.text = label.trim();
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
    if (!dragState.ftype) return;

    // Category header drag (idx === -1) → reorder display only
    if (dragState.idx === -1) {
      if (dragState.cat === cat) return;
      const fromIdx = frameCatOrder[ftype].indexOf(dragState.cat);
      const toI = frameCatOrder[ftype].indexOf(cat);
      if (fromIdx < 0 || toI < 0) return;
      frameCatOrder[ftype].splice(fromIdx, 1);
      frameCatOrder[ftype].splice(toI, 0, dragState.cat);
      frameCatOrder = {...frameCatOrder};
      return;
    }

    if (dragState.idx === null) return;
    if (dragState.ftype === ftype && dragState.cat === cat) {
      // Same category → reorder
      if (dragState.idx === toIdx) return;
      dayFrames.mutate(s => {
        const items = s[ftype].categories[cat].items;
        const [item] = items.splice(dragState.idx, 1);
        items.splice(toIdx, 0, item);
      });
    } else if (dragState.ftype === ftype) {
      // Same frame type, different category → move item
      dayFrames.mutate(s => {
        const fromItems = s[ftype].categories[dragState.cat].items;
        const [item] = fromItems.splice(dragState.idx, 1);
        if (!s[ftype].categories[cat]) s[ftype].categories[cat] = { type: 'routine', items: [] };
        s[ftype].categories[cat].items.splice(toIdx, 0, item);
      });
    }
    save();
  }

  function moveItemToCat(ftype, fromCat, idx, toCat) {
    if (fromCat === toCat) return;
    dayFrames.mutate(s => {
      const fromItems = s[ftype].categories[fromCat].items;
      const [item] = fromItems.splice(idx, 1);
      if (!s[ftype].categories[toCat]) s[ftype].categories[toCat] = { type: 'routine', items: [] };
      s[ftype].categories[toCat].items.push(item);
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
    const raw = $dayFrames[ftype].categories[cat].items[idx];
    const text = typeof raw === 'object' ? raw.text : raw;
    const url = prompt('URL (https:// 또는 cortex/ 경로)');
    if (!url) return;
    const label = prompt('표시 텍스트', text || 'link');
    if (!label) return;
    const newText = `[${label}](${url})`;
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

  async function injectFrameType(ftype) {
    const [y, m] = $ym.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    // Find days matching this frame type
    const { monthData } = await import('../../lib/stores.js');
    let md;
    monthData.subscribe(v => md = v)();
    let count = 0;
    for (let d = 1; d <= dim; d++) {
      const dd = md.days?.[String(d)] || {};
      const dow = new Date(y, m - 1, d).getDay();
      const dayType = dd.day_type || (dow === 0 ? 'block' : dow === 6 ? 'flow' : 'weekday');
      if (dayType !== ftype) continue;
      await api.injectFrames($ym, d, d);
      count++;
    }
    if (onReload) onReload();
    if (api.setToast) api.setToast(`${ftype}: ${count}일 반영 완료`);
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
      {#each frameCatOrder[ftype] as cat}
        {@const catData = frame.categories?.[cat] || { type: 'routine', items: [] }}
        <div class="frame-cat" style="border-left:2px solid {CAT_COLORS[cat]};padding-left:6px"
          on:dragover|preventDefault={(e) => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          on:dragleave={(e) => e.currentTarget.style.background = ''}
          on:drop|preventDefault={(e) => { e.stopPropagation(); e.currentTarget.style.background = ''; onDrop(ftype, cat, (catData.items||[]).length, e); }}>
          <div class="frame-cat-header"
            draggable="true"
            on:dragstart={(e) => { e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', cat); dragState = {ftype, cat, idx: -1}; }}
            on:dragover|preventDefault={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            on:dragleave={(e) => e.currentTarget.style.background = ''}
            on:drop|preventDefault={(e) => { e.currentTarget.style.background = ''; onDrop(ftype, cat, 0, e); }}
            style="cursor:grab">
            <span class="cl-{cat}">{CAT_NAMES[cat]}</span>
            <span class="frame-cat-type {catData.type}" on:click={() => toggleCatType(ftype, cat)}
              style="cursor:pointer" title="Click to toggle">{catData.type}</span>
          </div>
          {#each catData.items || [] as rawItem, idx}
            {#if isSeparator(rawItem)}
              <div class="item-sep" draggable="true"
                on:dragstart={(e) => onDragStart(ftype, cat, idx, e)}
                on:dragend={onDragEnd}
                on:dragover={onDragOver}
                on:dragleave={onDragLeave}
                on:drop={(e) => onDrop(ftype, cat, idx, e)}>
                <span class="sep-label" contenteditable="true" spellcheck="false"
                  on:blur={(e) => editSepLabel(ftype, cat, idx, e.target.textContent)}
                  on:keydown={(e) => e.key === 'Enter' && !e.isComposing && (e.preventDefault(), e.target.blur())}
                >{rawItem.text}</span>
                <hr class="sep-line">
                <span class="frame-del" on:click={() => delItem(ftype, cat, idx)}>×</span>
              </div>
            {:else}
              <div class="frame-item" tabindex="0" draggable="true"
                on:dragstart={(e) => onDragStart(ftype, cat, idx, e)}
                on:dragend={onDragEnd}
                on:dragover={onDragOver}
                on:dragleave={onDragLeave}
                on:drop={(e) => onDrop(ftype, cat, idx, e)}
                on:keydown={(e) => onFrameKey(ftype, cat, idx, e)}>
                <span class="drag-handle" style="cursor:grab;color:#484f58;font-size:12px;padding:0 2px">⠿</span>
                <span contenteditable="true" class="frame-text" style="flex:1"
                  on:blur={(e) => editItem(ftype, cat, idx, htmlToMarkdown(e.target))}
                  use:setFrameText={getItemText(rawItem)}></span>
                <select class="frame-move-cat" on:change={(e) => { if(e.target.value) { moveItemToCat(ftype, cat, idx, e.target.value); e.target.value=''; } }} title="카테고리 이동">
                  <option value="">↕</option>
                  {#each CATS as c}{#if c !== cat}<option value={c}>{CAT_NAMES[c]}</option>{/if}{/each}
                </select>
                <span class="link-btn" on:click={() => insertLink(ftype, cat, idx)} title="링크 추가">&#128279;</span>
                <span class="frame-del" on:click={() => delItem(ftype, cat, idx)}>×</span>
              </div>
            {/if}
          {/each}
          <div class="frame-add">
            <input placeholder="Add item..." on:keydown={(e) => { if (e.key === 'Enter') { addItem(ftype, cat, e.target.value); e.target.value = ''; } }}>
            <button on:click={(e) => { const inp = e.target.previousElementSibling; addItem(ftype, cat, inp.value); inp.value = ''; }}>+</button>
            <button class="frame-sep-btn" on:click={() => addSeparator(ftype, cat)} title="구분선 추가">―</button>
          </div>
        </div>
      {/each}
      <button class="inject-btn" on:click={() => injectFrameType(ftype)}>📅 {frame.label || ftype} 스케줄러 반영</button>
    </div>
  {/each}
</div>
<div class="frame-actions">
  <button class="frame-btn-inject" on:click={inject}>Apply to remaining days</button>
</div>
{/if}

<!-- styles in global app.css -->
