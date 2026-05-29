<script>
  import { activeNote, noteEditing } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let onBack;

  let editContent = '';

  $: if ($activeNote && $noteEditing) editContent = $activeNote.content;

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function renderMarkdown(md) {
    return esc(md)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^- (.+)$/gm, '&bull; $1')
      .replace(/\n/g, '<br>');
  }

  async function save() {
    if (!$activeNote) return;
    const res = await api.saveFile($activeNote.path, editContent, $activeNote.sha);
    if (res?.ok) {
      $activeNote = { ...$activeNote, content: editContent, sha: res.sha };
      $noteEditing = false;
    }
  }

  function startEdit() {
    editContent = $activeNote.content;
    $noteEditing = true;
  }

  function cancelEdit() {
    $noteEditing = false;
  }

  async function uploadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const res = await api.uploadFile(file.name, base64, file.type);
      if (res?.ok) {
        const textarea = document.getElementById('cortexEditArea');
        if (textarea) {
          const pos = textarea.selectionStart;
          editContent = editContent.slice(0, pos) + `\n${res.markdown}\n` + editContent.slice(pos);
        }
      }
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        uploadImage(item.getAsFile());
        return;
      }
    }
  }
</script>

{#if $activeNote}
  <div class="note-viewer">
    {#if $noteEditing}
      <div class="md-toolbar">
        <button on:click={onBack}>◀ Back</button>
        <span class="md-path">{$activeNote.path}</span>
        <label class="upload-btn">📷
          <input type="file" accept="image/*" style="display:none"
            on:change={(e) => uploadImage(e.target.files?.[0])}>
        </label>
        <button on:click={save}>Save</button>
        <button on:click={cancelEdit}>Cancel</button>
      </div>
      <textarea class="md-edit" id="cortexEditArea"
        bind:value={editContent}
        on:paste={handlePaste}></textarea>
    {:else}
      <div class="md-toolbar">
        <button on:click={onBack}>◀ Back</button>
        <span class="md-path">{$activeNote.path}</span>
        <button on:click={startEdit}>Edit</button>
      </div>
      <div class="md-content">{@html renderMarkdown($activeNote.content)}</div>
    {/if}
  </div>
{/if}

<style>
  .note-viewer { padding: 12px; }
  .md-toolbar { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
  .md-toolbar button { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; }
  .md-toolbar button:hover { background: #30363d; }
  .md-path { font-size: 10px; color: #6e7681; flex: 1; }
  .upload-btn { cursor: pointer; font-size: 10px; color: #58a6ff; padding: 3px 8px; }
  .md-edit { width: 100%; min-height: 300px; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; font-size: 12px; padding: 8px; border-radius: 4px; font-family: monospace; line-height: 1.6; resize: vertical; }
  .md-edit:focus { outline: 1px solid #f0c040; }
  .md-content { font-size: 12px; line-height: 1.7; color: #c9d1d9; white-space: pre-wrap; word-break: break-word; }
  :global(.md-content h1), :global(.md-content h2), :global(.md-content h3) { color: #f0c040; margin: 12px 0 6px; }
  :global(.md-content h1) { font-size: 16px; }
  :global(.md-content h2) { font-size: 14px; }
  :global(.md-content h3) { font-size: 12px; }
  :global(.md-content a) { color: #58a6ff; }
  :global(.md-content code) { background: #161b22; padding: 1px 4px; border-radius: 2px; font-size: 11px; }
  :global(.md-content hr) { border: none; border-top: 1px solid #21262d; margin: 8px 0; }
</style>
