#!/usr/bin/env node
/**
 * /dashboard CLI — analytics.jsonl 시각화
 * Phase 0 산출물 — team-roadmap.md
 *
 * 사용:
 *   npx tsx scripts/dashboard.mjs                      # 전체 (기본 30d)
 *   npx tsx scripts/dashboard.mjs --period=7d          # 7일
 *   npx tsx scripts/dashboard.mjs --module=design      # 모듈 필터 (skill prefix match)
 *   npx tsx scripts/dashboard.mjs --json               # JSON 출력
 *   npx tsx scripts/dashboard.mjs --health             # Module Health 표만
 *   npx tsx scripts/dashboard.mjs --file=path.jsonl    # 다른 analytics 파일
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = {};
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    flags[k] = v ?? true;
  }
}

const period = flags.period || '30d';
const moduleFilter = flags.module || null;
const jsonOut = flags.json === true;
const healthOnly = flags.health === true;
const file = flags.file || path.join(REPO_ROOT, '.context', 'analytics.jsonl');

// ── Load events ─────────────────────────────────────────────
if (!existsSync(file)) {
  console.error(`No analytics file: ${file}`);
  console.log('🟡 No usage data yet. Modules report via lib/analytics.ts logEvent() / logMarketingEvent() / logDesignAudit().');
  process.exit(0);
}

const events = readFileSync(file, 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean)
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

// ── Filter by period ────────────────────────────────────────
const periodMatch = period.match(/^(\d+)d$/);
let filtered = events;
let cutoff = null;
if (periodMatch) {
  const days = parseInt(periodMatch[1], 10);
  cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  filtered = events.filter(e => new Date(e.ts) >= cutoff);
}

if (moduleFilter) {
  filtered = filtered.filter(e => (e.skill || '').includes(moduleFilter) || (e.event || '').includes(moduleFilter));
}

// ── Aggregate ───────────────────────────────────────────────
const bySkill = {};
const byEvent = {};
const byRepo = {};
const lastSeen = {}; // skill → ts

for (const e of filtered) {
  const skill = e.skill || '?';
  const event = e.event || '(no event)';
  const repo = e.repo || '?';
  bySkill[skill] = (bySkill[skill] || 0) + 1;
  byEvent[event] = (byEvent[event] || 0) + 1;
  byRepo[repo] = (byRepo[repo] || 0) + 1;
  if (!lastSeen[skill] || e.ts > lastSeen[skill]) lastSeen[skill] = e.ts;
}

// ── Module Health (team-roadmap modules) ───────────────────
const ROADMAP_MODULES = {
  // Phase 0 메타
  'session': { phase: 0, kind: 'meta' },
  // Phase 1 BI
  'bi': { phase: 1, kind: 'bi', match: e => e.event?.startsWith('bi_') },
  // Phase 2 인텔리전스
  'intelligence': { phase: 2, kind: 'intelligence', match: e => e.event?.startsWith('intelligence_') },
  // Phase 3 마케팅
  'marketing-research': { phase: 3, kind: 'marketing' },
  'marketing-generate': { phase: 3, kind: 'marketing' },
  'marketing-repurpose': { phase: 3, kind: 'marketing' },
  'marketing-publish': { phase: 3, kind: 'marketing' },
  'marketing-analytics': { phase: 3, kind: 'marketing' },
  // Phase 4 디자인
  'design-auditor': { phase: 4, kind: 'design' },
  'design-brief': { phase: 4, kind: 'design' },
  'design-generate': { phase: 4, kind: 'design' },
  'design-thumbnail': { phase: 4, kind: 'design' },
  // Phase 5 QA
  'qa': { phase: 5, kind: 'qa' },
  // 자율 인프라
  'sleep-resume': { phase: 0, kind: 'infra' },
  'ralph': { phase: 0, kind: 'infra' },
};

const health = [];
const now = Date.now();
for (const [name, meta] of Object.entries(ROADMAP_MODULES)) {
  const matched = filtered.filter(e =>
    e.skill === name || (meta.match && meta.match(e))
  );
  const last = matched.length ? new Date(matched[matched.length - 1].ts) : null;
  const ageHours = last ? Math.floor((now - last.getTime()) / (1000 * 60 * 60)) : null;
  const status = matched.length === 0 ? '❌ unused'
    : ageHours < 24 ? '✅ active'
    : ageHours < 24 * 7 ? '🟡 weekly'
    : ageHours < 24 * 14 ? '🟠 stale'
    : '🔴 abandoned';
  health.push({
    module: name,
    phase: meta.phase,
    kind: meta.kind,
    count: matched.length,
    last: last ? last.toISOString().slice(0, 10) : '—',
    age_hours: ageHours,
    status,
  });
}

// ── Output ─────────────────────────────────────────────────
if (jsonOut) {
  console.log(JSON.stringify({ period, cutoff, totalEvents: filtered.length, bySkill, byEvent, byRepo, health }, null, 2));
  process.exit(0);
}

const fmt = (k, v) => `  ${k.padEnd(28)} ${String(v).padStart(6)}`;

console.log(`📊 A-Team Analytics Dashboard — period=${period} ${moduleFilter ? `module=${moduleFilter}` : ''}`);
console.log(`   File: ${path.relative(REPO_ROOT, file)}`);
console.log(`   Total events: ${filtered.length} (of ${events.length} all-time)`);
console.log();

if (!healthOnly) {
  console.log('── By Skill ──');
  for (const [k, v] of Object.entries(bySkill).sort((a, b) => b[1] - a[1])) {
    console.log(fmt(k, v));
  }
  console.log();

  console.log('── By Event ──');
  for (const [k, v] of Object.entries(byEvent).sort((a, b) => b[1] - a[1])) {
    console.log(fmt(k, v));
  }
  console.log();

  console.log('── By Repo ──');
  for (const [k, v] of Object.entries(byRepo).sort((a, b) => b[1] - a[1])) {
    console.log(fmt(k, v));
  }
  console.log();
}

console.log('── 🎯 Module Health (team-roadmap.md) ──');
console.log('  Module                       Phase  Count  Last        Status');
console.log('  ' + '─'.repeat(72));
for (const h of health.sort((a, b) => a.phase - b.phase || b.count - a.count)) {
  console.log(`  ${h.module.padEnd(28)} P${h.phase}     ${String(h.count).padStart(5)}  ${h.last.padEnd(10)}  ${h.status}`);
}
console.log();

const unused = health.filter(h => h.count === 0);
const stale = health.filter(h => h.status === '🟠 stale' || h.status === '🔴 abandoned');
if (unused.length > 0) {
  console.log(`⚠️  Unused (${unused.length}): ${unused.map(h => h.module).join(', ')}`);
  console.log('   → Build pending OR Gate not yet attempted. team-roadmap.md 참조.');
}
if (stale.length > 0) {
  console.log(`🟠 Stale ≥ 14d (${stale.length}): ${stale.map(h => h.module).join(', ')}`);
  console.log('   → 회고 트리거. .context/retros/_template.md 사용.');
}

process.exit(0);
