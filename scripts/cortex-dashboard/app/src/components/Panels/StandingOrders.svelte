<script>
  import { standingData, ym, currentMonth } from '../../lib/stores.js';
  import * as api from '../../lib/api.js';

  let activeTab = 'standing';

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  async function save() {
    // Safety: never save empty standing orders
    const size = JSON.stringify($standingData).length;
    if (size < 50) { console.warn('save blocked: standingData too small', size); return; }
    const res = await api.saveStandingOrders($standingData);
    if (res?._version) {
      standingData.mutate(s => { s._version = res._version; });
    }
  }

  // Standing
  function toggleActive(i) { standingData.mutate(s => { s.standing[i].active = !s.standing[i].active; }); save(); }
  function editText(i, text) { if (text.trim()) { standingData.mutate(s => { s.standing[i].text = text.trim(); }); save(); } }
  function delSO(i) { standingData.mutate(s => { s.standing.splice(i, 1); }); save(); }
  function addSO(text) { if (!text?.trim()) return; standingData.mutate(s => { s.standing.push({ id: `so-${Date.now()}`, text: text.trim(), active: true }); }); save(); }

  // Parse date from various formats: "6.1", "6/2", "6월 2", "6-2", "6 2"
  function parseDate(input) {
    if (!input || !input.trim()) return null;
    const s = input.trim();
    const m = s.match(/^(\d{1,2})\s*[\.\/\-월\s]\s*(\d{1,2})일?$/);
    if (m) return { month: +m[1], day: +m[2] };
    // Single number = day of current month
    if (/^\d{1,2}$/.test(s)) {
      const now = new Date();
      return { month: now.getMonth() + 1, day: +s };
    }
    return null;
  }

  function formatDate(s) {
    if (!s?.date_month) return '';
    return `${s.date_month}/${s.date_day || ''}`;
  }

  function editSODate(i, input) {
    const parsed = parseDate(input);
    standingData.mutate(s => {
      if (parsed) {
        s.standing[i].date_month = parsed.month;
        s.standing[i].date_day = parsed.day;
      } else {
        delete s.standing[i].date_month;
        delete s.standing[i].date_day;
      }
    });
    save();
  }

  // Weekly
  function editWeeklyDow(i, dow) { standingData.mutate(s => { s.weekly_recurring[i].dow = +dow; }); save(); }
  function editWeeklyFreq(i, freq) { standingData.mutate(s => { s.weekly_recurring[i].freq = freq; }); save(); }
  function editWeeklyText(i, text) { if (text.trim()) { standingData.mutate(s => { s.weekly_recurring[i].text = text.trim(); }); save(); } }
  function delWeekly(i) { standingData.mutate(s => { s.weekly_recurring.splice(i, 1); }); save(); }
  let newWkDow = 1, newWkFreq = 'weekly';
  function addWeekly(text) {
    if (!text?.trim()) return;
    standingData.mutate(s => {
      if (!s.weekly_recurring) s.weekly_recurring = [];
      s.weekly_recurring.push({ dow: newWkDow, freq: newWkFreq, text: text.trim() });
    });
    save();
  }

  // Monthly recurring
  function editMR(i, field, val) { standingData.mutate(s => { s.monthly_recurring[i][field] = field === 'text' ? val.trim() : +val; }); save(); }
  function delMR(i) { standingData.mutate(s => { s.monthly_recurring.splice(i, 1); }); save(); }
  let newMRDay = 0;
  function addMR(text) {
    if (!text?.trim()) return;
    standingData.mutate(s => {
      if (!s.monthly_recurring) s.monthly_recurring = [];
      s.monthly_recurring.push({ day: newMRDay, text: text.trim() });
    });
    save();
  }

  // This-month items
  function editMonthlyItem(i, text) { standingData.mutate(s => { s.monthly[$ym][i] = text.trim(); }); save(); }
  function delMonthlyItem(i) { standingData.mutate(s => { s.monthly[$ym].splice(i, 1); }); save(); }
  function addMonthlyItem(text) {
    if (!text?.trim()) return;
    standingData.mutate(s => {
      if (!s.monthly[$ym]) s.monthly[$ym] = [];
      s.monthly[$ym].push(text.trim());
    });
    save();
  }

  // Yearly
  function editYearlyMonth(i, m) { standingData.mutate(s => { s.yearly[i].month = +m; }); save(); }
  function editYearlyDay(i, d) { standingData.mutate(s => { s.yearly[i].day = +d; }); save(); }
  function editYearlyText(i, text) { if (text.trim()) { standingData.mutate(s => { s.yearly[i].text = text.trim(); }); save(); } }
  function delYearly(i) { standingData.mutate(s => { s.yearly.splice(i, 1); }); save(); }
  let newYearlyMonth = 1, newYearlyDay = 0;
  function addYearly(text, isTemp = false) {
    if (!text?.trim()) return;
    const item = { month: newYearlyMonth, day: newYearlyDay, text: text.trim() };
    if (isTemp) item.temp = true;
    standingData.mutate(s => { s.yearly.push(item); });
    save();
  }

  $: yearlyTemps = ($standingData?.yearly || []).map((y, i) => ({...y, _idx: i})).filter(y => y.temp);
  $: yearlyPerms = ($standingData?.yearly || []).map((y, i) => ({...y, _idx: i})).filter(y => !y.temp);

  function moveItem(section, idx, dir) {
    standingData.mutate(s => {
      let arr;
      if (section === 'standing') arr = s.standing;
      else if (section === 'weekly_recurring') arr = s.weekly_recurring;
      else if (section === 'monthly_recurring') arr = s.monthly_recurring;
      else if (section === 'monthly') arr = s.monthly[$ym] || [];
      else if (section === 'yearly') arr = s.yearly;
      else return;
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
    });
    save();
  }

  const DOW_NAMES = ['일','월','화','수','목','금','토'];

  function setText(node, text) {
    function render(text) {
      if (document.activeElement === node) return;
      node.textContent = '';
      if (!text) return;
      const re = /\[([^\]]+)\]\(([^)]+)\)/g;
      let last = 0, match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > last) node.appendChild(document.createTextNode(text.slice(last, match.index)));
        const a = document.createElement('a');
        const target = match[2];
        if (target.startsWith('http://') || target.startsWith('https://')) {
          a.href = target;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        } else {
          a.href = '#';
          a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open-cortex-file', { detail: target }));
          });
        }
        a.textContent = match[1];
        a.style.color = '#58a6ff';
        a.addEventListener('click', (e) => e.stopPropagation());
        node.appendChild(a);
        last = re.lastIndex;
      }
      if (last === 0) node.textContent = text;
      else if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
    }
    render(text);
    return { update: render };
  }

  // Drag reorder
  let dragIdx = null;
  let dragSection = null;

  function onDragStart(section, idx, e) {
    dragIdx = idx;
    dragSection = section;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    e.currentTarget.classList.add('dragging');
  }
  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    dragIdx = null;
    dragSection = null;
  }
  function onDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }
  function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }
  function onDrop(section, toIdx, e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (dragSection !== section || dragIdx === null || dragIdx === toIdx) return;
    standingData.mutate(s => {
      let arr;
      if (section === 'standing') arr = s.standing;
      else if (section === 'weekly_recurring') arr = s.weekly_recurring;
      else if (section === 'monthly_recurring') arr = s.monthly_recurring;
      else if (section === 'yearly') arr = s.yearly;
      else return;
      const [item] = arr.splice(dragIdx, 1);
      arr.splice(toIdx, 0, item);
    });
    save();
    dragIdx = null;
  }

  // Alt+Arrow key reorder
  function onItemKey(section, idx, e) {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); moveItem(section, idx, -1); focusItem(e.currentTarget.parentElement, idx - 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveItem(section, idx, 1); focusItem(e.currentTarget.parentElement, idx + 1); }
  }
  function focusItem(container, idx) {
    if (!container) return;
    requestAnimationFrame(() => {
      const items = container.querySelectorAll('.so-item');
      items[idx]?.focus();
    });
  }
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
      <div class="so-item" tabindex="0" draggable="true"
        on:dragstart={(e) => onDragStart('standing', i, e)}
        on:dragend={onDragEnd}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={(e) => onDrop('standing', i, e)}
        on:keydown={(e) => onItemKey('standing', i, e)}>
        <div class="so-move drag-handle">⠿</div>
        <input type="checkbox" checked={s.active} on:change={() => toggleActive(i)}>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editText(i, e.target.textContent)} use:setText={s.text}></span>
        <input class="so-date" type="text" placeholder="날짜"
          value={formatDate(s)}
          on:blur={(e) => editSODate(i, e.target.value)}
          on:keydown={(e) => e.key === 'Enter' && e.target.blur()}>
        <span class="del" on:click={() => delSO(i)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <input placeholder="Add standing order..." on:keydown={(e) => { if (e.key === 'Enter') { addSO(e.target.value); e.target.value = ''; } }}>
    </div>
  {:else if activeTab === 'weekly'}
    {#each $standingData.weekly_recurring || [] as w, i}
      <div class="so-item" tabindex="0" draggable="true"
        on:dragstart={(e) => onDragStart('weekly_recurring', i, e)}
        on:dragend={onDragEnd}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={(e) => onDrop('weekly_recurring', i, e)}
        on:keydown={(e) => onItemKey('weekly_recurring', i, e)}>
        <div class="so-move drag-handle">⠿</div>
        <select value={w.dow} on:change={(e) => editWeeklyDow(i, e.target.value)}>
          {#each DOW_NAMES as n, di}<option value={di}>{n}</option>{/each}
        </select>
        <select value={w.freq} on:change={(e) => editWeeklyFreq(i, e.target.value)}>
          <option value="weekly">매주</option><option value="biweekly">격주</option>
        </select>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editWeeklyText(i, e.target.textContent)} use:setText={w.text}></span>
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
        <div class="so-item" tabindex="0" draggable="true"
          on:dragstart={(e) => onDragStart('monthly_recurring', i, e)}
          on:dragend={onDragEnd}
          on:dragover={onDragOver}
          on:dragleave={onDragLeave}
          on:drop={(e) => onDrop('monthly_recurring', i, e)}
          on:keydown={(e) => onItemKey('monthly_recurring', i, e)}>
          <div class="so-move drag-handle">⠿</div>
          <select value={m.day} on:change={(e) => editMR(i, 'day', e.target.value)}>
            <option value={0}>말일</option>
            {#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}일</option>{/each}
          </select>
          <span contenteditable="true" style="flex:1" on:blur={(e) => editMR(i, 'text', e.target.textContent)} use:setText={m.text}></span>
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
        <span contenteditable="true" style="flex:1" on:blur={(e) => editMonthlyItem(i, e.target.textContent)} use:setText={typeof item === 'string' ? item : item.text}></span>
        <span class="del" on:click={() => delMonthlyItem(i)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <input placeholder="Add this-month item..." on:keydown={(e) => { if (e.key === 'Enter') { addMonthlyItem(e.target.value); e.target.value = ''; } }}>
    </div>
  {:else if activeTab === 'yearly'}
    <div class="section-title" style="color:#f0c040">TEMP (올해만)</div>
    {#each yearlyTemps as y}
      <div class="so-item" class:current-month={y.month === $currentMonth} tabindex="0" draggable="true"
        on:dragstart={(e) => onDragStart('yearly', y._idx, e)}
        on:dragend={onDragEnd}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={(e) => onDrop('yearly', y._idx, e)}
        on:keydown={(e) => onItemKey('yearly', y._idx, e)}>
        <div class="so-move drag-handle">⠿</div>
        <select value={y.month} on:change={(e) => editYearlyMonth(y._idx, e.target.value)}>
          {#each Array.from({length:12}, (_,m) => m+1) as mm}<option value={mm}>{mm}월</option>{/each}
        </select>
        <select value={y.day || 0} on:change={(e) => editYearlyDay(y._idx, e.target.value)}>
          <option value={0}>-</option>
          {#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}</option>{/each}
        </select>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editYearlyText(y._idx, e.target.textContent)} use:setText={y.text}></span>
        <span class="del" on:click={() => delYearly(y._idx)}>×</span>
      </div>
    {/each}
    <div class="add-row">
      <select bind:value={newYearlyMonth}>{#each Array.from({length:12}, (_,m) => m+1) as mm}<option value={mm}>{mm}월</option>{/each}</select>
      <select bind:value={newYearlyDay}><option value={0}>-</option>{#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}</option>{/each}</select>
      <input placeholder="Add temp..." on:keydown={(e) => { if (e.key === 'Enter') { addYearly(e.target.value, true); e.target.value = ''; } }}>
    </div>

    <div class="section-title" style="color:#8b949e;margin-top:12px">YEARLY (매년 반복)</div>
    {#each yearlyPerms as y}
      <div class="so-item" class:current-month={y.month === $currentMonth} tabindex="0" draggable="true"
        on:dragstart={(e) => onDragStart('yearly', y._idx, e)}
        on:dragend={onDragEnd}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={(e) => onDrop('yearly', y._idx, e)}
        on:keydown={(e) => onItemKey('yearly', y._idx, e)}>
        <div class="so-move drag-handle">⠿</div>
        <select value={y.month} on:change={(e) => editYearlyMonth(y._idx, e.target.value)}>
          {#each Array.from({length:12}, (_,m) => m+1) as mm}<option value={mm}>{mm}월</option>{/each}
        </select>
        <select value={y.day || 0} on:change={(e) => editYearlyDay(y._idx, e.target.value)}>
          <option value={0}>-</option>
          {#each Array.from({length:31}, (_,d) => d+1) as dd}<option value={dd}>{dd}</option>{/each}
        </select>
        <span contenteditable="true" style="flex:1" on:blur={(e) => editYearlyText(y._idx, e.target.textContent)} use:setText={y.text}></span>
        <span class="del" on:click={() => delYearly(y._idx)}>×</span>
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
