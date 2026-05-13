#!/usr/bin/env node
/**
 * weekly-report.mjs — 자동 주간 리포트 생성
 *
 * Usage:
 *   node scripts/weekly-report.mjs                  # 지난 주 리포트
 *   node scripts/weekly-report.mjs --weeks-ago 0    # 이번 주
 *   node scripts/weekly-report.mjs --json           # JSON 출력
 *   node scripts/weekly-report.mjs --save           # .context/insights/ 에 저장
 *
 * 통합 데이터: analytics.jsonl + anomaly-detect + capability-map
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const ANALYTICS_PATH = resolve(ROOT, '.context/analytics.jsonl');
const CAPABILITY_PATH = resolve(ROOT, 'lib/capability-map.json');
const INSIGHTS_DIR = resolve(ROOT, '.context/insights');

// --- CLI ---
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const saveMode = argv.includes('--save');
const waIdx = argv.indexOf('--weeks-ago');
const weeksAgo = waIdx !== -1 ? parseInt(argv[waIdx + 1], 10) || 1 : 1;

// --- Time ---
function getKSTWeekRange(wa = 0) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(kst);
  start.setUTCDate(kst.getUTCDate() - daysToMonday - wa * 7);
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
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// --- Parse ---
function parseJSONL(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function safeJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

// --- Aggregate ---
function aggregate(events, range) {
  const filtered = events.filter(e => {
    const t = new Date(e.ts || e.timestamp);
    return !isNaN(t) && t >= range.start && t < range.end;
  });

  const byEvent = {};
  const bySkill = {};
  for (const e of filtered) {
    const ev = e.event || 'unknown';
    const sk = e.skill || 'unknown';
    byEvent[ev] = (byEvent[ev] || 0) + 1;
    bySkill[sk] = (bySkill[sk] || 0) + 1;
  }

  // Design stats
  const designEvents = filtered.filter(e => e.event === 'design_audit' && typeof e.designScore === 'number');
  const designScores = designEvents.map(e => e.designScore);
  const designAvg = designScores.length > 0
    ? Math.round(designScores.reduce((a, b) => a + b, 0) / designScores.length)
    : null;
  const designPassRate = designEvents.length > 0
    ? Math.round(designEvents.filter(e => e.designPassed).length / designEvents.length * 100)
    : null;

  // Session stats
  const sessions = filtered.filter(e => e.event === 'session_end');

  return {
    total: filtered.length,
    byEvent,
    bySkill,
    design: { count: designEvents.length, avgScore: designAvg, passRate: designPassRate },
    sessions: sessions.length,
  };
}

// --- Capability summary ---
function capabilitySummary() {
  const cap = safeJSON(CAPABILITY_PATH);
  if (!cap?.departments) return null;

  const depts = {};
  let totalWeighted = 0;
  let totalWeight = 0;

  for (const [dept, info] of Object.entries(cap.departments)) {
    const caps = Object.entries(info.capabilities || {});
    const coverages = caps.map(([, d]) => d.coverage ?? 0);
    const avg = coverages.length > 0
      ? Math.round(coverages.reduce((a, b) => a + b, 0) / coverages.length * 100) / 100
      : 0;
    const gaps = caps.filter(([, d]) => (d.coverage ?? 0) < 0.3).map(([name]) => name);
    const weight = info.weight || 0;

    depts[dept] = { avg, gaps, weight };
    totalWeighted += avg * weight;
    totalWeight += weight;
  }

  return {
    departments: depts,
    weighted_avg: totalWeight > 0 ? Math.round(totalWeighted / totalWeight * 100) : 0,
  };
}

// --- Anomaly detection ---
function runAnomalyDetect(days) {
  try {
    const out = execSync(`node scripts/anomaly-detect.mjs --json --days ${days}`, {
      cwd: ROOT, encoding: 'utf8', timeout: 10000,
    });
    return JSON.parse(out);
  } catch (e) {
    if (e.stdout) {
      try { return JSON.parse(e.stdout); } catch { /* fall through */ }
    }
    return null;
  }
}

