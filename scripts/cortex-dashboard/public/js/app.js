const API = '';
const CATS = ['ritual','work','hexagonal','outcome','input','source'];
const CAT_NAMES = {ritual:'R&R', input:'Input', work:'Work', hexagonal:'6 Pillars', outcome:'Outcome', source:'Source'};
const DAY_NAMES = ['일','월','화','수','목','금','토'];
const TYPE_LABELS = {block:'BLOCK',flow:'FLOW',hf:'HF',vacation:'휴가'};
const TYPE_COLORS = {block:'badge-block',flow:'badge-flow',hf:'badge-hf',vacation:'badge-vacation'};
const TYPES = ['block','flow'];

let currentYear, currentMonth, currentWeekStart, monthData, standingData, recurringData;
let todayMonthData = null; // 오늘 날짜 월 캐시 (월 탐색 시에도 유지)
let workoutLog = {}; // 독립 workout 저장소 — 월 데이터와 완전 분리
let viewMode = 'month'; // 'month' (default) or 'week'
let _weekScrolledToToday = false; // only scroll today into view on mode switch, not every render
let _pendingCarrySave = false; // carry logic sets this; render() saves once at the end
let _lunarMode = false; // yearly add form: 음력 toggle state
let _activeSOTab = 'standing'; // persists tab across renderStandingOrders() calls
let sidebarOpen = false;

// --- Korean Lunar Calendar Conversion ---
// Data: ny=[solarMonth,solarDay of 음1/1], lm=leap month (0=none), ml=month lengths (29/30 days)
// Leap month is inserted AFTER the lm-th regular month in ml array
const _KLD = {
  2020:{ny:[1,25],lm:4, ml:[30,30,29,30,29,30,29,29,30,29,30,29,30]},
  2021:{ny:[2,12],lm:0, ml:[30,29,30,29,30,30,29,30,29,30,29,30]},
  2022:{ny:[2, 1],lm:0, ml:[30,29,30,29,30,30,29,30,30,29,30,29]},
  2023:{ny:[1,22],lm:2, ml:[29,30,29,29,30,29,30,30,29,30,29,30,30]},
  2024:{ny:[2,10],lm:0, ml:[29,30,29,30,29,30,30,29,30,29,30,30]},
  2025:{ny:[1,29],lm:6, ml:[30,29,30,29,30,29,30,29,29,30,30,29,30]},
  2026:{ny:[2,17],lm:0, ml:[29,30,29,30,29,30,29,30,30,29,30,29]},
  2027:{ny:[2, 6],lm:5, ml:[30,29,30,29,30,30,29,30,29,30,30,29,29]},
  2028:{ny:[1,26],lm:0, ml:[30,29,30,29,30,29,30,29,30,30,29,30]},
  2029:{ny:[2,13],lm:0, ml:[29,30,29,30,29,30,29,30,29,30,30,29]},
  2030:{ny:[2, 3],lm:3, ml:[30,29,30,30,29,30,29,30,29,30,29,30,29]},
  2031:{ny:[1,23],lm:0, ml:[29,30,29,30,29,30,29,30,29,30,29,30]},
  2032:{ny:[2,11],lm:0, ml:[30,29,30,29,30,29,30,29,30,29,30,29]},
  2033:{ny:[1,31],lm:11,ml:[30,29,30,29,30,29,30,29,30,29,30,30,29]},
  2034:{ny:[2,19],lm:0, ml:[29,30,29,30,29,30,29,30,29,30,29,30]},
  2035:{ny:[2, 8],lm:6, ml:[30,29,30,29,30,29,30,29,30,29,30,30,29]},
};
function lunarToSolar(year, lMonth, lDay) {
  const d = _KLD[year];
  if (!d) return null;
  let offset = lDay - 1;
  let mi = 0;
  for (let m = 1; m < lMonth; m++) {
    offset += d.ml[mi++];
    if (d.lm > 0 && m === d.lm) offset += d.ml[mi++]; // skip leap month
  }
  const dt = new Date(year, d.ny[0] - 1, d.ny[1] + offset);
  return { month: dt.getMonth() + 1, day: dt.getDate() };
}

// --- Init ---
function init() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  currentWeekStart = getWeekStart(now);
  updateDeviceMode();
  loadMonth(true);
  loadStandingOrders();
  loadRecurringTemplates();
  loadFrames();
  loadWorkoutLog();
  // loadVision(); // replaced by Twilight Mood board iframe
  loadSidebarTree('cortex');
  registerSW();
  initCellScrollDelay();
}

