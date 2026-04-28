#!/usr/bin/env node
/**
 * insights-aggregate.mjs — Step 1+2: 데이터 집계 + 패턴 감지
 * Usage: node scripts/insights-aggregate.mjs [--weeks-ago N]
 * Output: JSON to stdout
 */

import { readFileSync, existsSync } from 'fs';

// --- KST week range ---
function getKSTWeekRange(weeksAgo = 0) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;

  const start = new Date(kst);
  start.setUTCDate(kst.getUTCDate() - daysToMonday - weeksAgo * 7);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return { start, end };
}

function getISOWeekLabel(date) {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// --- Parse JSONL ---
function parseJSONL(path) {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch (e) {
    process.stderr.write(`[warn] Failed to read ${path}: ${e.message}\n`);
    return [];
  }
}

// --- Aggregate analytics events for a week range ---
function aggregateAnalytics(events, weekRange) {
  const filtered = events.filter(e => {
    const ts = new Date(e.ts);
    return ts >= weekRange.start && ts < weekRange.end;
  });

  const byModule = {};
  for (const e of filtered) {
    const mod = e.skill || e.module || 'unknown';
    if (!byModule[mod]) {
      byModule[mod] = { count: 0, scores: [], pass_count: 0, fail_count: 0 };
    }
    byModule[mod].count++;
    if (typeof e.designScore === 'number') byModule[mod].scores.push(e.designScore);
    if (e.designPassed === true) byModule[mod].pass_count++;
    if (e.designPassed === false) byModule[mod].fail_count++;
  }

  const result = {};
  for (const [mod, d] of Object.entries(byModule)) {
    const total_judged = d.pass_count + d.fail_count;
    result[mod] = {
      count: d.count,
      avg_score: d.scores.length > 0
        ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length)
        : null,
      pass_rate: total_judged > 0 ? Math.round((d.pass_count / total_judged) * 100) / 100 : null,
      fail_count: d.fail_count,
    };
  }
  return result;
}

// --- Aggregate friction (all-time) ---
function aggregateFriction(events) {
  const byPath = {};
  for (const e of events) {
    const path = e.capability_path || 'unknown';
    byPath[path] = (byPath[path] || 0) + 1;
  }
  return byPath;
}

// --- Capability snapshot ---
function snapshotCapability(path) {
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const snap = {};
    for (const [dept, info] of Object.entries(raw.departments || {})) {
      snap[dept] = {};
      for (const [cap, data] of Object.entries(info.capabilities || {})) {
        snap[dept][cap] = data.coverage ?? null;
      }
    }
    return snap;
  } catch (e) {
    process.stderr.write(`[warn] Failed to parse capability-map: ${e.message}\n`);
    return {};
  }
}

// --- Pattern detection ---
function detectPatterns(cur, prev) {
  const flags = [];

  for (const [mod, d] of Object.entries(cur)) {
    if (d.pass_rate !== null && d.pass_rate < 0.5) {
      flags.push({ type: 'high_failure', module: mod, pass_rate: d.pass_rate, fail_count: d.fail_count });
    }
  }

  if (prev) {
    for (const mod of Object.keys(prev)) {
      if (!cur[mod] || cur[mod].count === 0) {
        flags.push({ type: 'no_usage', module: mod, note: '전주 사용 있었으나 이번 주 0회' });
      }
    }
  }

  return flags;
}

// --- Main ---
const weeksAgo = (() => {
  const idx = process.argv.indexOf('--weeks-ago');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) || 0 : 0;
})();

const currentRange = getKSTWeekRange(weeksAgo);
const prevRange = getKSTWeekRange(weeksAgo + 1);
const weekLabel = getISOWeekLabel(currentRange.start);

const analyticsEvents = parseJSONL('.context/analytics.jsonl');
const frictionEvents = parseJSONL('.context/friction-log.jsonl');

const aggregate = aggregateAnalytics(analyticsEvents, currentRange);
const prevAggregate = aggregateAnalytics(analyticsEvents, prevRange);
const friction = aggregateFriction(frictionEvents);
const capability = snapshotCapability('lib/capability-map.json');

const topFriction = Object.entries(friction)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([path, count]) => ({ path, count }));

const wow = {};
for (const mod of new Set([...Object.keys(aggregate), ...Object.keys(prevAggregate)])) {
  wow[mod] = {
    count_delta: (aggregate[mod]?.count ?? 0) - (prevAggregate[mod]?.count ?? 0),
    pass_rate_delta: (aggregate[mod]?.pass_rate != null && prevAggregate[mod]?.pass_rate != null)
      ? Math.round((aggregate[mod].pass_rate - prevAggregate[mod].pass_rate) * 100) / 100
      : null,
  };
}

const patterns = detectPatterns(aggregate, prevAggregate);

const totalEvents = analyticsEvents.filter(e => {
  const ts = new Date(e.ts);
  return ts >= currentRange.start && ts < currentRange.end;
}).length;

process.stdout.write(JSON.stringify({
  week: weekLabel,
  week_range: {
    start: currentRange.start.toISOString(),
    end: currentRange.end.toISOString(),
  },
  total_events: totalEvents,
  aggregate,
  prev_aggregate: prevAggregate,
  wow,
  friction,
  top_friction: topFriction,
  capability_snapshot: capability,
  patterns,
  generated_at: new Date().toISOString(),
}, null, 2) + '\n');
