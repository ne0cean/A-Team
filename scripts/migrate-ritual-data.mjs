#!/usr/bin/env node
/**
 * Migrate Ritual & Routine data from original .md (HTML table format)
 * → monthly JSON + standing-orders.json
 *
 * Handles:
 * 1. Weekly <table> parsing → per-day items with day_type
 * 2. Post-table sections → standing-orders.json
 *    (상시업무, Happy Friday, 만년달력, Monthly, Yearly, Vision, Input, Instagram)
 * 3. Backup before overwrite
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '../cortex/areas/life/ritual-routine');

// --- Backup ---
function backup(filePath) {
  if (!existsSync(filePath)) return;
  for (let i = 2; i >= 0; i--) {
    const src = i === 0 ? filePath : `${filePath}.bak${i}`;
    const dst = `${filePath}.bak${i + 1}`;
    if (existsSync(src)) copyFileSync(src, dst);
  }
}

// --- Day type extraction ---
function extractDayType(text) {
  const lower = text.toLowerCase();
  if (/block\s*day/i.test(text)) return 'block';
  if (/flow\s*day/i.test(text)) return 'flow';
  if (/\bHF\b/.test(text)) return 'hf';
  if (/휴가/.test(text)) return 'vacation';
  return null;
}

// --- Parse checklist items from a cell ---
function parseItems(cell) {
  const items = [];
  const lines = cell.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^n\d+\s+(&nbsp;)?\s*n\d+$/.test(trimmed)) continue; // skip "n1  n2"
    if (/^<\/?(?:div|span|p|br)/i.test(trimmed)) continue;

    const checkMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)/);
    if (checkMatch) {
      const done = checkMatch[1].toLowerCase() === 'x';
      let text = checkMatch[2].trim();
      let url = '';

      // Extract markdown link
      const linkMatch = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        text = linkMatch[1];
        url = linkMatch[2] === 'link' ? '' : linkMatch[2];
      }

      text = cleanHtml(text);
      if (text) items.push({ text, url, done });
    } else {
      // Sub-item (indented) → append to last item
      if (line.startsWith('  ') && items.length > 0) {
        const cleaned = cleanHtml(trimmed);
        if (cleaned) items[items.length - 1].text += ' / ' + cleaned;
      } else {
        // Context line (non-checklist, non-indented)
        const cleaned = cleanHtml(trimmed);
        // Skip common headers
        if (cleaned && !/^(Important not urgent|Breaking Down Tasks|One thing as Output|Twilight Mood board|Flow day|n\d)/.test(cleaned)) {
          if (cleaned.length > 2) {
            items.push({ text: cleaned, url: '', done: false });
          }
        }
      }
    }
  }
  return items;
}

function cleanHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

// --- Split raw .md into table section and post-table sections ---
function splitSections(raw) {
  // Find last </table> — everything after is post-table sections
  const lastTableEnd = raw.lastIndexOf('</table>');
  if (lastTableEnd === -1) return { tablePart: raw, postPart: '' };

  const tablePart = raw.slice(0, lastTableEnd + '</table>'.length);
  const postPart = raw.slice(lastTableEnd + '</table>'.length);
  return { tablePart, postPart };
}

// --- Parse weekly tables → days ---
function parseTables(tablePart) {
  const result = { goals: {}, days: {} };

  // Extract goal/palette
  const goalMatch = tablePart.match(/\*\*Goal\*\*:\s*(.+)/);
  const paletteMatch = tablePart.match(/\*\*Palette\*\*:\s*(.+)/);
  if (goalMatch) result.goals.goal = goalMatch[1].trim();
  if (paletteMatch) result.goals.palette = paletteMatch[1].trim();

  // Split by <tr> to get rows
  const rows = tablePart.split(/<tr>/gi).slice(1);

  for (const row of rows) {
    if (row.includes('<th>')) continue; // header row

    const cleaned = row.replace(/<\/tr>/gi, '');
    const cellParts = cleaned.split(/<\/td>\s*<td>/gi);
    if (cellParts.length < 2) continue;

    cellParts[0] = cellParts[0].replace(/^\s*<td>\s*/i, '');
    cellParts[cellParts.length - 1] = cellParts[cellParts.length - 1].replace(/<\/td>\s*$/i, '');

    // Cell 0: Date
    const dateMatch = cellParts[0].match(/\*\*(\d+)\s*\([^)]*\)\*\*/);
    if (!dateMatch) continue;
    const dayNum = dateMatch[1];

    // Extract day type and notes from date cell
    const dateText = cellParts[0].replace(/\*\*\d+\s*\([^)]*\)\*\*/, '').trim();
    const dayType = extractDayType(dateText);
    const dayNotes = dateText
      .replace(/Block\s*day,?\s*\w*/i, '').replace(/Flow\s*day,?\s*\w*/i, '')
      .replace(/\bHF\b\s*\d*/, '').replace(/휴가\s*\d*/, '').trim();

    const dayData = {};
    if (dayType) dayData.day_type = dayType;
    if (dayNotes) dayData.notes = dayNotes;

    // Cells 1-4 = ritual, input, work, outcome
    const cats = ['ritual', 'input', 'work', 'outcome'];
    for (let i = 0; i < cats.length; i++) {
      const cellIdx = i + 1;
      if (cellIdx >= cellParts.length) break;
      const items = parseItems(cellParts[cellIdx]);
      if (items.length > 0) dayData[cats[i]] = items;
    }

    if (Object.keys(dayData).length > 0) {
      result.days[dayNum] = dayData;
    }
  }

  return result;
}