// #6 — day-cell 스크롤: 셀에 overflow 있으면 셀 스크롤 우선, 경계 도달 시 페이지 스크롤
function initCellScrollDelay() {
  const cellBoundaryHit = new WeakMap(); // { time, dir }
  const MOMENTUM_MS = 300;

  document.addEventListener('wheel', e => {
    const cell = e.target.closest('.day-cell');
    if (!cell) return;
    const { scrollTop, scrollHeight, clientHeight } = cell;
    if (scrollHeight <= clientHeight + 2) return; // 셀에 overflow 없으면 패스

    const now = Date.now();
    const atTop = scrollTop <= 0 && e.deltaY < 0;
    const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight && e.deltaY > 0;

    if (atTop || atBottom) {
      // 경계 도달 → 페이지 스크롤 허용 (momentum 윈도우 시작)
      cellBoundaryHit.set(cell, { time: now, dir: e.deltaY > 0 ? 1 : -1 });
      return;
    }

    // 경계 직후 같은 방향 → 관성으로 페이지 스크롤
    const bh = cellBoundaryHit.get(cell);
    if (bh && (now - bh.time < MOMENTUM_MS) && ((e.deltaY > 0) === (bh.dir === 1))) {
      return;
    }
    cellBoundaryHit.delete(cell);

    e.preventDefault();
    cell.scrollTop += e.deltaY;
  }, { passive: false });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function ym() { return `${currentYear}-${String(currentMonth).padStart(2,'0')}`; }

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// --- Data loading ---
let prevMonthData = null, nextMonthData = null;

async function loadMonth(isInit) {
  let res;
  try {
    res = await fetch(`${API}/api/month?ym=${ym()}`);
    monthData = await res.json();
  } catch (e) {
    console.error('[cortex] loadMonth failed:', e);
    showToast('달력 로드 실패 — 새로고침 해주세요', true);
    return;
  }
  // 오늘이 속한 월이면 todayMonthData 캐시
  const now = new Date();
  if (isInit || (currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1)) {
    todayMonthData = monthData;
  }
  // Load adjacent months for week overlap
  const pm = currentMonth === 1 ? 12 : currentMonth - 1;
  const py = currentMonth === 1 ? currentYear - 1 : currentYear;
  const nm = currentMonth === 12 ? 1 : currentMonth + 1;
  const ny = currentMonth === 12 ? currentYear + 1 : currentYear;
  const [prevRes, nextRes] = await Promise.all([
    fetch(`${API}/api/month?ym=${py}-${String(pm).padStart(2,'0')}`),
    fetch(`${API}/api/month?ym=${ny}-${String(nm).padStart(2,'0')}`)
  ]);
  prevMonthData = await prevRes.json();
  nextMonthData = await nextRes.json();
  // visionText2 is loaded from standingData.vision (global, see loadStandingOrders)
  // Auto viewMode: 최초 로드에만 적용. 이후 loadMonth() 재호출 시 사용자 선택 유지.
  if (isInit) {
    const _now = new Date();
    const _todayWeekStart = getWeekStart(_now);
    const _isTodayWeek = currentWeekStart.getFullYear() === _todayWeekStart.getFullYear()
      && currentWeekStart.getMonth() === _todayWeekStart.getMonth()
      && currentWeekStart.getDate() === _todayWeekStart.getDate();
    viewMode = _isTodayWeek ? 'week' : 'month';
  }
  updateLabel();
  render();
  renderWorkoutBar();
  ensureSoScheduled();
}

function getDayData(d, isCurrent) {
  if (isCurrent) return monthData.days[String(d)] || {};
  // Previous or next month
  if (d > 15) return prevMonthData?.days[String(d)] || {};
  return nextMonthData?.days[String(d)] || {};
}

function updateLabel() {
  document.getElementById('monthLabel').textContent = viewMode === 'month'
    ? `${currentYear}. ${currentMonth}` : formatWeekLabel();
  document.getElementById('viewToggle').textContent = viewMode === 'week' ? 'Full Month' : 'This Week';
}

function formatWeekLabel() {
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  return `${currentWeekStart.getMonth()+1}/${currentWeekStart.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
}

async function loadStandingOrders() {
  const res = await fetch(`${API}/api/standing-orders`);
  standingData = await res.json();
  // 비전 텍스트: standingData.vision → monthData.goals.goal fallback
  const vt = document.getElementById('visionText2');
  if (vt) {
    const mantra = standingData.vision || (todayMonthData || monthData)?.goals?.goal || '';
    vt.textContent = mantra;
  }
  renderStandingOrders();
  render(); // standing 날짜 뱃지를 캘린더에 반영
}

async function loadRecurringTemplates() {
  const res = await fetch(`${API}/api/recurring-templates`);
  recurringData = await res.json();
  renderRecurringTemplates();
}

// --- View toggle ---
function toggleView() {
  viewMode = viewMode === 'week' ? 'month' : 'week';
  _weekScrolledToToday = false; // allow scrollIntoView on next week render
  // [D-WEEKFIX] "This Week" = 항상 오늘 주로 이동 (navigate 후 남은 currentWeekStart 무시)
  if (viewMode === 'week') {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    currentWeekStart = getWeekStart(now);
  }
  document.getElementById('viewToggle').textContent = viewMode === 'week' ? 'Full Month' : 'This Week';
  document.getElementById('monthLabel').textContent = viewMode === 'month'
    ? `${currentYear}. ${currentMonth}` : formatWeekLabel();
  render();
}

function prevPeriod() {
  if (viewMode === 'month') { currentMonth--; if(currentMonth<1){currentMonth=12;currentYear--;} loadMonth(); }
  else { currentWeekStart.setDate(currentWeekStart.getDate() - 7); syncMonthFromWeek(); loadMonth(); }
}
function nextPeriod() {
  if (viewMode === 'month') { currentMonth++; if(currentMonth>12){currentMonth=1;currentYear++;} loadMonth(); }
  else { currentWeekStart.setDate(currentWeekStart.getDate() + 7); syncMonthFromWeek(); loadMonth(); }
}
function goToday() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  currentWeekStart = getWeekStart(now);
  loadMonth();
}
function syncMonthFromWeek() {
  const mid = new Date(currentWeekStart);
  mid.setDate(mid.getDate() + 3);
  currentYear = mid.getFullYear();
  currentMonth = mid.getMonth() + 1;
}

// --- Render ---
function render() {
  if (!monthData) return; // [D-RENDER-GUARD] monthData 로드 전 render 호출 방지 (loadFrames race condition)
  const container = document.getElementById('calendarContainer');

  // Flush one-thing field before DOM rebuild
  const focused = document.activeElement;
  if (focused && focused.classList.contains('one-thing')) focused.blur();

  // Preserve scroll positions — save by day-key (month) or by index (week)
  const mainEl = document.getElementById('main');
  const scrollY = window.scrollY || window.pageYOffset;
  const mainScrollTop = mainEl ? mainEl.scrollTop : 0;
  const cellScrollsByDay = {};
  const cellScrollsByIdx = {};
  document.querySelectorAll('.day-cell[data-day]').forEach(c => { const v = c.scrollTop; if (v) cellScrollsByDay[c.dataset.day] = v; });
  document.querySelectorAll('.week-cell').forEach((c, i) => { const v = c.scrollTop; if (v) cellScrollsByIdx[i] = v; });

  container.innerHTML = viewMode === 'month' ? renderMonthView() : renderWeekView();
  renderStats();

  // Persist carried items to D1 once per render cycle (carry logic flags this)
  if (_pendingCarrySave) { _pendingCarrySave = false; save(); }

  // Restore scroll positions — double-rAF for reliable layout commit
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.scrollTo(0, scrollY);
    if (mainEl) mainEl.scrollTop = mainScrollTop;
    document.querySelectorAll('.day-cell[data-day]').forEach(c => { const v = cellScrollsByDay[c.dataset.day]; if (v) c.scrollTop = v; });
    document.querySelectorAll('.week-cell').forEach((c, i) => { const v = cellScrollsByIdx[i]; if (v) c.scrollTop = v; });
    // Week view: scroll today into center ONLY on mode switch (not on every re-render)
    if (viewMode !== 'month' && !_weekScrolledToToday) {
      const todayCell = document.querySelector('.week-grid .week-cell.today');
      if (todayCell) todayCell.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' });
      _weekScrolledToToday = true;
    }
  }));
}

function renderMonthView() {
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const prevDaysInMonth = new Date(currentYear, currentMonth - 1, 0).getDate();
  const firstDow = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=Sun
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  // Build full calendar grid (6 weeks max, each week Sun-Sat)
  const cells = []; // {d, isCurrentMonth, date}
  // Previous month trailing days
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ d: prevDaysInMonth - i, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, current: true });
  }
  // Next month leading days
  while (cells.length % 7 !== 0) {
    cells.push({ d: cells.length - firstDow - daysInMonth + 1, current: false });
  }

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Determine current week — only fold past weeks in current month
  let currentWeekIdx = 0; // default: show all weeks
  let pastWeeks = [];
  if (isCurrentMonth) {
    currentWeekIdx = weeks.findIndex(w => w.some(c => c.current && c.d === todayDate));
    if (currentWeekIdx === -1) currentWeekIdx = 0;
    pastWeeks = weeks.filter((_, i) => i < currentWeekIdx);
  }
  let pastTotal = 0, pastDone = 0;
  pastWeeks.forEach(week => week.filter(c => c.current).forEach(c => {
    const dd = monthData?.days?.[String(c.d)] || {};
    CATS.forEach(cat => { const items = dd[cat] || []; pastTotal += items.length; pastDone += items.filter(i => i.done).length; });
  }));

  // 이달 메모: monthly 항목 중 날짜 prefix 없는 것들 캘린더 상단에 표시
  const ymKeyMemo = ym();
  const monthlyMemoItems = (standingData?.monthly?.[ymKeyMemo] || []).filter(item => {
    const text = typeof item === 'string' ? item : (item.text || '');
    return typeof text === 'string' && !text.match(/^\d+[~,～]?\d*일/);
  });
  let html = '';
  if (monthlyMemoItems.length > 0) {
    html += `<div class="monthly-memo-bar">`;
    html += `<span class="monthly-memo-label">이달 메모</span>`;
    monthlyMemoItems.forEach(item => {
      const text = typeof item === 'string' ? item : (item.text || '');
      html += `<span class="monthly-memo-item">${linkify(text)}</span>`;
    });
    html += `</div>`;
  }
  html += renderDayHeaders();

  // Past weeks: hidden
  if (pastWeeks.length > 0) {
    html += `<div id="pastWeeksContainer" style="display:none">`;
    pastWeeks.forEach(week => html += renderWeekGridFull(week, todayDate));
    html += '</div>';
  }

  // Current + future weeks
  weeks.forEach((week, wIdx) => {
    if (wIdx < currentWeekIdx) return;
    const showToggle = (wIdx === currentWeekIdx && pastWeeks.length > 0);
    html += renderWeekGridFull(week, todayDate, showToggle);
  });

  return html;
}

function renderWeekGridFull(week, todayDate, showToggle) {
  let html = '<div class="grid">';
  week.forEach(cell => {
    if (!cell.current) {
      html += `<div class="day-cell other-month"><div class="day-num" style="color:#30363d">${cell.d}</div></div>`;
    } else {
      const isToday = cell.d === todayDate;
      if (showToggle) {
        _showPastToggleOnWeek = true;
        _pastToggleDay = week.filter(c => c.current).pop()?.d || -1;
      }
      html += renderDayCell(cell.d, isToday, false, cell.current);
    }
  });
  html += '</div>';
  _showPastToggleOnWeek = false;
  return html;
}

function renderDayHeaders() {
  let html = '<div class="grid" style="position:sticky;top:0;z-index:10">';
  DAY_NAMES.forEach((n, i) => {
    const cls = i === 0 ? ' sun' : i === 6 ? ' sat' : '';
    html += `<div class="day-header${cls}">${n}</div>`;
  });
  html += '</div>';
  return html;
}

let _showPastToggleOnWeek = false;
let _pastToggleDay = -1;

function renderWeekGrid(week, todayDate, showPastToggle) {
  _showPastToggleOnWeek = showPastToggle || false;
  const weekStart = week[0];
  const weekEnd = week[week.length - 1];
  let html = '<div class="grid">';
  const firstDow = new Date(currentYear, currentMonth - 1, weekStart).getDay();
  for (let i = 0; i < firstDow; i++) html += `<div class="day-cell other-month"></div>`;
  week.forEach(d => html += renderDayCell(d, d === todayDate, false));
  const lastDow = new Date(currentYear, currentMonth - 1, weekEnd).getDay();
  for (let i = lastDow + 1; i < 7; i++) html += `<div class="day-cell other-month"></div>`;
  html += '</div>';
  _showPastToggleOnWeek = false;
  return html;
}

function togglePastWeeks() {
  const c = document.getElementById('pastWeeksContainer');
  const icon = document.getElementById('pastToggleIcon');
  const open = c.style.display !== 'none';
  c.style.display = open ? 'none' : '';
  icon.innerHTML = open ? '&#9654;' : '&#9660;';
}

function renderWeekView() {
  const today = new Date();
  let todayColIdx = -1;
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    if (date.toDateString() === today.toDateString()) { todayColIdx = i; break; }
  }
  // Build grid-template-columns: today gets 1.3fr, others 1fr
  const cols = Array.from({length: 7}, (_, i) => i === todayColIdx ? '1.3fr' : '1fr').join(' ');
  let html = `<div class="week-grid" style="grid-template-columns:${cols}">`;
  // Headers
  DAY_NAMES.forEach((n, i) => {
    const cls = i === 0 ? ' sun' : i === 6 ? ' sat' : '';
    html += `<div class="day-header${cls}">${n}</div>`;
  });
  // 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    const d = date.getDate();
    const isToday = date.toDateString() === today.toDateString();
    const isSameMonth = date.getMonth() + 1 === currentMonth;
    html += `<div class="week-cell${isToday ? ' today' : ''}">`;
    html += renderDayCellContent(d, isToday, true, isSameMonth);
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function goTodayWeek() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  currentWeekStart = getWeekStart(now);
  if (viewMode !== 'week') {
    viewMode = 'week';
    _weekScrolledToToday = false;
    document.getElementById('viewToggle').textContent = 'Full Month';
    document.getElementById('monthLabel').textContent = formatWeekLabel();
  }
  loadMonth();
}

function getHoliday(d) {
  if (!standingData?.holidays) return null;
  const key = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return standingData.holidays[key] || null;
}

function getSoEvents(d) {
  if (!standingData?.standing) return [];
  return standingData.standing.filter(item => {
    if (!item.date || item.active === false) return false;
    return item.date.split(',').some(part => {
      const parsed = parseSoDate(part.trim());
      return parsed && parsed.month === currentMonth && parsed.day === d;
    });
  });
}

function getYearlyEvents(d) {
  if (!standingData?.yearly) return [];
  return standingData.yearly.filter(y => {
    if (y.lunar && y.lunarMonth && y.lunarDay) {
      const sol = lunarToSolar(currentYear, y.lunarMonth, y.lunarDay);
      return sol ? (sol.month === currentMonth && sol.day === d) : (y.month === currentMonth && y.day === d);
    }
    return y.month === currentMonth && y.day === d;
  });
}

function getMonthlyRecurring(d) {
  const results = [];
  // standing orders with date field: "6/15", "6월 15일", "6.15" (multi-date supported)
  if (standingData?.standing) {
    standingData.standing.forEach(item => {
      if (item.active === false) return;
      let match = false;
      if (item.dates?.length) {
        match = item.dates.some(dt => dt.month === currentMonth && dt.day === d);
      } else if (item.date) {
        const parsed = parseSoDate(item.date);
        if (parsed) {
          match = parsed.month === currentMonth && parsed.day === d;
        } else {
          const dayOnly = parseInt(item.date.trim());
          if (!isNaN(dayOnly)) match = dayOnly === d;
        }
      }
      if (!match) return;
      const displayText = item.text.includes(':') ? item.text.split(':')[0].trim() : item.text;
      results.push({ text: displayText, url: item.url || '' });
    });
  }
  // monthly_recurring: structured {day, text} items
  if (standingData?.monthly_recurring) {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    standingData.monthly_recurring.forEach(m => {
      if (m.day === d || (m.day === 0 && d === daysInMonth)) results.push(m);
    });
  }
  // [D-MONTHLYINJECT] monthly[ym] 텍스트 아이템은 사이드바 스케줄러 전용 — day cell 주입 금지
  return results;
}

function getWeeklyRecurring(d) {
  if (!standingData?.weekly_recurring) return [];
  const dow = new Date(currentYear, currentMonth - 1, d).getDay();
  // Week number from start of month (for biweekly calc)
  const weekNum = Math.floor((d - 1) / 7);
  return standingData.weekly_recurring.filter(w => {
    if (w.dow !== dow) return false;
    if (w.freq === 'biweekly' && weekNum % 2 !== 0) return false;
    return true;
  });
}

function isHappyFriday(d) {
  const key = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return (standingData?.happy_friday || []).includes(key);
}
function getEffectiveDayType(dayData, d) {
  if (dayData.day_type) return dayData.day_type;
  const dow = new Date(currentYear, currentMonth - 1, d).getDay();
  const isHol = !!getHoliday(d);
  if (isHol || dow === 6 || isHappyFriday(d)) return 'flow';
  if (dow === 0) return 'block';
  return null;
}

function getFrameTypeForDay(d, dayData) {
  return getEffectiveDayType(dayData, d) || 'weekday';
}

function getDayCatType(d, dayData, cat) {
  const ft = getFrameTypeForDay(d, dayData);
  return framesData?.[ft]?.categories?.[cat]?.type || 'routine';
}

// Routine → live from template (done states in _rdone_${cat})
// Todo   → stored per-day in dayData[cat]
function getCatItemsForRender(d, dayData, cat) {
  if (!framesData) return dayData[cat] || [];
  const ft = getFrameTypeForDay(d, dayData);
  const catMeta = framesData[ft]?.categories?.[cat];
  const catType = catMeta?.type || 'routine';

  if (catType === 'todo') {
    // Manual items stored per-day (no _frame/_carried flags)
    const stored = (dayData[cat] || []).filter(i => !i._frame && !i._carried);
    const today = new Date().getDate();
    const templateItems = catMeta?.items || [];

    // Today and future: carry undone items from prev day (cascade)
    if (!templateItems.length && d >= today) {
      const prevDay = monthData.days?.[String(d - 1)];
      if (prevDay) {
        // Include _carried for cascade: prev day's undone items (manual + carried)
        // Also exclude items matching prev day's frame template (routine items that lost _frame marker)
        const prevDow = new Date(currentYear, currentMonth - 1, d - 1).getDay();
        const prevFt = prevDay.day_type || (prevDow === 0 ? 'block' : prevDow === 6 ? 'flow' : 'weekday');
        const normText = t => (t || '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        const prevFrameTexts = new Set((framesData?.[prevFt]?.categories?.[cat]?.items || []).map(ti => normText(typeof ti === 'object' ? ti.text : String(ti))));
        // Rejection list: texts explicitly deleted by user — never re-carry
        const rejectKey = `_carry_rejects_${cat}`;
        const rejected = new Set((dayData[rejectKey] || []).map(normText));
        // Remove stale _carried items whose source is now done in prevDay
        const prevDoneTexts = new Set(
          (prevDay[cat] || []).filter(i => i.done && !i._frame).map(i => normText(i.text))
        );
        if (prevDoneTexts.size > 0) {
          const currentItems = dayData[cat] || [];
          const hasStale = currentItems.some(i => i._carried && prevDoneTexts.has(normText(i.text)));
          if (hasStale) {
            ensureDay(d)[cat] = currentItems.filter(i => !i._carried || !prevDoneTexts.has(normText(i.text)));
            _pendingCarrySave = true;
          }
        }
        const prevUndone = (prevDay[cat] || []).filter(i =>
          !i.done && !i._frame && !i._carried && !prevFrameTexts.has(normText(i.text)) && !rejected.has(normText(i.text))
        );
        if (prevUndone.length > 0) {
          const existingTexts = new Set((dayData[cat] || []).map(i => normText(i.text)));
          const newCarried = prevUndone.filter(i => !existingTexts.has(normText(i.text)));
          if (newCarried.length > 0) {
            const toAdd = newCarried.map(i => ({ text: i.text, url: i.url || '', done: false, _carried: true }));
            const existing = (dayData[cat] || []).filter(i => !i._frame);
            ensureDay(d)[cat] = [...existing, ...toAdd];
            _pendingCarrySave = true; // save deferred — called once after render()
          }
        }
      }
      return (ensureDay(d)[cat] || []).filter(i => !i._frame);
    }

    if (!templateItems.length) return stored;

    // Merge: template as base (with done state from stored), manual-only items appended
    const storedByText = new Map(stored.map(i => [i.text, i]));
    const result = templateItems.map(ti => {
      if (typeof ti === 'object' && ti.type === 'separator') return { ...ti, _frame: true };
      const base = typeof ti === 'object' ? { text: ti.text || '', url: ti.url || '' } : { text: String(ti), url: '' };
      const s = storedByText.get(base.text);
      if (s) storedByText.delete(base.text);
      return { ...base, done: s ? s.done : false, url: s?.url || base.url, _frame: true };
    });
    storedByText.forEach(item => result.push(item)); // manual-only additions
    return result;
  }

  // Routine: live from template
  const templateItems = catMeta?.items || [];
  if (!templateItems.length) return [];
  const rdoneKey = `_rdone_${cat}`;
  let doneSet = new Set();
  if (Array.isArray(dayData[rdoneKey])) {
    doneSet = new Set(dayData[rdoneKey]);
  } else {
    // Legacy: text-match from stored items
    const stored = dayData[cat] || [];
    templateItems.forEach((ti, idx) => {
      const text = typeof ti === 'object' ? ti.text : String(ti);
      if (stored.some(si => si.text === text && si.done)) doneSet.add(idx);
    });
  }
  return templateItems.map((ti, idx) => {
    if (typeof ti === 'object' && ti.type === 'separator') return { ...ti, _frame: true };
    const base = typeof ti === 'object' ? { text: ti.text || '', url: ti.url || '' } : { text: String(ti), url: '' };
    return { ...base, done: doneSet.has(idx), _frame: true };
  });
}

function renderDayCell(d, isToday, isWeek, isCurrent) {
  const dayData = getDayData(d, isCurrent !== false);
  const dow = new Date(currentYear, currentMonth - 1, d).getDay();
  const effectiveType = getEffectiveDayType(dayData, d);
  const typeClass = effectiveType ? ` type-${effectiveType}` : '';
  const todayClass = isToday ? ' today' : '';
  const holidayClass = getHoliday(d) ? ' is-holiday' : '';
  const otherClass = isCurrent === false ? ' other-month' : '';

  return `<div class="day-cell${todayClass}${typeClass}${holidayClass}${otherClass}" data-day="${d}" ondragover="dayDragOver(event)" ondragleave="dayDragLeave(event)" ondrop="dayDrop(event,${d})">${renderDayCellContent(d, isToday, isWeek, isCurrent)}</div>`;
}

function renderDayCellContent(d, isToday, isWeek, isCurrent) {
  const dayData = getDayData(d, isCurrent !== false);
  const dow = new Date(currentYear, currentMonth - 1, d).getDay();
  const dowClass = dow === 0 ? ' sun' : dow === 6 ? ' sat' : '';

  const _effType = getEffectiveDayType(dayData, d);
  const badgeHtml = _effType
    ? ` <span class="day-type-badge ${TYPE_COLORS[_effType]}" onclick="event.stopPropagation();cycleDayType(${d})" style="${dayData.day_type ? '' : 'opacity:0.45'}">${TYPE_LABELS[_effType]}</span>`
    : '';
  let pastArrow = '';
  if (_pastToggleDay === d) {
    pastArrow = `<span onclick="event.stopPropagation();togglePastWeeks()" id="pastToggleIcon" style="cursor:pointer;color:#484f58;font-size:10px" title="Past weeks">&#9650;</span>`;
  }
  const holiday = getHoliday(d);
  const soEvts = getSoEvents(d);
  const yearlyEvts = getYearlyEvents(d);
  const monthlyRec = getMonthlyRecurring(d);
  const weeklyRec = getWeeklyRecurring(d);
  // Inject recurring into day data if not already present
  const recItems = [
    ...yearlyEvts.map(e => ({ ...e, _src: 'yearly' })),
    ...monthlyRec.map(e => ({ ...e, _src: 'monthly' })),
    ...weeklyRec.map(e => ({ ...e, _src: 'weekly' })),
  ];
  if (recItems.length) {
    if (!dayData._recurring) dayData._recurring = [];
    recItems.forEach(r => {
      if (!dayData._recurring.some(x => x.text === r.text)) {
        dayData._recurring.push({ text: r.text, done: false, _src: r._src });
      }
    });
  }
  const progressBadge = '';
  // T3: #lesson tag indicator
  const notesText = dayData.notes || '';
  const lessonCount = (notesText.match(/#lesson/gi) || []).length;
  const lessonBadge = lessonCount > 0
    ? `<span class="lesson-badge" title="${lessonCount}개 레슨">L</span>`
    : '';
  const evtHtml = (holiday ? `<div class="holiday-name">${esc(holiday)}</div>` : '');
  const soBadges = soEvts.map(s => {
    const label = s.text.includes(':') ? s.text.split(':')[0].trim() : s.text.trim();
    return `<span class="so-date-badge">${esc(label)}</span>`;
  }).join('');
  let html = `<div class="day-num${dowClass}">
    <span>${d}${badgeHtml}${progressBadge}${lessonBadge}${soBadges}</span>
    <span>${pastArrow}<span class="add-btn" onclick="event.stopPropagation();addItemPrompt(${d})">+</span></span>
  </div>${evtHtml}`;

  // One Thing
  const ot = dayData.one_thing || '';
  html += `<div class="one-thing" contenteditable="true"
    onblur="saveOneThing(${d}, htmlToMarkdown(this.innerHTML))"
    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}else if(event.key.toLowerCase()==='k'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.stopPropagation();openOneThingLinkPopup(event,${d});}"
  >${linkify(ot)}</div>`;

  // Categories
  const SRC_COLORS = { yearly: '#f0c040', monthly: '#bc8cff', weekly: '#6e7681' };
  const recArr = dayData._recurring || [];
  const _renderedCats = new Set();

  for (const cat of CATS) {
    const items = getCatItemsForRender(d, dayData, cat);
    const isFutureOrToday = isToday || new Date(currentYear, currentMonth - 1, d) >= new Date(new Date().toDateString());
    if (items.length === 0 && recArr.length === 0 && !isFutureOrToday) continue;
    if (items.length === 0 && cat !== 'outcome' && !isFutureOrToday) continue;

    _renderedCats.add(cat);
    html += `<div class="category cat-${cat}">
      <div class="cat-label cl-${cat}">
        <span>${CAT_NAMES[cat]}</span>
        <span class="cat-add" onclick="addSeparatorItem(${d},'${cat}')" title="구분선 추가" style="font-size:9px;color:#484f58;margin-right:1px">—</span>
        <span class="cat-add" onclick="addItemInline(${d},'${cat}')">+</span>
      </div>`;

    // Recurring items (yearly/monthly/weekly) injected into outcome
    if (cat === 'outcome') {
      recArr.forEach((item, idx) => {
        const doneClass = item.done ? 'done' : '';
        const clr = SRC_COLORS[item._src] || '#6e7681';
        html += `<div class="item ${doneClass}" style="border-left:2px solid ${clr}">
          <input type="checkbox" ${item.done?'checked':''} onchange="toggleRecurring(${d},${idx})" aria-label="${esc(item.text)}">
          <span class="src-dot" style="background:${clr}"></span>
          <span class="item-text" contenteditable="true" style="color:${clr}"
            onblur="editRecurring(${d},${idx},this.textContent)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}if(event.key==='Escape'){this.blur();}"
          >${linkify(item.text)}</span>
          <span class="del-btn" onclick="delRecurring(${d},${idx})">&#215;</span>
        </div>`;
      });
    }

    // Future days: collapse _frame items into a toggleable badge
    const _ftd = new Date(); _ftd.setHours(0,0,0,0);
    const _fcd = new Date(currentYear, currentMonth - 1, d); _fcd.setHours(0,0,0,0);
    const _isFuture = isCurrent !== false && _fcd > _ftd;
    const _frameItems = _isFuture ? items.filter(i => i._frame) : [];
    const _nonSepFrame = _frameItems.filter(i => i.type !== 'separator');
    if (_frameItems.length > 0) {
      const _tid = `ft-${d}-${cat}`;
      html += `<div id="${_tid}" class="frame-group-body">`;
      _frameItems.forEach(item => {
        const idx = items.indexOf(item);
        if (item.type === 'separator') {
          html += `<div class="item-separator"><span class="sep-label">${esc(item.text || '')}</span><span class="sep-line"></span></div>`;
          return;
        }
        html += `<div class="item${item.done?' done':''}" data-d="${d}" data-cat="${cat}" data-idx="${idx}">
          <input type="checkbox" ${item.done?'checked':''} onchange="toggleItem(${d},'${cat}',${idx})" aria-label="${esc(item.text)}">
          <span class="item-text frame-text" contenteditable="true"
            onblur="editFrameItemFromCalendar(${d},'${cat}',${idx},htmlToMarkdown(this.innerHTML))"
            onkeydown="handleItemKey(event,${d},'${cat}',${idx})"
          >${item.url && !item.text.includes('](') ? `<a href="${esc(item.url)}" target="_blank" onmousedown="event.preventDefault();window.open(this.href,'_blank')" onclick="event.stopPropagation()">${esc(item.text)}</a>` : linkify(item.text)}</span>
          <span class="del-btn" onclick="delItem(${d},'${cat}',${idx})">&#215;</span>
        </div>`;
      });
      html += '</div>';
    }
    const _renderItems = _isFuture ? items.filter(i => !i._frame) : items;
    _renderItems.forEach((item, _vi) => {
      const idx = _isFuture ? items.indexOf(item) : _vi;
      // Separator item — render as horizontal divider
      if (item.type === 'separator') {
        html += `<div class="item-separator" data-d="${d}" data-cat="${cat}" data-idx="${idx}" draggable="false" ondragstart="dragStart(event,${d},'${cat}',${idx})" ondragend="dragEnd(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event,${d},'${cat}',${idx})" onclick="this.querySelector('.sep-label').focus()"><span class="sep-label" data-drag-handle contenteditable="true" data-placeholder="구분선 텍스트..." onblur="editSeparatorItem(${d},'${cat}',${idx},this.textContent)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${esc(item.text || '')}</span><span class="sep-line"></span><span class="del-btn" onclick="event.stopPropagation();delItem(${d},'${cat}',${idx})">&#215;</span></div>`;
        return;
      }
      const doneClass = item.done ? 'done' : '';
      const carriedClass = item._carried ? 'is-carried' : '';
      const checked = item.done ? 'checked' : '';
      const blurFn = item._frame
        ? `editFrameItemFromCalendar(${d},'${cat}',${idx},htmlToMarkdown(this.innerHTML))`
        : `editItem(${d},'${cat}',${idx},htmlToMarkdown(this.innerHTML))`;
      html += `<div class="item ${doneClass} ${carriedClass}" draggable="false"
        data-d="${d}" data-cat="${cat}" data-idx="${idx}"
        ondragstart="dragStart(event,${d},'${cat}',${idx})"
        ondragend="dragEnd(event)"
        ondragover="dragOver(event)" ondragleave="dragLeave(event)"
        ondrop="drop(event,${d},'${cat}',${idx})">
        <input type="checkbox" ${checked} data-drag-handle onchange="toggleItem(${d},'${cat}',${idx})" aria-label="${esc(item.text)}">
        <span class="item-text${item.url?' has-link':''}${item._frame?' frame-text':''}" contenteditable="true"
          onblur="${blurFn}"
          onkeydown="handleItemKey(event,${d},'${cat}',${idx})"
          onpaste="handleItemPaste(event,${d},'${cat}',${idx})"
        >${item.url && !item.text.includes('](') ? `<a href="${esc(item.url)}" target="_blank" onmousedown="event.preventDefault();window.open(this.href,'_blank')" onclick="event.stopPropagation()">${esc(item.text)}</a>` : linkify(item.text)}</span>
        <span class="del-btn" onclick="delItem(${d},'${cat}',${idx})">&#215;</span>
      </div>`;
    });

    html += `<div class="new-item" id="new-${d}-${cat}">
      <textarea rows="1" placeholder="..." aria-label="${CAT_NAMES[cat]} 새 항목"
        style="resize:none;overflow:hidden;background:transparent;border:none;color:#e0e0e0;font-size:12px;padding:0;width:100%;box-sizing:border-box;font-family:inherit;outline:none"
        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitDayCatTextarea(this,${d},'${cat}');}"
        onblur="setTimeout(()=>this.parentElement.classList.remove('active'),100)"></textarea>
    </div></div>`;
  }

  // Empty cats for today — skip cats already rendered by main loop
  if (isToday) {
    for (const cat of CATS) {
      if (_renderedCats.has(cat)) continue; // already rendered above
      if (cat === 'outcome' && recArr.length > 0) continue; // already rendered with recurring
      html += `<div class="category cat-${cat}"><div class="cat-label cl-${cat}"><span>${CAT_NAMES[cat]}</span>
        <span class="cat-add" onclick="addSeparatorItem(${d},'${cat}')" title="구분선 추가" style="font-size:9px;color:#484f58;margin-right:1px">—</span>
        <span class="cat-add" onclick="addItemInline(${d},'${cat}')">+</span></div>
        <div class="new-item" id="new-${d}-${cat}"><textarea rows="1" placeholder="..." aria-label="${CAT_NAMES[cat]} 새 항목"
          style="resize:none;overflow:hidden;background:transparent;border:none;color:#e0e0e0;font-size:12px;padding:0;width:100%;box-sizing:border-box;font-family:inherit;outline:none"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitDayCatTextarea(this,${d},'${cat}');}"
          onblur="setTimeout(()=>this.parentElement.classList.remove('active'),100)"></textarea></div></div>`;
    }
  }

  // Notes (T3: highlight #lesson tags)
  const notes = dayData.notes || '';
  const notesCls = notes ? 'day-notes has-content' : 'day-notes';
  const notesHtml = esc(notes).replace(/\n/g,'<br>').replace(/#lesson/gi, '<span class="note-lesson-tag">#lesson</span>');
  html += `<div class="${notesCls}" id="notes-${d}" contenteditable="true"
    onblur="saveNotes(${d}, this.innerText)"
    onkeydown="if(event.key==='Escape')this.blur()"
  >${notesHtml}</div>`;

  return html;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function htmlToMarkdown(html) {
  // Convert <a href="url">text</a> back to [text](url), strip remaining tags
  return html
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .trim();
}

function linkify(s) {
  s = (s || '').replace(/&nbsp;/g, ' ');
  // Handle [text](url) markdown links (any url), then bare URLs
  let result = '';
  let last = 0;
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    result += esc(s.slice(last, m.index));
    if (/^https?:\/\//.test(m[2])) {
      result += `<a href="${esc(m[2])}" target="_blank" onmousedown="event.preventDefault();window.open(this.href,'_blank')" onclick="event.stopPropagation()">${esc(m[1])}</a>`;
    } else {
      result += esc(m[1]); // non-http URL: show text only
    }
    last = m.index + m[0].length;
  }
  result += esc(s.slice(last));
  // Bare URLs not already inside an anchor
  result = result.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<"&]+)/g,
    '<a href="$1" target="_blank" onmousedown="event.preventDefault();window.open(this.href,\'_blank\')" onclick="event.stopPropagation()">$1</a>');
  return result;
}

// --- Stats ---
function renderStats() {
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  let total=0, done=0;
  const catStats = {};
  CATS.forEach(c => catStats[c] = {total:0, done:0});
  const dailyDone = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dd = monthData.days[String(d)] || {};
    let dayDone = 0, dayTotal = 0;
    for (const cat of CATS) {
      const items = dd[cat] || [];
      total += items.length; catStats[cat].total += items.length;
      dayTotal += items.length;
      const dc = items.filter(i=>i.done).length;
      done += dc; catStats[cat].done += dc;
      dayDone += dc;
    }
    dailyDone.push(dayTotal > 0 ? dayDone / dayTotal : 0);
  }

  let html = '';

  // Mini heatmap
  html += '<span class="heatmap">';
  for (let d = 0; d < dailyDone.length; d++) {
    const pct = dailyDone[d];
    const level = pct === 0 ? 0 : pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4;
    html += `<div class="heat-cell heat-${level}" title="Day ${d+1}: ${Math.round(pct*100)}%"></div>`;
  }
  html += '</span>';

  document.getElementById('stats').innerHTML = html;
}

// --- Data operations ---
const TOKEN_KEY = 'cortex.dashboard.token';
function authHeaders() {
  const token = window.CORTEX_AUTH_TOKEN || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
  const headers = { 'Content-Type':'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
let _authPromptShown = false;
async function retryAuth(res, url) {
  if (res.status !== 401) return false;
  console.error('[cortex] 401 from:', url);
  if (_authPromptShown) return false; // 세션당 1회만
  _authPromptShown = true;
  const token = prompt('Cortex access token');
  if (!token) return false;
  localStorage.setItem(TOKEN_KEY, token.trim());
  return true;
}
const _rawFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const next = { ...init };
  if (url.includes('/api/')) next.headers = { ...(next.headers || {}), ...authHeaders() };
  const res = await _rawFetch(input, next);
  if (res.status === 401 && await retryAuth(res, url)) {
    if (url.includes('/api/')) next.headers = { ...(next.headers || {}), ...authHeaders() };
    return _rawFetch(input, next);
  }
  return res;
};
const AUTH = authHeaders; // legacy alias — use authHeaders() directly

async function save() {
  const dayCount = Object.keys(monthData.days || {}).length;
  let itemCount = 0;
  for (const dd of Object.values(monthData.days || {})) {
    for (const k of Object.keys(dd)) {
      if (Array.isArray(dd[k])) itemCount += dd[k].length;
    }
  }
  if (dayCount === 0 && itemCount === 0) {
    console.warn('save() blocked: empty');
    return;
  }
  try {
    // workout은 workout-log 독립 저장소에서 관리 — month 데이터에서 제거
    const safeData = { ...monthData, days: {} };
    for (const [k, dd] of Object.entries(monthData.days || {})) {
      const { workout, ...rest } = dd;
      safeData.days[k] = rest;
    }
    const res = await fetch(`${API}/api/month`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ ym: ym(), data: safeData })
    });
    if (!res.ok) throw new Error(res.status);
    return true;
  } catch (e) {
    document.title = '⚠ Save failed!';
    setTimeout(() => document.title = 'Cortex — Ritual & Routine', 3000);
    showToast('저장 실패', true);
    return false;
  }
}

