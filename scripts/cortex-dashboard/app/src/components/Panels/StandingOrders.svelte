<script>
  import { standingData, ym, currentMonth } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  let activeTab = 'standing';

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  async function save() {
    // Safety: never save empty standing orders
    const size = JSON.stringify($standingData).length;
    if (size < 50) { console.warn('save blocked: standingData too small', size); return; }
    await api.saveStandingOrders($standingData);
  }

  // Standing
  function toggleActive(i) { $standingData.standing[i].active = !$standingData.standing[i].active; save(); $standingData = $standingData; }
  function editText(i, text) { if (text.trim()) { $standingData.standing[i].text = text.trim(); save(); } }
  function delSO(i) { $standingData.standing.splice(i, 1); save(); $standingData = $standingData; }
  function addSO(text) { if (!text?.trim()) return; $standingData.standing.push({ id: `so-${Date.now()}`, text: text.trim(), active: true }); save(); $standingData = $standingData; }

  // Weekly
  function editWeeklyDow(i, dow) { $standingData.weekly_recurring[i].dow = +dow; save(); }
  function editWeeklyFreq(i, freq) { $standingData.weekly_recurring[i].freq = freq; save(); }
  function editWeeklyText(i, text) { if (text.trim()) { $standingData.weekly_recurring[i].text = text.trim(); save(); } }
  function delWeekly(i) { $standingData.weekly_recurring.splice(i, 1); save(); $standingData = $standingData; }
  let newWkDow = 1, newWkFreq = 'weekly';
  function addWeekly(text) {
    if (!text?.trim()) return;
    if (!$standingData.weekly_recurring) $standingData.weekly_recurring = [];
    $standingData.weekly_recurring.push({ dow: newWkDow, freq: newWkFreq, text: text.trim() });
    save(); $standingData = $standingData;
  }

  // Monthly recurring
  function editMR(i, field, val) { $standingData.monthly_recurring[i][field] = field === 'text' ? val.trim() : +val; save(); }
  function delMR(i) { $standingData.monthly_recurring.splice(i, 1); save(); $standingData = $standingData; }
  let newMRDay = 0;
  function addMR(text) {
    if (!text?.trim()) return;
    if (!$standingData.monthly_recurring) $standingData.monthly_recurring = [];
    $standingData.monthly_recurring.push({ day: newMRDay, text: text.trim() });
    save(); $standingData = $standingData;
  }

  // This-month items
  function editMonthlyItem(i, text) { $standingData.monthly[$ym][i] = text.trim(); save(); }
  function delMonthlyItem(i) { $standingData.monthly[$ym].splice(i, 1); save(); $standingData = $standingData; }
  function addMonthlyItem(text) {
    if (!text?.trim()) return;
    if (!$standingData.monthly[$ym]) $standingData.monthly[$ym] = [];
    $standingData.monthly[$ym].push(text.trim());
    save(); $standingData = $standingData;
  }

  // Yearly
  function editYearlyMonth(i, m) { $standingData.yearly[i].month = +m; save(); }
  function editYearlyDay(i, d) { $standingData.yearly[i].day = +d; save(); }
  function editYearlyText(i, text) { if (text.trim()) { $standingData.yearly[i].text = text.trim(); save(); } }
  function delYearly(i) { $standingData.yearly.splice(i, 1); save(); $standingData = $standingData; }
  let newYearlyMonth = 1, newYearlyDay = 0;
  function addYearly(text) {
    if (!text?.trim()) return;
    $standingData.yearly.push({ month: newYearlyMonth, day: newYearlyDay, text: text.trim() });
    save(); $standingData = $standingData;
  }

  function moveItem(section, idx, dir) {
    let arr;
    if (section === 'standing') arr = $standingData.standing;
    else if (section === 'weekly_recurring') arr = $standingData.weekly_recurring;
    else if (section === 'monthly_recurring') arr = $standingData.monthly_recurring;
    else if (section === 'monthly') arr = $standingData.monthly[$ym] || [];
    else if (section === 'yearly') arr = $standingData.yearly;
    else return;
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    save(); $standingData = $standingData;
  }

  const DOW_NAMES = ['일','월','화','수','목','금','토'];
</script>

