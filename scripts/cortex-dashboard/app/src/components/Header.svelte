<script>
  import { currentYear, currentMonth, monthData, viewMode, ym, searchOpen, sidebarOpen, workoutLog } from '../lib/stores.js';
  import * as api from '../lib/api.js';

  export let onReload;

  const WORKOUT_LEGS = [
    { label: '전면' }, { label: '측면' }, { label: '후면' }
  ];
  const WORKOUT_UPPER = [
    { label: '등' }, { label: '가슴' }
  ];

  function todayDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  $: workout = $workoutLog[todayDateKey()] || [];
  $: isCurrentMonth = new Date().getFullYear() === $currentYear && new Date().getMonth() + 1 === $currentMonth;
  $: todayDay = String(new Date().getDate());
  $: todayType = isCurrentMonth ? ($monthData.days?.[todayDay]?.day_type || null) : null;

  async function setTodayType(type) {
    if (!isCurrentMonth) return;
    const newType = todayType === type ? null : type;
    monthData.mutate(s => {
      if (!s.days[todayDay]) s.days[todayDay] = {};
      if (newType) s.days[todayDay].day_type = newType;
      else delete s.days[todayDay].day_type;
    });
    await api.setDayType($ym, todayDay, newType);
    await api.injectFrames($ym, Number(todayDay), Number(todayDay));
    onReload();
  }

  function prevPeriod() {
    $currentMonth--;
    if ($currentMonth < 1) { $currentMonth = 12; $currentYear--; }
    $viewMode = 'month';
    onReload();
  }
  function nextPeriod() {
    $currentMonth++;
    if ($currentMonth > 12) { $currentMonth = 1; $currentYear++; }
    $viewMode = 'month';
    onReload();
  }
  function goToday() {
    const now = new Date();
    $currentYear = now.getFullYear();
    $currentMonth = now.getMonth() + 1;
    onReload();
  }

  async function toggleWo(part) {
    const now = new Date();
    const day = String(now.getDate());
    const dateKey = todayDateKey();
    // Optimistic update
    workoutLog.update(log => {
      const cur = [...(log[dateKey] || [])];
      const idx = cur.indexOf(part);
      if (idx >= 0) cur.splice(idx, 1); else cur.push(part);
      return { ...log, [dateKey]: cur };
    });
    // Server sync
    const res = await api.toggleWorkout($ym, day, part);
    if (res?.workout) {
      workoutLog.update(log => ({ ...log, [dateKey]: res.workout }));
    }
  }

  function saveGoal(e) {
    const text = e.target.textContent.trim();
    monthData.mutate(s => {
      if (!s.goals) s.goals = {};
      s.goals.goal = text;
    });
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
        <span class="workout-sep"></span>
        <span class="day-type-chip" class:on={todayType === 'hf'} on:click={() => setTodayType('hf')}>HF</span>
        <span class="day-type-chip vacation" class:on={todayType === 'vacation'} on:click={() => setTodayType('vacation')}>휴가</span>
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
