#!/usr/bin/env node
/**
 * cortex-growth-snapshot.mjs — T4 Growth System analytics 연동
 *
 * D1(cortex-ritual-db)에서 월별 데이터를 직접 조회해 growth 스냅샷을
 * .context/analytics.jsonl에 emit한다.
 *
 * Usage:
 *   node scripts/cortex-growth-snapshot.mjs [YYYY-MM]
 *   node scripts/cortex-growth-snapshot.mjs 2026-06
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, '..');
const LOG_PATH = resolve(REPO_ROOT, '.context', 'analytics.jsonl');
const WRANGLER_DIR = resolve(__dir, 'cortex-dashboard');
const DB_NAME = 'cortex-ritual-db';

const ym = process.argv[2] || new Date().toISOString().slice(0, 7);

// 추적 카테고리 (done/total 집계 대상)
const TRACKED_CATS = ['input', 'outcome', 'work', 'one_thing', 'hexagonal'];

function fetchFromD1(ym) {
  const sql = `SELECT data FROM ritual_data WHERE key = '${ym}'`;
  const out = execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --command "${sql}" --json`,
    { cwd: WRANGLER_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  // wrangler prepends a Cloudflare banner line — strip everything before the JSON array
  const jsonStart = out.indexOf('[');
  if (jsonStart === -1) throw new Error('No JSON array in wrangler output');
  const parsed = JSON.parse(out.slice(jsonStart));
  const results = parsed?.[0]?.results ?? [];
  if (!results.length) return null;
  return JSON.parse(results[0].data);
}

function computeStats(data) {
  const days = data.days || {};
  let total = 0, done = 0;
  const pillar = {};
  let lessonCount = 0;
  const activeDays = Object.keys(days).length;

  for (const [, dd] of Object.entries(days)) {
    for (const cat of TRACKED_CATS) {
      const items = dd[cat];
      if (!Array.isArray(items)) continue;
      if (!pillar[cat]) pillar[cat] = { done: 0, total: 0 };
      for (const item of items) {
        total++;
        pillar[cat].total++;
        if (item.done) {
          done++;
          pillar[cat].done++;
        }
        // T3 #lesson 태그 카운트
        if (typeof item.text === 'string' && /#lesson/i.test(item.text)) {
          lessonCount++;
        }
      }
    }
  }

  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  const pillarPct = Object.fromEntries(
    Object.entries(pillar).map(([k, v]) => [k, v.total > 0 ? Math.round(v.done / v.total * 100) : 0])
  );

  return { total, done, pct, pillar, pillarPct, lessonCount, activeDays };
}

function emit(event) {
  const logDir = dirname(LOG_PATH);
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify(event) + '\n');
}

try {
  const data = fetchFromD1(ym);
  if (!data) {
    console.log(`cortex-growth-snapshot: no data for ${ym}`);
    process.exit(0);
  }

  const stats = computeStats(data);

  const event = {
    event: 'cortex_growth_snapshot',
    ts: new Date().toISOString(),
    repo: 'A-Team',
    ym,
    activeDays: stats.activeDays,
    done: stats.done,
    total: stats.total,
    pct: stats.pct,
    lessonCount: stats.lessonCount,
    pillarPct: stats.pillarPct,
    pillar: stats.pillar,
  };

  emit(event);

  console.log(`cortex_growth_snapshot [${ym}]: ${stats.done}/${stats.total} (${stats.pct}%) | lessons: ${stats.lessonCount} | active_days: ${stats.activeDays}`);
  const pillarLine = Object.entries(stats.pillarPct).map(([k, v]) => `${k}:${v}%`).join(' ');
  if (pillarLine) console.log(`Pillar: ${pillarLine}`);
} catch (e) {
  console.error('cortex-growth-snapshot error:', e.message);
  process.exit(1);
}
