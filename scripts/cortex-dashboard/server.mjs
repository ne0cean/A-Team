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

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 7843;
const DATA_DIR = join(__dirname, '../../cortex/areas/life/ritual-routine');

// Ensure data dir exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function getDataPath(yearMonth) {
  return join(DATA_DIR, `${yearMonth}.json`);
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Routes
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStatic(res, 'index.html', 'text/html; charset=utf-8');
  }

  if (url.pathname === '/api/month' && req.method === 'GET') {
    const ym = url.searchParams.get('ym') || new Date().toISOString().slice(0, 7);
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

server.listen(PORT, () => {
  console.log(`Cortex Dashboard: http://localhost:${PORT}`);
  console.log(`Data: ${DATA_DIR}`);
});
