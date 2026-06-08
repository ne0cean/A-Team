#!/usr/bin/env node
/**
 * generate-samples.mjs
 * 렌더링 방식 비교 샘플 6개 생성
 * Options 2/3/4 × Vision Board / Twilight Mood board
 *
 * 사용: node scripts/generate-samples.mjs
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SAMPLES_DIR = join(ROOT, 'cortex/2/zeroing/samples');
const IMG_BASE = '../../../attachments/';

const ONENOTE = join(ROOT, 'cortex/4/interstellar-onenote/2_6 hexagonal pillars_Rocks_Helm/Zeroing');
const GENERATED = join(ROOT, 'cortex/2/zeroing');
const TEMPLATE = join(ROOT, 'scripts/cortex-dashboard/templates/board-template.html');

const [vSrc, tSrc, boardTpl, vGen, tGen] = await Promise.all([
  readFile(join(ONENOTE, 'Vision Board.onenote.html'), 'utf-8'),
  readFile(join(ONENOTE, 'Twilight Mood board.onenote.html'), 'utf-8'),
  readFile(TEMPLATE, 'utf-8'),
  readFile(join(GENERATED, 'Vision Board.html'), 'utf-8'),
  readFile(join(GENERATED, 'Twilight Mood board.html'), 'utf-8'),
]);
await mkdir(SAMPLES_DIR, { recursive: true });

// ── Utilities ─────────────────────────────────────────────────────────────────

function extractBody(html) {
  const style = (html.match(/<body[^>]*style="([^"]*)"/) || [])[1] || '';
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || '';
  return { style, body: body.replace(/__ATTACHMENT__/g, IMG_BASE) };
}

function extractMeta(html) {
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || 'Untitled';
  const date = (html.match(/content="(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  return { title, date };
}

function extractDefaultCards(genHtml) {
  const m = genHtml.match(/const DEFAULT_CARDS = (\[[\s\S]*?\]);\s*\nconst CONTENT_HASH/);
  return m ? JSON.parse(m[1]) : [];
}

function md5(str) {
  return createHash('md5').update(str).digest('hex').slice(0, 8);
}

/** Extract table column contents from the html card */
function extractTableColumns(htmlCardContent) {
  const cols = ['', '', ''];
  const html = htmlCardContent;
  let pos = 0, depth = 0;
  let inTd = false, tdStart = 0, tdCol = -1;

  while (pos < html.length) {
    if (html[pos] !== '<') { pos++; continue; }
    const end = html.indexOf('>', pos);
    if (end < 0) break;
    const tag = html.slice(pos, end + 1);
    const nm = (tag.match(/^<\s*\/?([a-zA-Z]+)/) || [])[1]?.toLowerCase();
    if (!nm) { pos = end + 1; continue; }
    const isClose = tag[1] === '/';

    if (!isClose) {
      if (nm === 'table') depth++;
      else if (nm === 'td' && depth === 1) {
        inTd = true; tdStart = end + 1;
        if (tag.includes('width:295')) tdCol = 0;
        else if (tag.includes('width:356')) tdCol = 1;
        else tdCol = 2;
      }
    } else {
      if (nm === 'table') depth = Math.max(0, depth - 1);
      else if (nm === 'td' && depth === 1 && inTd) {
        const content = html.slice(tdStart, pos);
        if (tdCol >= 0) cols[tdCol] += content + '\n';
        inTd = false; tdCol = -1;
      }
    }
    pos = end + 1;
  }
  return cols;
}

/** Inject a mode badge into board-template HTML (before </body>) */
function injectBadge(html, label, color) {
  const badge = `<div style="position:fixed;bottom:12px;right:80px;z-index:9999;background:${color};color:white;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;pointer-events:none;">${label}</div>`;
  return html.replace('</body>', badge + '\n</body>');
}

/** Generate a card board HTML from board-template */
function makeBoardHtml(tpl, { title, date, saveKey, imgBase, cards, badge }) {
  const json = JSON.stringify(cards, null, 2);
  const hash = md5(json);
  let html = tpl
    .replace('{{BOARD_TITLE}}', title).replace('{{BOARD_TITLE}}', title)
    .replace('{{BOARD_DATE}}', date)
    .replace('{{SAVE_KEY}}', saveKey)
    .replace('{{IMG_BASE}}', imgBase)
    .replace('{{DEFAULT_CARDS}}', json)
    .replace('{{CONTENT_HASH}}', hash);
  if (badge) html = injectBadge(html, badge.label, badge.color);
  return html;
}

