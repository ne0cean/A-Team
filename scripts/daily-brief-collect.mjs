#!/usr/bin/env node
/**
 * daily-brief-collect.mjs — Daily Growth Brief 내부 데이터 수집
 *
 * Usage:
 *   node scripts/daily-brief-collect.mjs              # JSON 출력
 *   node scripts/daily-brief-collect.mjs --save       # .context/briefs/ 에 저장
 *
 * 수집 항목:
 *   1. git 활동 (24h 커밋, 변경 파일, 브랜치)
 *   2. capability gaps (상위 5개)
 *   3. anomaly alerts (활성 이상)
 *   4. stale modules (30일+ 미사용)
 *   5. analytics trends (최근 7일 vs 이전 7일)
 *   6. OKR 진행률 (있으면)
 *   7. 최근 board/insights 요약
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const ANALYTICS_PATH = resolve(ROOT, '.context/analytics.jsonl');
const CAPABILITY_PATH = resolve(ROOT, 'lib/capability-map.json');
const BRIEFS_DIR = resolve(ROOT, '.context/briefs');

const argv = process.argv.slice(2);
const saveMode = argv.includes('--save');

// --- Helpers ---
function safeExec(cmd, fallback = '') {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 10000 }).trim(); }
  catch { return fallback; }
}

function safeReadJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

function parseJSONL(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function toKSTDate(d = new Date()) {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// --- 1. Git Activity (24h) ---
function collectGitActivity() {
  const commits = safeExec('git log --since="24 hours ago" --oneline --no-merges');
  const changedFiles = safeExec('git log --since="24 hours ago" --name-only --pretty=format: | sort | uniq');
  const uncommitted = safeExec('git status --porcelain');
  return {
    commits_24h: commits ? commits.split('\n').length : 0,
    commit_list: commits ? commits.split('\n').slice(0, 10) : [],
    changed_files: changedFiles ? changedFiles.split('\n').filter(Boolean) : [],
    uncommitted_count: uncommitted ? uncommitted.split('\n').filter(Boolean).length : 0,
  };
}

// --- 2. Capability Gaps (top 5) ---
function collectCapabilityGaps() {
  const map = safeReadJSON(CAPABILITY_PATH);
  if (!map || !map.departments) return [];

  const gaps = [];
  for (const [dept, info] of Object.entries(map.departments)) {
    for (const [cap, data] of Object.entries(info.capabilities || {})) {
      if (data.coverage < 0.5) {
        gaps.push({
          department: dept,
          capability: cap,
          coverage: data.coverage,
          gap: data.gap || null,
        });
      }
    }
  }
  return gaps
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 8);
}

// --- 3. Anomaly Alerts ---
function collectAnomalies() {
  const raw = safeExec('node scripts/anomaly-detect.mjs --json --days 3 2>/dev/null');
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return (data.anomalies || data.alerts || []).slice(0, 5);
  } catch { return []; }
}

// --- 4. Stale Modules (30d+ 미사용) ---
function collectStaleModules() {
  const events = parseJSONL(ANALYTICS_PATH);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  // 모듈별 마지막 사용 시간
  const lastUsed = {};
  for (const e of events) {
    if (e.name === 'command_start' && e.data?.name) {
      const ts = new Date(e.ts || e.timestamp).getTime();
      if (!lastUsed[e.data.name] || ts > lastUsed[e.data.name]) {
        lastUsed[e.data.name] = ts;
      }
    }
  }

  const stale = [];
  for (const [mod, ts] of Object.entries(lastUsed)) {
    if (now - ts > thirtyDays) {
      stale.push({ module: mod, last_used: new Date(ts).toISOString().slice(0, 10), days_ago: Math.floor((now - ts) / 86400000) });
    }
  }
  return stale.sort((a, b) => b.days_ago - a.days_ago).slice(0, 10);
}

// --- 5. Analytics Trends (7d vs prev 7d) ---
function collectTrends() {
  const events = parseJSONL(ANALYTICS_PATH);
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;

  const thisWeek = events.filter(e => now - new Date(e.ts || e.timestamp).getTime() < week);
  const prevWeek = events.filter(e => {
    const age = now - new Date(e.ts || e.timestamp).getTime();
    return age >= week && age < week * 2;
  });

  // 모듈별 사용 횟수
  const count = (arr) => {
    const c = {};
    for (const e of arr) {
      if (e.name === 'command_start' && e.data?.name) {
        c[e.data.name] = (c[e.data.name] || 0) + 1;
      }
    }
    return c;
  };

  const thisCount = count(thisWeek);
  const prevCount = count(prevWeek);

  const allMods = new Set([...Object.keys(thisCount), ...Object.keys(prevCount)]);
  const trends = [];
  for (const mod of allMods) {
    const curr = thisCount[mod] || 0;
    const prev = prevCount[mod] || 0;
    const delta = curr - prev;
    if (delta !== 0) {
      trends.push({ module: mod, this_week: curr, prev_week: prev, delta });
    }
  }
  return trends.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10);
}

// --- 6. Current Tasks & Blockers ---
function collectCurrentState() {
  const currentMd = resolve(ROOT, '.context/CURRENT.md');
  if (!existsSync(currentMd)) return { next_tasks: [], blockers: [] };

  const content = readFileSync(currentMd, 'utf8');

  // Next Tasks 섹션 파싱
  const taskMatch = content.match(/## Next Tasks\s*\n([\s\S]*?)(?=\n## |$)/);
  const tasks = [];
  if (taskMatch) {
    const lines = taskMatch[1].split('\n');
    for (const line of lines) {
      const m = line.match(/- \[ \] \*\*(.+?)\*\*/);
      if (m) tasks.push(m[1]);
    }
  }

  // Blockers 섹션
  const blockerMatch = content.match(/## Blockers\s*\n([\s\S]*?)(?=\n## |$)/);
  const blockers = [];
  if (blockerMatch) {
    const text = blockerMatch[1].trim();
    if (text && text !== '없음') blockers.push(text);
  }

  return { next_tasks: tasks.slice(0, 5), blockers };
}

