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
  <div class="link-popup" style="left:{x}px;top:{y}px">
    <input type="text" bind:value={url} placeholder="https://..."
      on:keydown={(e) => e.key === 'Enter' && save()}>
    <div class="link-popup-btns">
      <button class="btn-save" on:click={save}>Save</button>
      <button class="btn-remove" on:click={remove}>Remove</button>
      <button class="btn-cancel" on:click={close}>Cancel</button>
    </div>
  </div>
{/if}

<style>
  .link-popup { position: fixed; z-index: 200; background: #161b22; border: 1px solid #f0c040; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
  .link-popup input { background: #0d1117; border: 1px solid #30363d; color: #e0e0e0; font-size: 12px; padding: 4px 8px; border-radius: 3px; width: 260px; }
  .link-popup input:focus { outline: 1px solid #f0c040; }
  .link-popup-btns { display: flex; gap: 4px; justify-content: flex-end; }
  .link-popup-btns button { padding: 3px 10px; border-radius: 3px; border: none; cursor: pointer; font-size: 11px; }
  .btn-save { background: #238636; color: #fff; }
  .btn-remove { background: #da3633; color: #fff; }
  .btn-cancel { background: #21262d; color: #c9d1d9; }
</style>
