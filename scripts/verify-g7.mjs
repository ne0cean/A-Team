#!/usr/bin/env node
// G7 No Regression Across Versions — verifier
// Usage: node scripts/verify-g7.mjs <prev-tag> <curr-tag>
// Exit: 0 pass, 1 regression detected

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const [, , prevTag, currTag] = process.argv;

if (!prevTag || !currTag) {
  console.error('Usage: node scripts/verify-g7.mjs <prev-tag> <curr-tag>');
  process.exit(2);
}

const prevPath = join(process.cwd(), '.bench', prevTag, 'results.json');
const currPath = join(process.cwd(), '.bench', currTag, 'results.json');

if (!existsSync(prevPath)) {
  console.error(`Missing baseline: ${prevPath}`);
  console.error('Run `node scripts/bench-runner.mjs --tag ' + prevTag + '` first.');
  process.exit(2);
}
if (!existsSync(currPath)) {
  console.error(`Missing current: ${currPath}`);
  process.exit(2);
}

const prev = JSON.parse(readFileSync(prevPath, 'utf8'));
const curr = JSON.parse(readFileSync(currPath, 'utf8'));

// G7 thresholds (MANIFEST.md G7-a~e)
// M4 (correctness): 0% 허용 (절대 하락 금지)
// M1/M2/M3/M5: 1% 노이즈 허용
const THRESHOLDS = {
  M1_tokens: 0.01,
  M2_time_s: 0.01,
  M3_tool_calls: 0.01,
  M4_correctness: 0,    // absolute no-regression
  M5_regressions: 0.01,
};

let failures = 0;
const report = [];

for (const [bid, currBench] of Object.entries(curr.benchmarks)) {
  const prevBench = prev.benchmarks[bid];
  if (!prevBench) {
    report.push(`[${bid}] NEW — no baseline, skipping`);
    continue;
  }
  if (currBench.mode === 'not-implemented' || prevBench.mode === 'not-implemented') {
    report.push(`[${bid}] SKIP — placeholder mode (run with --dry-run or implement Phase 2)`);
    continue;
  }

  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const prevStat = prevBench.stats?.[metric];
    const currStat = currBench.stats?.[metric];
    if (!prevStat || !currStat) continue;

    const pv = prevStat.mean;
    const cv = currStat.mean;

    // M4는 높을수록 좋음 → 감소가 regression
    // 다른 metric은 낮을수록 좋음 → 증가가 regression
    let delta;
    let regressed = false;

    if (metric === 'M4_correctness') {
      delta = cv - pv;  // 양수여야 좋음
      regressed = delta < -threshold;
    } else {
      delta = (cv - pv) / (pv || 1);  // 양수면 악화
      regressed = delta > threshold;
    }

    if (regressed) {
      failures++;
      report.push(`[${bid}] ${metric}: ${pv} → ${cv} (Δ ${(delta * 100).toFixed(2)}%) ✗ REGRESSION`);
    } else {
      const sign = delta > 0 ? '+' : '';
      const delta_pct = metric === 'M4_correctness' ? delta.toFixed(3) : `${sign}${(delta * 100).toFixed(2)}%`;
      report.push(`[${bid}] ${metric}: ${pv} → ${cv} (${delta_pct}) ✓`);
    }
  }
}

console.log(`\n=== G7 Verification: ${prevTag} → ${currTag} ===\n`);
console.log(report.join('\n'));
console.log('');

if (failures > 0) {
  console.log(`✗ G7 FAIL: ${failures} regression(s) detected. Rollback required.`);
  process.exit(1);
} else {
  console.log(`✓ G7 PASS: No regression across versions.`);
  process.exit(0);
}
