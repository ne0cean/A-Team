/**
 * confluence-sync/render.mjs
 * Cortex 데이터 → Confluence Storage Format (XHTML) 렌더러
 *
 * 페이지 구조:
 *   [오늘 상세] - 카테고리별 태스크 리스트
 *   [이번주] - 요일별 컴팩트 뷰
 *   [Standing Orders] - 활성 항목
 *   <!-- CORTEX_META:{...} -->  - 싱크 메타데이터 (파서가 사용)
 */

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const CAT_LABEL = {
  ritual:  '루틴',
  input:   '인풋',
  work:    '업무',
  outcome: '아웃컴',
  flow:    '플로우',
  block:   '블록',
};

const CAT_COLOR = {
  ritual:  '#DFF0D8',
  input:   '#D9EDF7',
  work:    '#FCF8E3',
  outcome: '#F2DEDE',
  flow:    '#E8D5F5',
  block:   '#F5E6D5',
};

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let _taskIdCounter = 1;

function taskList(items, dayNum, cat) {
  if (!items?.length) return '<p><em>-</em></p>';
  _taskIdCounter = (_taskIdCounter % 9000) + 1;
  const tasks = items.map((item, idx) => {
    const status = item.done ? 'complete' : 'incomplete';
    // 아이템 ID를 task body 끝에 숨김으로 인코딩 (파싱 시 사용)
    const meta = `[cx:${dayNum}:${cat}:${idx}]`;
    const text = escXml(item.text || '');
    return `<ac:task>
      <ac:task-id>${_taskIdCounter++}</ac:task-id>
      <ac:task-status>${status}</ac:task-status>
      <ac:task-body>${text} <ac:inline-comment-marker ac:ref="${meta}"/></ac:task-body>
    </ac:task>`;
  }).join('\n');
  return `<ac:task-list>\n${tasks}\n</ac:task-list>`;
}

function todaySection(dayData, dateStr, cats) {
  const d = new Date(dateStr + 'T00:00:00');
  const label = `${MONTH_KO[d.getMonth()]} ${d.getDate()}일 (${DAYS_KO[d.getDay()]})`;
  const dayNum = d.getDate();
  const rows = cats.map(cat => {
    // work 카테고리: _frame 제외한 work + _recurring 합산
    const baseItems = (dayData?.[cat] || []).filter(i => !i._frame);
    const recurItems = cat === 'work' ? (dayData?._recurring || []) : [];
    const items = [...baseItems, ...recurItems];
    if (!items.length) return '';
    const bg = CAT_COLOR[cat];
    return `<tr>
      <td style="background-color:${bg};font-weight:bold;width:80px;">${CAT_LABEL[cat]}</td>
      <td>${taskList(items, dayNum, cat)}</td>
    </tr>`;
  }).filter(Boolean).join('\n');

  return `<h2>오늘 — ${label}</h2>
<table data-cortex-section="today" data-date="${dateStr}">
  <colgroup><col style="width:80px"/><col/></colgroup>
  <tbody>
${rows}
  </tbody>
</table>`;
}

function weekSection(monthData, todayStr, cats) {
  const today = new Date(todayStr + 'T00:00:00');
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7)); // ISO Mon

  const cols = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNum = String(d.getDate());
    const items = monthData.days?.[dayNum] || {};
    const yy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
    const isToday = `${yy}-${mm}-${dd}` === todayStr;
    const allItems = cats.flatMap(cat => {
      const base = (items[cat] || []).filter(i => !i._frame);
      const recur = cat === 'work' ? (items._recurring || []) : [];
      return [...base, ...recur];
    });
    const label = `${DAYS_KO[d.getDay()]} ${d.getDate()}`;
    const bg = isToday ? '#FFF9C4' : 'transparent';
    const taskHtml = allItems.slice(0,5).map(it => {
      const done = it.done ? '✓' : '○';
      return `<li>${done} ${escXml(it.text||'').slice(0,30)}</li>`;
    }).join('');
    cols.push(`<td style="background-color:${bg};vertical-align:top;min-width:100px;">
      <strong>${label}</strong>
      <ul style="margin:4px 0 0 14px;font-size:11px;">${taskHtml || '<li style="color:#aaa">-</li>'}</ul>
    </td>`);
  }

  return `<h2>이번주</h2>
<table data-cortex-section="week">
  <tbody><tr>${cols.join('\n')}</tr></tbody>
</table>`;
}

function standingOrdersSection(soData) {
  const active = (soData.standing || []).filter(s => s.active);
  if (!active.length) return '';

  const tasks = active.map((so, idx) => {
    const meta = `[so:${so.id || idx}]`;
    return `<ac:task>
      <ac:task-id>${_taskIdCounter++}</ac:task-id>
      <ac:task-status>incomplete</ac:task-status>
      <ac:task-body>${escXml(so.text||'')} <ac:inline-comment-marker ac:ref="${meta}"/></ac:task-body>
    </ac:task>`;
  }).join('\n');

  return `<h2>Standing Orders (활성)</h2>
<ac:task-list data-cortex-section="standing">
${tasks}
</ac:task-list>`;
}

export function renderPage(monthData, soData, todayStr, cats = ['ritual','input','work','outcome','flow','block']) {
  _taskIdCounter = 1;
  const dayNum = String(parseInt(todayStr.split('-')[2]));
  const dayData = monthData.days?.[dayNum] || {};

  const syncMeta = JSON.stringify({
    cortexHash: hashData(monthData),
    syncedAt: new Date().toISOString(),
    todayStr,
  });

  const sections = [
    todaySection(dayData, todayStr, cats),
    weekSection(monthData, todayStr, cats),
    standingOrdersSection(soData),
    `<!-- CORTEX_META:${syncMeta} -->`,
  ].filter(Boolean);

  return sections.join('\n<hr/>\n');
}

export function pageTitle(todayStr) {
  const d = new Date(todayStr + 'T00:00:00');
  return `Cortex Dashboard — ${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function hashData(data) {
  const str = JSON.stringify(data);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(16);
}
