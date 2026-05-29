<script>
  import DayCell from './DayCell.svelte';
  import { currentYear, currentMonth, monthData, prevMonthData, nextMonthData, DAY_NAMES } from '../lib/stores.js';

  export let onReload;
  export let onOpenLink;

  let showPastWeeks = false;

  $: daysInMonth = new Date($currentYear, $currentMonth, 0).getDate();
  $: prevDaysInMonth = new Date($currentYear, $currentMonth - 1, 0).getDate();
  $: firstDow = new Date($currentYear, $currentMonth - 1, 1).getDay();
  $: today = new Date();
  $: isCurrentMonth = today.getFullYear() === $currentYear && today.getMonth() + 1 === $currentMonth;
  $: todayDate = isCurrentMonth ? today.getDate() : -1;

  $: cells = buildCells(firstDow, daysInMonth, prevDaysInMonth);
  $: weeks = groupWeeks(cells);
  $: currentWeekIdx = isCurrentMonth
    ? weeks.findIndex(w => w.some(c => c.current && c.d === todayDate))
    : -1;
  $: pastWeeks = currentWeekIdx > 0 ? weeks.slice(0, currentWeekIdx) : [];
  $: visibleWeeks = currentWeekIdx > 0 ? weeks.slice(currentWeekIdx) : weeks;

  function buildCells(firstDow, dim, prevDim) {
    const c = [];
    for (let i = firstDow - 1; i >= 0; i--) c.push({ d: prevDim - i, current: false });
    for (let d = 1; d <= dim; d++) c.push({ d, current: true });
    while (c.length % 7 !== 0) c.push({ d: c.length - firstDow - dim + 1, current: false });
    return c;
  }

  function groupWeeks(cells) {
    const w = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return w;
  }
</script>

<div class="calendar">
  <!-- Day headers -->
  <div class="grid header-grid">
    {#each DAY_NAMES as name, i}
      <div class="day-header" class:sun={i === 0} class:sat={i === 6}>{name}</div>
    {/each}
  </div>

  <!-- Past weeks (collapsed) -->
  {#if pastWeeks.length > 0}
    {#if showPastWeeks}
      {#each pastWeeks as week}
        <div class="grid">
          {#each week as cell}
            <DayCell d={cell.d} isToday={cell.current && cell.d === todayDate}
              isCurrent={cell.current} on:reload={onReload} on:openlink={(e) => onOpenLink(e.detail)} />
          {/each}
        </div>
      {/each}
    {/if}
  {/if}

  <!-- Current + future weeks -->
  {#each visibleWeeks as week, wIdx}
    <div class="grid">
      {#each week as cell}
        <DayCell d={cell.d} isToday={cell.current && cell.d === todayDate}
          isCurrent={cell.current}
          showPastToggle={wIdx === 0 && pastWeeks.length > 0 && cell === week.filter(c => c.current).pop()}
          on:reload={onReload}
          on:openlink={(e) => onOpenLink(e.detail)}
          on:togglepast={() => showPastWeeks = !showPastWeeks} />
      {/each}
    </div>
  {/each}
</div>

<!-- styles in global app.css -->
