#!/usr/bin/env node
/**
 * anomaly-detect.mjs — Analytics 이상 감지 엔진
 *
 * Usage:
 *   node scripts/anomaly-detect.mjs                # 최근 7일 스캔
 *   node scripts/anomaly-detect.mjs --days 14      # 최근 14일
 *   node scripts/anomaly-detect.mjs --json         # JSON 출력
 *   node scripts/anomaly-detect.mjs --alert-only   # 이상만 출력
 *
 * 감지 시나리오:
 *   1. 모듈 사용 급감/급증 (z-score > 2)
 *   2. 디자인 품질 저하 (평균 score 10p+ 하락)
 *   3. 테스트 실패율 급등
 *   4. 세션 패턴 이상 (orphan start/end)
 *   5. 이벤트 공백 (48h+ 무이벤트)
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const ANALYTICS_PATH = resolve(ROOT, '.context/analytics.jsonl');
const LOG_EVENT = resolve(ROOT, 'scripts/log-event.mjs');

// --- CLI args ---
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const alertOnly = argv.includes('--alert-only');
const daysIdx = argv.indexOf('--days');
const WINDOW_DAYS = daysIdx !== -1 ? parseInt(argv[daysIdx + 1], 10) || 7 : 7;

// --- Parse JSONL ---
function parseJSONL(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// --- Stats helpers ---
function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1));
}

function zScore(value, m, sd) {
  return sd === 0 ? 0 : (value - m) / sd;
}

// --- Time helpers ---
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function weekKey(ts) {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

// --- Main detection ---
function detectAnomalies(events) {
  const anomalies = [];
  const now = new Date();
  const windowStart = daysAgo(WINDOW_DAYS);
  const prevWindowStart = daysAgo(WINDOW_DAYS * 2);

  const getTs = e => new Date(e.ts || e.timestamp);
  const current = events.filter(e => { const t = getTs(e); return !isNaN(t) && t >= windowStart; });
  const previous = events.filter(e => {
    const t = getTs(e);
    return !isNaN(t) && t >= prevWindowStart && t < windowStart;
  });

  // 1. Module usage spike/drop (WoW comparison)
  const curByModule = groupBy(current, e => e.skill || e.event || 'unknown');
  const prevByModule = groupBy(previous, e => e.skill || e.event || 'unknown');
  const allModules = new Set([...Object.keys(curByModule), ...Object.keys(prevByModule)]);

  for (const mod of allModules) {
    const curCount = (curByModule[mod] || []).length;
    const prevCount = (prevByModule[mod] || []).length;

    if (prevCount >= 3 && curCount === 0) {
      anomalies.push({
        type: 'module_usage_drop',
        severity: 'warning',
        module: mod,
        detail: `${mod}: ${prevCount}건 → 0건 (전 기간 대비 완전 중단)`,
        current: curCount,
        previous: prevCount,
      });
    } else if (prevCount >= 3 && curCount >= prevCount * 3) {
      anomalies.push({
        type: 'module_usage_spike',
        severity: 'info',
        module: mod,
        detail: `${mod}: ${prevCount}건 → ${curCount}건 (3x+ 급증)`,
        current: curCount,
        previous: prevCount,
      });
    }
  }

  // 2. Design quality degradation
  const curDesign = current.filter(e => e.event === 'design_audit' && typeof e.designScore === 'number');
  const prevDesign = previous.filter(e => e.event === 'design_audit' && typeof e.designScore === 'number');

  if (curDesign.length >= 3 && prevDesign.length >= 3) {
    const curAvg = mean(curDesign.map(e => e.designScore));
    const prevAvg = mean(prevDesign.map(e => e.designScore));
    const delta = curAvg - prevAvg;

    if (delta <= -10) {
      anomalies.push({
        type: 'design_quality_drop',
        severity: 'warning',
        detail: `디자인 점수 평균 ${prevAvg.toFixed(1)} → ${curAvg.toFixed(1)} (${delta.toFixed(1)}p 하락)`,
        current_avg: Math.round(curAvg * 10) / 10,
        previous_avg: Math.round(prevAvg * 10) / 10,
      });
    }

    // A11y violation spike
    const curA11y = curDesign.filter(e => e.designA11yViolations > 0).length;
    const prevA11y = prevDesign.filter(e => e.designA11yViolations > 0).length;
    const curA11yRate = curA11y / curDesign.length;
    const prevA11yRate = prevDesign.length > 0 ? prevA11y / prevDesign.length : 0;

    if (curA11yRate > 0.3 && curA11yRate > prevA11yRate * 2) {
      anomalies.push({
        type: 'a11y_violation_spike',
        severity: 'critical',
        detail: `A11y 위반 비율 ${(prevA11yRate * 100).toFixed(0)}% → ${(curA11yRate * 100).toFixed(0)}%`,
        current_rate: Math.round(curA11yRate * 100) / 100,
        previous_rate: Math.round(prevA11yRate * 100) / 100,
      });
    }
  }

  // 3. Test failure rate spike
  const curQA = current.filter(e => e.event === 'qa_run');
  if (curQA.length >= 2) {
    const failRates = curQA
      .filter(e => typeof e.qaTestsTotal === 'number' && e.qaTestsTotal > 0)
      .map(e => 1 - (e.qaTestsPassed / e.qaTestsTotal));
    const avgFail = mean(failRates);
    if (avgFail > 0.1) {
      anomalies.push({
        type: 'test_failure_spike',
        severity: 'critical',
        detail: `테스트 실패율 평균 ${(avgFail * 100).toFixed(1)}% (임계값 10%)`,
        avg_failure_rate: Math.round(avgFail * 1000) / 1000,
      });
    }
  }

  // 4. Session pattern anomalies (orphan events)
  const starts = current.filter(e => e.event === 'session_start').length;
  const ends = current.filter(e => e.event === 'session_end').length;
  if (starts > 0 && ends > 0 && Math.abs(starts - ends) > Math.max(starts, ends) * 0.5) {
    anomalies.push({
      type: 'session_mismatch',
      severity: 'info',
      detail: `세션 start ${starts}건 vs end ${ends}건 (50%+ 불일치)`,
      starts,
      ends,
    });
  }

  // 5. Event gap detection (48h+ without any event)
  if (events.length >= 5) {
    const sorted = events
      .map(e => new Date(e.ts).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);

    let maxGap = 0;
    let gapStart = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = sorted[i - 1];
      }
    }

    const GAP_THRESHOLD = 48 * 60 * 60 * 1000;
    if (maxGap > GAP_THRESHOLD) {
      const gapDays = (maxGap / (24 * 60 * 60 * 1000)).toFixed(1);
      anomalies.push({
        type: 'event_gap',
        severity: 'info',
        detail: `최대 이벤트 공백 ${gapDays}일 (${new Date(gapStart).toISOString().slice(0, 10)} 이후)`,
        gap_hours: Math.round(maxGap / 3600000),
        gap_start: new Date(gapStart).toISOString(),
      });
    }
  }

  // 6. Daily volume z-score anomaly
  const byDay = {};
  for (const e of events) {
    const dk = dayKey(e.ts || e.timestamp);
    if (!dk) continue;
    byDay[dk] = (byDay[dk] || 0) + 1;
  }
  const dailyCounts = Object.values(byDay);
  if (dailyCounts.length >= 7) {
    const m = mean(dailyCounts);
    const sd = stddev(dailyCounts);
    const recentDays = Object.entries(byDay)
      .filter(([d]) => new Date(d) >= windowStart)
      .sort(([a], [b]) => b.localeCompare(a));

    for (const [day, count] of recentDays.slice(0, 3)) {
      const z = zScore(count, m, sd);
      if (Math.abs(z) > 2.5) {
        anomalies.push({
          type: z > 0 ? 'daily_volume_spike' : 'daily_volume_drop',
          severity: Math.abs(z) > 3 ? 'warning' : 'info',
          detail: `${day}: ${count}건 (z=${z.toFixed(1)}, 평균=${m.toFixed(1)})`,
          day,
          count,
          z_score: Math.round(z * 10) / 10,
          mean: Math.round(m * 10) / 10,
        });
      }
    }
  }

  return anomalies;
}

function groupBy(arr, fn) {
  const map = {};
  for (const item of arr) {
    const key = fn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

// --- Summary generation ---
function generateSummary(anomalies, events) {
  const byType = groupBy(anomalies, a => a.type);
  const bySeverity = groupBy(anomalies, a => a.severity);

  return {
    scan_window_days: WINDOW_DAYS,
    total_events_scanned: events.length,
    anomalies_found: anomalies.length,
    by_severity: {
      critical: (bySeverity.critical || []).length,
      warning: (bySeverity.warning || []).length,
      info: (bySeverity.info || []).length,
    },
    anomalies,
    scanned_at: new Date().toISOString(),
  };
}

// --- Output ---
function formatText(summary) {
  const lines = [];
  lines.push(`\n=== Anomaly Detection Report ===`);
  lines.push(`Scan window: ${summary.scan_window_days} days | Events: ${summary.total_events_scanned}`);
  lines.push(`Found: ${summary.anomalies_found} anomalies (${summary.by_severity.critical} critical, ${summary.by_severity.warning} warning, ${summary.by_severity.info} info)\n`);

  if (summary.anomalies.length === 0) {
    lines.push('No anomalies detected.');
  } else {
    const severityIcon = { critical: '[CRIT]', warning: '[WARN]', info: '[INFO]' };
    for (const a of summary.anomalies) {
      const icon = severityIcon[a.severity] || '[????]';
      lines.push(`${icon} ${a.detail}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// --- Main ---
const events = parseJSONL(ANALYTICS_PATH);
const anomalies = detectAnomalies(events);
const summary = generateSummary(anomalies, events);

if (jsonMode) {
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  const text = formatText(summary);
  if (alertOnly && anomalies.length === 0) {
    // silent
  } else {
    process.stdout.write(text);
  }
}

// Emit analytics event for the scan itself
if (existsSync(LOG_EVENT)) {
  try {
    const logLine = JSON.stringify({
      skill: 'anomaly-detect',
      event: 'bi_anomaly_detected',
      ts: new Date().toISOString(),
      repo: 'a-team',
      biAnomalyMagnitude: anomalies.filter(a => a.severity === 'critical').length,
      anomalyCount: anomalies.length,
    });
    appendFileSync(resolve(ROOT, '.context/analytics.jsonl'), logLine + '\n');
  } catch { /* graceful degrade */ }
}

process.exit(anomalies.some(a => a.severity === 'critical') ? 1 : 0);
