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
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dirname, '../cortex');
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
  // docMode:true → data-absolute-enabled 무시하고 Document 모드 강제 (비-Board 섹션)
  { src: '2_6 hexagonal pillars_Rocks_Helm/1. Character',  dst: '2/1-character',     docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/2. Mo chuisle', dst: '2/2-mo-chuisle',    docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/3. String',     dst: '2/3-string',        docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/4. Interstellar', dst: '2/4-interstellar', docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/5. Life Xlab',  dst: '2/5-life-xlab',    docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/6. Snowball',   dst: '2/6-snowball',      docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/Futures options', dst: '2/futures-options', docMode: true },
  { src: '2_6 hexagonal pillars_Rocks_Helm/Zeroing',       dst: '2/zeroing' }, // Board 모드 허용
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
  const c = content.replace(/\r\n/g, '\n');
  const m = c.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: c };
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
function inlineToHtml(text) {
  // Markdown links
  text = text.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Bare URLs (not already in anchors)
  text = text.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank">$1</a>');
  // Bold **text** (before italic to avoid conflict)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  // Italic *text*
  text = text.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  return text;
}

function textToHtml(raw) {
  // Decode HTML entities from OneNote export
  let decoded = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  const lines = decoded.split('\n');
  const parts = lines.map(line => {
    // Heading: # / ## / ###
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) return `<h${hm[1].length}>${inlineToHtml(hm[2])}</h${hm[1].length}>`;
    // Horizontal rule: --- or *** (3+ chars, solo)
    if (/^[-*]{3,}$/.test(line.trim())) return '<hr>';
    // Checkbox: - [ ] or - [x]
    const cm = line.match(/^- \[([ x])\]\s*(.*)/);
    if (cm) return `<label><input type="checkbox" disabled${cm[1] === 'x' ? ' checked' : ''}> ${inlineToHtml(cm[2])}</label>`;
    // Normal line
    return inlineToHtml(line);
  });

  // Join: no <br> around block elements (h1-h3, hr, label)
  const isBlock = p => /^<(h[1-3]|hr|label)/.test(p);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0 && !isBlock(parts[i]) && !isBlock(parts[i - 1])) result.push('<br>');
    result.push(parts[i]);
  }
  return result.join('').trim().replace(/(<br>)+$/, '');
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
.block-table td, .block-table th { border: 1px solid #444; padding: 5px 10px; vertical-align: top; cursor: text; }
.block-table th { background: #2a2a3a; color: #ccc; }
.block-table td[contenteditable="true"], .block-table th[contenteditable="true"] { outline: 2px solid #388bfd; background: rgba(56,139,253,0.08); }
</style>
</head>
<body>
<div class="toolbar">
  <span class="t-title">${escHtml(title)}</span>
  ${date ? `<span class="t-date">${escHtml(date)}</span>` : ''}
  <button onclick="save()">저장</button>
  <button id="copyBtn" onclick="copyPath()">⎘ 주소 복사</button>
  <span class="t-status" id="status"></span>
  <span style="display:flex;align-items:center;gap:4px;margin-left:8px;border-left:1px solid #30363d;padding-left:8px;">
    <button onclick="zoomOut()" title="Ctrl+-">−</button>
    <span id="zoom-level" style="font-size:11px;color:#8b949e;min-width:32px;text-align:center;">100%</span>
    <button onclick="zoomIn()" title="Ctrl+=">+</button>
  </span>
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
  document.querySelectorAll('.block-table').forEach(el => {
    data['tbl-' + el.dataset.idx] = el.querySelector('.table-wrap').innerHTML;
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

function attachTableListeners() {
  document.querySelectorAll('.block-table td, .block-table th').forEach(td => {
    if (td._editAttached) return;
    td._editAttached = true;
    td.title = '더블클릭으로 편집';
    td.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      this.contentEditable = 'true';
      this.focus();
    });
    td.addEventListener('blur', function() {
      this.contentEditable = 'false';
      save();
    });
    td.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { this.contentEditable = 'false'; this.blur(); }
      if (e.key === 'Enter' && !e.shiftKey && this.tagName === 'TD') {
        e.preventDefault();
        const cells = [...document.querySelectorAll('.block-table td, .block-table th')];
        const next = cells[cells.indexOf(this) + 1];
        if (next) { this.contentEditable = 'false'; next.contentEditable = 'true'; next.focus(); }
      }
    });
  });
}

// Zoom
let zoom = parseFloat(localStorage.getItem('zoom-' + SAVE_KEY) || '1.0');
function applyZoom() {
  const doc = document.getElementById('doc');
  doc.style.transform = 'scale(' + zoom + ')';
  doc.style.transformOrigin = '0 0';
  doc.style.width = (100 / zoom) + '%';
  document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
  localStorage.setItem('zoom-' + SAVE_KEY, zoom);
}
function zoomIn()  { zoom = Math.min(3.0, parseFloat((zoom + 0.1).toFixed(2))); applyZoom(); }
function zoomOut() { zoom = Math.max(0.2, parseFloat((zoom - 0.1).toFixed(2))); applyZoom(); }
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
    if (e.key === '-')                  { e.preventDefault(); zoomOut(); }
    if (e.key === '0')                  { e.preventDefault(); zoom = 1.0; applyZoom(); }
  }
});
document.getElementById('doc').addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  e.deltaY < 0 ? zoomIn() : zoomOut();
}, { passive: false });

