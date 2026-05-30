<script>
  import { currentYear, currentMonth, monthData, viewMode, ym, searchOpen, sidebarOpen } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let onReload;

  const WORKOUT_LEGS = [
    { label: '전면' }, { label: '측면' }, { label: '후면' }
  ];
  const WORKOUT_UPPER = [
    { label: '등' }, { label: '가슴' }
  ];

  $: todayData = $monthData.days?.[String(new Date().getDate())] || {};
  $: workout = todayData.workout || [];
  $: isCurrentMonth = new Date().getFullYear() === $currentYear && new Date().getMonth() + 1 === $currentMonth;

  function prevPeriod() {
    $currentMonth--;
    if ($currentMonth < 1) { $currentMonth = 12; $currentYear--; }
    onReload();
  }
  function nextPeriod() {
    $currentMonth++;
    if ($currentMonth > 12) { $currentMonth = 1; $currentYear++; }
    onReload();
  }
  function goToday() {
    const now = new Date();
    $currentYear = now.getFullYear();
    $currentMonth = now.getMonth() + 1;
    onReload();
  }

  async function toggleWo(part) {
    const day = String(new Date().getDate());
    // Optimistic update
    if (!$monthData.days[day]) $monthData.days[day] = {};
    const dd = $monthData.days[day];
    if (!dd.workout) dd.workout = [];
    const idx = dd.workout.indexOf(part);
    if (idx >= 0) dd.workout.splice(idx, 1);
    else dd.workout.push(part);
    $monthData = $monthData;
    // Server sync
    const res = await api.toggleWorkout($ym, day, part);
    if (res?.workout) {
      $monthData.days[day].workout = res.workout;
      $monthData = $monthData;
    }
  }

  function saveGoal(e) {
    const text = e.target.textContent.trim();
    if (!$monthData.goals) $monthData.goals = {};
    $monthData.goals.goal = text;
    api.saveMonth($ym, $monthData);
  }

  async function undo() {
    const res = await api.undoMonth($ym);
    if (res?.ok) onReload();
  }

  function setVision(node, text) {
    function render(text) {
      if (document.activeElement === node) return;
      node.textContent = text || '';
    }
    render(text);
    return { update: render };
  }
</script>

<header class="header">
  <div class="header-left">
    <span class="sidebar-toggle" on:click={() => $sidebarOpen = !$sidebarOpen}>☰</span>
    <h1>Cortex</h1>
    <div class="motto">Don't think, just do.</div>
  </div>

  <div class="header-center">
    <div class="vision" contenteditable="true" on:blur={saveGoal}
      use:setVision={$monthData.goals?.goal || ''}
    ></div>
    {#if isCurrentMonth}
      <div class="workout-bar">
        {#each WORKOUT_LEGS as g}
          <span class="workout-chip leg" class:on={workout.includes(g.label)}
            on:click={() => toggleWo(g.label)}>{g.label}</span>
        {/each}
        <span class="workout-sep"></span>
        {#each WORKOUT_UPPER as g}
          <span class="workout-chip upper" class:on={workout.includes(g.label)}
            on:click={() => toggleWo(g.label)}>{g.label}</span>
        {/each}
      </div>
    {/if}
  </div>

  <nav class="nav">
    <button on:click={() => $viewMode = $viewMode === 'month' ? 'week' : 'month'}>
      {$viewMode === 'week' ? 'Full Month' : 'This Week'}
    </button>
    <button on:click={prevPeriod}>◀</button>
    <span class="month-label" on:click={goToday}>{$currentYear}. {$currentMonth}</span>
    <button on:click={nextPeriod}>▶</button>
    <button on:click={undo}>↩</button>
    <span class="search-btn" on:click={() => $searchOpen = true}>🔍</span>
  </nav>
</header>

<!-- styles in global app.css -->
