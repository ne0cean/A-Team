#!/usr/bin/env node
/**
 * migrate-onenote-html.mjs
 * OneNote .md → HTML 카드보드 (Twilight Mood board 규격) 마이그레이션
 *
 * Usage:
 *   node scripts/migrate-onenote-html.mjs --dry-run
 *   node scripts/migrate-onenote-html.mjs --apply
 *   node scripts/migrate-onenote-html.mjs --apply --section "1. Character"
 */

import { readdir, readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { createHash } from 'crypto';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const ARCHIVE_BASE = join(CORTEX, '4/interstellar-onenote');
const ATTACHMENTS = join(CORTEX, 'attachments');

const DRY_RUN = !process.argv.includes('--apply');
const SECTION_FILTER = (() => {
  const i = process.argv.indexOf('--section');
  return i >= 0 ? process.argv[i + 1] : null;
})();

if (DRY_RUN) console.log('🔍 DRY RUN mode (pass --apply to write files)\n');

// ── Section mapping: Archive source → cortex target ──────────────────────────
const SECTION_MAP = [
  // 2_6 hexagonal pillars → cortex/2/
  { src: '2_6 hexagonal pillars_Rocks_Helm/1. Character',  dst: '2/1-character' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/2. Mo chuisle', dst: '2/2-mo-chuisle' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/3. String',     dst: '2/3-string' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/4. Interstellar', dst: '2/4-interstellar' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/5. Life Xlab',  dst: '2/5-life-xlab' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/6. Snowball',   dst: '2/6-snowball' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/Futures options', dst: '2/futures-options' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/Zeroing',       dst: '2/zeroing' },
  // 1_Projects → cortex/1/
  { src: '1_Projects/1_',          dst: '1/1_' },
  { src: '1_Projects/2. SLL',      dst: '1/2-sll' },
  { src: '1_Projects/3. HFK',      dst: '1/3-hfk' },
  { src: '1_Projects/5. Sport',    dst: '1/5-sport' },
  { src: '1_Projects/A TEAM',      dst: '1/a-team' },
  { src: '1_Projects/Dashbaord',   dst: '1/dashboard' },
  { src: '1_Projects/MK1',         dst: '1/mk1' },
  { src: '1_Projects/MKT_FB',      dst: '1/mkt-fb' },
  { src: '1_Projects/Side hutle',  dst: '1/side-hustle' },
  { src: '1_Projects/Writing',     dst: '1/writing' },
  // Dashbaord subdirectories (kept separate to avoid hexagonal pillar duplication)
  { src: '1_Projects/Dashbaord/1. Character',  dst: '1/dashboard/1-character' },
  { src: '1_Projects/Dashbaord/3. String',     dst: '1/dashboard/3-string' },
  { src: '1_Projects/Dashbaord/4. Interstellar', dst: '1/dashboard/4-interstellar' },
  { src: '1_Projects/Dashbaord/5. Life Xlab',  dst: '1/dashboard/5-life-xlab' },
  { src: '1_Projects/Dashbaord/6. Snowball',   dst: '1/dashboard/6-snowball' },
  { src: '1_Projects/Dashbaord/2. Block chain', dst: '1/dashboard/2-blockchain' },
];

// ── Image mapping: Graph API URL → local PNG filename ────────────────────────
function graphUrlToFilename(url) {
  // https://graph.microsoft.com/.../resources/0-abc123!1-xxx!yyy/$value
  const m = url.match(/\/resources\/([^/]+)\//);
  if (!m) return null;
  const resourceId = m[1];
  const prefix = resourceId.split('!')[0];
  return createHash('md5').update(prefix).digest('hex').slice(0, 10) + '.png';
}

// ── IMG_BASE: relative from section dir to cortex/attachments/ ───────────────
function imgBase(dstSection) {
  // dst like "2/1-character" → depth=2 → "../../attachments/"
  const depth = dstSection.split('/').length;
  return '../'.repeat(depth) + 'attachments/';
}

// ── Parse .md frontmatter ─────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: content };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w_]*):\s*"(.*)"\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  }
  return { meta, body: m[2] };
}

// ── Extract content blocks from body ─────────────────────────────────────────
// Returns array of { type: 'text'|'image'|'table', ... }
function extractBlocks(body, title) {
  const lines = body.split('\n');
  const blocks = [];
  let textLines = [];
  let i = 0;

  function flushText() {
    const t = textLines.join('\n').trim();
    if (t) blocks.push({ type: 'text', raw: t });
    textLines = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // Image line: ![image](url)  — URL contains () in users('...'), match to last ) on line
    const imgMatch = line.match(/!\[image\]\((https:\/\/graph\.microsoft\.com.+\/\$value)\)\s*$/);
    if (imgMatch) {
      flushText();
      const filename = graphUrlToFilename(imgMatch[1]);
      // Look ahead for caption (next non-empty line that's not another image)
      let caption = null;
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && !lines[j].match(/!\[image\]/) && !lines[j].match(/^<table/i)) {
        const nextLine = lines[j].trim();
        if (nextLine && nextLine.length < 200) {
          caption = nextLine;
          // Don't consume the caption line here; it will be picked as text
        }
      }
      // Check if previous line had a link wrapping this image: [...](url)
      const prevLine = i > 0 ? lines[i - 1] : '';
      const linkMatch = prevLine.match(/\[]\((https?:[^)]+)\)/);
      blocks.push({ type: 'image', filename, alt: title, caption: null, link: null });
      i++;
      continue;
    }

    // Linked image: [![image](url)](link) — extract link from trailing ](url)
    const linkedImg = line.match(/\[!\[image\]\((https:\/\/graph.+\/\$value)\)\]\((https?:[^)]+)\)\s*$/);
    if (linkedImg) {
      flushText();
      const filename = graphUrlToFilename(linkedImg[1]);
      blocks.push({ type: 'image', filename, alt: title, caption: null, link: linkedImg[2] });
      i++;
      continue;
    }

    // Table: raw HTML <table> block from OneNote export
    if (line.trim().match(/^<table/i)) {
      flushText();
      let tableLines = [];
      while (i < lines.length && !lines[i].trim().match(/<\/table>/i)) {
        tableLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) { tableLines.push(lines[i]); i++; }
      blocks.push({ type: 'table', html: tableLines.join('\n') });
      continue;
    }

    textLines.push(line);
    i++;
  }
  flushText();
  return blocks;
}