// --- Report generation ---
function generateMarkdown(weekLabel, cur, prev, anomalyReport, capSummary) {
  const lines = [];
  lines.push(`# Weekly Report — ${weekLabel}`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 19)}Z\n`);

  // Overview
  lines.push('## Overview');
  lines.push(`| Metric | This Week | Prev Week | Delta |`);
  lines.push(`|--------|-----------|-----------|-------|`);
  lines.push(`| Events | ${cur.total} | ${prev.total} | ${cur.total - prev.total > 0 ? '+' : ''}${cur.total - prev.total} |`);
  lines.push(`| Sessions | ${cur.sessions} | ${prev.sessions} | ${cur.sessions - prev.sessions > 0 ? '+' : ''}${cur.sessions - prev.sessions} |`);
  if (cur.design.count > 0) {
    lines.push(`| Design Audits | ${cur.design.count} | ${prev.design.count} | ${cur.design.count - prev.design.count > 0 ? '+' : ''}${cur.design.count - prev.design.count} |`);
    lines.push(`| Design Avg Score | ${cur.design.avgScore ?? '-'} | ${prev.design.avgScore ?? '-'} | ${cur.design.avgScore && prev.design.avgScore ? (cur.design.avgScore - prev.design.avgScore > 0 ? '+' : '') + (cur.design.avgScore - prev.design.avgScore) : '-'} |`);
    lines.push(`| Design Pass Rate | ${cur.design.passRate ?? '-'}% | ${prev.design.passRate ?? '-'}% | ${cur.design.passRate && prev.design.passRate ? (cur.design.passRate - prev.design.passRate > 0 ? '+' : '') + (cur.design.passRate - prev.design.passRate) + 'p' : '-'} |`);
  }
  lines.push('');

  // Event breakdown
  lines.push('## Event Breakdown');
  lines.push('| Event | Count |');
  lines.push('|-------|-------|');
  for (const [ev, count] of Object.entries(cur.byEvent).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${ev} | ${count} |`);
  }
  lines.push('');

  // Business KPIs
  const revenue = safeJSON(resolve(ROOT, '.context/revenue.json'));
  if (revenue) {
    lines.push('## Business KPIs');
    lines.push('| KPI | Value | Prev | Trend |');
    lines.push('|-----|-------|------|-------|');
    if (revenue.mrr != null) lines.push(`| MRR | $${revenue.mrr} | $${revenue.prev_mrr ?? '-'} | ${revenue.mrr > (revenue.prev_mrr ?? 0) ? '📈' : revenue.mrr < (revenue.prev_mrr ?? 0) ? '📉' : '➡️'} |`);
    if (revenue.arr != null) lines.push(`| ARR | $${revenue.arr} | - | - |`);
    if (revenue.customers != null) lines.push(`| Customers | ${revenue.customers} | ${revenue.prev_customers ?? '-'} | ${revenue.customers > (revenue.prev_customers ?? 0) ? '📈' : '➡️'} |`);
    if (revenue.churn_rate != null) lines.push(`| Churn Rate | ${(revenue.churn_rate * 100).toFixed(1)}% | - | ${revenue.churn_rate > 0.05 ? '🔴' : '🟢'} |`);
    if (revenue.published_content != null) lines.push(`| Published Content | ${revenue.published_content} | - | - |`);
    lines.push('');
  } else {
    lines.push('## Business KPIs');
    lines.push('*No revenue data yet. Create `.context/revenue.json` when first revenue arrives:*');
    lines.push('```json');
    lines.push('{"mrr":0,"arr":0,"customers":0,"churn_rate":null,"prev_mrr":0,"prev_customers":0,"published_content":0}');
    lines.push('```');
    lines.push('');
  }

  // Anomalies
  if (anomalyReport && anomalyReport.anomalies_found > 0) {
    lines.push('## Anomalies');
    lines.push(`Found ${anomalyReport.anomalies_found} (${anomalyReport.by_severity.critical} critical, ${anomalyReport.by_severity.warning} warning, ${anomalyReport.by_severity.info} info)\n`);
    const icon = { critical: '**[CRIT]**', warning: '[WARN]', info: '[INFO]' };
    for (const a of anomalyReport.anomalies) {
      lines.push(`- ${icon[a.severity] || '[????]'} ${a.detail}`);
    }
    lines.push('');
  }

  // Capability coverage
  if (capSummary) {
    lines.push('## Capability Coverage');
    lines.push(`**Weighted Average: ${capSummary.weighted_avg}%**\n`);
    lines.push('| Department | Avg | Weight | Top Gaps |');
    lines.push('|------------|-----|--------|----------|');
    for (const [dept, info] of Object.entries(capSummary.departments)) {
      const gapStr = info.gaps.length > 0 ? info.gaps.slice(0, 3).join(', ') : '-';
      lines.push(`| ${dept} | ${Math.round(info.avg * 100)}% | ${Math.round(info.weight * 100)}% | ${gapStr} |`);
    }
    lines.push('');
  }

  // Recommendations
  lines.push('## Recommendations');
  const recs = [];
  if (anomalyReport?.anomalies?.some(a => a.severity === 'critical')) {
    recs.push('- Critical anomalies detected — investigate immediately');
  }
  if (capSummary) {
    const weakest = Object.entries(capSummary.departments)
      .filter(([, d]) => d.weight >= 0.1)
      .sort((a, b) => a[1].avg - b[1].avg)[0];
    if (weakest) {
      recs.push(`- Weakest department: **${weakest[0]}** (${Math.round(weakest[1].avg * 100)}%) — prioritize gaps: ${weakest[1].gaps.slice(0, 2).join(', ') || 'none identified'}`);
    }
  }
  if (cur.total === 0) {
    recs.push('- No events this week — check analytics pipeline');
  }
  if (recs.length === 0) recs.push('- No urgent actions needed');
  lines.push(recs.join('\n'));
  lines.push('');

  return lines.join('\n');
}

