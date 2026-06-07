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

// ── Generate HTML document editor (linear, contenteditable) ──────────────────
function generateHtml(title, date, blocks, imgBase) {
  const bodyHtml = blocks.map((card, i) => {
    if (card.type === 'image') {
      const src = card.filename ? (imgBase + card.filename) : (card.src || '');
      const imgTag = `<img src="${escHtml(src)}" alt="${escHtml(card.alt || '')}" loading="lazy" onerror="this.style.display='none'">`;
      const inner = card.link ? `<a href="${escHtml(card.link)}" target="_blank" rel="noopener noreferrer">${imgTag}</a>` : imgTag;
      return `<div class="block block-image" data-idx="${i}">${inner}${card.caption ? `<div class="caption">${escHtml(card.caption)}</div>` : ''}</div>`;
    } else if (card.type === 'table') {
      return `<div class="block block-table" data-idx="${i}"><div class="table-wrap">${card.html || ''}</div></div>`;
    } else {
      return `<div class="block block-text" data-idx="${i}" contenteditable="true">${card.content || ''}</div>`;
    }
  }).join('\n');

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
  line-height: 1.7;
  padding: 0 0 80px;
}
a { color: #6cb0f6; text-decoration: none; }
a:hover { text-decoration: underline; }
.toolbar {
  position: sticky; top: 0; z-index: 100;
  background: #161b22; border-bottom: 1px solid #30363d;
  padding: 8px 24px; display: flex; gap: 10px; align-items: center;
}
.toolbar .t-title { font-size: 16px; font-weight: bold; color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toolbar .t-date { color: #8b949e; font-size: 12px; white-space: nowrap; }
.toolbar button { background: #21262d; border: 1px solid #30363d; color: #ccc; padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 12px; white-space: nowrap; }
.toolbar button:hover { background: #30363d; color: #fff; }
.toolbar .t-status { color: #8b949e; font-size: 11px; white-space: nowrap; }
.doc { max-width: 760px; margin: 0 auto; padding: 28px 24px; }
.block { margin-bottom: 10px; }
.block-text {
  outline: none;
  padding: 5px 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 1.5em;
}
.block-text:focus { background: rgba(255,255,255,0.04); }
.block-text:empty::before { content: '텍스트 입력...'; color: #555; pointer-events: none; }
.block-image img { max-width: 100%; border-radius: 6px; display: block; }
.block-image .caption { font-size: 12px; color: #888; margin-top: 4px; }
.block-table .table-wrap { overflow-x: auto; }
.block-table table { border-collapse: collapse; font-size: 13px; }
.block-table td, .block-table th { border: 1px solid #444; padding: 5px 10px; vertical-align: top; }
.block-table th { background: #2a2a3a; color: #ccc; }
</style>
</head>
<body>
<div class="toolbar">
  <span class="t-title">${escHtml(title)}</span>
  <span class="t-date">${escHtml(date)}</span>
  <button onclick="save()">저장</button>
  <button id="copyBtn" onclick="copyPath()">⎘ 주소 복사</button>
  <span class="t-status" id="status"></span>
</div>
<div class="doc" id="doc">
${bodyHtml}
</div>
<script>
const SAVE_KEY = 'note-${slugify(title)}';

function save() {
  const data = {};
  document.querySelectorAll('.block-text').forEach(el => {
    data[el.dataset.idx] = el.innerHTML;
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  const s = document.getElementById('status');
  s.textContent = '저장됨 ' + new Date().toLocaleTimeString();
  setTimeout(() => { s.textContent = ''; }, 2000);
}

function copyPath() {
  navigator.clipboard.writeText(location.pathname).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ 복사됨';
    setTimeout(() => { btn.textContent = '⎘ 주소 복사'; }, 1500);
  });
}

// Restore saved edits
const saved = localStorage.getItem(SAVE_KEY);
if (saved) {
  try {
    const data = JSON.parse(saved);
    document.querySelectorAll('.block-text').forEach(el => {
      if (data[el.dataset.idx] !== undefined) el.innerHTML = data[el.dataset.idx];
    });
  } catch(e) {}
}

document.querySelectorAll('.block-text').forEach(el => {
  el.addEventListener('blur', save);
});

setInterval(save, 30000);
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

// ── Extract card text: keep <a>,<b>,<br>, strip wrappers ─────────────────────
function cleanCardText(html) {
  return html
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, ' ')   // 문장 사이 공백 (개행 아님)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<td[^>]*>/gi, '\t')    // table cell → tab separator
    .replace(/<\/tr>/gi, '\n')       // table row → newline
    .replace(/<[^>]*(table|thead|tbody|tr|th)[^>]*>/gi, '')
    .replace(/<span[^>]*class="[^"]*NormalTextRun[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<(?!\/?(a|b|strong|em|br)[\s>])[^>]+>/gi, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')          // normalize CRLF
    .split('\n').map(l => l.trim()).join('\n')              // trim each line
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Extract board cards from OneNote absolute-layout HTML ─────────────────────
function extractBoardCards(bodyContent) {
  const cards = [];

  // Pass 1: top-level absolute images
  for (const m of bodyContent.matchAll(/<img\b([^>]*?)(?:\/>|>)/gi)) {
    const tag = m[1];
    const styleM = tag.match(/style="[^"]*position:absolute;left:(\d+(?:\.\d+)?)px;top:(\d+(?:\.\d+)?)px/);
    if (!styleM) continue;
    const srcM = tag.match(/data-fullres-src="__ATTACHMENT__([a-f0-9]+\.png)"|src="__ATTACHMENT__([a-f0-9]+\.png)"/);
    if (!srcM) continue;
    const x = Math.round(parseFloat(styleM[1]));
    const y = Math.round(parseFloat(styleM[2]));
    const wM = tag.match(/width="(\d+(?:\.\d+)?)"/);
    const w = wM ? Math.min(Math.round(parseFloat(wM[1])), 480) : 220;
    const src = srcM[1] || srcM[2];
    // Check for wrapping <a> just before this tag
    const before = bodyContent.slice(Math.max(0, m.index - 300), m.index);
    const linkM = before.match(/<a\s[^>]*href="([^"]+)"[^>]*>\s*$/);
    const card = { type: 'image', x, y, w, src };
    if (linkM) card.link = linkM[1];
    cards.push(card);
  }

  // Pass 2: top-level absolute divs
  const divRe = /<div\s+style="position:absolute;left:(\d+(?:\.\d+)?)px;top:(\d+(?:\.\d+)?)px;width:(\d+(?:\.\d+)?)px">/g;
  let dm;
  while ((dm = divRe.exec(bodyContent)) !== null) {
    const x = Math.round(parseFloat(dm[1]));
    const y = Math.round(parseFloat(dm[2]));
    const w = Math.min(Math.round(parseFloat(dm[3])), 600);
    // Find matching </div> by depth
    let depth = 1, j = dm.index + dm[0].length;
    while (j < bodyContent.length && depth > 0) {
      if (bodyContent[j] === '<') {
        if (bodyContent.slice(j, j + 4).toLowerCase() === '<div') depth++;
        else if (bodyContent.slice(j, j + 5).toLowerCase() === '</div') depth--;
      }
      if (depth > 0) j++;
    }
    const inner = bodyContent.slice(dm.index + dm[0].length, j);

    // Extract nested images (e.g. inside table cells) as individual image cards
    const nestedImgs = [...inner.matchAll(/<img\b([\s\S]*?)(?:\/>|>)/gi)];
    let imgIdx = 0;
    for (const im of nestedImgs) {
      const tag = im[1];
      const srcM = tag.match(/data-fullres-src="__ATTACHMENT__([a-f0-9]+\.png)"|src="__ATTACHMENT__([a-f0-9]+\.png)"/);
      if (!srcM) continue;
      const src = srcM[1] || srcM[2];
      // Skip if already captured as standalone absolute img
      if (cards.some(c => c.type === 'image' && c.src === src)) continue;
      const wM = tag.match(/width="(\d+(?:\.\d+)?)"/);
      const imgW = wM ? Math.min(Math.round(parseFloat(wM[1])), 480) : 220;
      // Lay out images in a grid within the div's footprint
      const col = imgIdx % 3;
      const row = Math.floor(imgIdx / 3);
      cards.push({ type: 'image', x: x + col * (imgW + 8), y: y + row * 200, w: imgW, src });
      imgIdx++;
    }

    // Also emit text card if there's readable text content
    const content = cleanCardText(inner);
    if (content.trim()) cards.push({ type: 'text', x, y: y + Math.ceil(imgIdx / 3) * 200, w, content });
  }

  return cards.sort((a, b) => (a.y - b.y) || (a.x - b.x));
}

// ── Process .onenote.html (Graph API raw HTML) → Cortex HTML ─────────────────
async function processOnenoteHtmlSource(onenoteHtmlPath, dstDir, dstSection, title, date) {
  const rawHtml = await readFile(onenoteHtmlPath, 'utf8');
  const base = imgBase(dstSection);

  // Extract body content + fix image placeholders
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : rawHtml;
  bodyContent = bodyContent.replace(/__ATTACHMENT__([a-f0-9]+\.png)/g, (_, f) => `__ATTACHMENT__${f}`); // keep placeholders for card extractor

  const isAbsolute = rawHtml.includes('data-absolute-enabled="true"');

  if (isAbsolute) {
    // Board-template mode: extract cards → interactive board
    const cards = extractBoardCards(bodyContent);
    const saveKey = 'board-' + slugify(title);
    const boardTemplate = await readFile(
      join(process.env.HOME, 'Projects/a-team/scripts/cortex-dashboard/templates/board-template.html'),
      'utf8'
    );
    return boardTemplate
      .replace('{{BOARD_TITLE}}', escHtml(title))
      .replace('{{BOARD_TITLE}}', escHtml(title)) // title-bar contenteditable
      .replace('{{BOARD_DATE}}', escHtml(date))
      .replace('{{SAVE_KEY}}', saveKey)
      .replace('{{IMG_BASE}}', base)
      .replace('{{DEFAULT_CARDS}}', JSON.stringify(cards, null, 2));
  }

  // Linear doc mode (non-absolute pages): wrap OneNote HTML body
  bodyContent = bodyContent
    .replace(/__ATTACHMENT__([a-f0-9]+\.png)/g, (_, f) => base + f)
    .replace(/src="(https:\/\/graph\.microsoft\.com[^"]+\/\$value)"/g, (_, url) => {
      const fn = graphUrlToFilename(url);
      return fn ? `src="${base}${fn}"` : `src="missing.png"`;
    });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1e1e1e; color: #e0e0e0; font-family: 'Segoe UI', -apple-system, sans-serif; font-size: 14px; line-height: 1.6; }
.toolbar { position: sticky; top: 0; z-index: 100; background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 24px; display: flex; gap: 10px; align-items: center; }
.toolbar .t-title { font-size: 16px; font-weight: bold; color: #fff; flex: 1; }
.toolbar .t-date { color: #8b949e; font-size: 12px; white-space: nowrap; }
.toolbar button { background: #21262d; border: 1px solid #30363d; color: #ccc; padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 12px; }
.toolbar button:hover { background: #30363d; color: #fff; }
.onenote-body { padding: 20px 24px 80px; }
.onenote-body * { color: #e0e0e0 !important; background-color: transparent !important; }
.onenote-body table { border-collapse: collapse; margin-bottom: 12px; }
.onenote-body td, .onenote-body th { border: 1px solid #444 !important; padding: 6px 10px !important; vertical-align: top; }
.onenote-body img { max-width: 100%; height: auto; border-radius: 4px; display: block; }
.onenote-body a { color: #6cb0f6 !important; text-decoration: none; }
.onenote-body a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="toolbar">
  <span class="t-title">${escHtml(title)}</span>
  <span class="t-date">${escHtml(date)}</span>
  <button id="copyBtn" onclick="copyPath()">⎘ 주소 복사</button>
</div>
<div class="onenote-body">${bodyContent}</div>
<script>
function copyPath() {
  navigator.clipboard.writeText(location.pathname).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ 복사됨';
    setTimeout(() => { btn.textContent = '⎘ 주소 복사'; }, 1500);
  });
}
</script>
</body>
</html>`;
}

// ── Process a single .md file → .html ────────────────────────────────────────
async function processFile(srcPath, dstDir, dstSection) {
  const content = await readFile(srcPath, 'utf8');
  const { meta, body } = parseFrontmatter(content);
  const title = meta.title || basename(srcPath, '.md');
  const date = formatDate(meta.modified || meta.created);
  const outName = basename(srcPath, '.md') + '.html';
  const outPath = join(dstDir, outName);

  // Prefer .onenote.html (Graph API HTML source) when available — preserves tables/images
  const onenoteHtmlPath = srcPath.replace(/\.md$/, '.onenote.html');
  const hasOnenoteHtml = await access(onenoteHtmlPath).then(() => true).catch(() => false);
  if (hasOnenoteHtml) {
    const html = await processOnenoteHtmlSource(onenoteHtmlPath, dstDir, dstSection, title, date);
    return { outPath, html, title, cardCount: -1, source: 'onenote-html' };
  }

  const blocks = extractBlocks(body, title);
  if (blocks.length === 0) return null;

  const cards = blocks.map(b => {
    if (b.type === 'text') {
      return { type: 'text', content: textToHtml(b.raw), w: cardWidth(b) };
    } else if (b.type === 'image') {
      const card = { type: 'image', filename: b.filename, src: b.filename || 'missing.png', alt: b.alt, w: 220 };
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
