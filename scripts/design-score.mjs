#!/usr/bin/env node
/**
 * Design Score — 디자인 품질 피드백 수집 + 기록
 *
 * UI 빌드 후 호출. 스크린샷 저장 + 평가 점수 로깅.
 * design-learn.mjs가 이 데이터를 집계하여 패턴 감지 + 토큰 조정 제안.
 *
 * Usage:
 *   node scripts/design-score.mjs <screenshot-path> [--project <name>] [--component <name>]
 *   node scripts/design-score.mjs --url http://localhost:3000 [--component Dashboard]
 *   node scripts/design-score.mjs --list          # 최근 점수 출력
 *   node scripts/design-score.mjs --trend          # 주간 트렌드
 *   node scripts/design-score.mjs --json           # JSON 출력
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, basename, extname } from 'path';

const args = process.argv.slice(2);
const SCORE_FILE = join(process.cwd(), '.context', 'design-scores.jsonl');
const SNAPSHOT_DIR = join(process.cwd(), '.design-snapshots');

// ── Flags ──
const flagList = args.includes('--list');
const flagTrend = args.includes('--trend');
const flagJson = args.includes('--json');
const flagUrl = args.includes('--url') ? args[args.indexOf('--url') + 1] : null;
const flagProject = args.includes('--project') ? args[args.indexOf('--project') + 1] : basename(process.cwd());
const flagComponent = args.includes('--component') ? args[args.indexOf('--component') + 1] : 'page';
const screenshotPath = args.find(a => !a.startsWith('--') && (a.endsWith('.png') || a.endsWith('.jpg') || a.endsWith('.webp')));

// ── List mode ──
if (flagList || flagTrend) {
  if (!existsSync(SCORE_FILE)) {
    console.log('  No design scores recorded yet.');
    process.exit(0);
  }
  const lines = readFileSync(SCORE_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  if (flagTrend) {
    // Weekly trend
    const weeks = {};
    for (const e of entries) {
      const d = new Date(e.ts);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(e.scores.overall);
    }
    console.log('\n  Design Quality Trend');
    console.log('  ' + '─'.repeat(40));
    for (const [week, scores] of Object.entries(weeks).sort()) {
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      const bar = '█'.repeat(Math.round(avg));
      console.log(`  ${week}  ${bar} ${avg}/5 (${scores.length} evals)`);
    }
    console.log('');
  } else {
    // Recent list
    const recent = entries.slice(-10);
    console.log('\n  Recent Design Scores');
    console.log('  ' + '─'.repeat(50));
    for (const e of recent) {
      const date = e.ts.slice(0, 10);
      const s = e.scores;
      console.log(`  ${date}  ${e.project}/${e.component}  L:${s.layout} T:${s.typography} O:${s.overall}  ${e.feedback || ''}`);
    }
    console.log('');
  }
  process.exit(0);
}

// ── Capture mode ──
async function captureUrl(url) {
  // Try Playwright MCP first, fallback to manual
  const { execSync } = await import('child_process');
  const date = new Date().toISOString().slice(0, 10);
  const outPath = join(SNAPSHOT_DIR, `${date}-${flagComponent}.png`);
  mkdirSync(SNAPSHOT_DIR, { recursive: true });

  try {
    // Try playwright screenshot
    execSync(
      `npx playwright screenshot --viewport-size="1440,900" "${url}" "${outPath}"`,
      { timeout: 30000, stdio: 'pipe' }
    );
    console.log(`  Screenshot: ${outPath}`);
    return outPath;
  } catch {
    console.log(`  Playwright unavailable. Please provide screenshot path manually.`);
    console.log(`  Usage: node scripts/design-score.mjs <screenshot.png>`);
    return null;
  }
}

async function main() {
  let snapshot = screenshotPath;

  if (flagUrl) {
    snapshot = await captureUrl(flagUrl);
    if (!snapshot) process.exit(1);
  } else if (snapshot) {
    // Copy to snapshots dir
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const dest = join(SNAPSHOT_DIR, `${date}-${flagComponent}${extname(snapshot)}`);
    try {
      copyFileSync(snapshot, dest);
      snapshot = dest;
    } catch {
      // Keep original path
    }
  }

  // Build score entry
  const entry = {
    ts: new Date().toISOString(),
    project: flagProject,
    component: flagComponent,
    snapshot: snapshot || null,
    scores: {
      layout: null,    // 1-5: 여백, 정렬, 그리드
      typography: null, // 1-5: 폰트 위계, 가독성, 크기
      overall: null,    // 1-5: 전체 느낌, "사람이 만든 것 같은가"
    },
    feedback: null,     // Free text
    drift_score: null,  // From design-drift-detect
    token_preset: null, // Which preset was used
    reference_compared: false,
  };

  // Auto-run drift detection
  try {
    const { execSync } = await import('child_process');
    const driftJson = execSync(
      `node scripts/design-drift-detect.mjs . --json 2>/dev/null`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const drift = JSON.parse(driftJson);
    entry.drift_score = drift.driftScore;
    entry.token_preset = drift.tokenFile;
  } catch {
    // drift detection optional
  }

  // Output for human scoring (will be filled by /design-score command)
  if (flagJson) {
    console.log(JSON.stringify(entry, null, 2));
  } else {
    console.log('\n  Design Score Entry Prepared');
    console.log('  ' + '─'.repeat(40));
    console.log(`  Project:    ${entry.project}`);
    console.log(`  Component:  ${entry.component}`);
    console.log(`  Snapshot:   ${entry.snapshot || '(none)'}`);
    console.log(`  Drift:      ${entry.drift_score !== null ? entry.drift_score + '/100' : 'N/A'}`);
    console.log(`  Token file: ${entry.token_preset || 'NONE'}`);
    console.log('');
    console.log('  Awaiting human scores (1-5):');
    console.log('    Layout / Typography / Overall / Feedback');
    console.log('');
    console.log('  Use /design-score to complete scoring via AskUserQuestion.');
  }

  // Save partial entry (scores will be filled by command)
  mkdirSync(join(process.cwd(), '.context'), { recursive: true });
  appendFileSync(SCORE_FILE, JSON.stringify(entry) + '\n');

  return entry;
}

// ── Score recording (called from /design-score command) ──
export function recordScore(project, component, scores, feedback, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    project,
    component,
    snapshot: extra.snapshot || null,
    scores: {
      layout: scores.layout,
      typography: scores.typography,
      overall: scores.overall,
    },
    feedback,
    drift_score: extra.drift_score ?? null,
    token_preset: extra.token_preset ?? null,
    reference_compared: extra.reference_compared ?? false,
    reference_gaps: extra.reference_gaps ?? [],
  };

  mkdirSync(join(process.cwd(), '.context'), { recursive: true });
  appendFileSync(SCORE_FILE, JSON.stringify(entry) + '\n');
  return entry;
}

main().catch(e => { console.error(e.message); process.exit(1); });