// ── Convert raw text to HTML ──────────────────────────────────────────────────
function textToHtml(raw) {
  // Decode HTML entities from OneNote export
  let t = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Convert markdown links to HTML anchors
  t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Bare URLs (not already in anchors)
  t = t.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank">$1</a>');
  // Bold **text**
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  // Newlines → <br>
  t = t.replace(/\n/g, '<br>');
  // Trim whitespace
  t = t.trim().replace(/(<br>)+$/, '');

  return t;
}

// ── Build card width heuristic ────────────────────────────────────────────────
function cardWidth(block) {
  if (block.type === 'image') return 220;
  if (block.type === 'table') return 480;
  const len = (block.raw || '').length;
  if (len < 100) return 260;
  if (len < 300) return 320;
  return 400;
}

// ── Generate full HTML card board ────────────────────────────────────────────
function generateHtml(title, date, cards, imgBase) {
  const cardsJson = JSON.stringify(cards, null, 2);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #1e1e1e;
  color: #e0e0e0;
  font-family: 'Segoe UI', -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  padding: 20px 30px 60px;
  overflow-x: hidden;
}
a { color: #6cb0f6; text-decoration: none; }
a:hover { text-decoration: underline; }
.title-bar {
  background: #3a3a5c;
  display: inline-block;
  padding: 6px 16px;
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}
.date { color: #999; font-size: 13px; margin-bottom: 20px; }
.board { position: relative; }
.card {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 12px;
  position: absolute;
  cursor: grab;
  transition: box-shadow 0.15s;
  overflow: hidden;
}
.card:hover { box-shadow: 0 0 0 1px #58a6ff; z-index: 10; }
.card.moving { opacity: 0.8; box-shadow: 0 4px 24px rgba(0,0,0,0.6); z-index: 100; cursor: grabbing; }
.card img { width: 100%; border-radius: 4px; display: block; }
.card .caption { font-size: 12px; color: #888; margin-top: 6px; }
.card .text { outline: none; min-height: 20px; white-space: pre-wrap; word-break: break-word; }
.card .text:focus { background: rgba(255,255,255,0.05); border-radius: 4px; padding: 4px; }
.card .text:empty::before { content: '텍스트 입력...'; color: #555; }
.card table { border-collapse: collapse; width: 100%; font-size: 13px; }
.card table td, .card table th { border: 1px solid #444; padding: 4px 8px; vertical-align: top; }
.card table th { background: #333; color: #ccc; }
.card-actions { position: absolute; top: 4px; right: 4px; display: none; gap: 4px; }
.card:hover .card-actions { display: flex; }
.card-btn { background: #333; border: 1px solid #555; color: #ccc; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer; }
.card-btn:hover { background: #444; color: #fff; }
.resize-handle { position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; cursor: se-resize; opacity: 0; }
.card:hover .resize-handle { opacity: 0.6; }
.resize-handle::after { content: ''; position: absolute; bottom: 3px; right: 3px; width: 8px; height: 8px; border-right: 2px solid #666; border-bottom: 2px solid #666; }
.toolbar { position: fixed; bottom: 0; left: 0; right: 0; background: #161b22; border-top: 1px solid #30363d; padding: 8px 20px; display: flex; gap: 12px; align-items: center; z-index: 200; }
.toolbar button { background: #21262d; border: 1px solid #30363d; color: #e0e0e0; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.toolbar button:hover { background: #30363d; }
.toolbar .status { color: #8b949e; font-size: 12px; margin-left: auto; }
.highlight-red { color: #ff6b6b; }
.highlight-blue { color: #6cb0f6; }
</style>
</head>
<body>
<div class="title-bar">${escHtml(title)}</div>
<div class="date">${escHtml(date)}</div>
<div class="board" id="board"></div>
<div class="toolbar">
  <button onclick="addTextCard()">+ 텍스트</button>
  <button onclick="addImageCard()">+ 이미지</button>
  <button onclick="saveBoard()">💾 저장</button>
  <button onclick="resetLayout()">↺ 재배치</button>
  <span class="status" id="status">Ready</span>
</div>
<script>
const SAVE_KEY = 'board-${slugify(title)}';
const IMG_BASE = '${imgBase}';
const DEFAULT_CARDS = ${cardsJson};

let cards = [];
let moving = null, resizing = null;

function loadBoard() {
  const saved = localStorage.getItem(SAVE_KEY);
  cards = saved ? JSON.parse(saved) : DEFAULT_CARDS.map(c => ({...c}));
  renderCards();
  if (!saved) autoLayout();
}

function autoLayout() {
  const GAP = 14;
  const boardW = document.getElementById('board').offsetWidth;
  const cols = Math.max(1, Math.floor(boardW / 280));
  const colW = (boardW - GAP * (cols - 1)) / cols;
  const colHeights = new Array(cols).fill(0);
  const allCards = document.querySelectorAll('.card');
  const images = document.querySelectorAll('.card img');
  let loaded = 0;
  const total = images.length;

  function place() {
    allCards.forEach((el, i) => {
      const card = cards[i];
      const w = Math.min(card.w || colW, colW);
      let minCol = 0;
      for (let c = 1; c < cols; c++) if (colHeights[c] < colHeights[minCol]) minCol = c;
      card.x = minCol * (colW + GAP);
      card.y = colHeights[minCol];
      card.w = w;
      el.style.left = card.x + 'px';
      el.style.top = card.y + 'px';
      el.style.width = w + 'px';
      colHeights[minCol] = card.y + el.offsetHeight + GAP;
    });
    document.getElementById('board').style.minHeight = Math.max(...colHeights) + 100 + 'px';
    saveBoard();
  }

  if (total === 0) requestAnimationFrame(place);
  else images.forEach(img => {
    if (img.complete) { loaded++; if (loaded >= total) requestAnimationFrame(place); }
    else img.onload = img.onerror = () => { loaded++; if (loaded >= total) requestAnimationFrame(place); };
  });
}

function syncText() {
  document.querySelectorAll('.card').forEach(el => {
    const idx = +el.dataset.idx;
    if (cards[idx]?.type === 'text') {
      const t = el.querySelector('.text');
      if (t) cards[idx].content = t.innerHTML;
    }
  });
}

function saveBoard() {
  syncText();
  localStorage.setItem(SAVE_KEY, JSON.stringify(cards));
  document.getElementById('status').textContent = '저장됨 ' + new Date().toLocaleTimeString();
}

function renderCards() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  cards.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.idx = i;
    if (card.x !== undefined) el.style.left = card.x + 'px';
    if (card.y !== undefined) el.style.top = card.y + 'px';
    if (card.w) el.style.width = card.w + 'px';

    el.addEventListener('mousedown', e => {
      if (e.target.closest('.text, a, .card-btn, .resize-handle, table')) return;
      e.preventDefault();
      moving = { idx: i, startX: e.clientX, startY: e.clientY, origX: card.x || 0, origY: card.y || 0 };
      el.classList.add('moving');
    });

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'card-btn'; delBtn.textContent = '×';
    delBtn.onclick = e => { e.stopPropagation(); if (confirm('삭제?')) { cards.splice(i, 1); renderCards(); saveBoard(); } };
    actions.appendChild(delBtn);
    el.appendChild(actions);

    if (card.type === 'text') {
      const text = document.createElement('div');
      text.className = 'text';
      text.contentEditable = true;
      text.innerHTML = card.content || '';
      text.addEventListener('blur', () => { card.content = text.innerHTML; saveBoard(); });
      el.appendChild(text);
    } else if (card.type === 'image') {
      const src = card.src.startsWith('http') || card.src.startsWith('data:') ? card.src : IMG_BASE + card.src;
      const img = document.createElement('img');
      img.src = src;
      img.alt = card.alt || '';
      img.loading = 'lazy';
      img.onerror = () => img.style.display = 'none';
      if (card.link) {
        const a = document.createElement('a'); a.href = card.link; a.target = '_blank';
        a.appendChild(img); el.appendChild(a);
      } else { el.appendChild(img); }
      if (card.caption) {
        const cap = document.createElement('div');
        cap.className = 'caption';
        cap.textContent = card.caption;
        el.appendChild(cap);
      }
    } else if (card.type === 'table') {
      const wrapper = document.createElement('div');
      wrapper.style.overflowX = 'auto';
      wrapper.innerHTML = card.html || '';
      el.appendChild(wrapper);
    }

    const rh = document.createElement('div');
    rh.className = 'resize-handle';
    rh.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      resizing = { idx: i, startX: e.clientX, startW: card.w || el.offsetWidth };
    });
    el.appendChild(rh);
    board.appendChild(el);
  });

  requestAnimationFrame(() => {
    let maxBottom = 0;
    document.querySelectorAll('.card').forEach(el => {
      const b = (parseFloat(el.style.top) || 0) + el.offsetHeight;
      if (b > maxBottom) maxBottom = b;
    });
    board.style.minHeight = (maxBottom + 100) + 'px';
  });
}

document.addEventListener('mousemove', e => {
  if (moving) {
    const el = document.querySelector(\`.card[data-idx="\${moving.idx}"]\`);
    if (!el) return;
    const nx = moving.origX + e.clientX - moving.startX;
    const ny = moving.origY + e.clientY - moving.startY;
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
  }
  if (resizing) {
    const card = cards[resizing.idx];
    card.w = Math.max(100, resizing.startW + e.clientX - resizing.startX);
    const el = document.querySelector(\`.card[data-idx="\${resizing.idx}"]\`);
    if (el) el.style.width = card.w + 'px';
  }
});

document.addEventListener('mouseup', e => {
  if (moving) {
    const card = cards[moving.idx];
    card.x = Math.max(0, moving.origX + e.clientX - moving.startX);
    card.y = Math.max(0, moving.origY + e.clientY - moving.startY);
    const el = document.querySelector(\`.card[data-idx="\${moving.idx}"]\`);
    if (el) { el.classList.remove('moving'); }
    moving = null; saveBoard();
  }
  if (resizing) { resizing = null; saveBoard(); }
});

function addTextCard() {
  cards.push({ type: 'text', content: '', x: 50, y: window.scrollY + 100, w: 300 });
  renderCards();
  setTimeout(() => { const els = document.querySelectorAll('.card .text'); els[els.length - 1]?.focus(); }, 100);
}

function addImageCard() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { cards.push({ type: 'image', src: reader.result, x: 50, y: window.scrollY + 100, w: 240 }); renderCards(); saveBoard(); };
    reader.readAsDataURL(file);
  };
  input.click();
}

function resetLayout() {
  if (!confirm('자동 재배치합니다. 현재 위치가 변경됩니다.')) return;
  cards.forEach(c => { delete c.x; delete c.y; });
  renderCards(); autoLayout();
}

setInterval(saveBoard, 30000);
loadBoard();
</script>
</body>
</html>`;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(s) {
  return s.replace(/[^a-zA-Z0-9가-힣]/g, '-').replace(/-+/g, '-').slice(0, 40);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } catch { return iso || ''; }
}

// ── Process a single .md file → .html ────────────────────────────────────────
async function processFile(srcPath, dstDir, dstSection) {
  const content = await readFile(srcPath, 'utf8');
  const { meta, body } = parseFrontmatter(content);
  const title = meta.title || basename(srcPath, '.md');
  const date = formatDate(meta.modified || meta.created);

  const blocks = extractBlocks(body, title);
  if (blocks.length === 0) return null;

  const cards = blocks.map(b => {
    if (b.type === 'text') {
      return { type: 'text', content: textToHtml(b.raw), w: cardWidth(b) };
    } else if (b.type === 'image') {
      const card = { type: 'image', src: b.filename || 'missing.png', alt: b.alt, w: 220 };
      if (b.link) card.link = b.link;
      if (b.caption) card.caption = b.caption;
      return card;
    } else {
      return { type: 'table', html: sanitizeTable(b.html), w: 480 };
    }
  }).filter(Boolean);

  if (cards.length === 0) return null;

  const base = imgBase(dstSection);
  const html = generateHtml(title, date, cards, base);
  const outName = basename(srcPath, '.md') + '.html';
  const outPath = join(dstDir, outName);
  return { outPath, html, title, cardCount: cards.length };
}

function sanitizeTable(html) {
  // Strip Microsoft Office XML namespaces and clean up table HTML
  return html
    .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/g, '')
    .replace(/<\/?[a-z]+:[a-z]+[^>]*>/g, '')
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/\s+class="[^"]*"/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let totalFiles = 0, totalCards = 0, skipped = 0, errors = 0;

  for (const { src, dst } of SECTION_MAP) {
    if (SECTION_FILTER && !src.includes(SECTION_FILTER)) continue;

    const srcDir = join(ARCHIVE_BASE, src);
    const dstDir = join(CORTEX, dst);

    let files;
    try {
      files = (await readdir(srcDir)).filter(f => f.endsWith('.md'));
    } catch {
      console.warn(`  ⚠ skip (not found): ${src}`);
      continue;
    }

    console.log(`\n📂 ${src} → ${dst} (${files.length} files)`);

    if (!DRY_RUN) await mkdir(dstDir, { recursive: true });

    for (const file of files) {
      const srcPath = join(srcDir, file);
      try {
        const result = await processFile(srcPath, dstDir, dst);
        if (!result) { skipped++; continue; }

        const { outPath, html, title, cardCount } = result;
        if (DRY_RUN) {
          console.log(`  ✓ ${title} → ${cardCount} cards`);
        } else {
          await writeFile(outPath, html, 'utf8');
          process.stdout.write('.');
        }
        totalFiles++;
        totalCards += cardCount;
      } catch (e) {
        console.error(`  ✗ ${file}: ${e.message}`);
        errors++;
      }
    }
    if (!DRY_RUN) process.stdout.write('\n');
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ ${totalFiles} files, ${totalCards} cards, ${skipped} skipped, ${errors} errors`);
  if (DRY_RUN) console.log('\n👉 Run with --apply to write files');
}

main().catch(e => { console.error(e); process.exit(1); });
