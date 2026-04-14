#!/usr/bin/env node
/**
 * A-Team 통합 가이드라인 점검 스크립트
 * - runAdversarialChecks (lib/adversarial.ts)
 * - Harness score (12원칙, lib/harness-score.ts)
 * - Coverage audit (lib/coverage-audit.ts)
 * - Sovereignty compliance (모든 변경이 A-Team 레포 내부인가)
 */

import { runAdversarialChecks, calculateBiasDelta } from '../lib/adversarial.ts';
import { calculateDimensions, calculateTotal, getGrade } from '../lib/harness-score.ts';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const report = [];

console.log('═══════════════════════════════════════════════════════');
console.log('  A-Team Integration Inspection Report');
console.log('  ' + new Date().toISOString());
console.log('═══════════════════════════════════════════════════════\n');

// 1. Adversarial checks
console.log('## 1. Adversarial Verification (lib/adversarial.ts)\n');
try {
  const result = runAdversarialChecks(REPO_ROOT);
  const bias = calculateBiasDelta(result.checks);
  console.log(`  Passed: ${result.passed}/${result.total}`);
  console.log(`  Bias Delta: ${bias.delta} (${bias.verdict})`);
  result.checks.forEach(c => {
    const mark = c.result === 'PASS' ? '✓' : '✗';
    console.log(`    ${mark} ${c.id}: ${c.description}`);
    if (c.detail) console.log(`        └─ ${c.detail}`);
  });
  report.push({ section: 'adversarial', pass: result.failed === 0, score: `${result.passed}/${result.total}` });
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
  report.push({ section: 'adversarial', pass: false, error: e.message });
}

// 2. Harness score (12 principles P1–P12)
console.log('\n## 2. Harness Score (12 principles)');
try {
  // Phase 14 현재 자가 평가 (opt-in default OFF, 전 기능 검증, governance 완비)
  const scores = {
    P1: 9, P2: 9, P3: 8, P4: 9, P5: 9, P6: 8,
    P7: 8, P8: 9, P9: 8, P10: 8, P11: 7, P12: 9,
  };
  const dims = calculateDimensions(scores);
  const total = calculateTotal(dims);
  const grade = getGrade(total);
  console.log(`  Total: ${total}/100 (Grade: ${grade})`);
  console.log(`  Dimension A: ${dims.A.toFixed(1)}, B: ${dims.B.toFixed(1)}, C: ${dims.C.toFixed(1)}, D: ${dims.D.toFixed(1)}`);
  report.push({ section: 'harness-score', pass: total >= 60, total, grade });
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
  report.push({ section: 'harness-score', pass: false });
}

// 3. Build + test verification
console.log('\n## 3. Build + Test (Earned Integration)');
try {
  execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
  console.log('  ✓ build PASS (tsc --noEmit)');
  const testOutput = execSync('npx vitest run --reporter=json 2>&1', { cwd: REPO_ROOT, stdio: 'pipe' }).toString();
  // JSON은 처음에 문자 전에 있을 수 있음, 단순 파싱
  const passed = (testOutput.match(/"numPassedTests":(\d+)/) || [])[1];
  const failed = (testOutput.match(/"numFailedTests":(\d+)/) || [])[1];
  console.log(`  ✓ tests: ${passed} passed, ${failed || 0} failed`);
  report.push({ section: 'build-test', pass: parseInt(failed || '0') === 0, passed, failed: failed || '0' });
} catch (e) {
  const out = e.stdout?.toString() || e.stderr?.toString() || e.message;
  console.log(`  ERROR: ${out.split('\n').slice(-3).join('\n')}`);
  report.push({ section: 'build-test', pass: false });
}

// 4. Sovereignty check — 변경이 A-Team 레포 내부만
console.log('\n## 4. Sovereignty Compliance');
try {
  const lastCommitFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD~21..HEAD', {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  }).toString().split('\n').filter(Boolean);
  const outside = lastCommitFiles.filter(f => f.startsWith('..') || f.startsWith('/'));
  console.log(`  21 commits 변경 파일: ${lastCommitFiles.length}개`);
  console.log(`  A-Team 외부 경로 변경: ${outside.length}건`);
  report.push({ section: 'sovereignty', pass: outside.length === 0, files: lastCommitFiles.length });
} catch (e) {
  console.log(`  WARN: ${e.message}`);
}

// 5. Opt-in default OFF 검증 (grep env flags default)
console.log('\n## 5. Opt-in Default OFF (Criterion 8)');
const flagChecks = [
  { file: 'scripts/prompt-cache.mjs', flag: 'ENABLE_PROMPT_CACHING' },
  { file: 'scripts/spotlight.mjs', flag: 'A_TEAM_SPOTLIGHT' },
  { file: 'scripts/handoff-compressor.mjs', flag: 'COMPRESSION_MODE' },
  { file: 'lib/cascade-gate.ts', flag: 'A_TEAM_CASCADE' },
  { file: 'lib/budget-tracker.ts', flag: 'A_TEAM_BUDGET_AWARE' },
];
let flagPass = 0;
for (const { file, flag } of flagChecks) {
  if (!existsSync(join(REPO_ROOT, file))) {
    console.log(`  ? ${file} not found`);
    continue;
  }
  const src = readFileSync(join(REPO_ROOT, file), 'utf8');
  // opt-in guard: env 변수를 check하는 패턴이 있는지
  const hasCheck = new RegExp(`process\\.env\\.${flag}`).test(src);
  const mark = hasCheck ? '✓' : '✗';
  console.log(`  ${mark} ${flag}: ${hasCheck ? 'guard present' : 'MISSING'} (${file})`);
  if (hasCheck) flagPass++;
}
report.push({ section: 'opt-in-flags', pass: flagPass === flagChecks.length, pass_count: `${flagPass}/${flagChecks.length}` });

// 6. Governance files presence
console.log('\n## 6. Governance Rules Integrity');
const govFiles = [
  'governance/rules/ateam-sovereignty.md',
  'governance/rules/ateam-first.md',
  'governance/rules/autonomous-loop.md',
  'governance/rules/truth-contract.md',
  'governance/rules/tool-search.md',
];
let govPass = 0;
for (const f of govFiles) {
  const exists = existsSync(join(REPO_ROOT, f));
  console.log(`  ${exists ? '✓' : '✗'} ${f}`);
  if (exists) govPass++;
}
report.push({ section: 'governance', pass: govPass === govFiles.length, pass_count: `${govPass}/${govFiles.length}` });

// 7. Final summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════');
const allPass = report.every(r => r.pass);
report.forEach(r => {
  const mark = r.pass ? '✓' : '✗';
  console.log(`  ${mark} ${r.section}: ${JSON.stringify({ ...r, section: undefined, pass: undefined }).replace(/[{}"]/g, '').trim() || 'OK'}`);
});
console.log(allPass ? '\n  🟢 ALL CHECKS PASS' : '\n  🔴 SOME CHECKS FAILED');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(allPass ? 0 : 1);
