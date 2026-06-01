<script>
  import { sidebarOpen, cortexPath, activeNote, noteEditing } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  let items = [];
  let searchQuery = '';

  $: loadTree($cortexPath);

  async function loadTree(path) {
    const data = await api.loadTree(path || 'cortex');
    if (!data) return;
    items = data
      .filter(i => !i.name.startsWith('.'))
      .sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });
  }

  function navigate(path) {
    $cortexPath = path;
    history.pushState({ cortexPath: path }, '', '');
  }

  function goUp() {
    const parent = $cortexPath.split('/').slice(0, -1).join('/') || 'cortex';
    navigate(parent);
  }

  async function openFile(path) {
    const data = await api.loadFile(path);
    if (data) {
      $activeNote = data;
      $noteEditing = false;
      // Close sidebar on mobile
      if (window.screen.width < 900) $sidebarOpen = false;
    }
  }

  async function searchNotes() {
    if (!searchQuery || searchQuery.length < 2) return;
    const results = await api.searchCortex(searchQuery);
    if (results) items = results.map(r => ({ ...r, name: r.name, path: r.path, type: r.type || 'file' }));
  }

  async function createNote() {
    const name = prompt('Note name (without .md):');
    if (!name?.trim()) return;
    const fileName = name.trim().replace(/\s+/g, '-') + '.md';
    const filePath = $cortexPath + '/' + fileName;
    const content = `# ${name.trim()}\n\n`;
    const res = await api.saveFile(filePath, content);
    if (res?.ok) {
      $activeNote = { path: filePath, name: fileName, content, sha: res.sha };
      $noteEditing = true;
      loadTree($cortexPath);
    }
  }

  function close() { $sidebarOpen = false; }

  // Browser back
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', (e) => {
      if (e.state?.cortexPath) $cortexPath = e.state.cortexPath;
    });
  }
</script>

<div class="sidebar" class:open={$sidebarOpen}>
  <div class="sidebar-header">
    <span class="title">Cortex</span>
    <span class="actions">
      <span class="btn" on:click={createNote} title="New note">+</span>
      <span class="btn close" on:click={close}>&#10005;</span>
    </span>
  </div>

  <input
    class="tree-search"
    bind:value={searchQuery}
    placeholder="Search notes..."
    on:keydown={(e) => e.key === 'Enter' && searchNotes()}
  >

  <div class="tree">
    {#if $cortexPath !== 'cortex'}
      <div class="tree-item" on:click={goUp}>
        <span class="icon">&#11014;</span>
        <span class="name">..</span>
      </div>
    {/if}

    <div class="breadcrumb">
      {#each $cortexPath.split('/') as part, i}
        <span on:click={() => navigate($cortexPath.split('/').slice(0, i + 1).join('/'))}>{part}</span>
        {#if i < $cortexPath.split('/').length - 1} / {/if}
      {/each}
    </div>

    {#each items as item}
      <div
        class="tree-item"
        class:active={$activeNote?.name === item.name}
        on:click={() => item.type === 'dir' ? navigate(item.path) : openFile(item.path)}
      >
        <span class="icon">{item.type === 'dir' ? '📁' : '📄'}</span>
        <span class="name">{item.name}</span>
      </div>
    {/each}

    {#if items.length === 0}
      <div class="empty">No files</div>
    {/if}
  </div>
</div>

<!-- Mobile overlay -->
{#if $sidebarOpen}
  <div class="overlay" on:click={close}></div>
{/if}

<!-- styles in global app.css -->