function ensureDay(d) {
  const key = String(d);
  if (!monthData.days[key]) monthData.days[key] = {};
  return monthData.days[key];
}

async function toggleItem(d, cat, idx) {
  const _sy = window.scrollY || window.pageYOffset;
  const _mx = document.getElementById('main')?.scrollTop || 0;
  const dayData = ensureDay(d);
  const catType = getDayCatType(d, dayData, cat);
  if (catType === 'todo') {
    if (!dayData[cat]?.[idx]) return;
    dayData[cat][idx].done = !dayData[cat][idx].done;
  } else {
    const key = `_rdone_${cat}`;
    if (!dayData[key]) dayData[key] = [];
    const pos = dayData[key].indexOf(idx);
    if (pos === -1) dayData[key].push(idx); else dayData[key].splice(pos, 1);
  }
  await save(); render();
  requestAnimationFrame(() => { window.scrollTo(0, _sy); const m = document.getElementById('main'); if (m) m.scrollTop = _mx; });
}

async function toggleRecurring(d, idx) {
  const _sy = window.scrollY || window.pageYOffset;
  const _mx = document.getElementById('main')?.scrollTop || 0;
  const dd = ensureDay(d);
  if (!dd._recurring) return;
  dd._recurring[idx].done = !dd._recurring[idx].done;
  await save(); render();
  requestAnimationFrame(() => { window.scrollTo(0, _sy); const m = document.getElementById('main'); if (m) m.scrollTop = _mx; });
}
async function editRecurring(d, idx, text) {
  const dd = ensureDay(d);
  if (!dd._recurring?.[idx]) return;
  const trimmed = text.trim();
  if (!trimmed || trimmed === dd._recurring[idx].text) return;
  dd._recurring[idx].text = trimmed;
  await save();
}
async function delRecurring(d, idx) {
  const dd = ensureDay(d);
  if (!dd._recurring) return;
  dd._recurring.splice(idx, 1);
  await save(); render();
}

// --- Link popup ---
let linkTarget = null;
let longPressTimer = null;

function openOneThingLinkPopup(event, d) {
  // Insert [text](url) markdown at cursor position in one-thing field
  const sel = window.getSelection();
  const selectedText = sel && sel.rangeCount ? sel.toString() : '';
  const url = prompt('URL 입력:', 'https://');
  if (!url) return;
  const label = selectedText || prompt('링크 텍스트:', '') || url;
  const dd = ensureDay(d);
  const current = dd.one_thing || '';
  dd.one_thing = current + (current ? ' ' : '') + `[${label}](${url})`;
  save().then(() => render());
}

let ctrlkTarget = null;
function openLinkPopupFromSpan(span, d, cat, idx) {
  // Ctrl+K: attach URL to item using the link popup (no prompt)
  const sel = window.getSelection();
  const selectedText = sel && sel.rangeCount ? sel.toString().trim() : '';
  const dayData = monthData.days?.[String(d)] || {};
  const catType = getDayCatType(d, dayData, cat);
  ctrlkTarget = { d, cat, idx, catType, selectedText };
  const popup = document.getElementById('linkPopup');
  const input = document.getElementById('linkUrl');
  // Prefill existing URL
  let currentUrl = '';
  if (catType === 'routine') {
    const ft = getFrameTypeForDay(d, dayData);
    const fi = framesData?.[ft]?.categories?.[cat]?.items?.[idx];
    if (fi && typeof fi === 'object') currentUrl = fi.url || '';
  } else {
    const items = getCatItemsForRender(d, dayData, cat);
    if (items[idx]) currentUrl = items[idx].url || '';
  }
  input.value = currentUrl;
  popup.dataset.mode = 'ctrlk';
  popup.classList.add('open');
  const rect = span.getBoundingClientRect();
  popup.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';
  popup.style.top = Math.min(rect.bottom + 4, window.innerHeight - 120) + 'px';
  setTimeout(() => input.focus(), 50);
}

function openLinkPopup(event, d, cat, idx) {
  const item = ensureDay(d)[cat]?.[idx];
  if (!item) return;
  linkTarget = { d, cat, idx };
  const popup = document.getElementById('linkPopup');
  const input = document.getElementById('linkUrl');
  input.value = item.url || '';
  popup.classList.add('open');
  // Position near click/touch — check changedTouches first (touchend), then touches, then clientX
  const touch = event.changedTouches?.[0] || event.touches?.[0];
  const cx = event.clientX || touch?.clientX || window.innerWidth / 2;
  const cy = event.clientY || touch?.clientY || window.innerHeight / 2;
  popup.style.left = Math.min(cx, window.innerWidth - 300) + 'px';
  popup.style.top = Math.min(cy, window.innerHeight - 120) + 'px';
  setTimeout(() => input.focus(), 50);
}

function closeLinkPopup() {
  const popup = document.getElementById('linkPopup');
  popup.classList.remove('open');
  popup.dataset.mode = '';
  linkTarget = null;
  frameLinkTarget = null;
  ctrlkTarget = null;
  mrLinkIdx = null;
}

async function saveLink() {
  const popup = document.getElementById('linkPopup');
  const url = document.getElementById('linkUrl').value.trim();
  if (popup.dataset.mode === 'mr' && mrLinkIdx !== null) {
    standingData.monthly_recurring[mrLinkIdx].url = url;
    saveStandingData(); renderStandingOrders(); closeLinkPopup();
    return;
  }
  if (popup.dataset.mode === 'frame' && frameLinkTarget) {
    const { ftype, cat, idx } = frameLinkTarget;
    const item = getFrameItem(ftype, cat, idx);
    item.url = url;
    setFrameItem(ftype, cat, idx, item);
    saveFramesData(); renderFrames(); closeLinkPopup();
    return;
  }
  if (popup.dataset.mode === 'ctrlk' && ctrlkTarget) {
    const { d, cat, idx, catType, selectedText } = ctrlkTarget;
    if (catType === 'routine') {
      const dayData = monthData.days?.[String(d)] || {};
      const ft = getFrameTypeForDay(d, dayData);
      const fItems = framesData?.[ft]?.categories?.[cat]?.items;
      if (fItems && idx < fItems.length) {
        if (typeof fItems[idx] !== 'object') fItems[idx] = { text: String(fItems[idx]), url: '' };
        fItems[idx].url = url;
        if (selectedText) fItems[idx].text = selectedText;
      }
      saveFramesData(); renderFrames(); render();
    } else {
      const item = ensureDay(d)[cat]?.[idx];
      if (item) { item.url = url; if (selectedText) item.text = selectedText; }
      await save(); render();
    }
    closeLinkPopup();
    return;
  }
  if (!linkTarget) return;
  const { d, cat, idx } = linkTarget;
  ensureDay(d)[cat][idx].url = url;
  await save(); render(); closeLinkPopup();
}

async function removeLink() {
  const popup = document.getElementById('linkPopup');
  if (popup.dataset.mode === 'mr' && mrLinkIdx !== null) {
    delete standingData.monthly_recurring[mrLinkIdx].url;
    saveStandingData(); renderStandingOrders(); closeLinkPopup();
    return;
  }
  if (popup.dataset.mode === 'frame' && frameLinkTarget) {
    const { ftype, cat, idx } = frameLinkTarget;
    const item = getFrameItem(ftype, cat, idx);
    item.url = '';
    setFrameItem(ftype, cat, idx, item);
    saveFramesData(); renderFrames(); closeLinkPopup();
    return;
  }
  if (popup.dataset.mode === 'ctrlk' && ctrlkTarget) {
    const { d, cat, idx, catType } = ctrlkTarget;
    if (catType === 'routine') {
      const dayData = monthData.days?.[String(d)] || {};
      const ft = getFrameTypeForDay(d, dayData);
      const fItems = framesData?.[ft]?.categories?.[cat]?.items;
      if (fItems && idx < fItems.length && typeof fItems[idx] === 'object') fItems[idx].url = '';
      saveFramesData(); renderFrames(); render();
    } else {
      const item = ensureDay(d)[cat]?.[idx];
      if (item) item.url = '';
      await save(); render();
    }
    closeLinkPopup();
    return;
  }
  if (!linkTarget) return;
  const { d, cat, idx } = linkTarget;
  ensureDay(d)[cat][idx].url = '';
  await save(); render(); closeLinkPopup();
}

function startLongPress(event, d, cat, idx) {
  longPressTimer = setTimeout(() => {
    event.preventDefault();
    openLinkPopup(event, d, cat, idx);
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}

async function editItem(d, cat, idx, newText) {
  if (!newText.trim()) return;
  const item = ensureDay(d)[cat]?.[idx];
  if (!item) return;
  const t = newText.trim();
  // htmlToMarkdown re-encodes <a href="url">text</a> → [text](url)
  // Extract and store properly to avoid rendering [text](url) as link text
  const mdLink = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (mdLink) {
    const [, label, url] = mdLink;
    if (item.text === label && item.url === url) return;
    item.text = label; item.url = url;
    await save(); render(); return;
  }
  if (item.text === t) return;
  // Auto-detect URL pasted into existing item
  const urlMatch = t.match(/^(https?:\/\/\S+)$/);
  const embeddedMatch = !urlMatch && t.match(/(https?:\/\/\S+)/);
  if (urlMatch && !item.url) item.url = t;
  else if (embeddedMatch && !item.url) item.url = embeddedMatch[1];
  item.text = t;
  await save(); render();
}

async function editFrameItemFromCalendar(d, cat, idx, newText) {
  const dayData = monthData.days?.[String(d)] || {};
  const ft = getFrameTypeForDay(d, dayData);
  const catType = getDayCatType(d, dayData, cat);
  const mdLink = newText.trim().match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const newTrimmed = mdLink ? mdLink[1] : newText.trim();
  if (!newTrimmed) return;

  if (catType === 'routine') {
    // Live routine: edit template directly by index
    const fItems = framesData?.[ft]?.categories?.[cat]?.items;
    if (!fItems || idx >= fItems.length) return;
    const cur = typeof fItems[idx] === 'object' ? fItems[idx].text : fItems[idx];
    if (newTrimmed === cur && !mdLink) return;
    if (typeof fItems[idx] === 'object') { fItems[idx].text = newTrimmed; if (mdLink) fItems[idx].url = mdLink[2]; }
    else fItems[idx] = mdLink ? { text: newTrimmed, url: mdLink[2] } : newTrimmed;
    // 6 Pillars sync across frame types
    if (cat === 'hexagonal') {
      const firstSep = fItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
      const syncBefore = firstSep === -1 ? fItems.length : firstSep;
      if (idx < syncBefore) {
        FRAME_TYPES.forEach(ft2 => {
          if (ft2 === ft) return;
          const ft2Items = framesData[ft2]?.categories?.hexagonal?.items;
          if (!ft2Items || idx >= ft2Items.length) return;
          const ft2Sep = ft2Items.findIndex(i => typeof i === 'object' && i.type === 'separator');
          if (ft2Sep === -1 || idx < ft2Sep) {
            if (typeof ft2Items[idx] === 'object') ft2Items[idx].text = newTrimmed;
            else ft2Items[idx] = newTrimmed;
          }
        });
      }
    }
    await saveFramesData();
    renderFrames(); render();
    return;
  }

  // Todo: check if item is a _frame copy or manual
  const item = ensureDay(d)[cat]?.[idx];
  if (!item?._frame) { editItem(d, cat, idx, newText); return; }
  const oldText = item.text;
  if (!newTrimmed || newTrimmed === oldText) return;
  const fItems = framesData?.[ft]?.categories?.[cat]?.items;
  if (!fItems) return;
  const fi = fItems.findIndex(i => (typeof i === 'object' ? i.text : i) === oldText);
  if (fi < 0) return;
  if (typeof fItems[fi] === 'object') fItems[fi].text = newTrimmed;
  else fItems[fi] = newTrimmed;
  await saveFramesData();
  const today = new Date().getDate();
  const [y, m] = ym().split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  await fetch(`${API}/api/inject-frames`, { method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), fromDay: today, toDay: daysInMonth }) });
  await loadMonth();
}

function toggleEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

async function handleItemKey(e, d, cat, idx) {
  if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    e.stopPropagation();
    openLinkPopupFromSpan(e.target, d, cat, idx);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const sel = window.getSelection();
    const fullText = e.target.textContent;
    // Use Range for accurate cursor offset — sel.focusOffset is node-relative, breaks with <a> tags
    let beforeText = fullText;
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(e.target);
      preRange.setEnd(range.startContainer, range.startOffset);
      beforeText = preRange.toString();
    }
    const before = beforeText.trim();
    const after = fullText.slice(beforeText.length).trim();
    // Suppress onblur so editItem doesn't overwrite our split when DOM rebuilds
    e.target.onblur = null;
    // Update current item with text before cursor
    const day = ensureDay(d);
    if (!day[cat]) day[cat] = [];
    day[cat][idx].text = before;
    // Insert new item with text after cursor
    day[cat].splice(idx + 1, 0, { text: after, url: '', done: false });
    save().then(() => {
      render();
      setTimeout(() => {
        const newItem = document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${idx + 1}"]`);
        if (newItem) {
          const _sy = window.scrollY || window.pageYOffset;
          const _mx = document.getElementById('main')?.scrollTop || 0;
          const cellEl = newItem.closest('.day-cell[data-day]');
          const _cellScroll = cellEl?.scrollTop || 0;
          newItem.querySelector('.item-text')?.focus({ preventScroll: true });
          requestAnimationFrame(() => {
            window.scrollTo(0, _sy);
            const mainEl = document.getElementById('main');
            if (mainEl) mainEl.scrollTop = _mx;
            if (cellEl) cellEl.scrollTop = _cellScroll;
          });
        }
      }, 50);
    });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx > 0) {
      document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${idx-1}"]`)
        ?.querySelector('.item-text')?.focus({ preventScroll: true });
    } else {
      // Navigate to last item of previous category in same day
      const catIdx = CATS.indexOf(cat);
      for (let ci = catIdx - 1; ci >= 0; ci--) {
        const prevCat = CATS[ci];
        const prevItems = document.querySelectorAll(`.item[data-d="${d}"][data-cat="${prevCat}"]`);
        if (prevItems.length > 0) {
          prevItems[prevItems.length - 1].querySelector('.item-text')?.focus({ preventScroll: true });
          break;
        }
      }
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextEl = document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${idx+1}"]`);
    if (nextEl) {
      nextEl.querySelector('.item-text')?.focus({ preventScroll: true });
    } else {
      // Navigate to first item of next category in same day
      const catIdx = CATS.indexOf(cat);
      for (let ci = catIdx + 1; ci < CATS.length; ci++) {
        const nextCat = CATS[ci];
        const firstEl = document.querySelector(`.item[data-d="${d}"][data-cat="${nextCat}"][data-idx="0"]`);
        if (firstEl) { firstEl.querySelector('.item-text')?.focus({ preventScroll: true }); break; }
      }
    }
  } else if (e.key === 'Backspace' && e.target.textContent.trim() === '') {
    e.preventDefault(); delItem(d, cat, idx, true);
  } else if (e.altKey && e.key === '1') {
    e.preventDefault(); toggleItem(d, cat, idx);
  }
}

async function addNewItemAfter(d, cat, afterIdx) {
  const day = ensureDay(d);
  if (!day[cat]) day[cat] = [];
  day[cat].splice(afterIdx + 1, 0, { text: '', url: '', done: false });
  await save(); render();
  setTimeout(() => {
    const items = document.querySelectorAll(`.item[draggable]`);
    // Find the right item by scanning
    let count = 0;
    for (const item of items) {
      const span = item.querySelector('.item-text');
      if (span && span.textContent === '') { span.focus(); break; }
    }
  }, 50);
}

// Parse a single pasted line → { text, url }
function parsePasteLine(line) {
  const mdLink = line.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  if (mdLink) return { text: mdLink[1], url: mdLink[2] };
  const bareUrl = line.match(/^(https?:\/\/\S+)$/);
  if (bareUrl) return { text: '', url: bareUrl[1] };
  const inlineUrl = line.match(/(https?:\/\/\S+)/);
  if (inlineUrl) {
    const url = inlineUrl[1];
    const text = line.replace(url, '').trim();
    return { text: text || url, url };
  }
  return { text: line, url: '' };
}

async function handleItemPaste(event, d, cat, idx) {
  const raw = event.clipboardData.getData('text/plain');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length <= 1) return; // 한 줄이면 기본 paste 동작 유지
  event.preventDefault();

  const dayData = ensureDay(d);
  if (!dayData[cat]) dayData[cat] = [];

  // 현재 아이템이 _frame이면 일반 아이템으로 처리 불가 → 새 아이템만 삽입
  const currentItem = dayData[cat][idx];
  const firstParsed = parsePasteLine(lines[0]);

  if (currentItem && !currentItem._frame) {
    // 첫 번째 줄로 현재 아이템 업데이트
    currentItem.text = firstParsed.text || firstParsed.url;
    if (firstParsed.url) currentItem.url = firstParsed.url;
    // 나머지 줄을 현재 아이템 바로 뒤에 삽입
    const newItems = lines.slice(1).map(l => {
      const p = parsePasteLine(l);
      return { text: p.text || p.url, url: p.url, done: false };
    });
    dayData[cat].splice(idx + 1, 0, ...newItems);
  } else {
    // frame 아이템이거나 없는 경우 → 현재 위치 뒤에 전부 삽입
    const newItems = lines.map(l => {
      const p = parsePasteLine(l);
      return { text: p.text || p.url, url: p.url, done: false };
    });
    dayData[cat].splice(idx + 1, 0, ...newItems);
  }

  // blur 억제 (onblur가 덮어쓰지 않도록)
  event.target.onblur = null;
  await save(); render();
}

async function editSeparatorItem(d, cat, idx, text) {
  const dayData = ensureDay(d);
  const catType = getDayCatType(d, dayData, cat);
  if (catType === 'routine') {
    // Routine separator → edit in frame template
    const ft = getFrameTypeForDay(d, dayData);
    const item = framesData?.[ft]?.categories?.[cat]?.items?.[idx];
    if (item && typeof item === 'object' && item.type === 'separator') {
      item.text = text.trim();
      saveFramesData();
    }
    return;
  }
  const item = dayData[cat]?.[idx];
  if (item && item.type === 'separator') { item.text = text.trim(); await save(); }
}

async function delItem(d, cat, idx, refocus) {
  const dayData = ensureDay(d);
  const catType = getDayCatType(d, dayData, cat);
  if (catType === 'routine') {
    const ft = getFrameTypeForDay(d, dayData);
    delFrameItem(ft, cat, idx);
    return;
  }
  // Track deleted item text in rejection list so it won't be re-carried from prev day
  const deletedItem = dayData[cat]?.[idx];
  const normText = t => (t || '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (deletedItem && !deletedItem.type) {
    const rejectKey = `_carry_rejects_${cat}`;
    const normalized = normText(deletedItem.text);
    // Add to NEXT day's reject list (carry logic reads target day's rejects)
    const nextDayData = monthData.days?.[String(d + 1)];
    if (nextDayData && normalized) {
      if (!nextDayData[rejectKey]) nextDayData[rejectKey] = [];
      if (!nextDayData[rejectKey].map(t => normText(t)).includes(normalized)) {
        nextDayData[rejectKey].push(deletedItem.text);
      }
      // Also remove already-saved _carried copies from future days
      for (let fd = d + 1; fd <= 31; fd++) {
        const fdd = monthData.days?.[String(fd)];
        if (!fdd || !fdd[cat]) continue;
        const before = fdd[cat].length;
        fdd[cat] = fdd[cat].filter(i => !(i._carried && normText(i.text) === normalized));
        if (fdd[cat].length !== before) {
          const frk = `_carry_rejects_${cat}`;
          if (!fdd[frk]) fdd[frk] = [];
          if (!fdd[frk].map(t => normText(t)).includes(normalized)) fdd[frk].push(deletedItem.text);
        }
      }
    }
  }
  dayData[cat].splice(idx, 1);
  await save(); render();
  if (refocus) {
    setTimeout(() => {
      const day = ensureDay(d);
      const len = (day[cat] || []).length;
      const targetIdx = len === 0 ? null : idx > 0 ? idx - 1 : 0;
      if (targetIdx !== null) {
        const el = document.querySelector(`.item[data-d="${d}"][data-cat="${cat}"][data-idx="${targetIdx}"]`);
        el?.querySelector('.item-text')?.focus({ preventScroll: true });
      }
    }, 50);
  }
}

async function addNewItem(d, cat, text) {
  if (!text.trim()) return;
  const dayData = ensureDay(d);
  const catType = getDayCatType(d, dayData, cat);
  if (catType === 'routine') {
    const ft = getFrameTypeForDay(d, dayData);
    addFrameItem(ft, cat, text.trim());
    return;
  }
  const day = dayData;
  if (!day[cat]) day[cat] = [];
  const t = text.trim();
  // text___ syntax → separator item
  const sepMatch = t.match(/^(.*?)_{3,}$/);
  if (sepMatch) {
    day[cat].push({ text: sepMatch[1].trim(), type: 'separator', done: false });
    await save(); render(); return;
  }
  // Auto-detect URL: if entire input is a URL, set as url+text
  const urlMatch = t.match(/^(https?:\/\/\S+)$/);
  // Or extract URL from mixed text: "label https://..."
  const mixedMatch = !urlMatch && t.match(/^(.+?)\s+(https?:\/\/\S+)$/);
  const embeddedMatch = !urlMatch && !mixedMatch && t.match(/(https?:\/\/\S+)/);
  if (urlMatch) {
    day[cat].push({ text: t, url: t, done: false });
  } else if (mixedMatch) {
    day[cat].push({ text: mixedMatch[1].trim(), url: mixedMatch[2], done: false });
  } else if (embeddedMatch) {
    day[cat].push({ text: t, url: embeddedMatch[1], done: false });
  } else {
    day[cat].push({ text: t, url: '', done: false });
  }
  await save(); render();
}

function addItemInline(d, cat) {
  const c = document.getElementById(`new-${d}-${cat}`);
  if (c) {
    c.classList.add('active');
    const el = c.querySelector('textarea') || c.querySelector('input');
    if (el) el.focus();
  }
}

async function submitDayCatTextarea(el, d, cat) {
  const lines = el.value.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (!lines.length) return;
  for (const line of lines) {
    await addNewItem(d, cat, line);
  }
  el.value = '';
  el.style.height = 'auto';
  el.closest('.new-item')?.classList.remove('active');
}

async function addSeparatorItem(d, cat) {
  const day = ensureDay(d);
  if (!day[cat]) day[cat] = [];
  day[cat].push({ text: '', type: 'separator', done: false });
  await save(); render();
}

function addItemPrompt(d) {
  ensureDay(d);
  render();
  setTimeout(() => {
    for (const cat of CATS) {
      const c = document.getElementById(`new-${d}-${cat}`);
      if (c) { c.classList.add('active'); const el = c.querySelector('textarea') || c.querySelector('input'); if (el) el.focus(); return; }
    }
  }, 50);
}

async function saveGoalText(text) {
  if (!standingData) standingData = {};
  standingData.vision = text.trim();
  await saveStandingData();
}

async function saveOneThing(d, text) {
  const trimmed = text.trim();
  ensureDay(d).one_thing = trimmed; // keep in-memory in sync
  await fetch(`${API}/api/one-thing`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), day: String(d), text: trimmed })
  });
}

async function loadWorkoutLog() {
  try {
    const res = await fetch(`${API}/api/workout-log`, { headers: AUTH });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Auto-recovery 감지: 서버가 checkpoint에서 복구한 경우
    if (data._auto_recovered) {
      console.warn('[workout] 서버가 checkpoint에서 자동 복구함:', data._recovered_at);
      showToast('운동 기록이 자동 복구됐습니다 (' + (data._recovered_at || '') + ')');
      delete data._auto_recovered;
      delete data._recovered_at;
    }
    workoutLog = data;
  } catch (e) {
    console.error('[workout] loadWorkoutLog failed:', e);
    // workoutLog 기존 값 유지 — 실패 시 덮어쓰지 않음
  }
}

function renderWorkoutBar() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const wo = workoutLog[todayStr] || [];
  const WORKOUT_GROUPS = [
    { label: '전면', parts: [], color: 'blue' },
    { label: '측면', parts: [], color: 'blue' },
    { label: '후면', parts: [], color: 'blue' },
    { label: '등',   parts: [], color: 'green' },
    { label: '가슴', parts: [], color: 'green' },
  ];
  const el = document.getElementById('workoutBar');
  if (!el) return;
  let chips = '';
  let prevColor = null;
  WORKOUT_GROUPS.forEach(g => {
    if (prevColor && prevColor !== g.color) chips += `<span style="display:inline-block;width:6px"></span>`;
    prevColor = g.color;
    const isOn = wo.includes(g.label);
    chips += `<span class="workout-chip ${g.color}${isOn?' on':''}" onclick="toggleWorkout('${g.label}')">${g.label}</span>`;
    if (isOn && g.parts.length) {
      g.parts.forEach(p => {
        const pOn = wo.includes(g.label+'/'+p);
        chips += `<span class="workout-chip sub${pOn?' on':''}" onclick="toggleWorkout('${g.label}/${p}')">${p}</span>`;
      });
    }
  });
  el.innerHTML = chips;
}

async function toggleWorkout(part) {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!workoutLog[todayStr]) workoutLog[todayStr] = [];
  const wo = workoutLog[todayStr];
  const idx = wo.indexOf(part);
  if (idx >= 0) {
    wo.splice(idx, 1);
  } else {
    const BLUE_GROUP = ['전면', '측면', '후면'];
    const GREEN_GROUP = ['등', '가슴'];
    const group = BLUE_GROUP.includes(part) ? BLUE_GROUP : GREEN_GROUP.includes(part) ? GREEN_GROUP : null;
    if (group) {
      for (let gi = wo.length - 1; gi >= 0; gi--) {
        if (group.includes(wo[gi])) wo.splice(gi, 1);
      }
    }
    wo.push(part);
  }
  await fetch(`${API}/api/workout-log`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ date: todayStr, workout: wo })
  });
  renderWorkoutBar();
}

async function saveNotes(d, text) {
  const dd = ensureDay(d);
  const trimmed = text.trim();
  if (trimmed) dd.notes = trimmed; // keep in-memory in sync
  else delete dd.notes;
  await fetch(`${API}/api/notes`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), day: String(d), notes: trimmed })
  });
}

function toggleNotes(d) {
  const el = document.getElementById(`notes-${d}`);
  if (el) { el.classList.toggle('editing'); if (el.classList.contains('editing')) el.focus(); }
}

// --- Day Type ---
async function cycleDayType(d) {
  const dd = ensureDay(d);
  // block/flow는 요일 기반 자동 처리 — 수동 설정 불가. hf/vacation만 수동 허용.
  const MANUAL_TYPES = ['hf', 'vacation'];
  const current = dd.day_type || null;
  // 기존에 block/flow가 explicit으로 저장돼 있으면 null로 리셋 (자동값 복귀)
  if (current === 'block' || current === 'flow') {
    await fetch(`${API}/api/day-type`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ ym: ym(), day: String(d), type: null })
    });
    delete dd.day_type;
    await fetch(`${API}/api/inject-frames`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ ym: ym(), fromDay: d, toDay: d })
    });
    await loadMonth();
    render();
    return;
  }
  const idx = current ? MANUAL_TYPES.indexOf(current) : -1;
  const next = idx >= MANUAL_TYPES.length - 1 ? null : MANUAL_TYPES[idx + 1];

  await fetch(`${API}/api/day-type`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), day: String(d), type: next })
  });

  if (next) dd.day_type = next;
  else delete dd.day_type;

  // Auto-inject frame for this day
  await fetch(`${API}/api/inject-frames`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), fromDay: d, toDay: d })
  });
  await loadMonth();
  render();
}

// --- Drag and Drop ---
let dragData = null;
function dragStart(e, d, cat, idx) {
  dragData = { d, cat, idx };
  e.target.classList.add('dragging');
  e.target.classList.remove('drag-ready');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // required for firefox
}
function dragEnd(e) {
  e.target.draggable = false;
  e.target.classList.remove('dragging', 'drag-ready');
}
function dragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

