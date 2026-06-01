const API = '';
const CATS = ['ritual','input','work','outcome'];
const CAT_NAMES = {ritual:'R&R', input:'Input', work:'Work', outcome:'Out'};
const DAY_NAMES = ['일','월','화','수','목','금','토'];
const TYPE_LABELS = {block:'BLOCK',flow:'FLOW',hf:'HF',vacation:'휴가'};
const TYPE_COLORS = {block:'badge-block',flow:'badge-flow',hf:'badge-hf',vacation:'badge-vacation'};
const TYPES = ['block','flow','hf','vacation'];

let currentYear, currentMonth, currentWeekStart, monthData, standingData, recurringData;
let todayMonthData = null; // 오늘 날짜 월 캐시 (월 탐색 시에도 유지)
let viewMode = 'month'; // 'month' (default) or 'week'

// --- Init ---
function init() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  currentWeekStart = getWeekStart(now);
  loadMonth(true);
  loadStandingOrders();
  loadRecurringTemplates();
  loadFrames();
  loadVision();
  loadSidebarTree('cortex');
  registerSW();
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
  const res = await fetch(`${API}/api/month?ym=${ym()}`);
  monthData = await res.json();
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
  // visionText2 is loaded from standingData.daily_mantra (global, see loadStandingOrders)
  // Auto viewMode: 오늘이 속한 주 → This Week, 그 외 주/월 → Full Month
  const _now = new Date();
  const _todayWeekStart = getWeekStart(_now);
  const _isTodayWeek = currentWeekStart.getFullYear() === _todayWeekStart.getFullYear()
    && currentWeekStart.getMonth() === _todayWeekStart.getMonth()
    && currentWeekStart.getDate() === _todayWeekStart.getDate();
  viewMode = _isTodayWeek ? 'week' : 'month';
  updateLabel();
  render();
  renderWorkoutBar();
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
  // 비전 텍스트: standing-orders.daily_mantra 우선, 없으면 현재 월 goals.goal
  const vt = document.getElementById('visionText2');
  if (vt) {
    const mantra = standingData.daily_mantra || (todayMonthData || monthData)?.goals?.goal || '';
    vt.textContent = mantra;
  }
  renderStandingOrders();
}

async function loadRecurringTemplates() {
  const res = await fetch(`${API}/api/recurring-templates`);
  recurringData = await res.json();
  renderRecurringTemplates();
}

// --- View toggle ---
function toggleView() {
  viewMode = viewMode === 'week' ? 'month' : 'week';
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
  const container = document.getElementById('calendarContainer');
  container.innerHTML = viewMode === 'month' ? renderMonthView() : renderWeekView();
  renderStats();
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
    const dd = monthData.days[String(c.d)] || {};
    CATS.forEach(cat => { const items = dd[cat] || []; pastTotal += items.length; pastDone += items.filter(i => i.done).length; });
  }));

  let html = renderDayHeaders();

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
  let html = '<div class="week-grid">';
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

function getHoliday(d) {
  if (!standingData?.holidays) return null;
  const key = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return standingData.holidays[key] || null;
}

function getYearlyEvents(d) {
  if (!standingData?.yearly) return [];
  return standingData.yearly.filter(y => y.month === currentMonth && y.day === d);
}

