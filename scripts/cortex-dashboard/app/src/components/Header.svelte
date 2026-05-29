<script>
  import { currentYear, currentMonth, monthData, viewMode, ym, searchOpen, sidebarOpen } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let onReload;

  const WORKOUT_GROUPS = [
    { label: '전면' }, { label: '측면' }, { label: '후면' },
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
    const res = await api.toggleWorkout($ym, day, part);
    if (res?.workout) {
      $monthData.days[day] = { ...($monthData.days[day] || {}), workout: res.workout };
      $monthData = $monthData; // trigger reactivity
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
</script>

<header class="header">
  <div class="header-left">
    <span class="sidebar-toggle" on:click={() => $sidebarOpen = !$sidebarOpen}>☰</span>
    <h1>Cortex</h1>
    <div class="motto">Don't think, just do.</div>
  </div>

  <div class="header-center">
    <div class="vision" contenteditable="true" on:blur={saveGoal}>
      {$monthData.goals?.goal || ''}
    </div>
    {#if isCurrentMonth}
      <div class="workout-bar">
        {#each WORKOUT_GROUPS as g}
          <span class="workout-chip" class:on={workout.includes(g.label)}
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

<style>
  .header { padding: max(10px, env(safe-area-inset-top)) 16px 10px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .header-left { display: flex; align-items: center; gap: 8px; }
  h1 { font-size: 16px; color: #f0c040; font-weight: 700; letter-spacing: -0.3px; }
  .motto { font-size: 9px; color: #484f58; font-style: italic; }
  .sidebar-toggle { cursor: pointer; font-size: 18px; color: #8b949e; padding: 4px 8px; border-radius: 4px; }
  .sidebar-toggle:hover { color: #f0c040; }
  .header-center { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .vision { font-size: 10px; color: #6e7681; cursor: text; min-height: 14px; padding: 1px 2px; border-radius: 2px; }
  .vision:focus { outline: 1px solid #30363d; background: #0d1117; color: #c9d1d9; }
  .workout-bar { display: flex; gap: 1px; flex-wrap: wrap; }
  .workout-chip { font-size: 8px; padding: 2px 4px; border-radius: 2px; cursor: pointer; user-select: none; background: #21262d; color: #6e7681; border: 1px solid transparent; }
  .workout-chip.on { background: #1c3050; color: #58a6ff; border-color: #1c3050; }
  .nav { display: flex; gap: 6px; align-items: center; }
  .nav button { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; }
  .nav button:hover { background: #30363d; }
  .month-label { font-size: 15px; font-weight: 700; min-width: 100px; text-align: center; cursor: pointer; }
  .search-btn { background: none !important; border: none !important; font-size: 14px; cursor: pointer; color: #6e7681; padding: 4px 8px; }
  .search-btn:hover { color: #c9d1d9; }
</style>