// Drop on item (reorder within same day+cat)
async function drop(e, d, cat, toIdx) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if (!dragData) return;

  // Same day, same category → reorder
  if (dragData.d === d && dragData.cat === cat) {
    if (dragData.idx === toIdx) return;
    await fetch(`${API}/api/reorder`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ ym: ym(), day: String(d), category: cat, fromIdx: dragData.idx, toIdx })
    });
    const items = ensureDay(d)[cat];
    const [moved] = items.splice(dragData.idx, 1);
    items.splice(toIdx, 0, moved);
    render();
  }
  // Different day → move across days
  else {
    await fetch(`${API}/api/move-item`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ ym: ym(), fromDay: String(dragData.d), fromCat: dragData.cat, fromIdx: dragData.idx, toDay: String(d), toCat: cat })
    });
    await loadMonth();
  }
  dragData = null;
}

// Drop on day cell (move to that day's outcome)
function dayDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dayDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
async function dayDrop(e, d) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if (!dragData || dragData.d === d) return;
  await fetch(`${API}/api/move-item`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), fromDay: String(dragData.d), fromCat: dragData.cat, fromIdx: dragData.idx, toDay: String(d), toCat: dragData.cat })
  });
  await loadMonth();
  dragData = null;
}

// --- Search ---
let searchTimer;
async function undoMonth() {
  if (!confirm(`${ym()} 데이터를 직전 백업으로 복원할까요?`)) return;
  const res = await fetch(`${API}/api/undo`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym() })
  });
  const data = await res.json();
  if (data.ok) { showToast(`복원됨 (${data.restored_from})`); loadMonth(); }
  else showToast('백업 없음', true);
}

function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.add('open');
  document.getElementById('searchInput').focus();
}
function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
}
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(doSearch, 300);
}
async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (q.length < 2) { document.getElementById('searchResults').innerHTML = ''; return; }
  let data;
  try {
    const res = await fetch(`${API}/api/search/unified?q=${encodeURIComponent(q)}`);
    data = await res.json();
  } catch (e) {
    document.getElementById('searchResults').innerHTML = '<div style="color:#f85149;padding:12px">검색 오류: ' + esc(String(e)) + '</div>';
    return;
  }
  const container = document.getElementById('searchResults');
  let html = '';

  // Schedule results
  if (data.schedule?.length) {
    html += '<div style="font-size:10px;color:#f0c040;padding:4px 12px;font-weight:600">SCHEDULE</div>';
    html += data.schedule.map(r => {
      const matchHtml = r.matches.map(m => {
        const highlighted = esc(m.text).replace(new RegExp(escRegex(q), 'gi'), '<mark>$&</mark>');
        return `<div class="sr-match"><span class="sr-cat">${m.field}</span> ${highlighted}</div>`;
      }).join('');
      return `<div class="search-result" role="button" tabindex="0" onclick="goToResult('${r.ym}',${r.day})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goToResult('${r.ym}',${r.day})}">
        <div class="sr-date">${r.ym} / ${r.day}일</div>${matchHtml}</div>`;
    }).join('');
  }

  // Notes results
  if (data.notes?.length) {
    html += '<div style="font-size:10px;color:#58a6ff;padding:4px 12px;font-weight:600;margin-top:8px">NOTES</div>';
    html += data.notes.map(r => {
      const icon = r.type === 'dir' ? '&#128193;' : '&#128196;';
      const onclick = r.type === 'dir' ? `closeSearch();loadSidebarTree('${r.path}')` : `closeSearch();openNote('${r.path}')`;
      return `<div class="search-result" role="button" tabindex="0" onclick="${onclick}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
        <span>${icon}</span> <span>${esc(r.name)}</span>
        <span style="font-size:9px;color:#484f58;margin-left:8px">${esc(r.path)}</span></div>`;
    }).join('');
  }

  if (!html) html = '<div style="color:#484f58;text-align:center;padding:20px">No results</div>';
  container.innerHTML = html;
}
function goToResult(resultYm, day) {
  closeSearch();
  const [y, m] = resultYm.split('-').map(Number);
  currentYear = y; currentMonth = m;
  loadMonth();
}
function goToDay(day) {
  closeSearch();
  const el = document.querySelector(`.day-cell[data-day="${day}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function searchPage(q) {
  const qRegex = new RegExp(escRegex(q), 'gi');
  const results = [];
  document.querySelectorAll('.item-text').forEach(el => {
    if (qRegex.test(el.textContent)) {
      const cell = el.closest('.day-cell');
      if (cell) results.push({ el, day: cell.dataset.day });
    }
  });
  return results;
}

// --- Standing Orders Panel ---
function renderStandingOrders() {
  if (!standingData) return;
  const currentMonthNum = currentMonth;
  const ymKey = ym();

  let html = '<div class="tabs">';
  html += '<div class="tab active" onclick="showSOTab(\'standing\',this)">Standing</div>';
  html += '<div class="tab" onclick="showSOTab(\'weekly\',this)">Weekly</div>';
  html += '<div class="tab" onclick="showSOTab(\'monthly\',this)">Monthly</div>';
  html += '<div class="tab" onclick="showSOTab(\'yearly\',this)">Yearly</div>';
  html += '</div>';

  // Standing — editable
  html += '<div id="soTab-standing">';
  const soLen = (standingData.standing || []).length;
  (standingData.standing || []).forEach((s, i) => {
    html += `<div class="so-item">
      <div class="so-move">
        <span onclick="moveSOItem('standing',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
        <span onclick="moveSOItem('standing',${i},1)" ${i===soLen-1?'style="visibility:hidden"':''}>&#9660;</span>
      </div>
      <input type="checkbox" ${s.active?'checked':''} onchange="toggleSOActive(${i})" aria-label="${esc(s.text)}">
      <span contenteditable="true" style="flex:1" onblur="editSOText(${i},htmlToMarkdown(this.innerHTML))" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${linkify(s.text)}</span>
      <input class="so-date-input" placeholder="날짜" aria-label="날짜" value="${esc(s.date||'')}"
        onblur="setSoDate(${i},this.value)"
        onkeydown="if(event.key==='Enter'){this.blur();}"
        title="날짜 입력: 6월 11일 / 6/11 / 6.11">
      <span class="del-btn" onclick="delSO(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add"><input placeholder="Add standing order..." aria-label="Add standing order" onkeydown="if(event.key==='Enter'){addSO(this.value);this.value='';}">
    <button aria-label="추가" onclick="addSO(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button></div>`;
  // HF dates
  const hfFromNow = (standingData.happy_friday || [])
    .filter(d => d.slice(0, 7) >= ymKey && d.slice(0, 4) === String(currentYear))
    .sort();
  if (hfFromNow.length) {
    html += '<div style="margin-top:6px;font-size:10px;color:#8b949e">Happy Friday:</div>';
    hfFromNow.forEach(d => {
      const [, mo, dy] = d.split('-');
      const label = mo === String(currentMonth).padStart(2,'0') ? `${+dy}일` : `${+mo}/${+dy}`;
      html += `<span class="hf-badge">${label}</span>`;
    });
  }
  // Holiday — 전체 월별 (접힌 상태로 기본)
  const allHolidays = Object.entries(standingData.holidays || {}).sort(([a],[b]) => a.localeCompare(b));
  if (allHolidays.length) {
    const byMonth = {};
    allHolidays.forEach(([d, name]) => {
      const ym = d.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push({ day: d.split('-')[2], name });
    });
    html += '<details style="margin-top:6px"><summary style="font-size:10px;color:#8b949e;cursor:pointer;user-select:none">Holidays</summary>';
    Object.entries(byMonth).forEach(([ym, items]) => {
      const isCurrent = ym === ymKey;
      html += `<div style="margin-top:4px;font-size:9px;color:${isCurrent ? '#f0c040' : '#484f58'};font-weight:${isCurrent ? '600' : '400'}">${ym.replace('-','.')}:</div>`;
      items.forEach(({ day, name }) => {
        html += `<div class="so-monthly-item" style="${isCurrent ? '' : 'color:#6e7681'}">${day}일 — ${esc(name)}</div>`;
      });
    });
    html += '</details>';
  }
  html += '</div>';

  // Weekly — editable
  const DOW_NAMES_SHORT = ['일','월','화','수','목','금','토'];
  const FREQ_LABELS = { weekly: '매주', biweekly: '격주' };
  html += '<div id="soTab-weekly" style="display:none">';
  const wr = standingData.weekly_recurring || [];
  const wrLen = wr.length;
  // #11 — WORK / Activity 구분 렌더링
  const wrWork = wr.map((w,i)=>({w,i})).filter(x => !x.w.section || x.w.section === 'work');
  const wrActivity = wr.map((w,i)=>({w,i})).filter(x => x.w.section === 'activity');
  const renderWeeklyItem = ({w, i}) => `<div class="so-item">
    <div class="so-move">
      <span onclick="moveSOItem('weekly_recurring',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
      <span onclick="moveSOItem('weekly_recurring',${i},1)" ${i===wrLen-1?'style="visibility:hidden"':''}>&#9660;</span>
    </div>
    <select aria-label="요일" style="width:40px;background:#0d1117;border:1px solid #30363d;color:#f0c040;font-size:10px;border-radius:2px" onchange="editWeeklyDow(${i},+this.value)">
      ${DOW_NAMES_SHORT.map((n,di)=>`<option value="${di}" ${w.dow===di?'selected':''}>${n}</option>`).join('')}
    </select>
    <select aria-label="주기" style="width:44px;background:#0d1117;border:1px solid #30363d;color:#6e7681;font-size:10px;border-radius:2px" onchange="editWeeklyFreq(${i},this.value)">
      <option value="weekly" ${w.freq==='weekly'?'selected':''}>매주</option>
      <option value="biweekly" ${w.freq==='biweekly'?'selected':''}>격주</option>
    </select>
    <span contenteditable="true" style="flex:1" onblur="editWeeklyText(${i},this.textContent)">${linkify(w.text)}</span>
    ${w.section === 'activity' ? `<span onclick="addWeeklyToToday('${esc(w.text)}')" style="cursor:pointer;font-size:9px;color:#56d364;padding:0 4px" title="오늘 Outcome에 추가">→</span>` : ''}
    <span class="del-btn" onclick="delWeekly(${i})" style="display:inline">&#215;</span>
  </div>`;
  if (wrWork.length > 0) {
    html += '<div style="font-size:9px;color:#6e7681;margin:6px 0 3px;font-weight:600">WORK</div>';
    wrWork.forEach(x => { html += renderWeeklyItem(x); });
  }
  if (wrActivity.length > 0) {
    html += '<div style="font-size:9px;color:#56d364;margin:6px 0 3px;font-weight:600">ACTIVITY</div>';
    wrActivity.forEach(x => { html += renderWeeklyItem(x); });
  }
  html += `<div class="frame-add" style="gap:4px">
    <select id="newWkDow" aria-label="요일" style="width:40px;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:11px;border-radius:2px">
      ${DOW_NAMES_SHORT.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}
    </select>
    <select id="newWkFreq" aria-label="주기" style="width:44px;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:11px;border-radius:2px">
      <option value="weekly">매주</option><option value="biweekly">격주</option>
    </select>
    <select id="newWkSection" aria-label="섹션" style="width:52px;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:11px;border-radius:2px">
      <option value="work">WORK</option><option value="activity">ACT</option>
    </select>
    <input placeholder="Add weekly item..." aria-label="Add weekly item" onkeydown="if(event.key==='Enter'){addWeekly(this.value);this.value='';}">
    <button aria-label="추가" onclick="addWeekly(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button>
  </div>`;
  html += '</div>';

  // Monthly — editable
  html += '<div id="soTab-monthly" style="display:none">';

  // Monthly Recurring (매달 반복) — 날짜 오름차순
  const mr = (standingData.monthly_recurring || []).slice().sort((a, b) => (a.day || 0) - (b.day || 0));
  const mrLen = mr.length;
  if (mrLen > 0) {
    html += '<div style="font-size:9px;color:#6e7681;margin-bottom:4px;font-weight:600">MONTHLY RECURRING</div>';
    const dayLabel = (d) => d === 0 ? '말일' : d + '일';
    const selStyle = 'background:#0d1117;border:1px solid #30363d;color:#f0c040;font-size:10px;border-radius:2px';
    mr.forEach((item, i) => {
      html += `<div class="so-item">
        <div class="so-move">
          <span onclick="moveSOItem('monthly_recurring',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
          <span onclick="moveSOItem('monthly_recurring',${i},1)" ${i===mrLen-1?'style="visibility:hidden"':''}>&#9660;</span>
        </div>
        <select aria-label="날짜" style="width:46px;${selStyle}" onchange="editMR(${i},'day',+this.value)">
          <option value="0" ${item.day===0?'selected':''}>말일</option>
          ${Array.from({length:31},(_,d)=>`<option value="${d+1}" ${item.day===d+1?'selected':''}>${d+1}일</option>`).join('')}
        </select>
        <span contenteditable="true" style="flex:1" onblur="editMR(${i},'text',this.textContent)">${linkify(item.text)}</span>
        <span class="link-btn" onclick="openMRLink(event,${i})" style="cursor:pointer;font-size:8px;display:inline">&#128279;</span>
        <span class="del-btn" onclick="delMR(${i})" style="display:inline">&#215;</span>
      </div>`;
    });
    html += `<div class="frame-add" style="gap:4px">
      <select id="newMRDay" aria-label="날짜" style="width:46px;${selStyle}">
        <option value="0">말일</option>${Array.from({length:31},(_,d)=>`<option value="${d+1}">${d+1}일</option>`).join('')}
      </select>
      <input placeholder="Add monthly recurring..." aria-label="Add monthly recurring" onkeydown="if(event.key==='Enter'){addMR(this.value);this.value='';}">
      <button aria-label="추가" onclick="addMR(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button>
    </div>`;
  }

  // This Month (이번달 한정)
  const monthlyItems = standingData.monthly?.[ymKey] || [];
  const mLen = monthlyItems.length;
  html += `<div style="font-size:9px;color:#6e7681;margin:8px 0 4px;font-weight:600">${ymKey} ONLY</div>`;
  monthlyItems.forEach((item, i) => {
    const text = typeof item === 'string' ? item : item.text || item;
    html += `<div class="so-item">
      <div class="so-move">
        <span onclick="moveSOItem('monthly',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
        <span onclick="moveSOItem('monthly',${i},1)" ${i===mLen-1?'style="visibility:hidden"':''}>&#9660;</span>
      </div>
      <span contenteditable="true" style="flex:1" onblur="editMonthlyItem(${i},this.textContent)">${linkify(text)}</span>
      <span class="del-btn" onclick="delMonthlyItem(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add"><input placeholder="Add this-month item..." aria-label="Add this-month item" onkeydown="if(event.key==='Enter'){addMonthlyItem(this.value);this.value='';}">
    <button aria-label="추가" onclick="addMonthlyItem(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button></div>`;
  html += '</div>';

  // Yearly — editable, 월/일 오름차순
  html += '<div id="soTab-yearly" style="display:none">';
  const yLen = (standingData.yearly || []).length;
  const selStyle = 'background:#0d1117;border:1px solid #30363d;color:#f0c040;font-size:10px;border-radius:2px';
  const yearlyDisplayOrder = (standingData.yearly || []).map((y, i) => ({ y, i })).sort((a, b) => (a.y.month - b.y.month) || ((a.y.day || 0) - (b.y.day || 0)));
  yearlyDisplayOrder.forEach(({ y, i }) => {
    const isCurrent = y.month === currentMonthNum;
    const dayVal = y.day || 0;
    const dayOpts = '<option value="0"' + (!dayVal?' selected':'') + '>-</option>' +
      Array.from({length:31},(_,d)=>`<option value="${d+1}" ${dayVal===d+1?'selected':''}>${d+1}</option>`).join('');
    html += `<div class="so-item ${isCurrent ? 'current-month' : ''}">
      <div class="so-move">
        <span onclick="moveSOItem('yearly',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
        <span onclick="moveSOItem('yearly',${i},1)" ${i===yLen-1?'style="visibility:hidden"':''}>&#9660;</span>
      </div>
      <select aria-label="월" style="width:46px;${selStyle}" onchange="editYearlyMonth(${i},+this.value)">
        ${Array.from({length:12},(_,m)=>`<option value="${m+1}" ${y.month===m+1?'selected':''}>${m+1}월</option>`).join('')}
      </select>
      <select aria-label="일" style="width:42px;${selStyle}" onchange="editYearlyDay(${i},+this.value)">
        ${dayOpts}
      </select>
      <span contenteditable="true" style="flex:1" onblur="editYearlyText(${i},this.textContent)">${linkify(y.text)}${y.lunar && y.lunarMonth && y.lunarDay ? `<span style="font-size:8px;color:#8b949e;margin-left:4px">(음 ${y.lunarMonth}/${y.lunarDay})</span>` : ''}</span>
      <span class="del-btn" onclick="delYearly(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add" style="gap:4px">
    <select id="newYearlyMonth" aria-label="월" style="width:46px;${selStyle}">
      ${Array.from({length:12},(_,m)=>`<option value="${m+1}">${m+1}월</option>`).join('')}
    </select>
    <select id="newYearlyDay" aria-label="일" style="width:42px;${selStyle}">
      <option value="0">-</option>${Array.from({length:31},(_,d)=>`<option value="${d+1}">${d+1}</option>`).join('')}
    </select>
    <button id="lunarToggleBtn" onclick="toggleLunarMode()" style="width:28px;font-size:10px;padding:0 4px;background:${_lunarMode?'#2a2000':'#161b22'};color:${_lunarMode?'#f0c040':'#6e7681'};border:1px solid ${_lunarMode?'#f0c040':'#30363d'};border-radius:2px;cursor:pointer" title="음력 입력 모드">음</button>
    <input placeholder="Add yearly item..." aria-label="Add yearly item" onkeydown="if(event.key==='Enter'){addYearly(this.value);this.value='';}">
    <button aria-label="추가" onclick="addYearly(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button></div>`;
  html += '</div>';

  document.getElementById('soPanel').innerHTML = html;
  // Restore active tab after innerHTML rebuild
  showSOTab(_activeSOTab);
}

// --- Standing Orders CRUD ---
async function saveStandingData() {
  const res = await fetch(`${API}/api/standing-orders`, {
    method:'POST', headers: AUTH,
    body: JSON.stringify(standingData)
  });
  if (res.status === 409) {
    // Version conflict — reload from server to get latest _version, then retry
    const fresh = await fetch(`${API}/api/standing-orders`);
    const freshData = await fresh.json();
    // Merge: keep client's structural changes but adopt server _version
    standingData._version = freshData._version;
    const res2 = await fetch(`${API}/api/standing-orders`, {
      method:'POST', headers: AUTH,
      body: JSON.stringify(standingData)
    });
    const d2 = await res2.json();
    if (d2._version) standingData._version = d2._version;
    if (!res2.ok) showToast('저장 실패 (충돌)', true);
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (data._version) standingData._version = data._version;
  if (!res.ok) showToast('저장 실패', true);
}

function moveSOItem(section, idx, dir) {
  const target = idx + dir;
  let arr;
  if (section === 'standing') arr = standingData.standing;
  else if (section === 'weekly_recurring') arr = standingData.weekly_recurring;
  else if (section === 'monthly_recurring') arr = standingData.monthly_recurring;
  else if (section === 'monthly') arr = standingData.monthly?.[ym()] || [];
  else if (section === 'yearly') arr = standingData.yearly;
  else return;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  saveStandingData(); renderStandingOrders();
}

function toggleSOActive(i) { standingData.standing[i].active = !standingData.standing[i].active; saveStandingData(); render(); }
function editSOText(i, text) { if(text.trim()) standingData.standing[i].text = text.trim(); saveStandingData(); render(); }
function delSO(i) { standingData.standing.splice(i, 1); saveStandingData(); renderStandingOrders(); render(); }
function parseSoDate(raw) {
  if (!raw?.trim()) return null;
  // Strip trailing parenthetical suffixes like (토), (일), (1교시) etc.
  const s = raw.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
  // "6월 11일", "6월11일"
  let m = s.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/);
  if (m) return { month: +m[1], day: +m[2] };
  // "6/11", "6.11", "6-11"
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})$/);
  if (m) return { month: +m[1], day: +m[2] };
  // "11" → current month
  m = s.match(/^(\d{1,2})$/);
  if (m) return { month: currentMonth, day: +m[1] };
  return null;
}
function setSoDate(i, raw) {
  const parsed = parseSoDate(raw);
  standingData.standing[i].date = raw.trim();
  saveStandingData();
  if (!parsed) return;
  // Inject into scheduler: find or create day entry
  const targetYm = `${currentYear}-${String(parsed.month).padStart(2,'0')}`;
  const dayKey = String(parsed.day);
  const item = standingData.standing[i];
  // Use todayMonthData if same month, else need to load — for now patch monthData if same ym
  const targetData = (targetYm === ym()) ? monthData : null;
  if (!targetData) { showToast(`${parsed.month}/${parsed.day} 저장됨 (다른 월)`); return; }
  if (!targetData.days[dayKey]) targetData.days[dayKey] = {};
  const cat = targetData.days[dayKey];
  if (!cat.outcome) cat.outcome = [];
  if (!cat.outcome.some(x => x.text === item.text)) {
    cat.outcome.push({ text: item.text, done: false, _soScheduled: true });
    save().then(() => { showToast(`${parsed.month}/${parsed.day}에 추가됨`); render(); });
  } else {
    showToast(`이미 ${parsed.month}/${parsed.day}에 있음`);
  }
}
// 페이지 로드/월 전환 시 standing 날짜 항목을 당월 outcome에 자동 주입 (idempotent)
function ensureSoScheduled() {
  // Disabled — standing date items are now shown as badges in the day header (getSoEvents)
}

function addSO(text) {
  if (!text?.trim()) return;
  standingData.standing.push({ id: `so-${Date.now()}`, text: text.trim(), active: true });
  saveStandingData(); renderStandingOrders(); render();
}

function editMonthlyItem(i, text) {
  const k = ym();
  if (!standingData.monthly?.[k]) return;
  standingData.monthly[k][i] = text.trim();
  saveStandingData();
}
function delMonthlyItem(i) {
  const k = ym();
  if (!standingData.monthly?.[k]) return;
  standingData.monthly[k].splice(i, 1);
  saveStandingData(); renderStandingOrders();
}
function addMonthlyItem(text) {
  if (!text?.trim()) return;
  const k = ym();
  if (!standingData.monthly) standingData.monthly = {};
  if (!standingData.monthly[k]) standingData.monthly[k] = [];
  standingData.monthly[k].push(text.trim());
  saveStandingData(); renderStandingOrders();
}

// --- Monthly Recurring CRUD ---
function editMR(i, field, val) {
  if (field === 'text') standingData.monthly_recurring[i].text = val.trim();
  else standingData.monthly_recurring[i][field] = val;
  saveStandingData();
}
function delMR(i) { standingData.monthly_recurring.splice(i, 1); saveStandingData(); renderStandingOrders(); render(); }
function addMR(text) {
  if (!text?.trim()) return;
  if (!standingData.monthly_recurring) standingData.monthly_recurring = [];
  const day = +(document.getElementById('newMRDay')?.value || 0);
  standingData.monthly_recurring.push({ day, text: text.trim() });
  saveStandingData(); renderStandingOrders(); render();
}

let mrLinkIdx = null;
function openMRLink(event, idx) {
  mrLinkIdx = idx;
  const item = standingData.monthly_recurring[idx];
  const popup = document.getElementById('linkPopup');
  const input = document.getElementById('linkUrl');
  input.value = item.url || '';
  popup.classList.add('open');
  popup.dataset.mode = 'mr';
  popup.style.left = Math.min(event.clientX || 100, window.innerWidth - 300) + 'px';
  popup.style.top = Math.min(event.clientY || 100, window.innerHeight - 100) + 'px';
  setTimeout(() => input.focus(), 50);
}

function editWeeklyDow(i, dow) { standingData.weekly_recurring[i].dow = dow; saveStandingData(); }
function editWeeklyFreq(i, freq) { standingData.weekly_recurring[i].freq = freq; saveStandingData(); }
function editWeeklyText(i, text) { if(text.trim()) standingData.weekly_recurring[i].text = text.trim(); saveStandingData(); }
function delWeekly(i) { standingData.weekly_recurring.splice(i, 1); saveStandingData(); renderStandingOrders(); render(); }
function addWeekly(text) {
  if (!text?.trim()) return;
  const dow = +(document.getElementById('newWkDow')?.value || 1);
  const freq = document.getElementById('newWkFreq')?.value || 'weekly';
  const section = document.getElementById('newWkSection')?.value || 'work';
  if (!standingData.weekly_recurring) standingData.weekly_recurring = [];
  standingData.weekly_recurring.push({ dow, freq, text: text.trim(), section });
  saveStandingData(); renderStandingOrders(); render();
}

async function addWeeklyToToday(text) {
  if (!text?.trim()) return;
  const today = new Date().getDate();
  const day = ensureDay(today);
  if (!day.outcome) day.outcome = [];
  day.outcome.push({ text: text.trim(), done: false });
  await save(); render();
  showToast(`오늘 Outcome에 추가됨: ${text.trim()}`);
}

function editYearlyMonth(i, month) { standingData.yearly[i].month = month; saveStandingData(); }
function editYearlyDay(i, day) { standingData.yearly[i].day = day || 0; saveStandingData(); }
function editYearlyText(i, text) { if(text.trim()) standingData.yearly[i].text = text.trim(); saveStandingData(); }
function delYearly(i) { standingData.yearly.splice(i, 1); saveStandingData(); renderStandingOrders(); render(); }
function toggleLunarMode() {
  _lunarMode = !_lunarMode;
  _activeSOTab = 'yearly';
  renderStandingOrders();
}
function addYearly(text) {
  if (!text?.trim()) return;
  const lm = +(document.getElementById('newYearlyMonth')?.value || 1);
  const ld = +(document.getElementById('newYearlyDay')?.value || 0);
  if (_lunarMode && ld > 0) {
    const solar = lunarToSolar(currentYear, lm, ld);
    const entry = { month: solar?.month || lm, day: solar?.day || ld, text: text.trim(), lunar: true, lunarMonth: lm, lunarDay: ld };
    standingData.yearly.push(entry);
  } else {
    standingData.yearly.push({ month: lm, day: ld, text: text.trim() });
  }
  _lunarMode = false;
  saveStandingData(); renderStandingOrders(); render();
}

function showSOTab(name, el) {
  _activeSOTab = name;
  ['standing','weekly','monthly','yearly'].forEach(t => {
    const tabEl = document.getElementById(`soTab-${t}`);
    if (tabEl) tabEl.style.display = t === name ? '' : 'none';
  });
  if (!el) {
    const idx = ['standing','weekly','monthly','yearly'].indexOf(name);
    const tabEls = document.querySelectorAll('#soPanel .tabs .tab');
    el = tabEls[idx];
  }
  if (el) {
    el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }
}

// --- Cortex Notes (sidebar + note viewer) ---
let cortexPath = 'cortex';
let cortexFile = null;
let cortexEditing = false;

function renderMarkdown(md) {
  return esc(md)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^- (.+)$/gm, '&bull; $1')
    .replace(/\n/g, '<br>');
}

async function createNewNote() {
  // Show folder selection + name input
  const folders = [
    'cortex/inbox',
    'cortex/hexagonal pillars_rocks_helm/1-character',
    'cortex/hexagonal pillars_rocks_helm/2-mo-chuisle',
    'cortex/hexagonal pillars_rocks_helm/3-string',
    'cortex/hexagonal pillars_rocks_helm/4-interstellar',
    'cortex/hexagonal pillars_rocks_helm/5-life-xlab',
    'cortex/hexagonal pillars_rocks_helm/6-snowball',
    'cortex/hexagonal pillars_rocks_helm/zeroing',
    'cortex/projects',
    'cortex/resources',
    cortexPath
  ];
  const unique = [...new Set(folders)];
  const folderLabels = unique.map(f => f.replace('cortex/hexagonal pillars_rocks_helm/', '⬡ ').replace('cortex/', ''));
  const choice = prompt('Save to:\n' + unique.map((f, i) => `${i}: ${folderLabels[i]}`).join('\n') + '\n\nEnter number (default: current folder):');
  const targetFolder = (choice !== null && choice !== '' && unique[+choice]) ? unique[+choice] : cortexPath;

  const name = prompt('Note name (without .md):');
  if (!name?.trim()) return;
  const fileName = name.trim().replace(/\s+/g, '-') + '.md';
  const filePath = targetFolder + '/' + fileName;
  const content = `# ${name.trim()}\n\n`;
  const res = await fetch(`${API}/api/cortex/file`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ filePath, content })
  });
  const data = await res.json();
  if (data.ok) {
    cortexFile = { path: filePath, name: fileName, content, sha: data.sha };
    cortexEditing = true;
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('scheduleNav').style.display = 'none';
    document.getElementById('noteView').style.display = '';
    document.getElementById('noteContent').innerHTML = renderNoteViewer();
    loadSidebarTree(cortexPath);
  } else {
    toast('Create failed: ' + (data.error || 'unknown'), true);
  }
}