function getMonthlyRecurring(d) {
  if (!standingData?.monthly_recurring) return [];
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  return standingData.monthly_recurring.filter(m => {
    if (m.day === d) return true;
    if (m.day === 0 && d === daysInMonth) return true;
    return false;
  });
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

function renderDayCell(d, isToday, isWeek, isCurrent) {
  const dayData = getDayData(d, isCurrent !== false);
  const dow = new Date(currentYear, currentMonth - 1, d).getDay();
  const typeClass = dayData.day_type ? ` type-${dayData.day_type}` : '';
  const todayClass = isToday ? ' today' : '';
  const holidayClass = getHoliday(d) ? ' is-holiday' : '';
  const otherClass = isCurrent === false ? ' other-month' : '';

  return `<div class="day-cell${todayClass}${typeClass}${holidayClass}${otherClass}" ondragover="dayDragOver(event)" ondragleave="dayDragLeave(event)" ondrop="dayDrop(event,${d})">${renderDayCellContent(d, isToday, isWeek, isCurrent)}</div>`;
}

function renderDayCellContent(d, isToday, isWeek, isCurrent) {
  const dayData = getDayData(d, isCurrent !== false);
  const dow = new Date(currentYear, currentMonth - 1, d).getDay();
  const dowClass = dow === 0 ? ' sun' : dow === 6 ? ' sat' : '';

  const badgeHtml = dayData.day_type
    ? ` <span class="day-type-badge ${TYPE_COLORS[dayData.day_type]}" onclick="event.stopPropagation();cycleDayType(${d})">${TYPE_LABELS[dayData.day_type]}</span>`
    : '';
  let pastArrow = '';
  if (_pastToggleDay === d) {
    pastArrow = `<span onclick="event.stopPropagation();togglePastWeeks()" id="pastToggleIcon" style="cursor:pointer;color:#484f58;font-size:10px" title="Past weeks">&#9650;</span>`;
  }
  const holiday = getHoliday(d);
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
  const evtHtml = (holiday ? `<div class="holiday-name">${esc(holiday)}</div>` : '');
  let html = `<div class="day-num${dowClass}" onclick="cycleDayType(${d})" style="cursor:pointer" title="Set day type">
    <span>${d}${badgeHtml}</span>
    <span>${pastArrow}<span class="add-btn" onclick="event.stopPropagation();addItemPrompt(${d})">+</span></span>
  </div>${evtHtml}`;

  // One Thing
  const ot = dayData.one_thing || '';
  html += `<div class="one-thing" contenteditable="true"
    onblur="saveOneThing(${d}, this.textContent)"
    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
  >${esc(ot)}</div>`;

  // Recurring items (weekly/monthly/yearly) — rendered as checkable items
  const recArr = dayData._recurring || [];
  if (recArr.length) {
    const SRC_COLORS = { yearly: '#f0c040', monthly: '#bc8cff', weekly: '#6e7681' };
    recArr.forEach((item, idx) => {
      const doneClass = item.done ? 'done' : '';
      const clr = SRC_COLORS[item._src] || '#6e7681';
      html += `<div class="item ${doneClass}" style="border-left:2px solid ${clr};padding-left:4px">
        <input type="checkbox" ${item.done?'checked':''} onchange="toggleRecurring(${d},${idx})">
        <span class="item-text" style="color:${clr}">${linkify(item.text)}</span>
      </div>`;
    });
  }

  // Categories
  for (const cat of CATS) {
    const items = dayData[cat] || [];
    const isFutureOrToday = isToday || new Date(currentYear, currentMonth - 1, d) >= new Date(new Date().toDateString());
    if (items.length === 0 && !isFutureOrToday) continue;

    html += `<div class="category cat-${cat}">
      <div class="cat-label cl-${cat}">
        <span>${CAT_NAMES[cat]}</span>
        <span class="cat-add" onclick="addItemInline(${d},'${cat}')">+</span>
      </div>`;

    items.forEach((item, idx) => {
      const doneClass = item.done ? 'done' : '';
      const carriedClass = item._carried ? 'is-carried' : '';
      const checked = item.done ? 'checked' : '';
      html += `<div class="item ${doneClass} ${carriedClass}" draggable="false"
        ondragstart="dragStart(event,${d},'${cat}',${idx})"
        ondragend="dragEnd(event)"
        ondragover="dragOver(event)" ondragleave="dragLeave(event)"
        ondrop="drop(event,${d},'${cat}',${idx})">
        <input type="checkbox" ${checked} onchange="toggleItem(${d},'${cat}',${idx})">
        <span class="item-text" contenteditable="true"
          onblur="editItem(${d},'${cat}',${idx},this.textContent)"
          onkeydown="handleItemKey(event,${d},'${cat}',${idx})"
        >${item.url ? `<a href="${esc(item.url)}" target="_blank" onclick="event.stopPropagation()">${esc(item.text)}</a>` : linkify(item.text)}</span>
        <span class="link-btn${item.url?' has-link':''}" onclick="openLinkPopup(event,${d},'${cat}',${idx})" ontouchend="event.preventDefault();openLinkPopup(event,${d},'${cat}',${idx})" title="Link">&#128279;</span>
        <span class="del-btn" onclick="delItem(${d},'${cat}',${idx})">&#215;</span>
      </div>`;
    });

    html += `<div class="new-item" id="new-${d}-${cat}">
      <input type="text" placeholder="..."
        onkeydown="if(event.key==='Enter'){addNewItem(${d},'${cat}',this.value);this.value='';this.parentElement.classList.remove('active');}"
        onblur="setTimeout(()=>this.parentElement.classList.remove('active'),100)">
    </div></div>`;
  }

  // Empty cats for today
  if (isToday) {
    for (const cat of CATS) {
      if ((dayData[cat] || []).length > 0) continue;
      html += `<div class="category cat-${cat}"><div class="cat-label cl-${cat}"><span>${CAT_NAMES[cat]}</span>
        <span class="cat-add" onclick="addItemInline(${d},'${cat}')">+</span></div>
        <div class="new-item" id="new-${d}-${cat}">
          <input type="text" placeholder="..." onkeydown="if(event.key==='Enter'){addNewItem(${d},'${cat}',this.value);this.value='';}"
            onblur="setTimeout(()=>this.parentElement.classList.remove('active'),100)">
        </div></div>`;
    }
  }

  // Notes
  const notes = dayData.notes || '';
  const notesCls = notes ? 'day-notes has-content' : 'day-notes';
  html += `<div class="${notesCls}" id="notes-${d}" contenteditable="true"
    onblur="saveNotes(${d}, this.innerText)"
    onkeydown="if(event.key==='Escape')this.blur()"
  >${esc(notes).replace(/\\n/g,'<br>')}</div>`;

  return html;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function linkify(s) {
  // Handle [text](url) markdown links, then bare URLs
  let result = '';
  let last = 0;
  const re = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    result += esc(s.slice(last, m.index));
    result += `<a href="${esc(m[2])}" target="_blank" onclick="event.stopPropagation()">${esc(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  result += esc(s.slice(last));
  // Bare URLs not already inside an anchor
  result = result.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<"&]+)/g,
    '<a href="$1" target="_blank" onclick="event.stopPropagation()">$1</a>');
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

  const pct = total > 0 ? Math.round(done/total*100) : 0;

  let html = `<span>Total: <span class="stat-value">${done}/${total}</span> (${pct}%)</span>`;

  // Per-category
  for (const cat of CATS) {
    const s = catStats[cat];
    const p = s.total > 0 ? Math.round(s.done/s.total*100) : 0;
    html += `<span>${CAT_NAMES[cat]}: ${p}%</span>`;
  }

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
const AUTH = { 'Content-Type':'application/json', 'Authorization':'Bearer cortex-ritual-2026-fb' };

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
    const res = await fetch(`${API}/api/month`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ ym: ym(), data: monthData })
    });
    if (!res.ok) throw new Error(res.status);
  } catch (e) {
    document.title = '⚠ Save failed!';
    setTimeout(() => document.title = 'Cortex — Ritual & Routine', 3000);
  }
}

function ensureDay(d) {
  const key = String(d);
  if (!monthData.days[key]) monthData.days[key] = {};
  return monthData.days[key];
}

async function toggleItem(d, cat, idx) {
  ensureDay(d)[cat][idx].done = !ensureDay(d)[cat][idx].done;
  await save(); render();
}

async function toggleRecurring(d, idx) {
  const dd = ensureDay(d);
  if (!dd._recurring) return;
  dd._recurring[idx].done = !dd._recurring[idx].done;
  await save(); render();
}

// --- Link popup ---
let linkTarget = null;
let longPressTimer = null;

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
  if (item.text === t) return;
  // Auto-detect URL pasted into existing item
  const urlMatch = t.match(/^(https?:\/\/\S+)$/);
  const embeddedMatch = !urlMatch && t.match(/(https?:\/\/\S+)/);
  if (urlMatch && !item.url) {
    item.url = t;
  } else if (embeddedMatch && !item.url) {
    item.url = embeddedMatch[1];
  }
  item.text = t;
  await save(); render();
}

function handleItemKey(e, d, cat, idx) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const sel = window.getSelection();
    const fullText = e.target.textContent;
    const offset = sel.focusOffset;
    const before = fullText.slice(0, offset).trim();
    const after = fullText.slice(offset).trim();
    // Update current item with text before cursor
    const day = ensureDay(d);
    if (!day[cat]) day[cat] = [];
    day[cat][idx].text = before || fullText.trim();
    // Insert new item with text after cursor
    day[cat].splice(idx + 1, 0, { text: after, url: '', done: false });
    save().then(() => {
      render();
      // Focus the new item
      setTimeout(() => {
        const items = document.querySelectorAll(`.item[draggable]`);
        let count = 0;
        for (const item of items) {
          const span = item.querySelector('.item-text');
          if (span && span.textContent === after) { span.focus(); break; }
        }
      }, 50);
    });
  } else if (e.key === 'Backspace' && e.target.textContent.trim() === '') {
    e.preventDefault(); delItem(d, cat, idx);
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

async function delItem(d, cat, idx) {
  ensureDay(d)[cat].splice(idx, 1);
  await save(); render();
}

async function addNewItem(d, cat, text) {
  if (!text.trim()) return;
  const day = ensureDay(d);
  if (!day[cat]) day[cat] = [];
  const t = text.trim();
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
  if (c) { c.classList.add('active'); c.querySelector('input').focus(); }
}

function addItemPrompt(d) {
  ensureDay(d);
  render();
  setTimeout(() => {
    for (const cat of CATS) {
      const c = document.getElementById(`new-${d}-${cat}`);
      if (c) { c.classList.add('active'); c.querySelector('input').focus(); return; }
    }
  }, 50);
}

async function saveGoalText(text) {
  if (!standingData) standingData = {};
  standingData.daily_mantra = text.trim();
  await saveStandingData();
}

async function saveOneThing(d, text) {
  ensureDay(d).one_thing = text.trim();
  await save();
}

function renderWorkoutBar() {
  const today = new Date().getDate();
  const dd = (todayMonthData || monthData).days?.[String(today)] || {};
  const wo = dd.workout || [];
  const WORKOUT_GROUPS = [
    { label: '전면', parts: [] },
    { label: '측면', parts: [] },
    { label: '후면', parts: [] },
    { label: '등', parts: [] },
    { label: '가슴', parts: [] },
  ];
  const el = document.getElementById('workoutBar');
  if (!el) return;
  let chips = '';
  WORKOUT_GROUPS.forEach(g => {
    const isOn = wo.includes(g.label);
    chips += `<span class="workout-chip${isOn?' on':''}" onclick="toggleWorkout('${g.label}')">${g.label}</span>`;
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
  const today = String(new Date().getDate());
  const target = todayMonthData || monthData;
  if (!target.days[today]) target.days[today] = {};
  if (!target.days[today].workout) target.days[today].workout = [];
  const idx = target.days[today].workout.indexOf(part);
  if (idx >= 0) target.days[today].workout.splice(idx, 1);
  else target.days[today].workout.push(part);
  // save to the correct month (today's month, not the viewed month)
  const now = new Date();
  const todayYm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  await fetch(`${API}/api/month`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ ym: todayYm, data: target })
  });
  renderWorkoutBar();
}

async function saveNotes(d, text) {
  const dd = ensureDay(d);
  if (text.trim()) dd.notes = text.trim();
  else delete dd.notes;
  await save();
}

function toggleNotes(d) {
  const el = document.getElementById(`notes-${d}`);
  if (el) { el.classList.toggle('editing'); if (el.classList.contains('editing')) el.focus(); }
}

// --- Day Type ---
async function cycleDayType(d) {
  const dd = ensureDay(d);
  const current = dd.day_type || null;
  const idx = current ? TYPES.indexOf(current) : -1;
  const next = idx >= TYPES.length - 1 ? null : TYPES[idx + 1];

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
  await loadMonth(); // reload to get injected items
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
  if (data.ok) { alert('복원 완료'); loadMonth(); }
  else alert('백업 없음');
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
  const res = await fetch(`${API}/api/search/unified?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  const container = document.getElementById('searchResults');
  let html = '';

  // Schedule results
  if (data.schedule?.length) {
    html += '<div style="font-size:10px;color:#f0c040;padding:4px 12px;font-weight:600">SCHEDULE</div>';
    html += data.schedule.map(r => {
      const matchHtml = r.matches.map(m => {
        const highlighted = esc(m.text).replace(new RegExp(esc(q), 'gi'), '<mark>$&</mark>');
        return `<div class="sr-match"><span class="sr-cat">${m.field}</span> ${highlighted}</div>`;
      }).join('');
      return `<div class="search-result" onclick="goToResult('${r.ym}',${r.day})">
        <div class="sr-date">${r.ym} / ${r.day}일</div>${matchHtml}</div>`;
    }).join('');
  }

  // Notes results
  if (data.notes?.length) {
    html += '<div style="font-size:10px;color:#58a6ff;padding:4px 12px;font-weight:600;margin-top:8px">NOTES</div>';
    html += data.notes.map(r => {
      const icon = r.type === 'dir' ? '&#128193;' : '&#128196;';
      const onclick = r.type === 'dir' ? `closeSearch();loadSidebarTree('${r.path}')` : `closeSearch();openNote('${r.path}')`;
      return `<div class="search-result" onclick="${onclick}">
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
      <input type="checkbox" ${s.active?'checked':''} onchange="toggleSOActive(${i})">
      <span contenteditable="true" style="flex:1" onblur="editSOText(${i},this.textContent)">${esc(s.text)}</span>
      <span class="del-btn" onclick="delSO(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add"><input placeholder="Add standing order..." onkeydown="if(event.key==='Enter'){addSO(this.value);this.value='';}">
    <button onclick="addSO(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button></div>`;
  // HF dates
  const hfThisMonth = (standingData.happy_friday || []).filter(d => d.startsWith(ymKey));
  if (hfThisMonth.length) {
    html += '<div style="margin-top:6px;font-size:10px;color:#8b949e">Happy Friday:</div>';
    hfThisMonth.forEach(d => { html += `<span class="hf-badge">${d.split('-')[2]}일</span>`; });
  }
  // Holiday — 전체 월별
  const allHolidays = Object.entries(standingData.holidays || {}).sort(([a],[b]) => a.localeCompare(b));
  if (allHolidays.length) {
    const byMonth = {};
    allHolidays.forEach(([d, name]) => {
      const ym = d.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push({ day: d.split('-')[2], name });
    });
    html += '<div style="margin-top:6px;font-size:10px;color:#8b949e">Holidays:</div>';
    Object.entries(byMonth).forEach(([ym, items]) => {
      const isCurrent = ym === ymKey;
      html += `<div style="margin-top:4px;font-size:9px;color:${isCurrent ? '#f0c040' : '#484f58'};font-weight:${isCurrent ? '600' : '400'}">${ym.replace('-','.')}:</div>`;
      items.forEach(({ day, name }) => {
        html += `<div class="so-monthly-item" style="${isCurrent ? '' : 'color:#6e7681'}">${day}일 — ${esc(name)}</div>`;
      });
    });
  }
  html += '</div>';

  // Weekly — editable
  const DOW_NAMES_SHORT = ['일','월','화','수','목','금','토'];
  const FREQ_LABELS = { weekly: '매주', biweekly: '격주' };
  html += '<div id="soTab-weekly" style="display:none">';
  const wr = standingData.weekly_recurring || [];
  const wrLen = wr.length;
  wr.forEach((w, i) => {
    html += `<div class="so-item">
      <div class="so-move">
        <span onclick="moveSOItem('weekly_recurring',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
        <span onclick="moveSOItem('weekly_recurring',${i},1)" ${i===wrLen-1?'style="visibility:hidden"':''}>&#9660;</span>
      </div>
      <select style="width:40px;background:#0d1117;border:1px solid #30363d;color:#f0c040;font-size:10px;border-radius:2px" onchange="editWeeklyDow(${i},+this.value)">
        ${DOW_NAMES_SHORT.map((n,di)=>`<option value="${di}" ${w.dow===di?'selected':''}>${n}</option>`).join('')}
      </select>
      <select style="width:44px;background:#0d1117;border:1px solid #30363d;color:#6e7681;font-size:10px;border-radius:2px" onchange="editWeeklyFreq(${i},this.value)">
        <option value="weekly" ${w.freq==='weekly'?'selected':''}>매주</option>
        <option value="biweekly" ${w.freq==='biweekly'?'selected':''}>격주</option>
      </select>
      <span contenteditable="true" style="flex:1" onblur="editWeeklyText(${i},this.textContent)">${esc(w.text)}</span>
      <span class="del-btn" onclick="delWeekly(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add" style="gap:4px">
    <select id="newWkDow" style="width:40px;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:11px;border-radius:2px">
      ${DOW_NAMES_SHORT.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}
    </select>
    <select id="newWkFreq" style="width:44px;background:#0d1117;border:1px solid #30363d;color:#e0e0e0;font-size:11px;border-radius:2px">
      <option value="weekly">매주</option><option value="biweekly">격주</option>
    </select>
    <input placeholder="Add weekly item..." onkeydown="if(event.key==='Enter'){addWeekly(this.value);this.value='';}">
    <button onclick="addWeekly(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button>
  </div>`;
  html += '</div>';

  // Monthly — editable
  html += '<div id="soTab-monthly" style="display:none">';

  // Monthly Recurring (매달 반복)
  const mr = standingData.monthly_recurring || [];
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
        <select style="width:46px;${selStyle}" onchange="editMR(${i},'day',+this.value)">
          <option value="0" ${item.day===0?'selected':''}>말일</option>
          ${Array.from({length:31},(_,d)=>`<option value="${d+1}" ${item.day===d+1?'selected':''}>${d+1}일</option>`).join('')}
        </select>
        <span contenteditable="true" style="flex:1" onblur="editMR(${i},'text',this.textContent)">${esc(item.text)}</span>
        <span class="link-btn" onclick="openMRLink(event,${i})" style="cursor:pointer;font-size:8px;display:inline">&#128279;</span>
        <span class="del-btn" onclick="delMR(${i})" style="display:inline">&#215;</span>
      </div>`;
    });
    html += `<div class="frame-add" style="gap:4px">
      <select id="newMRDay" style="width:46px;${selStyle}">
        <option value="0">말일</option>${Array.from({length:31},(_,d)=>`<option value="${d+1}">${d+1}일</option>`).join('')}
      </select>
      <input placeholder="Add monthly recurring..." onkeydown="if(event.key==='Enter'){addMR(this.value);this.value='';}">
      <button onclick="addMR(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button>
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
      <span contenteditable="true" style="flex:1" onblur="editMonthlyItem(${i},this.textContent)">${esc(text)}</span>
      <span class="del-btn" onclick="delMonthlyItem(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add"><input placeholder="Add this-month item..." onkeydown="if(event.key==='Enter'){addMonthlyItem(this.value);this.value='';}">
    <button onclick="addMonthlyItem(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button></div>`;
  html += '</div>';

  // Yearly — editable
  html += '<div id="soTab-yearly" style="display:none">';
  const yLen = (standingData.yearly || []).length;
  const selStyle = 'background:#0d1117;border:1px solid #30363d;color:#f0c040;font-size:10px;border-radius:2px';
  (standingData.yearly || []).forEach((y, i) => {
    const isCurrent = y.month === currentMonthNum;
    const dayVal = y.day || 0;
    const dayOpts = '<option value="0"' + (!dayVal?' selected':'') + '>-</option>' +
      Array.from({length:31},(_,d)=>`<option value="${d+1}" ${dayVal===d+1?'selected':''}>${d+1}</option>`).join('');
    html += `<div class="so-item ${isCurrent ? 'current-month' : ''}">
      <div class="so-move">
        <span onclick="moveSOItem('yearly',${i},-1)" ${i===0?'style="visibility:hidden"':''}>&#9650;</span>
        <span onclick="moveSOItem('yearly',${i},1)" ${i===yLen-1?'style="visibility:hidden"':''}>&#9660;</span>
      </div>
      <select style="width:46px;${selStyle}" onchange="editYearlyMonth(${i},+this.value)">
        ${Array.from({length:12},(_,m)=>`<option value="${m+1}" ${y.month===m+1?'selected':''}>${m+1}월</option>`).join('')}
      </select>
      <select style="width:42px;${selStyle}" onchange="editYearlyDay(${i},+this.value)">
        ${dayOpts}
      </select>
      <span contenteditable="true" style="flex:1" onblur="editYearlyText(${i},this.textContent)">${esc(y.text)}</span>
      <span class="del-btn" onclick="delYearly(${i})" style="display:inline">&#215;</span>
    </div>`;
  });
  html += `<div class="frame-add" style="gap:4px">
    <select id="newYearlyMonth" style="width:46px;${selStyle}">
      ${Array.from({length:12},(_,m)=>`<option value="${m+1}">${m+1}월</option>`).join('')}
    </select>
    <select id="newYearlyDay" style="width:42px;${selStyle}">
      <option value="0">-</option>${Array.from({length:31},(_,d)=>`<option value="${d+1}">${d+1}</option>`).join('')}
    </select>
    <input placeholder="Add yearly item..." onkeydown="if(event.key==='Enter'){addYearly(this.value);this.value='';}">
    <button onclick="addYearly(this.previousElementSibling.value);this.previousElementSibling.value=''">+</button></div>`;
  html += '</div>';

  document.getElementById('soPanel').innerHTML = html;
}

// --- Standing Orders CRUD ---
async function saveStandingData() {
  await fetch(`${API}/api/standing-orders`, {
    method:'POST', headers: AUTH,
    body: JSON.stringify(standingData)
  });
}

function moveSOItem(section, idx, dir) {
  const target = idx + dir;
  let arr;
  if (section === 'standing') arr = standingData.standing;
  else if (section === 'weekly_recurring') arr = standingData.weekly_recurring;
  else if (section === 'monthly_recurring') arr = standingData.monthly_recurring;
  else if (section === 'monthly') arr = standingData.monthly[ym()] || [];
  else if (section === 'yearly') arr = standingData.yearly;
  else return;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  saveStandingData(); renderStandingOrders();
}

function toggleSOActive(i) { standingData.standing[i].active = !standingData.standing[i].active; saveStandingData(); }
function editSOText(i, text) { if(text.trim()) standingData.standing[i].text = text.trim(); saveStandingData(); }
function delSO(i) { standingData.standing.splice(i, 1); saveStandingData(); renderStandingOrders(); }
function addSO(text) {
  if (!text?.trim()) return;
  standingData.standing.push({ id: `so-${Date.now()}`, text: text.trim(), active: true });
  saveStandingData(); renderStandingOrders();
}

function editMonthlyItem(i, text) {
  const k = ym();
  if (!standingData.monthly[k]) return;
  standingData.monthly[k][i] = text.trim();
  saveStandingData();
}
function delMonthlyItem(i) {
  const k = ym();
  if (!standingData.monthly[k]) return;
  standingData.monthly[k].splice(i, 1);
  saveStandingData(); renderStandingOrders();
}
function addMonthlyItem(text) {
  if (!text?.trim()) return;
  const k = ym();
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
function delMR(i) { standingData.monthly_recurring.splice(i, 1); saveStandingData(); renderStandingOrders(); }
function addMR(text) {
  if (!text?.trim()) return;
  if (!standingData.monthly_recurring) standingData.monthly_recurring = [];
  const day = +(document.getElementById('newMRDay')?.value || 0);
  standingData.monthly_recurring.push({ day, text: text.trim() });
  saveStandingData(); renderStandingOrders();
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
function delWeekly(i) { standingData.weekly_recurring.splice(i, 1); saveStandingData(); renderStandingOrders(); }
function addWeekly(text) {
  if (!text?.trim()) return;
  const dow = +(document.getElementById('newWkDow')?.value || 1);
  const freq = document.getElementById('newWkFreq')?.value || 'weekly';
  if (!standingData.weekly_recurring) standingData.weekly_recurring = [];
  standingData.weekly_recurring.push({ dow, freq, text: text.trim() });
  saveStandingData(); renderStandingOrders();
}

function editYearlyMonth(i, month) { standingData.yearly[i].month = month; saveStandingData(); }
function editYearlyDay(i, day) { standingData.yearly[i].day = day || 0; saveStandingData(); }
function editYearlyText(i, text) { if(text.trim()) standingData.yearly[i].text = text.trim(); saveStandingData(); }
function delYearly(i) { standingData.yearly.splice(i, 1); saveStandingData(); renderStandingOrders(); }
function addYearly(text) {
  if (!text?.trim()) return;
  const month = +(document.getElementById('newYearlyMonth')?.value || 1);
  const day = +(document.getElementById('newYearlyDay')?.value || 0);
  standingData.yearly.push({ month, day, text: text.trim() });
  saveStandingData(); renderStandingOrders();
}

function showSOTab(name, el) {
  ['standing','weekly','monthly','yearly'].forEach(t => {
    const el = document.getElementById(`soTab-${t}`);
    if (el) el.style.display = t === name ? '' : 'none';
  });
  el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
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
    alert('Create failed: ' + (data.error || 'unknown'));
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
    alert('Save failed: ' + (data.error || 'unknown'));
  }
}

async function searchCortex(q) {
  if (!q || q.length < 2) return;
  const res = await fetch(`${API}/api/cortex/search?q=${encodeURIComponent(q)}`);
  const results = await res.json();
  const el = document.getElementById('sidebarTree');
  if (!el) return;
  if (!results.length) { el.innerHTML = '<div style="color:#484f58;padding:8px">No results</div>'; return; }
  el.innerHTML = results.map(r => {
    const icon = r.type === 'dir' ? '&#128193;' : '&#128196;';
    const onclick = r.type === 'dir'
      ? `loadSidebarTree('${r.path}')`
      : `openNote('${r.path}')`;
    return `<div class="tree-item" onclick="${onclick}"><span class="icon">${icon}</span><span class="name">${esc(r.name)}</span></div>`;
  }).join('');
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

  let html = '<div style="overflow-x:auto"><table class="vision-table">';
  // Header
  html += '<tr><th>구분</th>';
  years.forEach(y => { html += `<th>${y}</th>`; });
  html += '</tr>';
  // Rows
  cats.forEach((cat, ci) => {
    html += `<tr><td>${esc(cat.label)}</td>`;
    years.forEach(y => {
      const val = cat.cells?.[y] || '';
      html += `<td contenteditable="true" onblur="editVisionCell(${ci},'${y}',this.innerText)">${esc(val).replace(/\n/g,'<br>')}</td>`;
    });
    html += '</tr>';
  });
  html += '</table></div>';

  // Admin notes
  const notes = visionData.admin_notes || '';
  html += `<div class="admin-notes">
    <div class="admin-notes-title">ADMIN NOTES</div>
    <div class="admin-notes-content" contenteditable="true" onblur="editVisionNotes(this.innerText)">${esc(notes).replace(/\n/g,'<br>')}</div>
  </div>`;

  el.innerHTML = html;
}

async function saveVisionData() {
  await fetch(`${API}/api/vision`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify(visionData)
  });
}

function editVisionCell(catIdx, year, text) {
  if (!visionData.categories[catIdx]) return;
  if (!visionData.categories[catIdx].cells) visionData.categories[catIdx].cells = {};
  visionData.categories[catIdx].cells[year] = text.trim();
  saveVisionData();
}

function editVisionNotes(text) {
  visionData.admin_notes = text.trim();
  saveVisionData();
}

// --- Day Frames Admin ---
let framesData = null;
const FRAME_TYPES = ['weekday', 'flow', 'block'];
const FRAME_TYPE_LABELS = { weekday: 'Weekday (평일)', flow: 'Flow Day (토/HF)', block: 'Block Day (일)' };
const CAT_TYPE_LABELS = { routine: 'Routine (매일 리셋)', todo: 'To-do (이월)' };

async function loadFrames() {
  const res = await fetch(`${API}/api/day-frames`);
  framesData = await res.json();
  renderFrames();
}

function renderFrames() {
  if (!framesData) return;
  const el = document.getElementById('framesPanel');

  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap">';
  for (const ftype of FRAME_TYPES) {
    const frame = framesData[ftype] || { label: ftype, categories: {} };
    html += `<div class="frame-section frame-type-${ftype}" style="flex:1;min-width:280px">`;
    html += `<div class="frame-section-header"><span class="frame-section-title">${esc(frame.label || FRAME_TYPE_LABELS[ftype])}</span></div>`;

    for (const cat of CATS) {
      const catData = frame.categories?.[cat] || { type: 'routine', items: [] };
      const catType = catData.type || 'routine';
      html += `<div class="frame-cat" style="border-left:2px solid ${catColorMap[cat]};padding-left:6px">`;
      html += `<div class="frame-cat-header">
        <span class="cl-${cat}">${CAT_NAMES[cat]}</span>
        <span class="frame-cat-type ${catType}" onclick="toggleCatType('${ftype}','${cat}')" style="cursor:pointer" title="Click to toggle">${catType}</span>
      </div>`;

      (catData.items || []).forEach((rawItem, idx) => {
        const isObj = typeof rawItem === 'object';
        const text = isObj ? rawItem.text : rawItem;
        const url = isObj ? (rawItem.url || '') : '';
        const hasUrl = url.length > 0;
        html += `<div class="frame-item">
          <span style="color:#484f58;font-size:9px">${idx+1}</span>
          <input value="${esc(text)}" onchange="editFrameItem('${ftype}','${cat}',${idx},this.value)">
          <span class="link-btn${hasUrl?' has-link':''}" onclick="openFrameLink(event,'${ftype}','${cat}',${idx})" style="cursor:pointer;font-size:8px;display:inline">&#128279;</span>
          <span class="frame-del" onclick="delFrameItem('${ftype}','${cat}',${idx})">&#215;</span>
        </div>`;
      });

      html += `<div class="frame-add">
        <input placeholder="Add item..." onkeydown="if(event.key==='Enter'){addFrameItem('${ftype}','${cat}',this.value);this.value='';}">
        <button onclick="addFrameItem('${ftype}','${cat}',this.previousElementSibling.value);this.previousElementSibling.value=''">+</button>
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
}

const catColorMap = { ritual: '#f0c040', input: '#58a6ff', work: '#56d364', outcome: '#bc8cff' };

async function saveFramesData() {
  await fetch(`${API}/api/day-frames`, {
    method: 'POST', headers: AUTH,
    body: JSON.stringify(framesData)
  });
}

function toggleCatType(ftype, cat) {
  const catData = framesData[ftype].categories[cat];
  catData.type = catData.type === 'routine' ? 'todo' : 'routine';
  saveFramesData();
  renderFrames();
}

function getFrameItem(ftype, cat, idx) {
  const raw = framesData[ftype].categories[cat].items[idx];
  return typeof raw === 'object' ? raw : { text: raw, url: '' };
}

function setFrameItem(ftype, cat, idx, obj) {
  framesData[ftype].categories[cat].items[idx] = obj.url ? obj : obj.text;
}

function addFrameItem(ftype, cat, text) {
  if (!text?.trim()) return;
  if (!framesData[ftype].categories[cat]) framesData[ftype].categories[cat] = { type: 'routine', items: [] };
  framesData[ftype].categories[cat].items.push(text.trim());
  saveFramesData();
  renderFrames();
}

function editFrameItem(ftype, cat, idx, text) {
  const item = getFrameItem(ftype, cat, idx);
  item.text = text.trim();
  setFrameItem(ftype, cat, idx, item);
  saveFramesData();
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
  framesData[ftype].categories[cat].items.splice(idx, 1);
  saveFramesData();
  renderFrames();
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
  alert(`${data.range}: ${data.injected} changes applied`);
  loadMonth();
}

// --- Recurring Templates Panel ---
function renderRecurringTemplates() {
  if (!recurringData) return;
  let html = `<div class="rtpl-toolbar">
    <select id="rtplCat">${CATS.map(c=>`<option value="${c}">${CAT_NAMES[c]}</option>`).join('')}</select>
    <input type="text" id="rtplName" class="rtpl-name" placeholder="New recurring..." onkeydown="if(event.key==='Enter')addRT()">
    <select id="rtplType" onchange="updateRTExtra()">
      <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
    </select>
    <span id="rtplExtra"></span>
    <button onclick="addRT()">Add</button>
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
  document.getElementById('rtPanel').innerHTML = html;
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

// --- Pull-to-refresh ---
let pullY = 0, pullActive = false;
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    save();
  }
});

// Long-press drag: 300ms hold → draggable 활성화
let _dragLongPressTimer = null;
let _dragPendingEl = null;
document.addEventListener('pointerdown', e => {
  const item = e.target.closest('.item[draggable]');
  if (!item) return;
  _dragPendingEl = item;
  _dragLongPressTimer = setTimeout(() => {
    item.draggable = true;
    item.classList.add('drag-ready');
    _dragLongPressTimer = null;
  }, 300);
});
document.addEventListener('pointerup', () => {
  if (_dragLongPressTimer) { clearTimeout(_dragLongPressTimer); _dragLongPressTimer = null; }
  if (_dragPendingEl) { _dragPendingEl.classList.remove('drag-ready'); _dragPendingEl = null; }
});
document.addEventListener('pointermove', e => {
  // Cancel long-press if moved significantly before timeout
  if (_dragLongPressTimer && _dragPendingEl) {
    const moved = Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3;
    if (moved) { clearTimeout(_dragLongPressTimer); _dragLongPressTimer = null; _dragPendingEl = null; }
  }
});

document.addEventListener('touchstart', e => {
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
  if (res.ok) { input.value = ''; alert('Saved to inbox'); }
  else alert('Save failed');
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
  if (!res.ok) { el.innerHTML = '<div style="color:#f85149;padding:8px">Load failed</div>'; return; }
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
  html += items.filter(i => !i.name.startsWith('.')).map(i => {
    const icon = i.type === 'dir' ? '&#128193;' : '&#128196;';
    const onclick = i.type === 'dir'
      ? `loadSidebarTree('${i.path}')`
      : `openNote('${i.path}')`;
    return `<div class="tree-item" onclick="${onclick}"><span class="icon">${icon}</span><span class="name">${esc(i.name)}</span></div>`;
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

function renderNoteViewer() {
  if (!cortexFile) return '';
  const { path: fp, content, name } = cortexFile;
  if (cortexEditing) {
    return `<div class="md-toolbar">
      <button onclick="showDashboard()">&#9664; Back</button>
      <span class="md-path">${esc(fp)}</span>
      <label style="cursor:pointer;font-size:10px;color:#58a6ff;padding:3px 8px">&#128247; <input type="file" accept="image/*" style="display:none" onchange="uploadImage(this.files[0])"></label>
      <button onclick="saveCortexFile()">Save</button>
      <button onclick="cortexEditing=false;document.getElementById('noteContent').innerHTML=renderNoteViewer()">Cancel</button>
    </div><textarea class="md-edit" id="cortexEditArea" onpaste="handlePaste(event)">${esc(content)}</textarea>`;
  }
  return `<div class="md-toolbar">
    <button onclick="showDashboard()">&#9664; Back</button>
    <span class="md-path">${esc(fp)}</span>
    <button onclick="cortexEditing=true;document.getElementById('noteContent').innerHTML=renderNoteViewer();document.getElementById('cortexEditArea')?.focus()">Edit</button>
  </div><div class="md-content">${renderMarkdown(content)}</div>`;
}

async function uploadImage(file) {
  if (!file) return;
  const reader = new FileReader();
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
      alert('Upload failed');
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
