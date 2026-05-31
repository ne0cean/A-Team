<script>
  import { createEventDispatcher } from 'svelte';
  import { CATS, CAT_NAMES } from '../lib/stores.js';

  export let item;
  export let index;
  export let day;
  export let category;
  export let isSelected = false;

  const dispatch = createEventDispatcher();

  let textEl;
  let suppressBlur = false;
  let focused = false;

  function safeUrl(u) {
    if (!u) return '';
    try { const s = new URL(u).protocol; return (s === 'https:' || s === 'http:') ? u : ''; } catch { return ''; }
  }

  // Parse [text](url) markdown links — supports https:// and cortex/ internal paths
  // Also handles ] (url) with space between ] and (
  function renderRichText(node, text) {
    const re = /\[([^\]]+)\]\s*\(([^)]+)\)/g;
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
        // Cortex internal link — open via API
        a.href = '#';
        a.dataset.cortexPath = target;
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
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  // Imperatively render content into contenteditable to avoid Svelte reactivity conflicts
  function renderContent(node, itm) {
    function render(itm) {
      if (focused) return;
      node.textContent = '';
      // Always render text as editable; item.url accessible via 🔗 button
      if (/\[.+?\]\s*\([^)]+\)/.test(itm.text)) {
        // Inline markdown links
        renderRichText(node, itm.text);
      } else {
        node.textContent = itm.text;
      }
    }
    render(itm);
    return { update: render };
  }

  function cursorOffset() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(textEl);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const fullText = htmlToMd(textEl);
      const sel = window.getSelection();
      let beforeLen = fullText.length;
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(textEl);
        preRange.setEnd(range.startContainer, range.startOffset);
        beforeLen = preRange.toString().length;
      }
      const before = fullText.slice(0, beforeLen).trim();
      const after = fullText.slice(beforeLen).trim();
      suppressBlur = true;
      focused = false;
      dispatch('split', { index, before, after });
      return;
    }
    if (e.isComposing) return;
    if (e.key === 'Backspace') {
      const text = htmlToMd(textEl);
      if (text.trim() === '') {
        suppressBlur = true; focused = false;
        e.preventDefault();
        dispatch('delete', { index });
        return;
      }
      // 커서가 맨 앞이면 위 항목과 병합
      const off = cursorOffset();
      if (off === 0) {
        e.preventDefault();
        suppressBlur = true; focused = false;
        dispatch('merge-up', { index, text });
        return;
      }
    } else if (e.key === 'ArrowUp' && !e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      if (cursorOffset() === 0) {
        e.preventDefault();
        dispatch('navigate', { direction: -1, index });
      }
    } else if (e.key === 'ArrowDown' && !e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const off = cursorOffset();
      const total = textEl.textContent.length;
      if (off !== null && off >= total) {
        e.preventDefault();
        dispatch('navigate', { direction: 1, index });
      }
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      dispatch('navigate', { direction: 1, index });
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      dispatch('navigate', { direction: -1, index });
    } else if (e.altKey && e.key === '1') {
      e.preventDefault();
      dispatch('toggle', { index });
    } else if (e.altKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      dispatch('movecat', { index, direction: e.key === 'ArrowUp' ? -1 : 1 });
    }
  }

  function handleFocus() {
    focused = true;
  }

  function htmlToMd(el) {
    let r = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) r += n.textContent;
      else if (n.tagName === 'A') {
        // Preserve internal cortex paths; use data-cortex-path if set
        const href = n.dataset.cortexPath || n.getAttribute('href') || '';
        r += `[${n.textContent}](${href})`;
      } else r += n.textContent;
    }
    return r.trim();
  }

  function handleBlur() {
    focused = false;
    if (suppressBlur) { suppressBlur = false; return; }
    if (textEl?.dataset?.skipBlur) { delete textEl.dataset.skipBlur; return; }
    const newText = htmlToMd(textEl);
    if (newText !== item.text) {
      // Auto-detect URL
      const urlMatch = newText.match(/^(https?:\/\/\S+)$/);
      const embeddedMatch = !urlMatch && newText.match(/(https?:\/\/\S+)/);
      let url = item.url || '';
      if (urlMatch && !url) url = newText;
      else if (embeddedMatch && !url) url = embeddedMatch[1];
      dispatch('edit', { index, text: newText, url });
    }
  }

  function handleToggle(e) {
    if (e.shiftKey) {
      e.preventDefault();
      dispatch('select', { index });
    } else {
      dispatch('toggle', { index });
    }
  }

  export function focus() {
    textEl?.focus();
  }
</script>

<div
  class="item"
  class:done={item.done}
  class:carried={item._carried}
  class:selected={isSelected}
  data-d={day}
  data-cat={category}
  data-idx={index}
  draggable="true"
  on:dragstart={(e) => dispatch('dragstart', { e, index })}
  on:dragover|preventDefault={(e) => { e.stopPropagation(); e.currentTarget.classList.add('drag-over'); }}
  on:dragleave={(e) => e.currentTarget.classList.remove('drag-over')}
  on:drop|preventDefault={(e) => { e.stopPropagation(); e.currentTarget.classList.remove('drag-over'); dispatch('drop', { e, index }); }}
>
  <span class="drag-handle" style="cursor:grab;color:#484f58;font-size:10px;padding:0 2px;display:none">⠿</span>
  <input type="checkbox" checked={item.done} on:click={handleToggle}>
  <span
    class="item-text"
    contenteditable="true"
    bind:this={textEl}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:keydown={handleKey}
    use:renderContent={item}
  ></span>
  <select class="move-cat" on:change={(e) => { if(e.target.value) { dispatch('movecat', { index, target: e.target.value }); e.target.value = ''; } }}>
    <option value="">↕</option>
    {#each CATS as c}{#if c !== category}<option value={c}>{CAT_NAMES[c]}</option>{/if}{/each}
  </select>
  <span class="link-btn" class:has-link={item.url} on:click={() => dispatch('link', { index })}>&#128279;</span>
  <span class="del-btn" on:click={() => dispatch('delete', { index })}>&#215;</span>
</div>

<!-- styles in global app.css -->
