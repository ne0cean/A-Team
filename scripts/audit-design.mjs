#!/usr/bin/env node
/**
 * Design audit CLI — design-auditor 서브에이전트가 실제로 호출하는 진입점.
 *
 * 사용:
 *   npx tsx scripts/audit-design.mjs <file> [--tone=editorial-technical] [--gate=ship|craft|default] [--repo=A-Team]
 *   npx tsx scripts/audit-design.mjs <file1> <file2> --gate=ship
 *
 * Exit codes:
 *   0 — pass (score ≥ threshold AND a11y === 0)
 *   1 — fail (score 또는 a11y 게이트 미통과)
 *   2 — error (파일 없음, 잘못된 인자 등)
 *
 * Output: stdout JSON {summary, files: [{file, score, passed, violations, summary}]}
 *         + lib/analytics.ts logDesignAudit() 자동 기록 (analytics jsonl)
 *
 * Closes PMI MEDIUM M2: logDesignAudit/logDesignOutcome 호출 경로.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { register } from 'node:module';

// tsx loader는 호출 측 (`npx tsx`) 에서 자동 등록됨. node 직접 실행 시 fallback.
try { register('tsx/esm', import.meta.url); } catch { /* tsx already loaded */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = {};
const files = [];
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    flags[k] = v ?? true;
  } else {
    files.push(arg);
  }
}

if (files.length === 0) {
  console.error('Usage: audit-design.mjs <file> [...] [--tone=X] [--gate=ship|craft|default] [--repo=X]');
  process.exit(2);
}

const tone = flags.tone || readToneFromOverride();
const gateContext = flags.gate || 'default';
const repo = flags.repo || path.basename(REPO_ROOT);
const analyticsPath = flags.analytics || path.join(REPO_ROOT, '.context', 'analytics.jsonl');

function readToneFromOverride() {
  const overridePath = path.join(REPO_ROOT, '.design-override.md');
  if (!existsSync(overridePath)) return undefined;
  const txt = readFileSync(overridePath, 'utf-8');
  const m = txt.match(/^tone:\s*(\S+)/mi);
  return m ? m[1] : undefined;
}

const { detectDesignSmells, meetsThreshold, hasA11yViolations } =
  await import(path.join(REPO_ROOT, 'lib', 'design-smell-detector.ts'));
const { logDesignAudit } =
  await import(path.join(REPO_ROOT, 'lib', 'analytics.ts'));

const results = [];
let allPassed = true;

for (const file of files) {
  const abs = path.isAbsolute(file) ? file : path.resolve(file);
  if (!existsSync(abs)) {
    console.error(`ERROR: File not found: ${abs}`);
    process.exit(2);
  }
  const content = readFileSync(abs, 'utf-8');
  const r = detectDesignSmells({ file: path.relative(REPO_ROOT, abs), content, tone });
  const passed = meetsThreshold(r, gateContext) && !hasA11yViolations(r);
  if (!passed) allPassed = false;

  try {
    logDesignAudit(r, { repo, tone, gateContext, passed }, analyticsPath);
  } catch (e) {
    // analytics 기록 실패는 치명적이지 않음 — graceful degrade
    console.error(`WARN: logDesignAudit failed: ${e.message}`);
  }

  results.push({
    file: path.relative(REPO_ROOT, abs),
    score: r.score,
    passed,
    summary: r.summary,
    violations: r.violations,
  });
}

const out = {
  status: 'completed',
  repo,
  tone: tone || null,
  gate_context: gateContext,
  threshold: gateContext === 'craft' ? 85 : gateContext === 'ship' ? 70 : 60,
  all_passed: allPassed,
  files: results,
  tokens_consumed: 0,
};

console.log(JSON.stringify(out, null, 2));
process.exit(allPassed ? 0 : 1);
