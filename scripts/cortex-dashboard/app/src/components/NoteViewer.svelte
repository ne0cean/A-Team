<script>
  import { onMount, onDestroy } from 'svelte';
  import { activeNote, noteEditing } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let onBack;

  function handleMouseBack(e) { if (e.button === 3 || e.button === 4) { e.preventDefault(); onBack(); } }
  onMount(() => window.addEventListener('mouseup', handleMouseBack));
  onDestroy(() => window.removeEventListener('mouseup', handleMouseBack));

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
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
        const safe = /^https?:/.test(href) ? href : '#';
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      })
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

<!-- styles in global app.css -->
