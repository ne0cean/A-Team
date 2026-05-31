<script>
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let index;
  export let day;
  export let category;

  const dispatch = createEventDispatcher();

  let textEl;
  let suppressBlur = false;
  let focused = false;

  function safeUrl(u) {
    if (!u) return '';
    try { const s = new URL(u).protocol; return (s === 'https:' || s === 'http:') ? u : ''; } catch { return ''; }
  }

  // Parse [text](url) markdown links — supports https:// and cortex/ internal paths
  function renderRichText(node, text) {
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
      const url = safeUrl(itm.url);
      if (url) {
        // Whole-item link (legacy: item.url field)
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = itm.text;
        a.addEventListener('click', (e) => e.stopPropagation());
        node.appendChild(a);
      } else if (/\[.+?\]\([^)]+\)/.test(itm.text)) {
        // Inline markdown links
        renderRichText(node, itm.text);
      } else {
        node.textContent = itm.text;
      }
    }
    render(itm);
    return { update: render };
  }

  function handleKey(e) {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      const fullText = textEl.textContent;
      let beforeText = fullText;
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(textEl);
        preRange.setEnd(range.startContainer, range.startOffset);
        beforeText = preRange.toString();
      }
      const before = beforeText.trim();
      const after = fullText.slice(beforeText.length).trim();
      suppressBlur = true;
      focused = false;
      dispatch('split', { index, before, after });
    } else if (e.key === 'Backspace' && textEl.textContent.trim() === '') {
      suppressBlur = true;
      focused = false;
      e.preventDefault();
      dispatch('delete', { index });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      dispatch('navigate', { direction: 1, index });
    } else if (e.key === 'ArrowUp') {
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

  function handleBlur() {
    focused = false;
    if (suppressBlur) { suppressBlur = false; return; }
    const newText = textEl.textContent.trim();
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

  function handleToggle() {
    dispatch('toggle', { index });
  }

  export function focus() {
    textEl?.focus();
  }
</script>

<div
  class="item"
  class:done={item.done}
  class:carried={item._carried}
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
  <input type="checkbox" checked={item.done} on:change={handleToggle}>
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
    <option value="ritual">R&R</option>
    <option value="input">Outcome</option>
    <option value="work">Work</option>
    <option value="outcome">Input</option>
  </select>
  <span class="link-btn" class:has-link={item.url} on:click={() => dispatch('link', { index })}>&#128279;</span>
  <span class="del-btn" on:click={() => dispatch('delete', { index })}>&#215;</span>
</div>

<!-- styles in global app.css -->
