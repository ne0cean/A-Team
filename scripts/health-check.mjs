#!/usr/bin/env node
/**
 * A-Team Health Check — 프로젝트 상태 자동 점검
 *
 * Usage:
 *   node scripts/health-check.mjs                  # 전체 점검
 *   node scripts/health-check.mjs --alert-only     # 이상만 출력
 *   node scripts/health-check.mjs --json           # JSON 출력
 *
 * Cron:  매일 09:00 KST 실행 권장
 * Alert: Slack/Telegram webhook 연동 가능
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

const args = new Set(process.argv.slice(2));
const alertOnly = args.has('--alert-only');
const jsonMode = args.has('--json');

const checks = [];

function check(name, fn) {
  try {
    const result = fn();
    checks.push({ name, ...result });
  } catch (e) {
    checks.push({ name, status: 'ERROR', detail: e.message });
  }
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 30000 }).trim();
}

// 1. Tests
check('Tests', () => {
  const output = run('npm test 2>&1');
  const match = output.match(/Tests\s+(\d+)\s+passed/);
  const count = match ? parseInt(match[1]) : 0;
  const failed = output.includes('failed');
  return {
    status: failed ? 'FAIL' : 'OK',
    detail: `${count} tests passed${failed ? ' (SOME FAILED)' : ''}`,
  };
});

// 2. TypeScript
check('TypeScript', () => {
  const output = run('npx tsc --noEmit 2>&1');
  const hasErrors = output.includes('error TS');
  return {
    status: hasErrors ? 'FAIL' : 'OK',
    detail: hasErrors ? output.slice(0, 100) : 'No errors',
  };
});

// 3. Security Audit
check('npm audit', () => {
  try {
    run('npm audit --audit-level=moderate 2>&1');
    return { status: 'OK', detail: '0 vulnerabilities' };
  } catch {
    return { status: 'WARN', detail: 'Vulnerabilities found' };
  }
});

// 4. License Compliance
check('Licenses', () => {
  try {
    run("npx license-checker-rseidelsohn --production --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD' 2>&1");
    return { status: 'OK', detail: 'All licenses approved' };
  } catch {
    return { status: 'FAIL', detail: 'Non-approved license found' };
  }
});

// 5. Git Status
check('Git', () => {
  const status = run('git status --short 2>&1');
  const lines = status.split('\n').filter(l => l.trim()).length;
  const branch = run('git branch --show-current');
  const behind = run('git rev-list --count HEAD..origin/master 2>/dev/null || echo 0');
  return {
    status: lines > 10 ? 'WARN' : 'OK',
    detail: `Branch: ${branch}, ${lines} uncommitted, ${behind} behind remote`,
  };
});

// 6. Disk Usage
check('Disk', () => {
  const size = run('du -sh . 2>/dev/null | cut -f1');
  const nodeModules = run('du -sh node_modules 2>/dev/null | cut -f1');
  return { status: 'OK', detail: `Project: ${size}, node_modules: ${nodeModules}` };
});

// 7. Analytics Health
check('Analytics', () => {
  const file = resolve(ROOT, '.context', 'analytics.jsonl');
  if (!existsSync(file)) return { status: 'WARN', detail: 'analytics.jsonl not found' };
  const content = readFileSync(file, 'utf8');
  const lines = content.trim().split('\n').length;
  const lastLine = content.trim().split('\n').pop();
  let lastTs = 'unknown';
  try { lastTs = JSON.parse(lastLine).ts; } catch {}
  return { status: 'OK', detail: `${lines} events, last: ${lastTs}` };
});

// 8. Orchestration Hooks
check('Orchestration', () => {
  const preemptLog = '/tmp/orchestration-preempt.log';
  if (!existsSync(preemptLog)) return { status: 'INFO', detail: 'No preempt log yet' };
  const content = readFileSync(preemptLog, 'utf8');
  const lines = content.trim().split('\n').length;
  const denies = (content.match(/DENY/g) || []).length;
  const passes = (content.match(/PASS/g) || []).length;
  return {
    status: 'OK',
    detail: `${lines} entries, ${denies} denied, ${passes} passed through`,
  };
});

// 9. Groq API
check('Groq API', () => {
  if (!process.env.GROQ_API_KEY) return { status: 'WARN', detail: 'GROQ_API_KEY not set' };
  try {
    const output = run('curl -s -m 3 -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models');
    return { status: output === '200' ? 'OK' : 'WARN', detail: `HTTP ${output}` };
  } catch {
    return { status: 'WARN', detail: 'Unreachable' };
  }
});

// 10. Ollama
check('Ollama', () => {
  try {
    const output = run('curl -s -m 3 http://localhost:11434/api/tags | jq -r ".models | length" 2>/dev/null');
    return { status: 'OK', detail: `${output} models` };
  } catch {
    return { status: 'INFO', detail: 'Offline (optional)' };
  }
});

// Output
const alerts = checks.filter(c => c.status === 'FAIL' || c.status === 'WARN');

if (jsonMode) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), checks, alerts: alerts.length }, null, 2));
} else {
  if (!alertOnly) {
    console.log('\n=== A-Team Health Check ===');
    console.log(`Time: ${new Date().toISOString().slice(0, 19)}\n`);
  }

  for (const c of checks) {
    if (alertOnly && c.status === 'OK') continue;
    const icon = { OK: '\u2705', WARN: '\u26A0\uFE0F ', FAIL: '\u274C', ERROR: '\u274C', INFO: '\u2139\uFE0F ' }[c.status] || '?';
    console.log(`${icon} ${c.name.padEnd(16)} ${c.detail}`);
  }

  if (!alertOnly) {
    console.log(`\n${alerts.length === 0 ? 'All healthy.' : `${alerts.length} issue(s) found.`}`);
  }
}

process.exit(alerts.some(a => a.status === 'FAIL') ? 1 : 0);