// --- Parse post-table sections → standing-orders.json ---
function parsePostSections(postPart) {
  const standing = { standing: [], monthly: {}, yearly: [], happy_friday: [], holidays: {}, vision: '', input_backlog: [], instagram: [] };

  // Split by ## headers
  const sections = postPart.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const firstLine = section.split('\n')[0].trim();
    const body = section.slice(firstLine.length).trim();

    if (firstLine === '상시 업무') {
      const items = parseStandingItems(body);
      standing.standing = items.map((text, i) => ({ id: `so-${i + 1}`, text, active: true }));
    }
    else if (/Happy Friday/.test(firstLine)) {
      // Extract dates like "6/12, 6/26, ..."
      const dateMatches = body.match(/[\d\/]+/g) || [];
      standing.happy_friday = dateMatches.map(d => {
        const parts = d.split('/');
        if (parts.length === 2) return `2026-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        return d;
      }).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    }
    else if (/만년 달력/.test(firstLine) || /만년달력/.test(firstLine)) {
      // Parse holiday table
      const rows = body.split('\n').filter(l => l.includes('|') && !l.includes('---'));
      for (const row of rows) {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2) {
          const monthMatch = cells[0].match(/(\d+)월/);
          if (!monthMatch) continue;
          const mon = monthMatch[1].padStart(2, '0');
          // Extract "N일 이름" patterns
          const holidayMatches = cells[1].matchAll(/(\d+)일\s*([^,]+)/g);
          for (const m of holidayMatches) {
            const day = m[1].padStart(2, '0');
            standing.holidays[`2026-${mon}-${day}`] = m[2].trim();
          }
        }
      }
    }
    else if (/^Monthly\s*-\s*(\w+)/.test(firstLine)) {
      const monthName = firstLine.match(/Monthly\s*-\s*(\w+)/)[1];
      const monthMap = { January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',
        July:'07',August:'08',September:'09',October:'10',November:'11',December:'12' };
      const monthNum = monthMap[monthName] || '01';
      const ym = `2026-${monthNum}`;
      const items = parseListItems(body);
      if (items.length) standing.monthly[ym] = items;
    }
    else if (firstLine === 'Yearly') {
      const lines = body.split('\n').filter(l => l.trim().startsWith('-'));
      for (const line of lines) {
        const text = line.replace(/^-\s*(\[.\]\s*)?/, '').trim();
        const monthMatch = text.match(/^(\d+)월\s/);
        if (monthMatch) {
          standing.yearly.push({ month: parseInt(monthMatch[1]), text: cleanHtml(text) });
        } else {
          standing.yearly.push({ month: 0, text: cleanHtml(text) });
        }
      }
    }
    else if (/Vision|Root/.test(firstLine)) {
      const visionMatch = body.match(/"([^"]+)"/);
      if (visionMatch) standing.vision = visionMatch[1];
      else standing.vision = body.split('\n')[0].trim();
    }
    else if (firstLine === 'Input') {
      const lines = body.split('\n').filter(l => l.trim().startsWith('-'));
      standing.input_backlog = lines.map(l => {
        const checkMatch = l.match(/\[([ xX])\]\s*(.+)/);
        if (checkMatch) return { text: cleanHtml(checkMatch[2]), done: checkMatch[1] !== ' ' };
        const text = l.replace(/^-\s*/, '').trim();
        return { text: cleanHtml(text), done: false };
      }).filter(i => i.text);
    }
    else if (/Instagram/.test(firstLine)) {
      const links = body.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      standing.instagram = links.map(l => {
        const m = l.match(/\[([^\]]+)\]\(([^)]+)\)/);
        return m ? { label: m[1], url: m[2] } : null;
      }).filter(Boolean);
    }
    // Skip CI구매 and Vision table for now
  }

  return standing;
}

function parseStandingItems(body) {
  return body.split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(l => cleanHtml(l.replace(/^-\s*/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()))
    .filter(Boolean);
}

function parseListItems(body) {
  const items = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      items.push(cleanHtml(trimmed.replace(/^[-*]\s*(\[.\]\s*)?/, '')));
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      items.push(cleanHtml(trimmed));
    } else if (trimmed && !trimmed.startsWith('>') && !trimmed.startsWith('|')) {
      items.push(cleanHtml(trimmed));
    }
  }
  return items.filter(Boolean);
}

// --- Main ---
function migrate(mdPath, targetMonth) {
  console.log(`Parsing: ${mdPath}`);
  const raw = readFileSync(mdPath, 'utf-8');
  const { tablePart, postPart } = splitSections(raw);

  // Parse tables → days
  const tableData = parseTables(tablePart);
  const monthData = { month: targetMonth, goals: tableData.goals, days: tableData.days };

  // Find which days belong to target month vs overflow
  // The .md may span multiple months (Week 23 crosses May→June)
  const monthNum = parseInt(targetMonth.split('-')[1]);
  const mainDays = {};
  const overflowDays = {}; // days that belong to next/prev month

  // In the original .md, days are numbered within their actual date
  // Week 23 (5/31-6/6) has day 31 (May) and days 1-6 (June)
  // But they're in the same file. We need to detect month boundaries.
  // Heuristic: if day numbers go 31→1, the 1 is next month
  let seenHigh = false;
  const sortedDays = Object.keys(tableData.days).map(Number).sort((a, b) => a - b);

  // Check for month rollover: if we see 31 then 1-6, the small numbers are overflow
  const hasRollover = sortedDays.some((d, i) => i > 0 && d < sortedDays[i - 1] - 10);

  if (hasRollover) {
    let rolledOver = false;
    let prevDay = 0;
    for (const d of sortedDays) {
      if (d < prevDay - 10) rolledOver = true;
      const key = String(d);
      if (rolledOver) {
        overflowDays[key] = tableData.days[key];
      } else {
        mainDays[key] = tableData.days[key];
      }
      prevDay = d;
    }
  } else {
    Object.assign(mainDays, tableData.days);
  }

  monthData.days = mainDays;

  // Parse post-table sections
  let standingOrders = null;
  if (postPart.trim()) {
    standingOrders = parsePostSections(postPart);
    console.log(`  Standing orders: ${standingOrders.standing.length} items`);
    console.log(`  Monthly sections: ${Object.keys(standingOrders.monthly).length}`);
    console.log(`  Yearly items: ${standingOrders.yearly.length}`);
    console.log(`  Happy Friday dates: ${standingOrders.happy_friday.length}`);
    console.log(`  Holidays: ${Object.keys(standingOrders.holidays).length}`);
    console.log(`  Input backlog: ${standingOrders.input_backlog.length}`);
    console.log(`  Instagram: ${standingOrders.instagram.length}`);
  }

  return { monthData, overflowDays, standingOrders };
}

// --- Run ---
const may = migrate('/tmp/original-2026-05.md', '2026-05');
const june = migrate('/tmp/original-2026-06.md', '2026-06');

// Merge May overflow days into June (days 1-6 from Week 23)
if (Object.keys(may.overflowDays).length > 0) {
  console.log(`\nMerging ${Object.keys(may.overflowDays).length} overflow days from May → June`);
  for (const [day, data] of Object.entries(may.overflowDays)) {
    if (!june.monthData.days[day]) {
      june.monthData.days[day] = data;
    } else {
      // Merge categories
      for (const cat of ['ritual', 'input', 'work', 'outcome']) {
        if (data[cat]) {
          june.monthData.days[day][cat] = [...(june.monthData.days[day][cat] || []), ...data[cat]];
        }
      }
    }
  }
}

// Save
console.log('\n--- Saving ---');

const mayPath = join(DATA_DIR, '2026-05.json');
const junePath = join(DATA_DIR, '2026-06.json');
const standingPath = join(DATA_DIR, 'standing-orders.json');

backup(mayPath);
backup(junePath);
backup(standingPath);

writeFileSync(mayPath, JSON.stringify(may.monthData, null, 2));
console.log(`May: ${Object.keys(may.monthData.days).length} days → ${mayPath}`);

writeFileSync(junePath, JSON.stringify(june.monthData, null, 2));
console.log(`June: ${Object.keys(june.monthData.days).length} days → ${junePath}`);

// Standing orders: merge from both files (May has the main sections)
const standing = may.standingOrders || june.standingOrders || { standing: [], monthly: {}, yearly: [], happy_friday: [], holidays: {}, vision: '', input_backlog: [], instagram: [] };
// Merge June standing if exists
if (june.standingOrders) {
  for (const [ym, items] of Object.entries(june.standingOrders.monthly)) {
    if (!standing.monthly[ym]) standing.monthly[ym] = items;
  }
}

writeFileSync(standingPath, JSON.stringify(standing, null, 2));
console.log(`Standing orders → ${standingPath}`);

// Verification
console.log('\n--- Verification ---');
let totalItems = 0;
for (const [day, dd] of Object.entries(may.monthData.days)) {
  for (const cat of ['ritual', 'input', 'work', 'outcome']) {
    totalItems += (dd[cat] || []).length;
  }
}
console.log(`May total items: ${totalItems}`);

totalItems = 0;
for (const [day, dd] of Object.entries(june.monthData.days)) {
  for (const cat of ['ritual', 'input', 'work', 'outcome']) {
    totalItems += (dd[cat] || []).length;
  }
}
console.log(`June total items: ${totalItems}`);

// Check Day 6 is clean (no blob)
const day6 = may.monthData.days['6'];
if (day6) {
  const outcomeTexts = (day6.outcome || []).map(i => i.text);
  const hasBlob = outcomeTexts.some(t => t.length > 200);
  console.log(`Day 6 blob check: ${hasBlob ? 'FAIL - blob still present' : 'PASS - clean'}`);
}