// --- Main ---
const range = getKSTWeekRange(weeksAgo);
const prevRange = getKSTWeekRange(weeksAgo + 1);
const weekLabel = getISOWeekLabel(range.start);

const events = parseJSONL(ANALYTICS_PATH);
const cur = aggregate(events, range);
const prev = aggregate(events, prevRange);
const anomalyReport = runAnomalyDetect(7);
const capSummary = capabilitySummary();

if (jsonMode) {
  process.stdout.write(JSON.stringify({
    week: weekLabel,
    current: cur,
    previous: prev,
    anomalies: anomalyReport,
    capability: capSummary,
    generated_at: new Date().toISOString(),
  }, null, 2) + '\n');
} else {
  const md = generateMarkdown(weekLabel, cur, prev, anomalyReport, capSummary);

  if (saveMode) {
    mkdirSync(INSIGHTS_DIR, { recursive: true });
    const filePath = resolve(INSIGHTS_DIR, `${weekLabel}-report.md`);
    writeFileSync(filePath, md, 'utf8');
    console.log(`Report saved: .context/insights/${weekLabel}-report.md`);
    console.log(`Events: ${cur.total} | Anomalies: ${anomalyReport?.anomalies_found ?? 0}`);
  } else {
    process.stdout.write(md);
  }
}

// Log report generation event
try {
  appendFileSync(resolve(ROOT, '.context/analytics.jsonl'), JSON.stringify({
    skill: 'weekly-report',
    event: 'bi_insight_generated',
    ts: new Date().toISOString(),
    repo: 'a-team',
    biInsightCount: 1,
  }) + '\n');
} catch { /* graceful degrade */ }
