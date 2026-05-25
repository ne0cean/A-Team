#!/usr/bin/env node
/**
 * Cortex Ritual & Routine Dashboard v2 — localhost server
 * Port: 7843
 *
 * APIs:
 *   GET  /api/month?ym=YYYY-MM     — load month data
 *   POST /api/month                 — save full month data
 *   POST /api/toggle                — toggle item done
 *   POST /api/add-item              — add item to day
 *   POST /api/one-thing             — set One Thing
 *   POST /api/day-type              — set day type
 *   POST /api/notes                 — save day notes
 *   POST /api/reorder               — reorder items
 *   POST /api/edit-item             — edit item text
 *   POST /api/delete-item           — delete item
 *   GET  /api/search?q=keyword      — search across months
 *   GET  /api/standing-orders       — load standing orders
 *   POST /api/standing-orders       — save standing orders
 *   GET  /api/recurring-templates   — load recurring templates
 *   POST /api/recurring-templates   — create recurring template
 *   PUT  /api/recurring-templates/:id
 *   DELETE /api/recurring-templates/:id
 *   POST /api/recurring-inject      — inject recurring into month
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 7843;
const DATA_DIR = join(__dirname, '../../cortex/areas/life/ritual-routine');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const STANDING_PATH = join(DATA_DIR, 'standing-orders.json');
const RECURRING_PATH = join(DATA_DIR, 'recurring-templates.json');
const FRAMES_PATH = join(DATA_DIR, 'day-frames.json');

// --- Backup (rolling 3) ---
function backup(filePath) {
  if (!existsSync(filePath)) return;
  for (let i = 2; i >= 0; i--) {
    const src = i === 0 ? filePath : `${filePath}.bak${i}`;
    const dst = `${filePath}.bak${i + 1}`;
    try { if (existsSync(src)) copyFileSync(src, dst); } catch {}
  }
}

// --- Month data ---
function getDataPath(ym) { return join(DATA_DIR, `${ym}.json`); }
function getMdPath(ym) { return join(DATA_DIR, `${ym}.md`); }

function loadMonth(ym) {
  const p = getDataPath(ym);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  return { month: ym, goals: {}, days: {} };
}

function saveMonth(ym, data) {
  const p = getDataPath(ym);
  backup(p);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  generateMd(ym, data);
}

function ensureDay(data, day) {
  if (!data.days[day]) data.days[day] = {};
  return data.days[day];
}

// --- Standing Orders ---
function loadStanding() {
  if (existsSync(STANDING_PATH)) return JSON.parse(readFileSync(STANDING_PATH, 'utf-8'));
  return { standing: [], monthly: {}, yearly: [], happy_friday: [], holidays: {}, vision: '', input_backlog: [], instagram: [] };
}

function saveStanding(data) {
  backup(STANDING_PATH);
  writeFileSync(STANDING_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Day Frames ---
function loadFrames() {
  if (existsSync(FRAMES_PATH)) return JSON.parse(readFileSync(FRAMES_PATH, 'utf-8'));
  return { weekday: { label: 'Weekday', categories: {} }, flow: { label: 'Flow Day', categories: {} }, block: { label: 'Block Day', categories: {} } };
}

function saveFrames(data) {
  backup(FRAMES_PATH);
  writeFileSync(FRAMES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Determine day type for a given date.
 * Priority: explicit day_type in data > auto-detect by day of week
 * Auto: Sunday=block, Saturday=flow, else=weekday
 */
function resolveDayType(dayData, dow) {
  if (dayData?.day_type) return dayData.day_type;
  if (dow === 0) return 'block';
  if (dow === 6) return 'flow';
  return 'weekday';
}

/**
 * Check if a category is "todo" type for given day type.
 */
function isTodoCategory(frames, dayType, cat) {
  return frames[dayType]?.categories?.[cat]?.type === 'todo';
}

/**
 * Inject frame into a day: add routine items (idempotent), carry over todos from previous day.
 * Returns true if data was modified.
 */
