<script>
  import { onMount } from 'svelte';
  import { currentYear, currentMonth, monthData, prevMonthData, nextMonthData,
    standingData, dayFrames, visionData, activeNote, noteEditing, sidebarOpen, ym } from './lib/stores.js';
  import * as api from './lib/api.js';

  import Toast from './components/Toast.svelte';
  import Header from './components/Header.svelte';
  import Calendar from './components/Calendar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import CaptureBar from './components/CaptureBar.svelte';
  import Search from './components/Search.svelte';
  import NoteViewer from './components/NoteViewer.svelte';
  import LinkPopup from './components/LinkPopup.svelte';
  import StandingOrders from './components/Panels/StandingOrders.svelte';
  import Vision from './components/Panels/Vision.svelte';
  import Frames from './components/Panels/Frames.svelte';

  let linkPopup = { open: false, url: '', x: 0, y: 0, target: null };
  let panels = { standing: true, vision: false, frames: true };

  onMount(async () => {
    await loadAllData();
    // Sidebar hidden by default on all devices
    // Refresh on tab focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshWorkout();
    });
    // Cortex internal link handler
    window.addEventListener('open-cortex-file', (e) => openNote(e.detail));
    // Register SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Pull-to-refresh
    let pullY = 0, pullActive = false;
    document.addEventListener('touchstart', e => {
      pullY = e.touches[0].screenY;
      pullActive = (document.documentElement.scrollTop || document.body.scrollTop) < 5;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (!pullActive) return;
      if (e.changedTouches[0].screenY - pullY > 80) location.reload();
      pullActive = false;
    });
  });

  async function loadAllData() {
    const ymStr = $ym;
    const data = await api.loadMonth(ymStr);
    if (data) monthData.load(data);

    // Adjacent months
    const [y, m] = ymStr.split('-').map(Number);
    const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
    const [prev, next, so, frames, vision] = await Promise.all([
      api.loadMonth(`${py}-${String(pm).padStart(2, '0')}`),
      api.loadMonth(`${ny}-${String(nm).padStart(2, '0')}`),
      api.loadStandingOrders(),
      api.loadDayFrames(),
      api.loadVision(),
    ]);
    if (prev) prevMonthData.load(prev);
    if (next) nextMonthData.load(next);
    if (so) standingData.load(so);
    if (frames) dayFrames.load(frames);
    if (vision) visionData.load(vision);

    // Auto-inject frames for today (carries forward uncompleted todos)
    // Only once per calendar day to prevent HMR/reload from overwriting in-flight toggles
    const now = new Date();
    if (now.getFullYear() === y && now.getMonth() + 1 === m) {
      const today = now.getDate();
      const injectKey = `injected_${ymStr}_${today}`;
      if (!sessionStorage.getItem(injectKey)) {
        await api.injectFrames(ymStr, today, today);
        sessionStorage.setItem(injectKey, '1');
        const refreshed = await api.loadMonth(ymStr);
        if (refreshed) monthData.load(refreshed);
      }
    }
  }

  async function refreshWorkout() {
    const data = await api.loadMonth($ym);
    if (!data?.days) return;
    monthData.mutate(s => {
      for (const [day, dd] of Object.entries(data.days)) {
        if (!s.days[day]) s.days[day] = {};
        if (dd.workout !== undefined) s.days[day].workout = dd.workout;
      }
    });
  }

  function onReload() { loadAllData(); }

  function onOpenLink(detail) {
    const { d, cat, index } = detail;
    const item = $monthData.days?.[String(d)]?.[cat]?.[index];
    if (!item) return;
    linkPopup = { open: true, url: item.url || '', x: 200, y: 200, target: { d, cat, index } };
  }

  async function onLinkSave(e) {
    const { url } = e.detail;
    const { d, cat, index } = linkPopup.target;
    const dayData = $monthData.days?.[String(d)];
    if (dayData?.[cat]?.[index]) {
      monthData.mutate(s => { s.days[String(d)][cat][index].url = url; });
      linkPopup.open = false;
      api.editItem($ym, String(d), cat, index, dayData[cat][index].text, url);
    } else {
      linkPopup.open = false;
    }
  }

  async function onLinkRemove() {
    const { d, cat, index } = linkPopup.target;
    const dayData = $monthData.days?.[String(d)];
    if (dayData?.[cat]?.[index]) {
      monthData.mutate(s => { s.days[String(d)][cat][index].url = ''; });
      linkPopup.open = false;
      api.editItem($ym, String(d), cat, index, dayData[cat][index].text, '');
    } else {
      linkPopup.open = false;
    }
  }

  function showDashboard() {
    activeNote.set(null);
    noteEditing.set(false);
  }

  async function openNote(path) {
    const data = await api.loadFile(path);
    if (data) { activeNote.set(data); noteEditing.set(false); }
  }

  function goToDay(day) {
    // Scroll to day cell — handled by Calendar
    showDashboard();
  }

  function goToResult(resultYm, day) {
    const [y, m] = resultYm.split('-').map(Number);
    $currentYear = y; $currentMonth = m;
    showDashboard();
    loadAllData();
  }

  function togglePanel(name) { panels[name] = !panels[name]; panels = panels; }
</script>

<Toast />
<Sidebar />
<Search onGoToDay={goToDay} onGoToResult={goToResult} onOpenNote={openNote} />
<LinkPopup bind:open={linkPopup.open} bind:url={linkPopup.url}
  x={linkPopup.x} y={linkPopup.y}
  on:save={onLinkSave} on:remove={onLinkRemove} on:close={() => linkPopup.open = false} />

<div class="main" class:desktop-sidebar={$sidebarOpen && window?.screen?.width >= 900}>
  <Header onReload={onReload} />

  {#if $activeNote}
    <NoteViewer onBack={showDashboard} />
  {:else}
    <Calendar onReload={onReload} onOpenLink={onOpenLink} />

    <!-- Bottom Panels -->
    <div class="panels">
      <div class="panel">
        <div class="panel-header" on:click={() => togglePanel('standing')}>
          <h2>RECURRING BOARD</h2>
          <span class="panel-toggle">{panels.standing ? '▼' : '▶'}</span>
        </div>
        {#if panels.standing}
          <div class="panel-body open"><StandingOrders /></div>
        {/if}
      </div>

      <div class="panel">
        <div class="panel-header" on:click={() => togglePanel('frames')}>
          <h2>DAY FRAMES (Admin)</h2>
          <span class="panel-toggle">{panels.frames ? '▼' : '▶'}</span>
        </div>
        {#if panels.frames}
          <div class="panel-body open"><Frames onReload={onReload} /></div>
        {/if}
      </div>

      <div class="panel">
        <div class="panel-header" on:click={() => togglePanel('vision')}>
          <h2>VISION & MILESTONES</h2>
          <span class="panel-toggle">{panels.vision ? '▼' : '▶'}</span>
        </div>
        {#if panels.vision}
          <div class="panel-body open"><Vision /></div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<CaptureBar />

<!-- styles in global app.css -->