/** Generate passthrough HTML (opt2 / opt3-Vision) */
function makePassthroughHtml({ title, date, bodyStyle, bodyHtml, badge, withAnnotation, noteKey }) {
  const annoBtn = withAnnotation
    ? `<button id="anno-btn" onclick="toggleAnno()" style="background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:12px;">✍ 메모</button>`
    : '';

  const annoScript = withAnnotation ? `
<script>
let annoMode = false;
const NKEY = '${noteKey}';
let notes = JSON.parse(localStorage.getItem(NKEY) || '[]');

function renderNotes() {
  document.querySelectorAll('.sticky-note').forEach(s => s.remove());
  const cv = document.getElementById('canvas');
  notes.forEach((n, i) => {
    const el = document.createElement('div');
    el.className = 'sticky-note';
    el.style.cssText = \`position:absolute;left:\${n.x}px;top:\${n.y}px;z-index:800;
      background:#ffe066;color:#111;padding:6px 24px 6px 8px;border-radius:4px;
      font-size:12px;max-width:200px;min-width:80px;cursor:move;
      box-shadow:2px 2px 8px rgba(0,0,0,.5);white-space:pre-wrap;line-height:1.4;\`;
    el.innerHTML = \`<span style="position:absolute;top:2px;right:5px;cursor:pointer;font-weight:bold;" onclick="delNote(\${i})">×</span>\` + n.text;
    drag(el, i);
    cv.appendChild(el);
  });
}

function delNote(i) { notes.splice(i, 1); save(); renderNotes(); }
function save() { localStorage.setItem(NKEY, JSON.stringify(notes)); }

function toggleAnno() {
  annoMode = !annoMode;
  const btn = document.getElementById('anno-btn');
  btn.textContent = annoMode ? '✍ ON' : '✍ 메모';
  btn.style.background = annoMode ? '#388bfd' : '#21262d';
  document.getElementById('canvas').style.cursor = annoMode ? 'crosshair' : '';
}

document.getElementById('canvas').addEventListener('click', e => {
  if (!annoMode || e.target.closest('.sticky-note')) return;
  const r = document.getElementById('canvas').getBoundingClientRect();
  const wrap = document.getElementById('wrap');
  const x = e.clientX - r.left + wrap.scrollLeft;
  const y = e.clientY - r.top + wrap.scrollTop;
  const text = prompt('메모 내용:');
  if (!text) return;
  notes.push({ x: Math.round(x), y: Math.round(y), text });
  save(); renderNotes();
});

function drag(el, idx) {
  el.addEventListener('mousedown', e => {
    if (e.target.tagName === 'SPAN') return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const ox = notes[idx].x, oy = notes[idx].y;
    const mv = e => { el.style.left = (ox + e.clientX - sx) + 'px'; el.style.top = (oy + e.clientY - sy) + 'px'; };
    const up = e => {
      notes[idx].x = ox + e.clientX - sx; notes[idx].y = oy + e.clientY - sy;
      save();
      document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
}
renderNotes();
</script>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${title} [${badge.label}]</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0d1117;font-family:'Malgun Gothic',sans-serif;font-size:11pt;color:#c9d1d9}
    #toolbar{position:fixed;top:0;left:0;right:0;z-index:999;background:#161b22;
      border-bottom:1px solid #30363d;padding:0 16px;height:44px;
      display:flex;align-items:center;gap:12px}
    #toolbar h1{font-size:15px;font-weight:600;color:#e6edf3;white-space:nowrap}
    .tb-date{font-size:12px;color:#8b949e}
    #badge{margin-left:auto;padding:3px 10px;border-radius:20px;font-size:11px;
      font-weight:600;background:${badge.color};color:white;white-space:nowrap}
    #wrap{margin-top:44px;overflow:auto;height:calc(100vh - 44px)}
    #canvas{position:relative;padding:16px;${bodyStyle ? bodyStyle.replace(/"/g, '') : ''}}
    #canvas a{color:#6cb0f6}
    #canvas img{height:auto}
    #canvas table{border-collapse:collapse}
    #canvas td,#canvas th{vertical-align:top}
  </style>
</head>
<body>
  <div id="toolbar">
    <h1>${title}</h1>
    <span class="tb-date">${date}</span>
    ${annoBtn}
    <div id="badge">${badge.label}</div>
  </div>
  <div id="wrap">
    <div id="canvas">
      ${bodyHtml}
    </div>
  </div>
  ${annoScript}
</body>
</html>`;
}

// ── Vision Board ─────────────────────────────────────────────────────────────

const vMeta = extractMeta(vSrc);
const { style: vStyle, body: vBody } = extractBody(vSrc);
const vCards = extractDefaultCards(vGen);

