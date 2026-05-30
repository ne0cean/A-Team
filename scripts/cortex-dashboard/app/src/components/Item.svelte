<script>
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let index;
  export let day;
  export let category;

  const dispatch = createEventDispatcher();

  let textEl;
  let suppressBlur = false;

  function handleKey(e) {
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
      dispatch('split', { index, before, after });
    } else if (e.key === 'Backspace' && textEl.textContent.trim() === '') {
      suppressBlur = true;
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
    }
  }

  function handleBlur() {
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
  on:dragover|preventDefault={(e) => e.currentTarget.classList.add('drag-over')}
  on:dragleave={(e) => e.currentTarget.classList.remove('drag-over')}
  on:drop|preventDefault={(e) => { e.currentTarget.classList.remove('drag-over'); dispatch('drop', { e, index }); }}
>
  <input type="checkbox" checked={item.done} on:change={handleToggle}>
  <span
    class="item-text"
    contenteditable="true"
    bind:this={textEl}
    on:blur={handleBlur}
    on:keydown={handleKey}
  >{#if item.url}<a href={item.url} target="_blank" on:click|stopPropagation>{item.text}</a>{:else}{item.text}{/if}</span>
  <span class="link-btn" class:has-link={item.url} on:click={(e) => { if (item.url) { e.stopPropagation(); window.open(item.url, '_blank'); } else { dispatch('link', { index }); } }}>&#128279;</span>
  <span class="del-btn" on:click={() => dispatch('delete', { index })}>&#215;</span>
</div>

<!-- styles in global app.css -->
