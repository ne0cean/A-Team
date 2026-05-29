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

<style>
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
    background: #0d1117; border-right: 1px solid #21262d; z-index: 60;
    transform: translateX(-100%); transition: transform 0.2s ease;
    overflow-y: auto; display: flex; flex-direction: column;
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar.desktop-open { transform: translateX(0); }
  .sidebar-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px; border-bottom: 1px solid #21262d;
  }
  .title { font-size: 13px; font-weight: 700; color: #f0c040; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .btn { cursor: pointer; color: #484f58; font-size: 14px; padding: 4px; }
  .btn:hover { color: #c9d1d9; }
  .actions .btn:first-child { color: #56d364; font-size: 16px; }
  .tree-search {
    margin: 8px; width: calc(100% - 16px);
    background: #0d1117; border: 1px solid #30363d; color: #e0e0e0;
    font-size: 11px; padding: 4px 8px; border-radius: 4px;
  }
  .tree-search:focus { outline: 1px solid #f0c040; }
  .tree { flex: 1; overflow-y: auto; padding: 0 4px 8px; }
  .tree-item {
    display: flex; align-items: center; gap: 4px; padding: 3px 4px;
    font-size: 11px; cursor: pointer; border-radius: 3px; color: #c9d1d9;
  }
  .tree-item:hover { background: #21262d; }
  .tree-item.active { background: #1c3050; color: #58a6ff; }
  .icon { font-size: 10px; width: 14px; text-align: center; flex-shrink: 0; }
  .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .breadcrumb { font-size: 10px; color: #6e7681; margin-bottom: 4px; padding: 0 4px; }
  .breadcrumb span { cursor: pointer; }
  .breadcrumb span:hover { color: #58a6ff; }
  .empty { color: #484f58; font-size: 10px; padding: 8px; }
  .overlay {
    display: block; position: fixed; inset: 0;
    background: rgba(0,0,0,0.5); z-index: 55;
  }

  @media (min-width: 900px) {
    .overlay { display: none !important; }
  }
</style>
