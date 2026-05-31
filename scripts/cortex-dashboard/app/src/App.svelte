<script>
  import { onMount } from 'svelte';
  import { currentYear, currentMonth, monthData, prevMonthData, nextMonthData,
    standingData, dayFrames, visionData, activeNote, noteEditing, sidebarOpen, ym, workoutLog } from './lib/stores.js';
  import * as api from './lib/api.js';

  import { setLastKeyTracker, showToast } from './lib/api.js';
  import { setCatNames } from './lib/stores/constants.js';
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

  let linkPopup = { open: false, url: '', text: '', x: 0, y: 0, target: null };
  let lastChangedKey = null;
  let panels = { standing: true, vision: false, frames: true };

  onMount(async () => {
    setLastKeyTracker(k => lastChangedKey = k);
    await loadAllData();
    // Load custom category names from day-frames
    if ($dayFrames?._catNames) setCatNames($dayFrames._catNames);
    // Sidebar hidden by default on all devices
    // Refresh on tab focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshWorkout();
    });
    // Cortex internal link handler
    window.addEventListener('open-cortex-file', (e) => openNote(e.detail));
    // Ctrl+Z: undo last change
    document.addEventListener('keydown', async (e) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === 'z') || e.shiftKey) return;
      // Don't intercept undo inside contenteditable
      if (document.activeElement?.contentEditable === 'true' || document.activeElement?.tagName === 'INPUT') return;
      e.preventDefault();
      const key = lastChangedKey || $ym;
      const res = await api.undo(key);
      if (res?.ok) {
        showToast(`되돌림: ${key}`);
        await loadAllData();
      } else if (res?.error) {
        showToast(res.error, true);
      }
    });

    // Ctrl+S: 현재 편집 중인 항목 즉시 저장
    document.addEventListener('keydown', (e) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === 's')) return;
      e.preventDefault();
      const active = document.activeElement;
      if (active && (active.contentEditable === 'true' || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        active.blur();
        showToast('저장됨', false, 1000);
      }
    });

    // Ctrl+K: global link shortcut
    document.addEventListener('keydown', (e) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === 'k')) return;
      e.preventDefault();
      const active = document.activeElement;
      if (!active) return;

      // 1. Calendar item (.item with data-d/data-cat/data-idx)
      const calItem = active.closest('.item[data-d][data-cat]');
      if (calItem) {
        const d = +calItem.dataset.d;
        const cat = calItem.dataset.cat;
        const idx = +calItem.dataset.idx;
        if (d && cat && idx >= 0) {
          // Check if text is selected → inline markdown link
          const sel = window.getSelection();
          if (sel && sel.toString().trim() && sel.rangeCount) {
            const selectedText = sel.toString().trim();
            const item = $monthData.days?.[String(d)]?.[cat]?.[idx];
            if (!item) return;
            const textEl = calItem.querySelector('.item-text');
            // Find position: use item.text directly (indexOf with occurrence matching)
            const fullText = item.text;
            // Count which occurrence of selectedText is at cursor
            const range = sel.getRangeAt(0);
            const preRange = document.createRange();
            preRange.selectNodeContents(textEl);
            preRange.setEnd(range.startContainer, range.startOffset);
            const beforeSel = preRange.toString();
            // Count occurrences of selectedText before cursor
            let occurrences = 0;
            let searchFrom = 0;
            const beforeCount = (beforeSel.match(new RegExp(selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            // Find the nth occurrence in item.text
            let pos = -1;
            for (let n = 0; n <= beforeCount; n++) {
              pos = fullText.indexOf(selectedText, searchFrom);
              if (pos === -1) break;
              searchFrom = pos + 1;
            }
            if (pos === -1) pos = fullText.indexOf(selectedText);
            const url = prompt('URL', '');
            if (url && pos >= 0) {
              const before = fullText.slice(0, pos);
              const after = fullText.slice(pos + selectedText.length);
              const md = `${before}[${selectedText}](${url})${after}`;
              // Set flag to skip next blur
              textEl.dataset.skipBlur = '1';
              monthData.mutate(s => { s.days[String(d)][cat][idx].text = md; });
              api.editItem($ym, String(d), cat, idx, md, item.url || '');
            }
          } else {
            // No selection → open link popup for whole item URL
            onOpenLink({ d, cat, index: idx });
          }
          return;
        }
      }

      // 2. Recurring board item (.so-item contenteditable)
      const soItem = active.closest('.so-item');
      if (soItem) {
        // 기존 링크 편집: 커서 근처 <a> 태그 감지
        const sel2 = window.getSelection();
        const nearAnchor = sel2?.anchorNode?.parentElement?.closest('a') || sel2?.anchorNode?.closest?.('a');
        if (nearAnchor) {
          const curUrl = nearAnchor.href || '';
          const curLabel = nearAnchor.textContent || '';
          const url = prompt('URL', curUrl); if (!url) return;
          const label = prompt('표시 텍스트', curLabel); if (!label) return;
          nearAnchor.href = url; nearAnchor.textContent = label;
          active.dispatchEvent(new Event('blur'));
        } else {
          const selectedText = sel2?.toString().trim() || '';
          const url = prompt('URL', ''); if (!url) return;
          const label = selectedText || prompt('표시 텍스트', active.textContent?.trim() || 'link'); if (!label) return;
          if (selectedText && sel2.rangeCount) {
            const range = sel2.getRangeAt(0);
            range.deleteContents();
            const a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.textContent = label;
            range.insertNode(a);
          } else {
            active.textContent = `[${label}](${url})`;
          }
          active.dispatchEvent(new Event('blur'));
        }
        return;
      }

      // 3. Frame item (.frame-text contenteditable)
      const frameItem = active.closest('.frame-item');
      if (frameItem) {
        const url = prompt('URL', '');
        if (!url) return;
        const sel = window.getSelection();
        const selectedText = sel?.toString().trim();
        const label = selectedText || prompt('표시 텍스트', active.textContent?.trim() || 'link');
        if (!label) return;
        const existing = active.textContent || '';
        active.textContent = existing ? `${existing} [${label}](${url})` : `[${label}](${url})`;
        active.dispatchEvent(new Event('blur'));
        return;
      }
    });
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

    // Load independent workout log
    const wlog = await api.loadWorkoutLog();
    if (wlog) workoutLog.set(wlog);

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
    const wlog = await api.loadWorkoutLog();
    if (wlog) workoutLog.set(wlog);
  }

  function onReload() { loadAllData(); }

  function onOpenLink(detail) {
    const { d, cat, index } = detail;
    const item = $monthData.days?.[String(d)]?.[cat]?.[index];
    if (!item) return;
    linkPopup = { open: true, url: item.url || '', text: item.text || '', x: 200, y: 200, target: { d, cat, index } };
  }

  async function onLinkSave(e) {
    const { url } = e.detail;
    const { d, cat, index } = linkPopup.target;
    const dayData = $monthData.days?.[String(d)];
    if (dayData?.[cat]?.[index]) {
      monthData.mutate(s => { s.days[String(d)][cat][index].url = url; });
      linkPopup.open = false;
      await api.setUrl($ym, String(d), cat, index, url);
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
      await api.setUrl($ym, String(d), cat, index, '');
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
  text={linkPopup.text} x={linkPopup.x} y={linkPopup.y}
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