// Restore saved edits
const saved = localStorage.getItem(SAVE_KEY);
if (saved) {
  try {
    const data = JSON.parse(saved);
    document.querySelectorAll('.block-text').forEach(el => {
      if (data[el.dataset.idx] !== undefined) el.innerHTML = data[el.dataset.idx];
    });
    document.querySelectorAll('.block-table').forEach(el => {
      const key = 'tbl-' + el.dataset.idx;
      if (data[key] !== undefined) el.querySelector('.table-wrap').innerHTML = data[key];
    });
  } catch(e) {}
}

document.querySelectorAll('.block-text').forEach(el => {
  el.addEventListener('blur', save);
});
attachTableListeners();
applyZoom();
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
  if (!iso) return '';
  // OneNote exports 7-digit fractional seconds; truncate to 3 for ISO compliance
  const normalized = iso.replace(/(\.\d{3})\d+/, '$1');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
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

// ── Flow content parser for absolute divs ─────────────────────────────────────
function estimateTextHeight(text, w) {
  const charsPerLine = Math.max(20, Math.floor(w / 9));
  const lines = text.split('\n').reduce((acc, line) => acc + Math.max(1, Math.ceil((line.length || 1) / charsPerLine)), 0);
  return Math.max(30, lines * 20 + 16);
}

function isMeaningfulAlt(alt) {
  return /[\uAC00-\uD7A3]/.test(alt) || (/^[\x20-\x7E\n]+$/.test(alt) && alt.trim().length > 20);
}

