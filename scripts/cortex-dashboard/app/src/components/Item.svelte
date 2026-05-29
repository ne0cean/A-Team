<script>
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let index;
  export let day;
  export let category;

  const dispatch = createEventDispatcher();

  let textEl;

  function handleKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      const text = textEl.textContent;
      const offset = sel.focusOffset;
      dispatch('split', { index, before: text.slice(0, offset).trim(), after: text.slice(offset).trim() });
    } else if (e.key === 'Backspace' && textEl.textContent.trim() === '') {
      e.preventDefault();
      dispatch('delete', { index });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      dispatch('navigate', { direction: 1, index });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      dispatch('navigate', { direction: -1, index });
    }
  }

  function handleBlur() {
    const newText = textEl.textContent.trim();
    if (newText !== item.text) {
      dispatch('edit', { index, text: newText });
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
  <span class="link-btn" class:has-link={item.url} on:click={() => dispatch('link', { index })}>&#128279;</span>
  <span class="del-btn" on:click={() => dispatch('delete', { index })}>&#215;</span>
</div>

<!-- styles in global app.css -->
