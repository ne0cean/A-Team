<script>
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let url = '';
  export let x = 0;
  export let y = 0;

  const dispatch = createEventDispatcher();

  function save() { dispatch('save', { url }); open = false; }
  function remove() { dispatch('remove'); open = false; }
  function close() { dispatch('close'); open = false; }
</script>

{#if open}
  <div class="link-backdrop" on:click={close}></div>
  <div class="link-popup" style="left:{x}px;top:{y}px">
    <input type="text" bind:value={url} placeholder="https://..."
      on:keydown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close(); }}>
    <div class="link-popup-btns">
      <button class="btn-save" on:click={save}>Save</button>
      <button class="btn-remove" on:click={remove}>Remove</button>
      <button class="btn-cancel" on:click={close}>Cancel</button>
    </div>
  </div>
{/if}

<!-- styles in global app.css -->