async function saveCortexFile() {
  const textarea = document.getElementById('cortexEditArea');
  if (!textarea || !cortexFile) return;
  const content = textarea.value;
  const res = await fetch(`${API}/api/cortex/file`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ filePath: cortexFile.path, content, sha: cortexFile.sha })
  });
  const data = await res.json();
  if (data.ok) {
    cortexFile.content = content;
    cortexFile.sha = data.sha;
    cortexEditing = false;
    document.getElementById('noteContent').innerHTML = renderNoteViewer();
  } else {
    toast('Save failed: ' + (data.error || 'unknown'), true);
  }
}

let _sidebarSearchTimer;
function debounceSidebarSearch(q) {
  clearTimeout(_sidebarSearchTimer);
  if (!q || q.length < 2) { loadSidebarTree(); return; }
  _sidebarSearchTimer = setTimeout(() => searchCortex(q), 300);
}
async function searchCortex(q) {
  if (!q || q.length < 2) return;
  const el = document.getElementById('sidebarTree');
  if (!el) return;
  el.innerHTML = '<div style="color:#8b949e;padding:8px">검색 중...</div>';
  try {
    const res = await fetch(`${API}/api/cortex/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = await res.json();
    if (!results.length) { el.innerHTML = '<div style="color:#484f58;padding:8px">No results</div>'; return; }
    el.innerHTML = results.map(r => {
      const icon = r.type === 'dir' ? '&#128193;' : '&#128196;';
      const onclick = r.type === 'dir'
        ? `loadSidebarTree('${r.path}')`
        : `openNote('${r.path}')`;
      const snippet = r.snippet ? `<div style="font-size:10px;color:#8b949e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:4px">${esc(r.snippet)}</div>` : '';
      return `<div class="tree-item" onclick="${onclick}"><span class="icon">${icon}</span><span class="name">${esc(r.name)}</span>${snippet}</div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div style="color:#f85149;padding:8px">검색 오류: ${esc(String(e))}</div>`;
  }
}

// --- Vision & Milestones ---
let visionData = null;

async function loadVision() {
  const res = await fetch(`${API}/api/vision`);
  visionData = await res.json();
  renderVision();
}

function renderVision() {
  if (!visionData) return;
  const el = document.getElementById('visionPanel');
  const years = visionData.years || [];
  const cats = visionData.categories || [];

  let html = '<div class="vision-board">';

  // Category header row
  html += '<div class="vision-header-row"><div style="width:52px;min-width:52px"></div>';
  cats.forEach(cat => {
    html += `<div class="vision-header-cell">${esc(cat.label)}</div>`;
  });
  html += '</div>';

  // Year rows
  years.forEach(y => {
    html += `<div class="vision-year-row">`;
    html += `<div class="vision-year-label">${esc(y)}</div>`;
    cats.forEach((cat, ci) => {
      const raw = cat.cells?.[y] || '';
      const cell = (typeof raw === 'object' && raw !== null) ? raw : { text: raw, image: null };
      const hasImg = !!cell.image;

      html += `<div class="vision-card${hasImg ? ' has-image' : ' no-image'}">`;

      if (hasImg) {
        html += `<img class="vision-card-img" src="${cell.image}" alt="">`;
        html += `<div class="vision-card-overlay">`;
        html += `<div class="vision-card-text" contenteditable="true" onblur="editVisionCell(${ci},'${y}',this)">${esc(cell.text).replace(/\n/g,'<br>')}</div>`;
        html += `</div>`;
      } else {
        html += `<div class="vision-card-empty-hint"><span>🖼</span><span style="font-size:9px">이미지 추가</span></div>`;
        html += `<div class="vision-card-text" contenteditable="true" onblur="editVisionCell(${ci},'${y}',this)">${esc(cell.text).replace(/\n/g,'<br>')}</div>`;
      }

      html += `<div class="vision-card-actions">`;
      html += `<button class="vision-card-btn" onclick="uploadVisionImage(${ci},'${y}')" title="이미지 업로드">📷</button>`;
      if (hasImg) {
        html += `<button class="vision-card-btn" onclick="removeVisionImage(${ci},'${y}')" title="이미지 제거">✕</button>`;
      }
      html += `</div>`;

      html += `</div>`; // .vision-card
    });
    html += `</div>`; // .vision-year-row
  });

  html += '</div>';

  // Admin notes
  const notes = visionData.admin_notes || '';
  html += `<div class="admin-notes">
    <div class="admin-notes-title">ADMIN NOTES</div>
    <div class="admin-notes-content" contenteditable="true" onblur="editVisionNotes(this.innerText)">${esc(notes).replace(/\n/g,'<br>')}</div>
  </div>`;

  el.innerHTML = html;
}

async function saveVisionData() {
  const res = await fetch(`${API}/api/vision`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify(visionData)
  });
  if (!res.ok) throw new Error(`저장 실패: ${res.status}`);
}

function editVisionCell(catIdx, year, el) {
  if (!visionData.categories[catIdx]) return;
  if (!visionData.categories[catIdx].cells) visionData.categories[catIdx].cells = {};
  const raw = visionData.categories[catIdx].cells[year] || '';
  const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: '', image: null };
  existing.text = (typeof el === 'string' ? el : el.innerText).trim();
  visionData.categories[catIdx].cells[year] = existing;
  saveVisionData().catch(err => showToast('저장 실패: ' + err.message, true));
}

async function uploadVisionImage(catIdx, year) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeImageTo600(file);
    if (!visionData.categories[catIdx].cells) visionData.categories[catIdx].cells = {};
    const raw = visionData.categories[catIdx].cells[year] || '';
    const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: raw, image: null };
    existing.image = dataUrl;
    visionData.categories[catIdx].cells[year] = existing;
    await saveVisionData();
    renderVision();
  };
  input.click();
}

async function removeVisionImage(catIdx, year) {
  if (!visionData.categories?.[catIdx]?.cells) return;
  const raw = visionData.categories[catIdx].cells[year] || '';
  const existing = (typeof raw === 'object' && raw !== null) ? { ...raw } : { text: raw, image: null };
  existing.image = null;
  visionData.categories[catIdx].cells[year] = existing;
  await saveVisionData();
  renderVision();
}

function resizeImageTo600(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function editVisionNotes(text) {
  visionData.admin_notes = text.trim();
  saveVisionData().catch(err => showToast('저장 실패: ' + err.message, true));
}

// --- Day Frames Admin ---
let framesData = null;
const FRAME_TYPES = ['weekday', 'flow', 'block'];
// Source group sync: flow.source ↔ block.source only (weekday.input 독립)
const SOURCE_SYNC_MAP = {
  'block:source': [['flow','source']],
  'flow:source':  [['block','source']],
};
const FRAME_TYPE_LABELS = { weekday: 'Weekday (평일)', flow: 'Flow Day (토/HF)', block: 'Block Day (일)' };
// #18 — frame type별 카테고리 이름 override / 숨김
const FRAME_CAT_OVERRIDES = {};
const CAT_TYPE_LABELS = { routine: 'Routine (매일 리셋)', todo: 'To-do (이월)' };

async function loadFrames() {
  const res = await fetch(`${API}/api/day-frames`);
  const raw = await res.json();
  // Unwrap if data was accidentally saved with 'day-frames' wrapper
  framesData = raw['day-frames'] || raw;
  if (raw._version && !framesData._version) framesData._version = raw._version;
  // Apply saved category name overrides (_catNames stored in day-frames data)
  if (framesData._catNames) Object.assign(CAT_NAMES, framesData._catNames);
  renderFrames();
  render(); // Re-render calendar with frame template items
}

function renderFrames() {
  if (!framesData) return;
  const el = document.getElementById('framesPanel');

  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap">';
  for (const ftype of FRAME_TYPES) {
    const frame = framesData[ftype] || { label: ftype, categories: {} };
    html += `<div class="frame-section frame-type-${ftype}" style="flex:1;min-width:280px">`;
    html += `<div class="frame-section-header"><span class="frame-section-title">${esc(frame.label || FRAME_TYPE_LABELS[ftype])}</span></div>`;

    const _frameOverride = FRAME_CAT_OVERRIDES[ftype] || {};
    const catOrder = frame._catOrder || CATS;
    for (const cat of catOrder) {
      if (_frameOverride.hide && _frameOverride.hide.includes(cat)) continue;
      const catData = frame.categories?.[cat] || { type: 'routine', items: [] };
      const catType = catData.type || 'routine';
      const catLabel = (_frameOverride.labels && _frameOverride.labels[cat]) || CAT_NAMES[cat];
      html += `<div class="frame-cat" draggable="true" data-frame-drag="cat" data-ftype="${ftype}" data-cat="${cat}" style="border-left:2px solid ${catColorMap[cat]};padding-left:6px">`;
      html += `<div class="frame-cat-header">
        <span class="drag-handle" title="드래그로 순서 변경">⠿</span>
        <span class="cl-${cat}">${catLabel}</span>
        <span class="frame-cat-type ${catType}" onclick="toggleCatType('${ftype}','${cat}')" style="cursor:pointer" title="Click to toggle">${catType}</span>
      </div>`;

      (catData.items || []).forEach((rawItem, idx) => {
        if (typeof rawItem === 'object' && rawItem.type === 'separator') {
          html += `<div class="frame-separator" draggable="true" data-frame-drag="item" data-ftype="${ftype}" data-cat="${cat}" data-idx="${idx}">
            <span class="drag-handle" title="드래그">⠿</span>
            <span class="sep-label" contenteditable="true" onblur="editFrameSeparator('${ftype}','${cat}',${idx},this.textContent)">${esc(rawItem.text || '')}</span>
            <span class="sep-line"></span>
            <span class="del-btn" onclick="delFrameItem('${ftype}','${cat}',${idx})">&#215;</span>
          </div>`;
          return;
        }
        const parsed = getFrameItem(ftype, cat, idx);
        const text = parsed.text || '';
        const url = parsed.url || '';
        const hasUrl = url.length > 0 && url !== '#';
        html += `<div class="frame-item" draggable="true" data-frame-drag="item" data-ftype="${ftype}" data-cat="${cat}" data-idx="${idx}">
          <span class="drag-handle" title="드래그">⠿</span>
          <input value="${esc(text)}" onchange="editFrameItem('${ftype}','${cat}',${idx},this.value)">
          <span class="link-btn${hasUrl?' has-link':''}" onclick="openFrameLink(event,'${ftype}','${cat}',${idx})" style="cursor:pointer;font-size:8px;display:inline">&#128279;</span>
          <span class="frame-del" onclick="delFrameItem('${ftype}','${cat}',${idx})">&#215;</span>
        </div>`;
      });

      html += `<div class="frame-add" style="flex-direction:column;align-items:stretch;gap:3px">
        <textarea rows="1" placeholder="Add item… (여러 줄 붙여넣기 가능)" aria-label="새 항목 추가"
          style="resize:none;overflow:hidden;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:12px;border-radius:3px;padding:3px 6px;width:100%;box-sizing:border-box;font-family:inherit"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitFrameTextarea(this,'${ftype}','${cat}');}"></textarea>
        <div style="display:flex;gap:4px">
          <button aria-label="추가" onclick="submitFrameTextarea(this.parentElement.previousElementSibling,'${ftype}','${cat}')" style="flex:1">+</button>
          <button aria-label="구분선 추가" onclick="addFrameSeparator('${ftype}','${cat}')" title="구분선 추가" style="font-size:10px;padding:0 4px">─</button>
        </div>
      </div>`;
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += `<div class="frame-actions">
    <button class="frame-btn-inject" onclick="injectFrames()">Apply to remaining days</button>
  </div>`;

  el.innerHTML = html;
  if (!el._dragInited) { initFrameDrag(el); el._dragInited = true; }
}

const catColorMap = { ritual: '#f0c040', input: '#58a6ff', work: '#56d364', hexagonal: '#f85149', outcome: '#bc8cff', source: '#ff9500' };

async function saveFramesData() {
  const res = await fetch(`${API}/api/day-frames`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify(framesData)
  });
  const result = await res.json().catch(() => ({}));
  if (result._version) framesData._version = result._version;
}

function toggleCatType(ftype, cat) {
  const catData = framesData[ftype].categories[cat];
  catData.type = catData.type === 'routine' ? 'todo' : 'routine';
  saveFramesData();
  renderFrames(); render();
}

function getFrameItem(ftype, cat, idx) {
  const raw = framesData[ftype].categories[cat].items[idx];
  if (typeof raw === 'object') return raw;
  // Parse embedded markdown link: [text](url)suffix
  const m = raw.match(/^\[([^\]]*)\]\(([^)]+)\)(.*)/);
  if (m) return { text: m[1] + m[3], url: m[2] };
  return { text: raw, url: '' };
}

function setFrameItem(ftype, cat, idx, obj) {
  framesData[ftype].categories[cat].items[idx] = obj.url ? obj : obj.text;
}

function _addFrameItemToData(ftype, cat, text) {
  if (!text?.trim()) return;
  if (!framesData[ftype]) framesData[ftype] = { label: ftype, categories: {} };
  if (!framesData[ftype].categories) framesData[ftype].categories = {};
  if (!framesData[ftype].categories[cat]) framesData[ftype].categories[cat] = { type: 'routine', items: [] };
  const srcItems = framesData[ftype].categories[cat].items;
  const srcSep = srcItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
  if (srcSep === -1) srcItems.push(text.trim());
  else srcItems.splice(srcSep, 0, text.trim());
  // 6PILLARS (hexagonal) sync
  if (cat === 'hexagonal') {
    FRAME_TYPES.forEach(ft => {
      if (ft === ftype) return;
      if (!framesData[ft]?.categories) return;
      if (!framesData[ft].categories[cat]) framesData[ft].categories[cat] = { type: 'routine', items: [] };
      const ftItems = framesData[ft].categories[cat].items;
      const ftSep = ftItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
      if (ftSep === -1) ftItems.push(text.trim());
      else ftItems.splice(ftSep, 0, text.trim());
    });
  }
  // Source group sync (weekday.input ↔ block/flow.outcome)
  for (const [st, sc] of (SOURCE_SYNC_MAP[`${ftype}:${cat}`] || [])) {
    if (!framesData[st]?.categories?.[sc]) continue;
    const tItems = framesData[st].categories[sc].items;
    const tSep = tItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
    if (tSep === -1) tItems.push(text.trim()); else tItems.splice(tSep, 0, text.trim());
  }
}

function addFrameItem(ftype, cat, text) {
  _addFrameItemToData(ftype, cat, text);
  saveFramesData();
  renderFrames(); render();
}

function submitFrameTextarea(el, ftype, cat) {
  const lines = el.value.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (!lines.length) return;
  lines.forEach(line => _addFrameItemToData(ftype, cat, line));
  el.value = '';
  el.style.height = 'auto';
  saveFramesData();
  renderFrames(); render();
}

function addFrameSeparator(ftype, cat) {
  const label = prompt('구분선 텍스트 (비워두면 선만):', '') ?? null;
  if (label === null) return;
  if (!framesData[ftype].categories[cat]) framesData[ftype].categories[cat] = { type: 'routine', items: [] };
  framesData[ftype].categories[cat].items.push({ type: 'separator', text: label.trim() });
  saveFramesData();
  renderFrames(); render();
}

function editFrameItem(ftype, cat, idx, text) {
  const item = getFrameItem(ftype, cat, idx);
  item.text = text.trim();
  setFrameItem(ftype, cat, idx, item);
  // 6PILLARS (hexagonal) sync — stop at separator
  if (cat === 'hexagonal') {
    const srcItems = framesData[ftype]?.categories?.hexagonal?.items || [];
    const firstSep = srcItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
    const syncBefore = firstSep === -1 ? srcItems.length : firstSep;
    if (idx < syncBefore) {
      FRAME_TYPES.forEach(ft => {
        if (ft === ftype) return;
        const ftItems = framesData[ft]?.categories?.hexagonal?.items;
        if (!ftItems) return;
        const ftFirstSep = ftItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
        const ftSyncBefore = ftFirstSep === -1 ? ftItems.length : ftFirstSep;
        if (idx < ftSyncBefore) {
          const ftItem = getFrameItem(ft, cat, idx);
          ftItem.text = text.trim();
          setFrameItem(ft, cat, idx, ftItem);
        }
      });
    }
  }
  // Source group sync
  for (const [st, sc] of (SOURCE_SYNC_MAP[`${ftype}:${cat}`] || [])) {
    const stItem = getFrameItem(st, sc, idx);
    if (stItem) { stItem.text = text.trim(); setFrameItem(st, sc, idx, stItem); }
  }
  saveFramesData();
  renderFrames(); render();
}

let frameLinkTarget = null;
function openFrameLink(event, ftype, cat, idx) {
  const item = getFrameItem(ftype, cat, idx);
  frameLinkTarget = { ftype, cat, idx };
  const popup = document.getElementById('linkPopup');
  const input = document.getElementById('linkUrl');
  input.value = item.url || '';
  popup.classList.add('open');
  popup.style.left = Math.min(event.clientX || 100, window.innerWidth - 300) + 'px';
  popup.style.top = Math.min(event.clientY || 100, window.innerHeight - 100) + 'px';
  // Override save/remove to use frame target
  popup.dataset.mode = 'frame';
  setTimeout(() => input.focus(), 50);
}

function delFrameItem(ftype, cat, idx) {
  const items = framesData[ftype]?.categories?.[cat]?.items;
  if (!items) return;
  // Determine sync scope before splicing
  const firstSep = items.findIndex(i => typeof i === 'object' && i.type === 'separator');
  const shouldSync = cat === 'hexagonal' && (firstSep === -1 || idx < firstSep);
  items.splice(idx, 1);
  if (shouldSync) {
    FRAME_TYPES.forEach(ft => {
      if (ft === ftype) return;
      const ftItems = framesData[ft]?.categories?.hexagonal?.items;
      if (!ftItems || idx >= ftItems.length) return;
      const ftFirstSep = ftItems.findIndex(i => typeof i === 'object' && i.type === 'separator');
      if (ftFirstSep === -1 || idx < ftFirstSep) ftItems.splice(idx, 1);
    });
  }
  // Source group sync
  for (const [st, sc] of (SOURCE_SYNC_MAP[`${ftype}:${cat}`] || [])) {
    const stItems = framesData[st]?.categories?.[sc]?.items;
    if (stItems && idx < stItems.length) stItems.splice(idx, 1);
  }
  saveFramesData();
  renderFrames(); render();
}

function editFrameSeparator(ftype, cat, idx, text) {
  const item = framesData[ftype]?.categories?.[cat]?.items?.[idx];
  if (!item || typeof item !== 'object' || item.type !== 'separator') return;
  item.text = text.trim();
  saveFramesData();
  renderFrames(); render();
}

let _frameDrag = null;
function initFrameDrag(panel) {
  let _touchTimer = null, _touchEl = null;

  panel.addEventListener('dragstart', e => {
    if (e.target.closest('input,[contenteditable]')) return;
    const el = e.target.closest('[data-frame-drag]');
    if (!el) return;
    _frameDrag = { role: el.dataset.frameDrag, ftype: el.dataset.ftype, cat: el.dataset.cat,
      idx: el.dataset.idx !== undefined ? parseInt(el.dataset.idx) : undefined, el };
    el.classList.add('drag-on');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  panel.addEventListener('dragend', () => {
    panel.querySelectorAll('.drag-on,.drag-target').forEach(x => x.classList.remove('drag-on','drag-target'));
    _frameDrag = null;
  });

  panel.addEventListener('dragover', e => {
    if (!_frameDrag) return;
    const el = e.target.closest('[data-frame-drag]');
    if (!el || el === _frameDrag.el) return;
    if (el.dataset.frameDrag !== _frameDrag.role) return;
    if (_frameDrag.role === 'item' && (el.dataset.ftype !== _frameDrag.ftype || el.dataset.cat !== _frameDrag.cat)) return;
    if (_frameDrag.role === 'cat' && el.dataset.ftype !== _frameDrag.ftype) return;
    e.preventDefault();
    panel.querySelectorAll('.drag-target').forEach(x => x.classList.remove('drag-target'));
    el.classList.add('drag-target');
  });

  panel.addEventListener('drop', e => {
    e.preventDefault();
    if (!_frameDrag) return;
    const el = e.target.closest('[data-frame-drag]');
    if (!el || el === _frameDrag.el || el.dataset.frameDrag !== _frameDrag.role) return;
    if (_frameDrag.role === 'item') {
      if (el.dataset.ftype !== _frameDrag.ftype || el.dataset.cat !== _frameDrag.cat) return;
      const from = _frameDrag.idx, to = parseInt(el.dataset.idx);
      if (from === to) return;
      const items = framesData[_frameDrag.ftype].categories[_frameDrag.cat].items;
      const [moved] = items.splice(from, 1); items.splice(to, 0, moved);
    } else if (_frameDrag.role === 'cat') {
      if (el.dataset.ftype !== _frameDrag.ftype) return;
      const ftype = _frameDrag.ftype;
      if (!framesData[ftype]._catOrder) framesData[ftype]._catOrder = [...CATS];
      const order = framesData[ftype]._catOrder;
      const fi = order.indexOf(_frameDrag.cat), ti = order.indexOf(el.dataset.cat);
      if (fi === -1 || ti === -1 || fi === ti) return;
      order.splice(fi, 1); order.splice(ti, 0, _frameDrag.cat);
    }
    saveFramesData(); renderFrames();
  });

  // Touch long-press
  panel.addEventListener('touchstart', e => {
    if (e.target.closest('input,[contenteditable]')) return;
    const el = e.target.closest('[data-frame-drag]');
    if (!el) return;
    _touchTimer = setTimeout(() => {
      _touchEl = el;
      _frameDrag = { role: el.dataset.frameDrag, ftype: el.dataset.ftype, cat: el.dataset.cat,
        idx: el.dataset.idx !== undefined ? parseInt(el.dataset.idx) : undefined, el };
      el.classList.add('drag-on');
      navigator.vibrate?.(50);
    }, 400);
  }, { passive: true });

  panel.addEventListener('touchmove', e => {
    if (_touchTimer) { clearTimeout(_touchTimer); _touchTimer = null; }
    if (!_frameDrag) return;
    e.preventDefault();
    const t = e.touches[0];
    const under = document.elementFromPoint(t.clientX, t.clientY)?.closest('[data-frame-drag]');
    panel.querySelectorAll('.drag-target').forEach(x => x.classList.remove('drag-target'));
    if (under && under !== _touchEl) under.classList.add('drag-target');
  }, { passive: false });

  panel.addEventListener('touchend', e => {
    if (_touchTimer) { clearTimeout(_touchTimer); _touchTimer = null; }
    if (!_frameDrag) return;
    const t = e.changedTouches[0];
    const under = document.elementFromPoint(t.clientX, t.clientY)?.closest('[data-frame-drag]');
    if (under && under !== _touchEl && under.dataset.frameDrag === _frameDrag.role) {
      if (_frameDrag.role === 'item' && under.dataset.ftype === _frameDrag.ftype && under.dataset.cat === _frameDrag.cat) {
        const from = _frameDrag.idx, to = parseInt(under.dataset.idx);
        if (from !== to) {
          const items = framesData[_frameDrag.ftype].categories[_frameDrag.cat].items;
          const [moved] = items.splice(from, 1); items.splice(to, 0, moved);
          saveFramesData(); renderFrames();
        }
      } else if (_frameDrag.role === 'cat' && under.dataset.ftype === _frameDrag.ftype) {
        const ftype = _frameDrag.ftype;
        if (!framesData[ftype]._catOrder) framesData[ftype]._catOrder = [...CATS];
        const order = framesData[ftype]._catOrder;
        const fi = order.indexOf(_frameDrag.cat), ti = order.indexOf(under.dataset.cat);
        if (fi !== -1 && ti !== -1 && fi !== ti) {
          order.splice(fi, 1); order.splice(ti, 0, _frameDrag.cat);
          saveFramesData(); renderFrames();
        }
      }
    }
    panel.querySelectorAll('.drag-on,.drag-target').forEach(x => x.classList.remove('drag-on','drag-target'));
    _frameDrag = null; _touchEl = null;
  });
}

async function injectFrames() {
  const today = new Date().getDate();
  const [y, m] = ym().split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const res = await fetch(`${API}/api/inject-frames`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: ym(), fromDay: today, toDay: daysInMonth })
  });
  const data = await res.json();
  showToast(`${data.range}: ${data.injected} 적용됨`);
  loadMonth();
}

// --- Recurring Templates Panel ---
function renderRecurringTemplates() {
  if (!recurringData) return;
  let html = `<div class="rtpl-toolbar">
    <select id="rtplCat" aria-label="카테고리">${CATS.map(c=>`<option value="${c}">${CAT_NAMES[c]}</option>`).join('')}</select>
    <input type="text" id="rtplName" class="rtpl-name" placeholder="New recurring..." aria-label="새 반복 항목 이름" onkeydown="if(event.key==='Enter')addRT()">
    <select id="rtplType" aria-label="반복 유형" onchange="updateRTExtra()">
      <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
    </select>
    <span id="rtplExtra"></span>
    <button aria-label="추가" onclick="addRT()">Add</button>
  </div>`;

  const templates = recurringData.templates || [];
  if (!templates.length) { html += '<div style="color:#484f58;font-size:10px">No templates</div>'; }
  else {
    templates.forEach(t => {
      const onCls = t.enabled ? 'on' : 'off';
      const icon = t.enabled ? '&#9679;' : '&#9675;';
      const sched = schedLabel(t.schedule);
      html += `<div class="rtpl-item">
        <span class="rtpl-toggle ${onCls}" onclick="toggleRT('${t.id}')">${icon}</span>
        <span class="rtpl-cat">${CAT_NAMES[t.category]||t.category}</span>
        <span style="flex:1;color:#c9d1d9">${esc(t.name)}</span>
        <span class="rtpl-sched">${esc(sched)}</span>
        <span class="rtpl-del" onclick="delRT('${t.id}')">&#215;</span>
      </div>`;
    });
  }
  const rtPanel = document.getElementById('rtPanel');
  if (!rtPanel) return;
  rtPanel.innerHTML = html;
  updateRTExtra();
}

function schedLabel(s) {
  if (!s) return '';
  if (s.type === 'daily') return 'Daily';
  if (s.type === 'weekly') return (s.days||[]).map(d=>DAY_NAMES[d]).join('/');
  if (s.type === 'monthly') return (s.dates||[]).join(',') + '일';
  return s.type;
}

function updateRTExtra() {
  const type = document.getElementById('rtplType')?.value;
  const el = document.getElementById('rtplExtra');
  if (!el) return;
  if (type === 'daily') el.innerHTML = '';
  else if (type === 'weekly') el.innerHTML = DAY_NAMES.map((n,i)=>`<label style="font-size:10px;cursor:pointer"><input type="checkbox" name="rt-dow" value="${i}"> ${n}</label>`).join(' ');
  else if (type === 'monthly') el.innerHTML = '<input type="number" id="rtMonthDate" min="1" max="31" value="1" style="width:50px;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:11px;padding:2px;border-radius:3px">';
}

async function addRT() {
  const name = document.getElementById('rtplName')?.value.trim();
  const category = document.getElementById('rtplCat')?.value;
  const type = document.getElementById('rtplType')?.value;
  if (!name) return;
  let schedule = { type };
  if (type === 'weekly') schedule.days = [...document.querySelectorAll('input[name="rt-dow"]:checked')].map(c=>+c.value);
  if (type === 'monthly') schedule.dates = [+(document.getElementById('rtMonthDate')?.value || 1)];
  await fetch(`${API}/api/recurring-templates`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,category,schedule,enabled:true}) });
  document.getElementById('rtplName').value = '';
  loadRecurringTemplates();
}

async function toggleRT(id) {
  const t = recurringData.templates.find(t=>t.id===id);
  if (!t) return;
  await fetch(`${API}/api/recurring-templates/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({enabled:!t.enabled}) });
  loadRecurringTemplates();
}

