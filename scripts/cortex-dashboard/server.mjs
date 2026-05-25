#!/usr/bin/env node
/**
 * Cortex Ritual & Routine Dashboard — localhost server
 * Reads/writes .json data files, serves calendar grid UI
 * Port: 7843
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 7843;
const DATA_DIR = join(__dirname, '../../cortex/areas/life/ritual-routine');

// Ensure data dir exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const TEMPLATES_PATH = join(DATA_DIR, 'templates.json');
const RECURRING_TEMPLATES_PATH = join(DATA_DIR, 'recurring-templates.json');

function getDataPath(yearMonth) {
  return join(DATA_DIR, `${yearMonth}.json`);
}

function loadTemplates() {
  if (existsSync(TEMPLATES_PATH)) return JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
  return { daily: [], monthly: [], yearly: [] };
}

function saveTemplates(data) {
  writeFileSync(TEMPLATES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Recurring Templates ---

function loadRecurringTemplates() {
  if (existsSync(RECURRING_TEMPLATES_PATH)) {
    return JSON.parse(readFileSync(RECURRING_TEMPLATES_PATH, 'utf-8'));
  }
  return { templates: [], _meta: { injectedMonths: [] } };
}

function saveRecurringTemplates(data) {
  writeFileSync(RECURRING_TEMPLATES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Returns true if this template should fire on the given date.
 * @param {object} tpl  recurring template
 * @param {Date}   date JS Date object
 */
function templateMatchesDate(tpl, date) {
  if (!tpl.enabled) return false;
  const { type, days, dates } = tpl.schedule;
  if (type === 'daily') return true;
  if (type === 'weekly') {
    const dow = date.getDay(); // 0=Sun, 6=Sat
    return Array.isArray(days) && days.includes(dow);
  }
  if (type === 'monthly') {
    const dom = date.getDate();
    return Array.isArray(dates) && dates.includes(dom);
  }
  return false;
}

/**
 * Inject enabled recurring templates into monthData for all days of yearMonth.
 * Skips days that already have the item (idempotent).
 * Returns count of new items injected.
 */
function injectRecurringIntoMonth(yearMonth, monthData, recurringData) {
  const [year, month] = yearMonth.split('-').map(Number);
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
      // idempotent: skip if already injected (match by _tplId)
      const alreadyExists = dayData[cat].some(i => i._tplId === tpl.id);
      if (!alreadyExists) {
        dayData[cat].push({ text: tpl.name, url: '', done: false, _tplId: tpl.id });
        injected++;
      }
    }
  }
  return injected;
}

/**
 * Auto-inject on server start and when loading a new month.
 * Marks the month as injected in _meta.injectedMonths so we don't double-run
 * (but re-run is still idempotent).
 */
function autoInjectMonth(yearMonth) {
  const recurringData = loadRecurringTemplates();
  const alreadyDone = recurringData._meta.injectedMonths.includes(yearMonth);
  if (alreadyDone) return 0;

  const monthData = loadMonth(yearMonth);
  const count = injectRecurringIntoMonth(yearMonth, monthData, recurringData);
  if (count > 0) saveMonth(yearMonth, monthData);

  recurringData._meta.injectedMonths.push(yearMonth);
  saveRecurringTemplates(recurringData);
  return count;
}

// Run auto-inject for current month on startup
const startupYm = new Date().toISOString().slice(0, 7);
autoInjectMonth(startupYm);
console.log(`Auto-inject on startup: ${startupYm}`);

function getMdPath(yearMonth) {
  return join(DATA_DIR, `${yearMonth}.md`);
}

function loadMonth(yearMonth) {
  const p = getDataPath(yearMonth);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  return { month: yearMonth, goals: {}, days: {} };
}

function saveMonth(yearMonth, data) {
  writeFileSync(getDataPath(yearMonth), JSON.stringify(data, null, 2), 'utf-8');
  // Also generate .md for Claude Code
  generateMd(yearMonth, data);
}

function generateMd(yearMonth, data) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  let md = `# ${yearMonth} Ritual & Routine\n\n`;
  md += `> Vision: 아침에 일어나서 원하는 것을 할 수 있는 것, 즉 자유\n\n`;

  // Weekly tables
  let weekStart = 1;
  while (weekStart <= daysInMonth) {
    const dow = new Date(year, month - 1, weekStart).getDay();
    let weekEnd = weekStart + (6 - dow);
    if (weekEnd > daysInMonth) weekEnd = daysInMonth;

    md += `## ${month}/${weekStart} - ${month}/${weekEnd}\n\n`;

    for (let d = weekStart; d <= weekEnd; d++) {
      const dayKey = String(d);
      const dayData = data.days[dayKey] || {};
      const dateObj = new Date(year, month - 1, d);
      const kr = dayNames[dateObj.getDay()];

      md += `### ${d} (${kr})`;
      if (dayData.one_thing) md += ` — ONE THING: ${dayData.one_thing}`;
      md += `\n\n`;

      const cats = ['ritual', 'input', 'work', 'outcome'];
      const catNames = { ritual: 'Ritual & Routine', input: '출근전 - Input/R&D', work: 'Work - 1H Blocks', outcome: '퇴근후 - Outcome' };

      for (const cat of cats) {
        const items = dayData[cat] || [];
        if (items.length === 0) continue;
        md += `**${catNames[cat]}**\n`;
        for (const item of items) {
          const check = item.done ? 'x' : ' ';
          if (item.url) {
            md += `- [${check}] [${item.text}](${item.url})\n`;
          } else {
            md += `- [${check}] ${item.text}\n`;
          }
        }
        md += `\n`;
      }

      // Free notes
      if (dayData.notes) {
        md += `**Notes**\n${dayData.notes}\n\n`;
      }
    }

    md += `---\n\n`;
    weekStart = weekEnd + 1;
  }

  writeFileSync(getMdPath(yearMonth), md, 'utf-8');
}