function parseFlowContent(html, baseX, baseY, divW) {
  const results = [];
  const GAP = 8;
  let curY = baseY;
  let lastTextCard = null; // accumulates consecutive text-only rows into one card
  let lastSingleImageCard = null; // tracks last row that had exactly one image (for caption attach)
  // Split by <br> to determine rows
  const parts = html.split(/<br\s*\/?>/gi);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue; // empty <br> — don't break text accumulation
    const imgMatches = [...trimmed.matchAll(/<img\b([^>]*?)(?:\/>|>)/gi)];
    if (imgMatches.length > 0) {
      lastTextCard = null; // image row breaks text accumulation
      lastSingleImageCard = null;
      // If there's meaningful text before the first image, emit it as a text card first
      const firstImgBefore = cleanCardText(trimmed.slice(0, imgMatches[0].index));
      if (firstImgBefore.trim()) {
        const tw = Math.min(divW, 600);
        const th = estimateTextHeight(firstImgBefore, tw);
        results.push({ type: 'text', x: baseX, y: curY, w: tw, content: firstImgBefore });
        curY += th + GAP;
      }
      let curX = baseX, rowH = 0;
      const rowCards = [];
      for (const im of imgMatches) {
        const tag = im[1];
        const srcM = tag.match(/data-fullres-src="__ATTACHMENT__([a-f0-9]+\.png)"|src="__ATTACHMENT__([a-f0-9]+\.png)"/);
        if (!srcM) continue;
        const src = srcM[1] || srcM[2];
        const wM = tag.match(/width="(\d+(?:\.\d+)?)"/);
        const hM = tag.match(/height="(\d+(?:\.\d+)?)"/);
        const rawW = wM ? Math.round(parseFloat(wM[1])) : 220;
        const imgW = Math.min(rawW, 480);
        const imgH = hM ? Math.round(parseFloat(hM[1]) * (imgW / rawW)) : 200;
        const altM = tag.match(/\balt="([^"]*)"/);
        const alt = altM ? altM[1].trim() : '';
        const before = trimmed.slice(0, im.index);
        const linkM = before.match(/<a\s[^>]*href="([^"]+)"[^>]*>\s*$/);
        const card = { type: 'image', x: curX, y: curY, w: imgW, h: imgH, src };
        if (linkM) card.link = linkM[1];
        if (isMeaningfulAlt(alt)) card.caption = alt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        results.push(card);
        rowCards.push(card);
        curX += imgW + GAP;
        rowH = Math.max(rowH, imgH);
      }
      // Track single-image rows for potential caption attachment
      if (rowCards.length === 1 && !firstImgBefore.trim()) {
        lastSingleImageCard = rowCards[0];
      }
      curY += rowH + GAP;
    } else {
      const content = cleanCardText(trimmed);
      if (content.trim()) {
        const w = Math.min(divW, 600);
        // If previous row had exactly one image and no caption yet, attach short text as caption
        if (lastSingleImageCard && !lastSingleImageCard.caption && content.trim().length < 150) {
          lastSingleImageCard.caption = content.trim();
          lastSingleImageCard = null;
          // Don't create a separate text card — caption is absorbed into the image card
        } else if (lastTextCard) {
          lastSingleImageCard = null;
          // Merge consecutive text rows into one card
          lastTextCard.content += '\n' + content;
          const h = estimateTextHeight(lastTextCard.content, w);
          curY = lastTextCard.y + h + GAP;
        } else {
          lastSingleImageCard = null;
          const h = estimateTextHeight(content, w);
          lastTextCard = { type: 'text', x: baseX, y: curY, w, content };
          results.push(lastTextCard);
          curY += h + GAP;
        }
      }
    }
  }
  return results;
}

// ── Detect page type from raw OneNote HTML ────────────────────────────────────
// Type A (visionboard): data-absolute-enabled + table containing images
// Type B (twilight):    data-absolute-enabled + no table images
// Type C (doc):         no data-absolute-enabled
function detectPageType(rawHtml) {
  if (!rawHtml.includes('data-absolute-enabled="true"')) return 'doc';
  return /<table[\s\S]{0,2000}?<img/i.test(rawHtml) ? 'visionboard' : 'twilight';
}