async function delRT(id) {
  await fetch(`${API}/api/recurring-templates/${id}`, { method:'DELETE' });
  loadRecurringTemplates();
}

// --- Panel toggle ---
function togglePanel(id) {
  const body = document.getElementById(id);
  body.classList.toggle('open');
  document.getElementById(id+'Toggle').innerHTML = body.classList.contains('open') ? '&#9660;' : '&#9654;';
}

// --- Navigation ---
function prevMonth() { prevPeriod(); }
function nextMonth() { nextPeriod(); }

// --- Toast ---
let _toastTimer = null;
function showToast(msg = '저장됨', isError = false) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 3000 : 1500);
}
// Legacy alias
function toast(msg, isError) { showToast(msg, isError); }

// --- Pull-to-refresh ---
let pullY = 0, pullActive = false;
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    e.stopPropagation();
    save().then(() => showToast('저장됨')).catch(err => showToast('저장 실패: ' + err.message, true));
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    openSearch();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    const active = document.activeElement;
    const isEditing = active && (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    if (!isEditing) {
      e.preventDefault();
      undoMonth();
    }
  }
}, { capture: true });

// Long-press drag: 300ms hold → draggable 활성화
let _dragLongPressTimer = null;
let _dragPendingEl = null;
document.addEventListener('pointerdown', e => {
  const item = e.target.closest('.item[draggable], .item-separator[draggable]');
  if (!item) return;
  _dragPendingEl = item;
  // Drag handle: immediate activation (no long-press required)
  if (e.target.closest('[data-drag-handle]')) {
    item.draggable = true;
    item.classList.add('drag-ready');
    return;
  }
  _dragLongPressTimer = setTimeout(() => {
    item.draggable = true;
    item.classList.add('drag-ready');
    _dragLongPressTimer = null;
  }, 300);
});
document.addEventListener('pointerup', () => {
  if (_dragLongPressTimer) { clearTimeout(_dragLongPressTimer); _dragLongPressTimer = null; }
  if (_dragPendingEl) {
    _dragPendingEl.classList.remove('drag-ready');
    _dragPendingEl.draggable = false; // 드래그 없이 클릭만 한 경우 리셋
    _dragPendingEl = null;
  }
});
document.addEventListener('pointermove', e => {
  // Cancel long-press if moved significantly before timeout
  if (_dragLongPressTimer && _dragPendingEl) {
    const moved = Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3;
    if (moved) { clearTimeout(_dragLongPressTimer); _dragLongPressTimer = null; _dragPendingEl = null; }
  }
});