function serveStatic(res, file, type) {
  try {
    const content = readFileSync(join(__dirname, file), 'utf-8');
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Routes
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStatic(res, 'index.html', 'text/html; charset=utf-8');
  }

  if (url.pathname === '/api/month' && req.method === 'GET') {
    const ym = url.searchParams.get('ym') || new Date().toISOString().slice(0, 7);
    // Auto-inject recurring templates if this month hasn't been processed yet
    autoInjectMonth(ym);
    const data = loadMonth(ym);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  if (url.pathname === '/api/month' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { ym, data } = JSON.parse(body);
        saveMonth(ym, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/toggle' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { ym, day, category, index } = JSON.parse(body);
        const data = loadMonth(ym);
        if (data.days[day]?.[category]?.[index] !== undefined) {
          data.days[day][category][index].done = !data.days[day][category][index].done;
          saveMonth(ym, data);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/add-item' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { ym, day, category, text, url: itemUrl } = JSON.parse(body);
        const data = loadMonth(ym);
        if (!data.days[day]) data.days[day] = {};
        if (!data.days[day][category]) data.days[day][category] = [];
        data.days[day][category].push({ text, url: itemUrl || '', done: false });
        saveMonth(ym, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Templates API
  if (url.pathname === '/api/templates' && req.method === 'GET') {
    const tpl = loadTemplates();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(tpl));
  }

  if (url.pathname === '/api/templates' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        saveTemplates(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/inject' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { ym, day } = JSON.parse(body);
        const data = loadMonth(ym);
        const tpl = loadTemplates();
        if (!data.days[day]) data.days[day] = {};
        const dayData = data.days[day];
        for (const item of tpl.daily) {
          const cat = item.category;
          if (!dayData[cat]) dayData[cat] = [];
          const exists = dayData[cat].some(i => i.text === item.text);
          if (!exists) dayData[cat].push({ text: item.text, url: '', done: false });
        }
        saveMonth(ym, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, injected: tpl.daily.length }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ---- Recurring Templates API ----

  // GET /api/recurring-templates
  if (url.pathname === '/api/recurring-templates' && req.method === 'GET') {
    const data = loadRecurringTemplates();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  // POST /api/recurring-templates — create new template
  if (url.pathname === '/api/recurring-templates' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name, category, schedule, enabled } = JSON.parse(body);
        if (!name || !category || !schedule) {
          res.writeHead(400); return res.end(JSON.stringify({ error: 'name, category, schedule required' }));
        }
        const data = loadRecurringTemplates();
        const newTpl = {
          id: `rt-${randomUUID().slice(0, 8)}`,
          name: String(name).trim(),
          category: String(category),
          schedule,
          enabled: enabled !== false
        };
        data.templates.push(newTpl);
        saveRecurringTemplates(data);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, template: newTpl }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // PUT /api/recurring-templates/:id — update template
  const tplUpdateMatch = url.pathname.match(/^\/api\/recurring-templates\/([^/]+)$/);
  if (tplUpdateMatch && req.method === 'PUT') {
    const id = tplUpdateMatch[1];
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const data = loadRecurringTemplates();
        const idx = data.templates.findIndex(t => t.id === id);
        if (idx === -1) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' })); }
        data.templates[idx] = { ...data.templates[idx], ...updates, id };
        saveRecurringTemplates(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, template: data.templates[idx] }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/recurring-templates/:id
  const tplDeleteMatch = url.pathname.match(/^\/api\/recurring-templates\/([^/]+)$/);
  if (tplDeleteMatch && req.method === 'DELETE') {
    const id = tplDeleteMatch[1];
    const data = loadRecurringTemplates();
    const before = data.templates.length;
    data.templates = data.templates.filter(t => t.id !== id);
    if (data.templates.length === before) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' })); }
    saveRecurringTemplates(data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  // POST /api/recurring-inject — manual inject for a specific month
  if (url.pathname === '/api/recurring-inject' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { ym } = JSON.parse(body);
        if (!ym) { res.writeHead(400); return res.end(JSON.stringify({ error: 'ym required' })); }
        const recurringData = loadRecurringTemplates();
        const monthData = loadMonth(ym);
        const count = injectRecurringIntoMonth(ym, monthData, recurringData);
        if (count > 0) saveMonth(ym, monthData);
        // Mark as injected (re-inject overwrites the flag by removing and re-adding)
        recurringData._meta.injectedMonths = recurringData._meta.injectedMonths.filter(m => m !== ym);
        recurringData._meta.injectedMonths.push(ym);
        saveRecurringTemplates(recurringData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, injected: count, ym }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/one-thing' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { ym, day, text } = JSON.parse(body);
        const data = loadMonth(ym);
        if (!data.days[day]) data.days[day] = {};
        data.days[day].one_thing = text;
        saveMonth(ym, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cortex Dashboard: http://localhost:${PORT}`);
  console.log(`Data: ${DATA_DIR}`);
});