// ── Extract images from table cells as individual positioned cards (Type A) ───
// containerX/Y: absolute position of the div wrapping the table
// Returns { imageCards, tableHtmlWithPlaceholders }
// - imageCards: individual draggable image cards at cell positions
// - tableHtmlWithPlaceholders: table HTML with <img> replaced by sized placeholder divs
function extractTableImageCards(tableHtml, containerX, containerY) {
  const imageCards = [];
  let tableHtmlOut = tableHtml;
  const seen = new Set(); // dedup by src filename
  const CARD_PAD = 12; // board .card CSS padding — images must start inside this offset

  // ── Primary pass: tr/td structure ─────────────────────────────────────────
  // Note: OneNote HTML sometimes has malformed/nested <tr> elements that the lazy
  // regex cannot handle. The secondary pass below catches any images missed here.
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  let rowY = containerY + CARD_PAD; // offset by card padding so images land inside the card
  while ((trM = trRe.exec(tableHtml)) !== null) {
    const rowHtml = trM[1];
    let cellX = containerX + CARD_PAD;
    let rowMaxH = 0;
    const tdRe = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi;
    let tdM;
    while ((tdM = tdRe.exec(rowHtml)) !== null) {
      const tdAttrs = tdM[1];
      const tdContent = tdM[2];
      const wAttr = tdAttrs.match(/width\s*:\s*(\d+)/i) || tdAttrs.match(/width="(\d+)"/i);
      const cellW = wAttr ? parseInt(wAttr[1]) : 200;
      const imgRe = /<img\b([^>]*?)(?:\/>|>)/gi;
      let imgM;
      let imgOffsetY = 0;
      while ((imgM = imgRe.exec(tdContent)) !== null) {
        const tag = imgM[1];
        const fullresM = tag.match(/data-fullres-src="__ATTACHMENT__([a-f0-9]+\.\w+)"/);
        const srcAttrM = tag.match(/src="__ATTACHMENT__([a-f0-9]+\.\w+)"/);
        const primarySrc = (fullresM && fullresM[1]) || (srcAttrM && srcAttrM[1]);
        if (!primarySrc || seen.has(primarySrc)) continue;
        const iW = tag.match(/width="(\d+(?:\.\d+)?)"/);
        const iH = tag.match(/height="(\d+(?:\.\d+)?)"/);
        const rawW = iW ? parseFloat(iW[1]) : cellW;
        const w = Math.min(Math.round(rawW), 480);
        const scale = rawW > 0 ? w / rawW : 1;
        const h = iH ? Math.round(parseFloat(iH[1]) * scale) : null;
        const altM = tag.match(/\balt="([^"]*)"/);
        const alt = altM ? altM[1].trim() : '';
        const card = { type: 'image', x: cellX, y: rowY + imgOffsetY, w, src: primarySrc };
        if (h) {
          card.h = h;
          rowMaxH = Math.max(rowMaxH, imgOffsetY + h);
          imgOffsetY += h + 8;
        }
        if (isMeaningfulAlt(alt)) card.caption = alt.replace(/\s+/g, ' ').trim();
        imageCards.push(card);
        seen.add(primarySrc);
        // If src and data-fullres-src point to different files, emit both
        if (srcAttrM && fullresM && srcAttrM[1] !== fullresM[1] && !seen.has(srcAttrM[1])) {
          const card2 = { type: 'image', x: cellX + w + 8, y: rowY + imgOffsetY - (h || 0) - 8, w, src: srcAttrM[1] };
          if (h) card2.h = h;
          imageCards.push(card2);
          seen.add(srcAttrM[1]);
        }
        const placeholder = h
          ? `<div style="display:inline-block;width:${w}px;height:${h}px;background:#2d333b;border-radius:4px;margin:2px;vertical-align:top;opacity:0.4"></div>`
          : `<div style="display:inline-block;width:${w}px;height:120px;background:#2d333b;border-radius:4px;margin:2px;vertical-align:top;opacity:0.4"></div>`;
        tableHtmlOut = tableHtmlOut.replace(imgM[0], placeholder);
      }
      cellX += cellW;
    }
    // Use 30px for text-only header rows (vs 200px which placed images too far down)
    rowY += rowMaxH || 30;
  }

  // ── Secondary pass: catch images in malformed/nested rows missed by regex ──
  // Layout missed images below the primary cards, in a 3-column grid
  const maxCardY = imageCards.length > 0
    ? Math.max(...imageCards.map(c => c.y + (c.h || 200)))
    : rowY;
  let spY = maxCardY + 20;
  let spCol = 0;
  const SP_COLS = 3;
  const SP_COL_W = 300;
  const SP_GAP = 10;

  const imgRe2 = /<img\b([^>]*?)(?:\/>|>)/gi;
  let imgM2;
  while ((imgM2 = imgRe2.exec(tableHtml)) !== null) {
    const tag = imgM2[1];
    if (tag.includes('position:absolute')) continue;
    const fullresM = tag.match(/data-fullres-src="__ATTACHMENT__([a-f0-9]+\.\w+)"/);
    const srcAttrM = tag.match(/src="__ATTACHMENT__([a-f0-9]+\.\w+)"/);
    for (const srcFile of [fullresM && fullresM[1], srcAttrM && srcAttrM[1]]) {
      if (!srcFile || seen.has(srcFile)) continue;
      const iW = tag.match(/width="(\d+(?:\.\d+)?)"/);
      const iH = tag.match(/height="(\d+(?:\.\d+)?)"/);
      const rawW = iW ? parseFloat(iW[1]) : SP_COL_W;
      const w = Math.min(Math.round(rawW), 480);
      const scale = rawW > 0 ? w / rawW : 1;
      const h = iH ? Math.round(parseFloat(iH[1]) * scale) : 200;
      const altM = tag.match(/\balt="([^"]*)"/);
      const alt = altM ? altM[1].trim() : '';
      const card = { type: 'image', x: containerX + CARD_PAD + spCol * (SP_COL_W + SP_GAP), y: spY, w, h, src: srcFile };
      if (isMeaningfulAlt(alt)) card.caption = alt.replace(/\s+/g, ' ').trim();
      imageCards.push(card);
      seen.add(srcFile);
      spCol++;
      if (spCol >= SP_COLS) { spCol = 0; spY += h + SP_GAP; }
      // Replace in table HTML (img tag still present since primary pass skipped it)
      const placeholder = `<div style="display:inline-block;width:${w}px;height:${h}px;background:#2d333b;border-radius:4px;margin:2px;vertical-align:top;opacity:0.4"></div>`;
      tableHtmlOut = tableHtmlOut.replace(imgM2[0], placeholder);
    }
  }

  return { imageCards, tableHtmlWithPlaceholders: tableHtmlOut };
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
    const hM = tag.match(/height="(\d+(?:\.\d+)?)"/);
    const rawW = wM ? Math.round(parseFloat(wM[1])) : 220;
    const w = Math.min(rawW, 480);
    const h = hM ? Math.round(parseFloat(hM[1]) * (w / rawW)) : null;
    const altM = tag.match(/\balt="([^"]*)"/);
    const alt = altM ? altM[1].trim() : '';
    const src = srcM[1] || srcM[2];
    const before = bodyContent.slice(Math.max(0, m.index - 300), m.index);
    const linkM = before.match(/<a\s[^>]*href="([^"]+)"[^>]*>\s*$/);
    const card = { type: 'image', x, y, w, src };
    if (h) card.h = h;
    if (linkM) card.link = linkM[1];
    if (isMeaningfulAlt(alt)) card.caption = alt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    cards.push(card);
  }

  // Pass 2: top-level absolute divs → parse flow content with correct positions
  const divRe = /<div\s+style="position:absolute;left:(\d+(?:\.\d+)?)px;top:(\d+(?:\.\d+)?)px;width:(\d+(?:\.\d+)?)px">/g;
  let dm;
  while ((dm = divRe.exec(bodyContent)) !== null) {
    const divX = Math.round(parseFloat(dm[1]));
    const divY = Math.round(parseFloat(dm[2]));
    const divW = Math.min(Math.round(parseFloat(dm[3])), 1400);
    let depth = 1, j = dm.index + dm[0].length;
    while (j < bodyContent.length && depth > 0) {
      if (bodyContent[j] === '<') {
        if (bodyContent.slice(j, j+4).toLowerCase() === '<div') depth++;
        else if (bodyContent.slice(j, j+5).toLowerCase() === '</div') depth--;
      }
      if (depth > 0) j++;
    }
    const inner = bodyContent.slice(dm.index + dm[0].length, j);
    if (/<table[\s>]/i.test(inner)) {
      // Type A: keep table as html card (structure) + extract images as individual draggable cards
      const { imageCards, tableHtmlWithPlaceholders } = extractTableImageCards(inner, divX, divY);
      // Always keep the table structure (with placeholder divs where images were)
      cards.push({ type: 'html', x: divX, y: divY, w: divW, html: tableHtmlWithPlaceholders });
      // Add image cards on top — draggable outside table bounds
      for (const c of imageCards) cards.push(c);
    } else {
      const flowCards = parseFlowContent(inner, divX, divY, divW);
      for (const c of flowCards) {
        if (c.type === 'image' && cards.some(e => e.type === 'image' && e.src === c.src)) continue;
        cards.push(c);
      }
    }
  }

  return cards.sort((a, b) => (a.y - b.y) || (a.x - b.x));
}