// Touch drag for mobile — drag handle 기반
let _touchDragEl = null, _touchDragData = null, _touchDragTarget = null;
document.addEventListener('touchstart', e => {
  if (e.target.type === 'checkbox') return;
  const handle = e.target.closest('[data-drag-handle]');
  if (!handle) return;
  const item = handle.closest('.item');
  if (!item) return;
  e.preventDefault();
  _touchDragEl = item;
  _touchDragData = { d: parseInt(item.dataset.d), cat: item.dataset.cat, idx: parseInt(item.dataset.idx) };
  item.classList.add('dragging');
}, { passive: false });
document.addEventListener('touchmove', e => {
  if (!_touchDragEl) return;
  e.preventDefault();
  const t = e.touches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const ti = el?.closest('.item[data-d]');
  if (_touchDragTarget && _touchDragTarget !== ti) _touchDragTarget.classList.remove('drag-over');
  if (ti && ti !== _touchDragEl) { ti.classList.add('drag-over'); _touchDragTarget = ti; }
  else _touchDragTarget = null;
}, { passive: false });
document.addEventListener('touchend', async e => {
  if (!_touchDragEl || !_touchDragData) return;
  _touchDragEl.classList.remove('dragging', 'drag-ready');
  if (_touchDragTarget) {
    _touchDragTarget.classList.remove('drag-over');
    const { d, cat, idx } = _touchDragData;
    const toD = parseInt(_touchDragTarget.dataset.d), toCat = _touchDragTarget.dataset.cat, toIdx = parseInt(_touchDragTarget.dataset.idx);
    if (d === toD && cat === toCat && idx !== toIdx) {
      await fetch(`${API}/api/reorder`, { method:'POST', headers:AUTH, body:JSON.stringify({ ym:ym(), day:String(d), category:cat, fromIdx:idx, toIdx }) });
      const items = ensureDay(d)[cat]; const [moved] = items.splice(idx,1); items.splice(toIdx,0,moved); render();
    } else if (d !== toD || cat !== toCat) {
      await fetch(`${API}/api/move-item`, { method:'POST', headers:AUTH, body:JSON.stringify({ ym:ym(), fromDay:String(d), fromCat:cat, fromIdx:idx, toDay:String(toD), toCat }) });
      await loadMonth();
    }
  }
  _touchDragEl = null; _touchDragData = null; _touchDragTarget = null;
}, { passive: false });

document.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { pullActive = false; return; } // 핀치줌 등 멀티터치 무시
  if (e.target.closest('[data-drag-handle]')) { pullActive = false; return; } // 드래그 핸들은 PTR 스킵
  if (window.visualViewport && window.visualViewport.scale > 1.05) { pullActive = false; return; } // 줌 상태에서 PTR 차단
  pullY = e.touches[0].screenY;
  pullActive = (document.documentElement.scrollTop || document.body.scrollTop) < 5;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!pullActive) return;
  const dy = e.changedTouches[0].screenY - pullY;
  if (dy > 80) location.reload();
  pullActive = false;
});

// --- Capture ---
async function submitCapture() {
  const input = document.getElementById('captureInput');
  const text = input?.value?.trim();
  if (!text) return;

  // Try schedule shorthand: [月/]日 카테고리 내용
  const match = text.match(/^(?:(\d{1,2})\/)?(\d{1,2})\s+(r|i|w|o|ritual|input|work|outcome|리추얼|인풋|워크|아웃컴|업무|결과)\s+(.+)$/i);
  if (match) {
    const aliases = {r:'ritual',i:'input',w:'work',o:'outcome',ritual:'ritual',input:'input',work:'work',outcome:'outcome','리추얼':'ritual','인풋':'input','워크':'work','아웃컴':'outcome','업무':'work','결과':'outcome'};
    const month = match[1] ? parseInt(match[1]) : currentMonth;
    const day = parseInt(match[2]);
    const cat = aliases[match[3].toLowerCase()];
    const content = match[4].trim();
    if (cat) {
      const ymStr = `${currentYear}-${String(month).padStart(2,'0')}`;
      const res = await fetch(`${API}/api/add-item`, { method:'POST', headers:AUTH, body:JSON.stringify({ym:ymStr,day:String(day),category:cat,text:content,url:''}) });
      if (res.ok) { input.value = ''; loadMonth(); return; }
    }
  }

  // Otherwise save as inbox note
  const ts = new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
  const slug = text.slice(0,30).replace(/[^a-zA-Z0-9가-힣]/g,'-').replace(/-+/g,'-');
  const filePath = `cortex/inbox/${ts.slice(0,10)}-${slug}.md`;
  const md = `---\ncaptured: ${new Date().toISOString()}\nsource: dashboard\n---\n\n${text}`;
  const res = await fetch(`${API}/api/cortex/file`, { method:'POST', headers:AUTH, body:JSON.stringify({filePath,content:md}) });
  if (res.ok) { input.value = ''; showToast('Saved to inbox'); }
  else showToast('Save failed', true);
}

async function captureImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const res = await fetch(`${API}/api/cortex/upload`, { method:'POST', headers:AUTH, body:JSON.stringify({fileName:file.name,base64}) });
    const data = await res.json();
    if (data.ok) {
      const input = document.getElementById('captureInput');
      if (input) input.value = (input.value ? input.value + ' ' : '') + data.markdown;
    }
  };
  reader.readAsDataURL(file);
}

// --- Sidebar ---
function isDesktop() {
  return window.screen.width >= 900;
}

function updateDeviceMode() {
  document.body?.classList.toggle('desktop-screen', isDesktop());
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const main = document.getElementById('main');
  if (isDesktop()) {
    sidebar?.classList.toggle('desktop-open');
    main?.classList.toggle('desktop-sidebar');
  } else {
    sidebarOpen = !sidebarOpen;
    sidebar?.classList.toggle('open', sidebarOpen);
    overlay?.classList.toggle('open', sidebarOpen);
  }
}

// Sidebar: starts closed (user manually opens)

async function loadSidebarTree(dirPath) {
  cortexPath = dirPath || 'cortex';
  const el = document.getElementById('sidebarTree');
  if (!el) return;
  const res = await fetch(`${API}/api/cortex/tree?path=${encodeURIComponent(cortexPath)}`);
  if (!res.ok) {
    el.innerHTML = `<div style="color:#f85149;padding:8px">Load failed
      <button onclick="loadSidebarTree('${cortexPath}')" style="margin-left:8px;font-size:11px;padding:2px 8px;background:#21262d;border:1px solid #30363d;color:#e0e0e0;border-radius:3px;cursor:pointer">Retry</button>
    </div>`;
    return;
  }
  const items = await res.json();
  items.sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });
  let html = '';
  if (cortexPath !== 'cortex') {
    const parent = cortexPath.split('/').slice(0, -1).join('/') || 'cortex';
    html += `<div class="tree-item" onclick="loadSidebarTree('${parent}')"><span class="icon">&#11014;</span><span class="name">..</span></div>`;
  }
  const parts = cortexPath.split('/');
  html += '<div class="cortex-breadcrumb">';
  parts.forEach((p, i) => {
    const full = parts.slice(0, i + 1).join('/');
    html += `<span onclick="loadSidebarTree('${full}')">${p}</span>`;
    if (i < parts.length - 1) html += ' / ';
  });
  html += '</div>';
  const FOLDER_LABELS = {
    '1-character': 'Character', '2-mo-chuisle': 'Mo chuisle',
    '3-string': 'String', '4-interstellar': 'Interstellar',
    '5-life-xlab': 'Life Xlab', '6-snowball': 'Snowball',
    'zeroing': 'Zeroing', 'futures-options': 'Futures options',
    '2-sll': 'SLL', '3-hfk': 'HFK', '5-sport': 'Sport',
    'dashboard': 'Dashboard', 'mk1': 'MK1',
    'mkt-fb': 'MKT FB', 'side-hustle': 'Side Hustle', 'writing': 'Writing',
  };
  html += items.filter(i => !i.name.startsWith('.')).map(i => {
    const icon = i.type === 'dir' ? '&#128193;' : '&#128196;';
    const label = i.type === 'dir' ? (FOLDER_LABELS[i.name] || esc(i.name)) : esc(i.name);
    const onclick = i.type === 'dir'
      ? `loadSidebarTree('${i.path}')`
      : `openNote('${i.path}')`;
    return `<div class="tree-item" onclick="${onclick}"><span class="icon">${icon}</span><span class="name">${label}</span></div>`;
  }).join('');
  el.innerHTML = html;
}

async function openNote(filePath) {
  const res = await fetch(`${API}/api/cortex/file?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) return;
  cortexFile = await res.json();
  cortexEditing = false;
  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('scheduleNav').style.display = 'none';
  const noteView = document.getElementById('noteView');
  noteView.style.display = '';
  noteView.querySelector('#noteContent').innerHTML = renderNoteViewer();
  if (window.innerWidth < 900) toggleSidebar();
}

function showDashboard() {
  document.getElementById('dashboardView').style.display = '';
  document.getElementById('scheduleNav').style.display = '';
  document.getElementById('noteView').style.display = 'none';
  cortexFile = null;
}

function copyNotePath() {
  if (!cortexFile) return;
  navigator.clipboard.writeText(cortexFile.path).then(() => {
    const btn = document.getElementById('copyNotePathBtn');
    if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = '⎘'; }, 1500); }
  });
}

function renderNoteViewer() {
  if (!cortexFile) return '';
  const { path: fp, content } = cortexFile;
  const isHtml = fp.toLowerCase().endsWith('.html');
  const copyBtn = `<button id="copyNotePathBtn" onclick="copyNotePath()">⎘</button>`;

  if (isHtml) {
    setTimeout(() => {
      const iframe = document.getElementById('noteIframe');
      if (iframe) iframe.srcdoc = content;
    }, 0);
    return `<div class="md-toolbar">
      <button onclick="showDashboard()">&#9664; Back</button>
      <span class="md-path">${esc(fp)}</span>
      ${copyBtn}
    </div><iframe id="noteIframe" style="width:100%;height:calc(100vh - 50px);border:none;background:#1e1e1e;display:block"></iframe>`;
  }

  if (cortexEditing) {
    return `<div class="md-toolbar">
      <button onclick="showDashboard()">&#9664; Back</button>
      <span class="md-path">${esc(fp)}</span>
      ${copyBtn}
      <label style="cursor:pointer;font-size:10px;color:#58a6ff;padding:3px 8px">&#128247; <input type="file" accept="image/*" style="display:none" onchange="uploadImage(this.files[0])"></label>
      <button onclick="saveCortexFile()">Save</button>
      <button onclick="cortexEditing=false;document.getElementById('noteContent').innerHTML=renderNoteViewer()">Cancel</button>
    </div><textarea class="md-edit" id="cortexEditArea" onpaste="handlePaste(event)">${esc(content)}</textarea>`;
  }

  return `<div class="md-toolbar">
    <button onclick="showDashboard()">&#9664; Back</button>
    <span class="md-path">${esc(fp)}</span>
    ${copyBtn}
    <button onclick="cortexEditing=true;document.getElementById('noteContent').innerHTML=renderNoteViewer();document.getElementById('cortexEditArea')?.focus()">Edit</button>
  </div><div class="md-content">${renderMarkdown(content)}</div>`;
}

async function uploadImage(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast('이미지가 5MB를 초과합니다. 더 작은 이미지를 사용해주세요.', true);
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => { toast('이미지 읽기 실패. 파일 형식을 확인해주세요.', true); };
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const res = await fetch(`${API}/api/cortex/upload`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ fileName: file.name, base64, contentType: file.type })
    });
    const data = await res.json();
    if (data.ok) {
      const textarea = document.getElementById('cortexEditArea');
      if (textarea) {
        const pos = textarea.selectionStart;
        const before = textarea.value.slice(0, pos);
        const after = textarea.value.slice(pos);
        textarea.value = before + `\n${data.markdown}\n` + after;
      }
    } else {
      toast('Upload failed', true);
    }
  };
  reader.readAsDataURL(file);
}

function handlePaste(event) {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      uploadImage(item.getAsFile());
      return;
    }
  }
}

init();
window.addEventListener('resize', updateDeviceMode);

// Refresh workout bar when tab becomes visible (picks up mobile changes)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetch(`${API}/api/month?ym=${ym()}`)
      .then(r => r.json())
      .then(data => {
        for (const [day, dd] of Object.entries(data.days || {})) {
          if (!monthData.days[day]) monthData.days[day] = {};
          if (dd.workout !== undefined) monthData.days[day].workout = dd.workout;
        }
        return loadWorkoutLog();
      })
      .then(() => renderWorkoutBar())
      .catch(() => {});
  }
});