function injectFrameForDay(ym, dayNum, monthData, frames) {
  const [year, month] = ym.split('-').map(Number);
  const dow = new Date(year, month - 1, dayNum).getDay();
  const dayKey = String(dayNum);
  if (!monthData.days[dayKey]) monthData.days[dayKey] = {};
  const dayData = monthData.days[dayKey];
  const dayType = resolveDayType(dayData, dow);
  const frame = frames[dayType];
  if (!frame?.categories) return false;

  let modified = false;
  const CATS = ['ritual', 'input', 'work', 'outcome'];

  for (const cat of CATS) {
    const catFrame = frame.categories[cat];
    if (!catFrame) continue;
    if (!dayData[cat]) dayData[cat] = [];

    if (catFrame.type === 'routine') {
      // Inject routine items not already present
      for (const text of (catFrame.items || [])) {
        const exists = dayData[cat].some(i => i.text === text && i._frame);
        if (!exists) {
          dayData[cat].push({ text, url: '', done: false, _frame: true });
          modified = true;
        }
      }
    }
    // todo items: carry-over handled separately
  }

  return modified;
}

/**
 * Carry over unchecked todo items from previous day.
 * Only for categories marked as "todo" in the day's frame.
 */
function carryOverTodos(ym, dayNum, monthData, frames) {
  if (dayNum <= 1) return false; // no previous day in this month

  const [year, month] = ym.split('-').map(Number);
  const prevKey = String(dayNum - 1);
  const dayKey = String(dayNum);
  const prevData = monthData.days[prevKey];
  if (!prevData) return false;

  if (!monthData.days[dayKey]) monthData.days[dayKey] = {};
  const dayData = monthData.days[dayKey];

  const prevDow = new Date(year, month - 1, dayNum - 1).getDay();
  const prevType = resolveDayType(prevData, prevDow);
  const CATS = ['ritual', 'input', 'work', 'outcome'];

  let modified = false;
  for (const cat of CATS) {
    if (!isTodoCategory(frames, prevType, cat)) continue;
    const prevItems = prevData[cat] || [];
    if (!dayData[cat]) dayData[cat] = [];

    for (const item of prevItems) {
      if (item.done) continue; // completed → don't carry
      if (item._frame) continue; // routine frame items don't carry
      // Check not already present
      const exists = dayData[cat].some(i => i.text === item.text);
      if (!exists) {
        dayData[cat].push({ text: item.text, url: item.url || '', done: false, _carried: true });
        modified = true;
      }
    }
  }
  return modified;
}

// --- Recurring Templates ---
function loadRecurring() {
  if (existsSync(RECURRING_PATH)) return JSON.parse(readFileSync(RECURRING_PATH, 'utf-8'));
  return { templates: [], _meta: { injectedMonths: [] } };
}

