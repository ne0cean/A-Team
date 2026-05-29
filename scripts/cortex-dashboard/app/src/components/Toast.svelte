<script>
  import { onMount } from 'svelte';
  import { setToast } from '../lib/api.js';

  let message = '';
  let isError = false;
  let visible = false;
  let timer;

  function show(msg, error = false) {
    message = msg;
    isError = error;
    visible = true;
    clearTimeout(timer);
    timer = setTimeout(() => visible = false, 2200);
  }

  onMount(() => setToast(show));

  export { show };
</script>

<div class="toast" class:error={isError} class:show={visible}>
  {message}
</div>

<style>
  .toast {
    position: fixed;
    bottom: calc(52px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%) translateY(8px);
    background: #238636;
    color: #fff;
    font-size: 12px;
    padding: 7px 16px;
    border-radius: 6px;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s, transform 0.15s;
    white-space: nowrap;
  }
  .toast.error { background: #da3633; }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