// opt2 — Passthrough + annotation
const vOpt2 = makePassthroughHtml({
  title: vMeta.title, date: vMeta.date,
  bodyStyle: vStyle, bodyHtml: vBody,
  badge: { label: '[Option 2] Passthrough + 메모 오버레이', color: '#8957e5' },
  withAnnotation: true, noteKey: 'sample-vision-opt2-notes',
});

// opt3 — Hybrid: Vision has table → Passthrough (clean, no annotation)
const vOpt3 = makePassthroughHtml({
  title: vMeta.title, date: vMeta.date,
  bodyStyle: vStyle, bodyHtml: vBody,
  badge: { label: '[Option 3] Hybrid → Passthrough (표 감지)', color: '#388bfd' },
  withAnnotation: false, noteKey: '',
});

// opt4 — 표를 열(column) 단위 카드로 분리
const htmlCard = vCards.find(c => c.type === 'html');
const otherCards = vCards.filter(c => c.type !== 'html');
let vOpt4Cards = [...otherCards];
if (htmlCard) {
  const cols = extractTableColumns(htmlCard.html);
  const COL_X = [48, 48 + 295 + 2, 48 + 295 + 2 + 356 + 2]; // 48, 345, 703
  const COL_W = [295, 356, 500];
  cols.forEach((content, i) => {
    if (content.trim()) {
      vOpt4Cards.push({ type: 'html', x: COL_X[i], y: htmlCard.y, w: COL_W[i], html: content });
    }
  });
}
vOpt4Cards.sort((a, b) => (a.y - b.y) || (a.x - b.x));

const vOpt4 = injectBadge(
  makeBoardHtml(boardTpl, {
    title: vMeta.title, date: vMeta.date,
    saveKey: 'sample-vision-opt4', imgBase: IMG_BASE,
    cards: vOpt4Cards, badge: null,
  }),
  '[Option 4] 카드 방식 + 열 단위 분리', '#3fb950'
);

// ── Twilight Mood Board ───────────────────────────────────────────────────────

const tMeta = extractMeta(tSrc);
const { style: tStyle, body: tBody } = extractBody(tSrc);
const tCards = extractDefaultCards(tGen);

// opt2 — Passthrough + annotation
const tOpt2 = makePassthroughHtml({
  title: tMeta.title, date: tMeta.date,
  bodyStyle: tStyle, bodyHtml: tBody,
  badge: { label: '[Option 2] Passthrough + 메모 오버레이', color: '#8957e5' },
  withAnnotation: true, noteKey: 'sample-twilight-opt2-notes',
});

// opt3 — Hybrid: Twilight has no table → Card board (same as current, with badge)
const tOpt3 = injectBadge(
  makeBoardHtml(boardTpl, {
    title: tMeta.title, date: tMeta.date,
    saveKey: 'sample-twilight-opt3', imgBase: IMG_BASE,
    cards: tCards, badge: null,
  }),
  '[Option 3] Hybrid → Card 보드 (표 없음 감지)', '#388bfd'
);

// opt4 — 이미지 원본 크기 + 기존 카드 방식 (maxWidth 해제 버전)
// Twilight opt4: 기존 카드 그대로, 하지만 image card w를 원본 크기로 복원
const tOpt4Cards = tCards.map(c => {
  if (c.type === 'image' && c.w) {
    // maxWidth cap was 480 — release it to allow natural flow
    // We mark w as 0 to let renderCards use auto sizing
    return { ...c };
  }
  return c;
});

// Modify board template: for opt4 Twilight, patch renderCards to not enforce max img width
let tOpt4Tpl = boardTpl.replace(
  "img.style.maxWidth = card.w + 'px';",
  "// opt4: let image display at its natural size\n      img.style.maxWidth = '100%';"
);
const tOpt4 = injectBadge(
  makeBoardHtml(tOpt4Tpl, {
    title: tMeta.title, date: tMeta.date,
    saveKey: 'sample-twilight-opt4', imgBase: IMG_BASE,
    cards: tOpt4Cards, badge: null,
  }),
  '[Option 4] 카드 방식 + 이미지 원본 크기', '#3fb950'
);

// ── Write files ───────────────────────────────────────────────────────────────

const files = [
  ['Vision-Board-opt2.html', vOpt2],
  ['Vision-Board-opt3.html', vOpt3],
  ['Vision-Board-opt4.html', vOpt4],
  ['Twilight-opt2.html', tOpt2],
  ['Twilight-opt3.html', tOpt3],
  ['Twilight-opt4.html', tOpt4],
];

for (const [name, html] of files) {
  await writeFile(join(SAMPLES_DIR, name), html, 'utf-8');
  console.log('✅', name);
}
console.log(`\n6개 파일 → cortex/2/zeroing/samples/`);
console.log('서버: http://localhost:7700/cortex/2/zeroing/samples/');
