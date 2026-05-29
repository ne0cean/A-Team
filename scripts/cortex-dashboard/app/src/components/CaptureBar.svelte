<script>
  import { ym } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  let input = '';
  let loading = false;

  const aliases = {
    r:'ritual',i:'input',w:'work',o:'outcome',
    ritual:'ritual',input:'input',work:'work',outcome:'outcome',
    '리추얼':'ritual','인풋':'input','워크':'work','아웃컴':'outcome','업무':'work','결과':'outcome'
  };

  async function submit() {
    if (!input.trim() || loading) return;
    loading = true;

    // Try schedule shorthand
    const match = input.match(/^(?:(\d{1,2})\/)?(\d{1,2})\s+(\S+)\s+(.+)$/);
    if (match) {
      const cat = aliases[match[3].toLowerCase()];
      if (cat) {
        const month = match[1] ? parseInt(match[1]) : new Date().getMonth() + 1;
        const day = parseInt(match[2]);
        const ymStr = `${new Date().getFullYear()}-${String(month).padStart(2,'0')}`;
        const res = await api.addItem(ymStr, String(day), cat, match[4].trim());
        if (res?.ok) { input = ''; loading = false; return; }
      }
    }

    // Save as inbox note
    const ts = new Date().toISOString().slice(0,10);
    const slug = input.slice(0,30).replace(/[^a-zA-Z0-9가-힣]/g,'-').replace(/-+/g,'-');
    const filePath = `cortex/inbox/${ts}-${slug}.md`;
    const md = `---\ncaptured: ${new Date().toISOString()}\nsource: dashboard\n---\n\n${input}`;
    await api.saveFile(filePath, md);
    input = '';
    loading = false;
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const res = await api.uploadFile(file.name, base64);
      if (res?.ok) input += (input ? ' ' : '') + res.markdown;
    };
    reader.readAsDataURL(file);
  }
</script>

<div class="capture-bar">
  <input
    type="text"
    bind:value={input}
    placeholder="Quick memo... or '28 w meeting'"
    on:keydown={(e) => e.key === 'Enter' && submit()}
  >
  <label class="photo-btn">
    &#128247;
    <input type="file" accept="image/*" style="display:none" on:change={handleFile}>
  </label>
  <button class:loading on:click={submit}>
    {loading ? '...' : '▶'}
  </button>
</div>

<!-- styles in global app.css -->