// ── Process .onenote.html (Graph API raw HTML) → Cortex HTML ─────────────────
async function processOnenoteHtmlSource(onenoteHtmlPath, dstDir, dstSection, title, date, forceDoc = false) {
  const rawHtml = await readFile(onenoteHtmlPath, 'utf8');
  const base = imgBase(dstSection);

  // Extract body content + fix image placeholders
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : rawHtml;
  bodyContent = bodyContent.replace(/__ATTACHMENT__([a-f0-9]+\.png)/g, (_, f) => `__ATTACHMENT__${f}`); // keep placeholders for card extractor

  const pageType = forceDoc ? 'doc' : detectPageType(rawHtml);
  const isAbsolute = pageType !== 'doc';

  if (isAbsolute) {
    // Board mode: extract cards with flow-based positioning → interactive board template
    const cards = extractBoardCards(bodyContent);
    const saveKey = 'board-' + slugify(title);
    const cardsJson = JSON.stringify(cards, null, 2);
    const contentHash = createHash('md5').update(cardsJson).digest('hex').slice(0, 8);
    const boardTemplate = await readFile(
      join(__dirname, 'cortex-dashboard/templates/board-template.html'),
      'utf8'
    );
    return boardTemplate
      .replace('{{BOARD_TITLE}}', escHtml(title))
      .replace('{{BOARD_TITLE}}', escHtml(title))
      .replace('{{BOARD_DATE}}', escHtml(date))
      .replace('{{SAVE_KEY}}', saveKey)
      .replace('{{IMG_BASE}}', base)
      .replace('{{DEFAULT_CARDS}}', cardsJson)
      .replace('{{CONTENT_HASH}}', contentHash);
  }

  // Linear doc mode: fix image paths + strip absolute positioning
  bodyContent = bodyContent
    .replace(/__ATTACHMENT__([a-f0-9]+\.png)/g, (_, f) => base + f)
    .replace(/src="(https:\/\/graph\.microsoft\.com[^"]+\/\$value)"/g, (_, url) => {
      const fn = graphUrlToFilename(url);
      return fn ? `src="${base}${fn}"` : `src="missing.png"`;
    })
    // Strip absolute/fixed positioning from inline styles (keep layout natural)
    .replace(/position\s*:\s*(absolute|fixed)\s*;?/gi, '')
    .replace(/left\s*:\s*[\d.]+px\s*;?/gi, '')
    .replace(/top\s*:\s*[\d.]+px\s*;?/gi, '')
    .replace(/width\s*:\s*[\d.]+px\s*;?/gi, '');

  const saveKey = 'doc-' + slugify(title);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1e1e1e; color: #e0e0e0; font-family: 'Segoe UI', -apple-system, sans-serif; font-size: 14px; line-height: 1.7; }