// --- 7. Latest Insights/Board Summary ---
function collectLatestReports() {
  const insightsDir = resolve(ROOT, '.context/insights');
  const reports = {};

  if (existsSync(insightsDir)) {
    // 가장 최근 insights 파일
    const files = safeExec(`ls -t "${insightsDir}"/*.md 2>/dev/null`);
    if (files) {
      const latest = files.split('\n')[0];
      if (latest && existsSync(latest)) {
        const content = readFileSync(latest, 'utf8');
        // 첫 20줄만
        reports.latest_insights = {
          file: latest.split('/').pop(),
          summary: content.split('\n').slice(0, 20).join('\n'),
        };
      }
    }
  }

  return reports;
}

// --- 8. Ecosystem Context ---
function collectEcosystemContext() {
  // A-Team 경쟁사 및 관심 영역 (정적 시드)
  return {
    watch_topics: [
      'Claude Code updates & new features',
      'AI coding assistant ecosystem (Cursor, Windsurf, Copilot)',
      'Claude API / model releases',
      'AI agent frameworks (LangGraph, CrewAI, AutoGen)',
      'Solo developer / indie hacker tools',
      'Marketing automation AI tools',
      'Design AI tools (Figma AI, Galileo, v0)',
      'Open source AI toolkit projects',
    ],
    competitors: [
      { name: 'SuperClaude', repo: 'nickbaumann98/super-claude', stars: '22.8k' },
      { name: 'BMAD', repo: 'bmadcode/BMAD-METHOD', stars: '47k' },
      { name: 'spec-kit', repo: 'spec-kit', stars: '90k' },
    ],
    last_checked: null, // 에이전트가 실제 검색 후 채움
  };
}

// --- Main ---
function main() {
  const brief = {
    date: toKSTDate(),
    generated_at: new Date().toISOString(),
    version: '1.0.0',
    sections: {
      git_activity: collectGitActivity(),
      capability_gaps: collectCapabilityGaps(),
      anomalies: collectAnomalies(),
      stale_modules: collectStaleModules(),
      trends: collectTrends(),
      current_state: collectCurrentState(),
      latest_reports: collectLatestReports(),
      ecosystem: collectEcosystemContext(),
    },
  };

  if (saveMode) {
    mkdirSync(BRIEFS_DIR, { recursive: true });
    const path = resolve(BRIEFS_DIR, `${brief.date}-collect.json`);
    writeFileSync(path, JSON.stringify(brief, null, 2));
    console.error(`Saved: ${path}`);
  }

  console.log(JSON.stringify(brief, null, 2));
}

main();