function saveRecurring(data) {
  writeFileSync(RECURRING_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function templateMatchesDate(tpl, date) {
  if (!tpl.enabled) return false;
  const { type, days, dates } = tpl.schedule;
  if (type === 'daily') return true;
  if (type === 'weekly') return Array.isArray(days) && days.includes(date.getDay());
  if (type === 'monthly') return Array.isArray(dates) && dates.includes(date.getDate());
  return false;
}

function injectRecurringIntoMonth(ym, monthData, recurringData) {
  const [year, month] = ym.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let injected = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayKey = String(d);
    if (!monthData.days[dayKey]) monthData.days[dayKey] = {};
    const dayData = monthData.days[dayKey];
    for (const tpl of recurringData.templates) {
      if (!templateMatchesDate(tpl, dateObj)) continue;
      const cat = tpl.category;
      if (!dayData[cat]) dayData[cat] = [];
      if (!dayData[cat].some(i => i._tplId === tpl.id)) {
        dayData[cat].push({ text: tpl.name, url: '', done: false, _tplId: tpl.id });
        injected++;
      }
    }
  }
  return injected;
}

function autoInjectMonth(ym) {
  const rec = loadRecurring();
  if (rec._meta.injectedMonths.includes(ym)) return 0;
  const data = loadMonth(ym);
  const count = injectRecurringIntoMonth(ym, data, rec);
  if (count > 0) saveMonth(ym, data);
  rec._meta.injectedMonths.push(ym);
  saveRecurring(rec);
  return count;
}

// Startup inject
autoInjectMonth(new Date().toISOString().slice(0, 7));

// --- .md generation (enhanced) ---
function generateMd(ym, data) {
  const [year, month] = ym.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const typeLabels = { block: 'BLOCK', flow: 'FLOW', hf: 'HF', vacation: '휴가' };

  let md = `# ${ym} Ritual & Routine\n\n`;
  if (data.goals?.goal) md += `> ${data.goals.goal}\n\n`;

  let weekStart = 1;
  while (weekStart <= daysInMonth) {
    const dow = new Date(year, month - 1, weekStart).getDay();
    let weekEnd = Math.min(weekStart + (6 - dow), daysInMonth);
    md += `## ${month}/${weekStart} - ${month}/${weekEnd}\n\n`;

    for (let d = weekStart; d <= weekEnd; d++) {
      const dayData = data.days[String(d)] || {};
      const kr = dayNames[new Date(year, month - 1, d).getDay()];
      const typeTag = dayData.day_type ? ` [${typeLabels[dayData.day_type] || dayData.day_type}]` : '';

      md += `### ${d} (${kr})${typeTag}`;
      if (dayData.one_thing) md += ` — ONE THING: ${dayData.one_thing}`;
      md += `\n\n`;

      const cats = ['ritual', 'input', 'work', 'outcome'];
      const catNames = { ritual: 'Ritual & Routine', input: '출근전 - Input/R&D', work: 'Work - 1H Blocks', outcome: '퇴근후 - Outcome' };

      for (const cat of cats) {
        const items = dayData[cat] || [];
        if (!items.length) continue;
        md += `**${catNames[cat]}**\n`;
        for (const item of items) {
          const ck = item.done ? 'x' : ' ';
          md += item.url ? `- [${ck}] [${item.text}](${item.url})\n` : `- [${ck}] ${item.text}\n`;
        }
        md += `\n`;
      }

      if (dayData.notes) md += `**Notes**\n${dayData.notes}\n\n`;
    }
    md += `---\n\n`;
    weekStart = weekEnd + 1;
  }

  // Append standing orders summary
  try {
    const so = loadStanding();
    if (so.standing.length) {
      md += `## 상시 업무\n\n`;
      so.standing.filter(s => s.active).forEach(s => { md += `- ${s.text}\n`; });
      md += `\n`;
    }
    const monthlyItems = so.monthly[ym] || [];
    if (monthlyItems.length) {
      md += `## Monthly\n\n`;
      monthlyItems.forEach(i => { md += `- ${typeof i === 'string' ? i : i.text || i}\n`; });
      md += `\n`;
    }
  } catch {}

  writeFileSync(getMdPath(ym), md, 'utf-8');
}

// --- Search ---
function searchMonths(query) {
  const results = [];
  const q = query.toLowerCase();
  const files = readdirSync(DATA_DIR).filter(f => /^\d{4}-\d{2}\.json$/.test(f));
  for (const file of files) {
    const ym = file.replace('.json', '');
    const data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
    for (const [day, dd] of Object.entries(data.days || {})) {
      const matches = [];
      if (dd.one_thing?.toLowerCase().includes(q)) matches.push({ field: 'one_thing', text: dd.one_thing });
      if (dd.notes?.toLowerCase().includes(q)) matches.push({ field: 'notes', text: dd.notes });
      for (const cat of ['ritual', 'input', 'work', 'outcome']) {
        for (const item of (dd[cat] || [])) {
          if (item.text.toLowerCase().includes(q)) matches.push({ field: cat, text: item.text });
        }
      }
      if (matches.length) results.push({ ym, day, matches });
    }
  }
  return results;
}

// --- Static file serving ---
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveFile(res, filePath) {
  try {
    const ext = extname(filePath);
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

// --- Request body helper ---
function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

function jsonRes(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// --- Server ---
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS + no-cache for dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  try {
    // --- Static files ---
    if (path === '/' || path === '/index.html') return serveFile(res, join(__dirname, 'index.html'));
    if (path === '/manifest.json' || path === '/manifest.webmanifest') return serveFile(res, join(__dirname, 'manifest.json'));
    if (path === '/sw.js') return serveFile(res, join(__dirname, 'sw.js'));
    if (path.startsWith('/icons/')) return serveFile(res, join(__dirname, path));

    // --- Month API ---
    if (path === '/api/month' && req.method === 'GET') {
      const ym = url.searchParams.get('ym') || new Date().toISOString().slice(0, 7);
      autoInjectMonth(ym);
      return jsonRes(res, 200, loadMonth(ym));
    }

    if (path === '/api/month' && req.method === 'POST') {
      const { ym, data } = JSON.parse(await readBody(req));
      saveMonth(ym, data);
      return jsonRes(res, 200, { ok: true });
    }

    if (path === '/api/toggle' && req.method === 'POST') {
      const { ym, day, category, index } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      if (data.days[day]?.[category]?.[index] !== undefined) {
        data.days[day][category][index].done = !data.days[day][category][index].done;
        saveMonth(ym, data);
      }
      return jsonRes(res, 200, { ok: true });
    }

    if (path === '/api/add-item' && req.method === 'POST') {
      const { ym, day, category, text, url: itemUrl } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      const dd = ensureDay(data, day);
      if (!dd[category]) dd[category] = [];
      dd[category].push({ text, url: itemUrl || '', done: false });
      saveMonth(ym, data);
      return jsonRes(res, 200, { ok: true });
    }

    if (path === '/api/one-thing' && req.method === 'POST') {
      const { ym, day, text } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      ensureDay(data, day).one_thing = text;
      saveMonth(ym, data);
      return jsonRes(res, 200, { ok: true });
    }

    if (path === '/api/edit-item' && req.method === 'POST') {
      const { ym, day, category, index, text } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      if (data.days[day]?.[category]?.[index]) {
        data.days[day][category][index].text = text;
        saveMonth(ym, data);
      }
      return jsonRes(res, 200, { ok: true });
    }

    if (path === '/api/delete-item' && req.method === 'POST') {
      const { ym, day, category, index } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      if (data.days[day]?.[category]) {
        data.days[day][category].splice(index, 1);
        saveMonth(ym, data);
      }
      return jsonRes(res, 200, { ok: true });
    }

    // --- Day Type ---
    if (path === '/api/day-type' && req.method === 'POST') {
      const { ym, day, type } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      const dd = ensureDay(data, day);
      if (type) dd.day_type = type;
      else delete dd.day_type;
      saveMonth(ym, data);
      return jsonRes(res, 200, { ok: true });
    }

    // --- Notes ---
    if (path === '/api/notes' && req.method === 'POST') {
      const { ym, day, notes } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      const dd = ensureDay(data, day);
      if (notes) dd.notes = notes;
      else delete dd.notes;
      saveMonth(ym, data);
      return jsonRes(res, 200, { ok: true });
    }

    // --- Reorder ---
    if (path === '/api/reorder' && req.method === 'POST') {
      const { ym, day, category, fromIdx, toIdx } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      const items = data.days[day]?.[category];
      if (items && fromIdx >= 0 && fromIdx < items.length && toIdx >= 0 && toIdx < items.length) {
        const [moved] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, moved);
        saveMonth(ym, data);
      }
      return jsonRes(res, 200, { ok: true });
    }

    // --- Search ---
    if (path === '/api/search' && req.method === 'GET') {
      const q = url.searchParams.get('q') || '';
      if (!q) return jsonRes(res, 200, []);
      return jsonRes(res, 200, searchMonths(q));
    }

    // --- Standing Orders ---
    if (path === '/api/standing-orders' && req.method === 'GET') {
      return jsonRes(res, 200, loadStanding());
    }

    if (path === '/api/standing-orders' && req.method === 'POST') {
      const data = JSON.parse(await readBody(req));
      saveStanding(data);
      return jsonRes(res, 200, { ok: true });
    }

    // --- Day Frames ---
    if (path === '/api/day-frames' && req.method === 'GET') {
      return jsonRes(res, 200, loadFrames());
    }

    if (path === '/api/day-frames' && req.method === 'POST') {
      const data = JSON.parse(await readBody(req));
      saveFrames(data);
      return jsonRes(res, 200, { ok: true });
    }

    // Inject frames + carry-over for a specific day or range
    if (path === '/api/inject-frames' && req.method === 'POST') {
      const { ym, fromDay, toDay } = JSON.parse(await readBody(req));
      const data = loadMonth(ym);
      const frames = loadFrames();
      const [year, month] = ym.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const start = fromDay || 1;
      const end = toDay || daysInMonth;
      let injected = 0;
      for (let d = start; d <= end; d++) {
        if (injectFrameForDay(ym, d, data, frames)) injected++;
        if (carryOverTodos(ym, d, data, frames)) injected++;
      }
      if (injected > 0) saveMonth(ym, data);
      return jsonRes(res, 200, { ok: true, injected, range: `${start}-${end}` });
    }

    // --- Recurring Templates ---
    if (path === '/api/recurring-templates' && req.method === 'GET') {
      return jsonRes(res, 200, loadRecurring());
    }

    if (path === '/api/recurring-templates' && req.method === 'POST') {
      const { name, category, schedule, enabled } = JSON.parse(await readBody(req));
      if (!name || !category || !schedule) return jsonRes(res, 400, { error: 'name, category, schedule required' });
      const data = loadRecurring();
      const newTpl = { id: `rt-${randomUUID().slice(0, 8)}`, name: name.trim(), category, schedule, enabled: enabled !== false };
      data.templates.push(newTpl);
      saveRecurring(data);
      return jsonRes(res, 201, { ok: true, template: newTpl });
    }

    const tplIdMatch = path.match(/^\/api\/recurring-templates\/([^/]+)$/);
    if (tplIdMatch && req.method === 'PUT') {
      const id = tplIdMatch[1];
      const updates = JSON.parse(await readBody(req));
      const data = loadRecurring();
      const idx = data.templates.findIndex(t => t.id === id);
      if (idx === -1) return jsonRes(res, 404, { error: 'not found' });
      data.templates[idx] = { ...data.templates[idx], ...updates, id };
      saveRecurring(data);
      return jsonRes(res, 200, { ok: true, template: data.templates[idx] });
    }

    if (tplIdMatch && req.method === 'DELETE') {
      const id = tplIdMatch[1];
      const data = loadRecurring();
      const before = data.templates.length;
      data.templates = data.templates.filter(t => t.id !== id);
      if (data.templates.length === before) return jsonRes(res, 404, { error: 'not found' });
      saveRecurring(data);
      return jsonRes(res, 200, { ok: true });
    }

    if (path === '/api/recurring-inject' && req.method === 'POST') {
      const { ym } = JSON.parse(await readBody(req));
      if (!ym) return jsonRes(res, 400, { error: 'ym required' });
      const rec = loadRecurring();
      const monthData = loadMonth(ym);
      const count = injectRecurringIntoMonth(ym, monthData, rec);
      if (count > 0) saveMonth(ym, monthData);
      rec._meta.injectedMonths = rec._meta.injectedMonths.filter(m => m !== ym);
      rec._meta.injectedMonths.push(ym);
      saveRecurring(rec);
      return jsonRes(res, 200, { ok: true, injected: count, ym });
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    console.error(e);
    jsonRes(res, 500, { error: e.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cortex Dashboard v2: http://localhost:${PORT}`);
  console.log(`Data: ${DATA_DIR}`);
});