{#if $standingData}
<div class="so-panel">
  <div class="tabs">
    {#each ['standing','weekly','monthly','yearly'] as tab}
      <div class="tab" class:active={activeTab === tab} on:click={() => activeTab = tab}>
        {tab === 'standing' ? 'Standing' : tab === 'weekly' ? 'Weekly' : tab === 'monthly' ? 'Monthly' : 'Yearly'}
      </div>
    {/each}
  </div>

  {#if activeTab === 'standing'}
    {#each $standingData.standing || [] as s, i}
      <div class="so-item">
        <div class="so-move">
          <span on:click={() => moveItem('standing', i, -1)} class:hidden={i === 0}>▲</span>
          <span on:click={() => moveItem('standing', i, 1)} class:hidden={i === ($standingData.standing || []).length - 1}>▼</span>
        </div>
        <input type="checkbox" checked={s.active} on:change={() => toggleActive(i)}>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editText(i, e.target.textContent)}>{s.text}</span>
        <span class="del" on:click={() => delSO(i)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <input placeholder="Add standing order..." on:keydown={(e) => { if (e.key === 'Enter') { addSO(e.target.value); e.target.value = ''; } }}>
    </div>
  {:else if activeTab === 'weekly'}
    {#each $standingData.weekly_recurring || [] as w, i}
      <div class="so-item">
        <div class="so-move">
          <span on:click={() => moveItem('weekly_recurring', i, -1)} class:hidden={i === 0}>▲</span>
          <span on:click={() => moveItem('weekly_recurring', i, 1)} class:hidden={i === ($standingData.weekly_recurring || []).length - 1}>▼</span>
        </div>
        <select value={w.dow} on:change={(e) => editWeeklyDow(i, e.target.value)}>
          {#each DOW_NAMES as n, di}<option value={di}>{n}</option>{/each}
        </select>
        <select value={w.freq} on:change={(e) => editWeeklyFreq(i, e.target.value)}>
          <option value="weekly">매주</option><option value="biweekly">격주</option>
        </select>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editWeeklyText(i, e.target.textContent)}>{w.text}</span>
        <span class="del" on:click={() => delWeekly(i)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <select bind:value={newWkDow}>{#each DOW_NAMES as n, i}<option value={i}>{n}</option>{/each}</select>
      <select bind:value={newWkFreq}><option value="weekly">매주</option><option value="biweekly">격주</option></select>
      <input placeholder="Add weekly..." on:keydown={(e) => { if (e.key === 'Enter') { addWeekly(e.target.value); e.target.value = ''; } }}>
    </div>
  {:else if activeTab === 'monthly'}
    {#if ($standingData.monthly_recurring || []).length > 0}
      <div class="section-title">MONTHLY RECURRING</div>
      {#each $standingData.monthly_recurring as m, i}
        <div class="so-item">
          <div class="so-move">
            <span on:click={() => moveItem('monthly_recurring', i, -1)} class:hidden={i === 0}>▲</span>
            <span on:click={() => moveItem('monthly_recurring', i, 1)} class:hidden={i === $standingData.monthly_recurring.length - 1}>▼</span>
          </div>
          <select value={m.day} on:change={(e) => editMR(i, 'day', e.target.value)}>
            <option value={0}>말일</option>
            {#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}일</option>{/each}
          </select>
          <span contenteditable="true" style="flex:1" on:blur={(e) => editMR(i, 'text', e.target.textContent)}>{m.text}</span>
          <span class="del" on:click={() => delMR(i)}>×</span>
        </div>
      {/each}
      <div class="add-row">
        <select bind:value={newMRDay}>
          <option value={0}>말일</option>
          {#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}일</option>{/each}
        </select>
        <input placeholder="Add monthly recurring..." on:keydown={(e) => { if (e.key === 'Enter') { addMR(e.target.value); e.target.value = ''; } }}>
      </div>
    {/if}
    <div class="section-title">{$ym} ONLY</div>
    {#each $standingData.monthly?.[$ym] || [] as item, i}
      <div class="so-item">
        <span contenteditable="true" style="flex:1" on:blur={(e) => editMonthlyItem(i, e.target.textContent)}>{typeof item === 'string' ? item : item.text}</span>
        <span class="del" on:click={() => delMonthlyItem(i)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <input placeholder="Add this-month item..." on:keydown={(e) => { if (e.key === 'Enter') { addMonthlyItem(e.target.value); e.target.value = ''; } }}>
    </div>
  {:else if activeTab === 'yearly'}
    {#each $standingData.yearly || [] as y, i}
      <div class="so-item" class:current-month={y.month === $currentMonth}>
        <div class="so-move">
          <span on:click={() => moveItem('yearly', i, -1)} class:hidden={i === 0}>▲</span>
          <span on:click={() => moveItem('yearly', i, 1)} class:hidden={i === ($standingData.yearly || []).length - 1}>▼</span>
        </div>
        <select value={y.month} on:change={(e) => editYearlyMonth(i, e.target.value)}>
          {#each Array.from({length:12}, (_,m) => m+1) as mm}<option value={mm}>{mm}월</option>{/each}
        </select>
        <select value={y.day || 0} on:change={(e) => editYearlyDay(i, e.target.value)}>
          <option value={0}>-</option>
          {#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}</option>{/each}
        </select>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editYearlyText(i, e.target.textContent)}>{y.text}</span>
        <span class="del" on:click={() => delYearly(i)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <select bind:value={newYearlyMonth}>{#each Array.from({length:12}, (_,m) => m+1) as mm}<option value={mm}>{mm}월</option>{/each}</select>
      <select bind:value={newYearlyDay}><option value={0}>-</option>{#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}</option>{/each}</select>
      <input placeholder="Add yearly..." on:keydown={(e) => { if (e.key === 'Enter') { addYearly(e.target.value); e.target.value = ''; } }}>
    </div>
  {/if}
</div>
{/if}

<!-- styles in global app.css -->
