<script>
  import { searchOpen, monthData, ym, activeNote, CATS, CAT_NAMES } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let onGoToDay;
  export let onGoToResult;
  export let onOpenNote;

  let query = '';
  let pageResults = [];
  let globalResults = null;
  let globalLoading = false;
  let searchTimer;

  function close() { $searchOpen = false; query = ''; pageResults = []; globalResults = null; }

  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function searchPage(q) {
    const results = [];
    const ql = q.toLowerCase();
    if ($activeNote) {
      $activeNote.content.split('\n').forEach((line, i) => {
        if (line.toLowerCase().includes(ql)) results.push({ type: 'note-line', line: i + 1, text: line.trim().slice(0, 80) });
      });
    } else if ($monthData?.days) {
      for (const [day, dd] of Object.entries($monthData.days)) {
        if (dd.one_thing?.toLowerCase().includes(ql)) results.push({ day, field: 'ONE THING', text: dd.one_thing });
        if (dd.notes?.toLowerCase().includes(ql)) results.push({ day, field: 'notes', text: dd.notes });
        for (const cat of CATS) {
          for (const item of (dd[cat] || [])) {
            if (item.text?.toLowerCase().includes(ql)) results.push({ day, field: CAT_NAMES[cat], text: item.text });
          }
        }
      }
    }
    return results;
  }

  function highlight(text, q) {
    return esc(text).replace(new RegExp(escRegex(q), 'gi'), '<mark>$&</mark>');
  }

  async function doSearch() {
    if (!query || query.length < 2) { pageResults = []; globalResults = null; return; }
    pageResults = searchPage(query);
    globalLoading = true;
    try {
      const data = await api.searchUnified(query);
      globalResults = data;
    } catch {
      globalResults = { error: true };
    }
    globalLoading = false;
  }

  function debounce() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 300);
  }

  function clickResult(r) {
    close();
    if (r.day) onGoToDay(+r.day);
  }

  function clickGlobalSchedule(r) {
    close();
    onGoToResult(r.ym, r.day);
  }

  function clickGlobalNote(r) {
    close();
    onOpenNote(r.path);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }
</script>

{#if $searchOpen}
  <div class="search-overlay" on:click|self={close} on:keydown={onKeydown}>
    <div class="search-box">
      <input type="text" bind:value={query} on:input={debounce}
        placeholder="Search schedule & notes..." autofocus>
    </div>
    <div class="search-results">
      {#if pageResults.length > 0}
        <div class="section-label green">
          {$activeNote ? 'THIS NOTE' : `THIS MONTH (${$ym})`} ({pageResults.length})
        </div>
        {#each pageResults.slice(0, 15) as r}
          <div class="search-result" on:click={() => clickResult(r)}>
            {#if r.type === 'note-line'}
              <span class="sr-cat">L{r.line}</span> {@html highlight(r.text, query)}
            {:else}
              <div class="sr-date">{r.day}일 <span class="sr-cat">{r.field}</span></div>
              {@html highlight(r.text, query)}
            {/if}
          </div>
        {/each}
      {/if}

      {#if globalLoading}
        <div class="loading">Searching all...</div>
      {:else if globalResults?.error}
        <div class="error-msg">Global search failed</div>
      {:else if globalResults}
        {#if globalResults.schedule?.length}
          <div class="section-label gold">ALL SCHEDULE ({globalResults.schedule.length})</div>
          {#each globalResults.schedule.slice(0, 20) as r}
            <div class="search-result" on:click={() => clickGlobalSchedule(r)}>
              <div class="sr-date">{r.ym} / {r.day}일</div>
              {#each r.matches as m}
                <div class="sr-match"><span class="sr-cat">{m.field}</span> {@html highlight(m.text, query)}</div>
              {/each}
            </div>
          {/each}
        {/if}
        {#if globalResults.notes?.length}
          <div class="section-label blue">NOTES ({globalResults.notes.length})</div>
          {#each globalResults.notes.slice(0, 20) as r}
            <div class="search-result" on:click={() => clickGlobalNote(r)}>
              <span>{r.type === 'dir' ? '📁' : '📄'}</span>
              <span>{r.name}</span>
              <span class="sr-path">{r.path}</span>
            </div>
          {/each}
        {/if}
        {#if !globalResults.schedule?.length && !globalResults.notes?.length && !pageResults.length}
          <div class="loading">No results</div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<!-- styles in global app.css -->
