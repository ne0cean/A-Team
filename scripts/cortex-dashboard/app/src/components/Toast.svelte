<script>
  import { onMount } from 'svelte';
  import { setToast } from '../lib/api.js';

  let message = '';
  let isError = false;
  let visible = false;
  let timer;

  function show(msg, error = false, duration = 2200) {
    message = msg;
    isError = error;
    visible = true;
    clearTimeout(timer);
    timer = setTimeout(() => visible = false, duration);
  }

  onMount(() => setToast(show));

  export { show };
</script>

<div class="toast" class:error={isError} class:show={visible}>
  {message}
</div>

<!-- styles in global app.css -->
