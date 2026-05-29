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

<style>
  .item {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 2px 0;
    font-size: 11px;
    line-height: 1.5;
    position: relative;
  }
  .item input[type="checkbox"] {
    -webkit-appearance: none;
    appearance: none;
    margin-top: 2px;
    cursor: pointer;
    flex-shrink: 0;
    width: 11px;
    height: 11px;
    border: 1.5px solid #484f58;
    border-radius: 2px;
    background: transparent;
    position: relative;
  }
  .item input[type="checkbox"]:checked {
    background: #56d364;
    border-color: #56d364;
  }
  .item input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 2.5px;
    top: 0.5px;
    width: 3px;
    height: 6px;
    border: solid #0d1117;
    border-width: 0 1.5px 1.5px 0;
    transform: rotate(45deg);
  }
  .item.done .item-text { text-decoration: line-through; color: #484f58; }
  .item.carried .item-text::before { content: '↩ '; color: #f0c040; font-size: 9px; }
  .item-text {
    flex: 1;
    min-height: 14px;
    cursor: text;
    word-break: break-word;
    outline: none;
  }
  .item-text:focus { background: #161b22; border-radius: 2px; }
  .item-text a { color: #58a6ff; text-decoration: none; }
  .link-btn {
    color: #484f58;
    cursor: pointer;
    font-size: 8px;
    display: none;
    padding: 0 2px;
    position: absolute;
    right: 18px;
    top: 2px;
  }
  .link-btn.has-link { color: #58a6ff; display: inline; }
  .item:hover .link-btn, .item:focus-within .link-btn { display: inline; }
  .del-btn {
    color: #484f58;
    cursor: pointer;
    font-size: 10px;
    display: none;
    padding: 0 2px;
    position: absolute;
    right: 2px;
    top: 2px;
  }
  .item:hover .del-btn, .item:focus-within .del-btn { display: inline; }
  .del-btn:hover { color: #f85149; }
  .drag-over { border-top: 2px solid #f0c040; }
</style>