.toolbar { position: sticky; top: 0; z-index: 100; background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 24px; display: flex; gap: 10px; align-items: center; }
.toolbar .t-title { font-size: 16px; font-weight: bold; color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toolbar .t-date { color: #8b949e; font-size: 12px; white-space: nowrap; }
.toolbar .t-status { color: #8b949e; font-size: 11px; white-space: nowrap; }
.toolbar button { background: #21262d; border: 1px solid #30363d; color: #ccc; padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 12px; white-space: nowrap; }
.toolbar button:hover { background: #30363d; color: #fff; }
.onenote-body { max-width: 900px; margin: 0 auto; padding: 24px 24px 80px; outline: none; }
.onenote-body * { color: #e0e0e0 !important; background-color: transparent !important; font-family: 'Segoe UI', sans-serif !important; }
.onenote-body table { border-collapse: collapse; margin: 8px 0 14px; width: auto; }
.onenote-body td, .onenote-body th { border: 1px solid #444 !important; padding: 6px 10px !important; vertical-align: top; cursor: text; }
.onenote-body th { background: #2d333b !important; font-weight: 600; }
.onenote-body td[contenteditable="true"], .onenote-body th[contenteditable="true"] { outline: 2px solid #388bfd !important; background: rgba(56,139,253,0.08) !important; }
.onenote-body img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 4px 0; }
.onenote-body a { color: #6cb0f6 !important; text-decoration: none; }
.onenote-body a:hover { text-decoration: underline; }
.onenote-body p, .onenote-body span, .onenote-body div { min-height: 1em; }
</style>
</head>
<body>
<div class="toolbar">
  <span class="t-title">${escHtml(title)}</span>
  ${date ? `<span class="t-date">${escHtml(date)}</span>` : ''}
  <button onclick="save()">💾 저장</button>
  <button id="copyBtn" onclick="copyPath()">⎘ 주소 복사</button>
  <span class="t-status" id="status"></span>
  <span style="display:flex;align-items:center;gap:4px;margin-left:8px;border-left:1px solid #30363d;padding-left:8px;">
    <button onclick="zoomOut()" title="Ctrl+-">−</button>
    <span id="zoom-level" style="font-size:11px;color:#8b949e;min-width:32px;text-align:center;">100%</span>
    <button onclick="zoomIn()" title="Ctrl+=">+</button>
  </span>
</div>
<div class="onenote-body" id="doc" contenteditable="true">${bodyContent}</div>
<script>
const SAVE_KEY = '${saveKey}';
let zoom = parseFloat(localStorage.getItem('zoom-' + SAVE_KEY) || '1.0');

function applyZoom() {
  const doc = document.getElementById('doc');
  doc.style.transform = 'scale(' + zoom + ')';
  doc.style.transformOrigin = '0 0';
  document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
  localStorage.setItem('zoom-' + SAVE_KEY, zoom);
}
function zoomIn()  { zoom = Math.min(3.0, parseFloat((zoom + 0.1).toFixed(2))); applyZoom(); }
function zoomOut() { zoom = Math.max(0.2, parseFloat((zoom - 0.1).toFixed(2))); applyZoom(); }
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
    if (e.key === '-') { e.preventDefault(); zoomOut(); }
    if (e.key === '0') { e.preventDefault(); zoom = 1.0; applyZoom(); }
  }
});
document.getElementById('doc').addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  e.deltaY < 0 ? zoomIn() : zoomOut();
}, { passive: false });

function save() {
  localStorage.setItem(SAVE_KEY, document.getElementById('doc').innerHTML);
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

// Table cell dblclick editing (prevent accidental edits via contenteditable parent)
const doc = document.getElementById('doc');
doc.addEventListener('dblclick', e => {
  const cell = e.target.closest('td, th');
  if (!cell) return;
  e.stopPropagation();
});

// Load saved content
const saved = localStorage.getItem(SAVE_KEY);
if (saved) document.getElementById('doc').innerHTML = saved;

// Auto-save every 30s
setInterval(save, 30000);

applyZoom();
</script>
</body>
</html>`;
}

// ── Process a single .md file → .html ────────────────────────────────────────
async function processFile(srcPath, dstDir, dstSection, docMode = false) {
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
    const html = await processOnenoteHtmlSource(onenoteHtmlPath, dstDir, dstSection, title, date, docMode);
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
  let result = html
    .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/g, '')
    .replace(/<\/?[a-z]+:[a-z]+[^>]*>/g, '')
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/\s+class="[^"]*"/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
  // Convert inline markdown inside td/th cells
  result = result.replace(/(<t[dh][^>]*>)([\s\S]*?)(<\/t[dh]>)/g, (_, open, inner, close) => {
    const converted = inner
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    return open + converted + close;
  });
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let totalFiles = 0, totalCards = 0, skipped = 0, errors = 0;

  for (const { src, dst, docMode = false } of SECTION_MAP) {
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
        const result = await processFile(srcPath, dstDir, dst, docMode);
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
