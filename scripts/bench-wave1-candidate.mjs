#!/usr/bin/env node
// Wave 1 Candidate Dry-Run Simulation
// Purpose: RFC-001/003/004/007-S 모두 활성 시 **추정** 효과 시뮬레이션
// ⚠️ 실제 Claude 호출 아님 — Phase 2 실측 전 Earned Integration 체크용

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TAG = 'v-wave-1-estimate';
const OUTPUT_DIR = join(process.cwd(), '.bench', TAG);

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// Baseline (v-baseline results.json에서 로드)
const baselinePath = join(process.cwd(), '.bench', 'v-baseline', 'results.json');
if (!existsSync(baselinePath)) {
  console.error('Run: node scripts/bench-runner.mjs --tag v-baseline --runs 3 --dry-run');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

// RFC 활성 시 예상 효과 (RFC 본문의 추정치, 실측 전)
const RFC_EFFECTS = {
  // RFC-001 Prompt Caching: M1 -35% (세션 2+), M2 -51%
  prompt_caching: { M1: -0.35, M2: -0.51, M4: +0.01, scope: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
  // RFC-003 ToolSearch: M1 -15% (Sonnet/Opus tier만, Haiku 제외)
  tool_search: { M1: -0.15, scope: ['b1', 'b2', 'b3', 'b5'] },
  // RFC-004 Classical Tools Phase 1: M1 -20~30% on search-heavy (B1/B3/B6)
  classical_tools: { M1: -0.25, scope: ['b1', 'b3', 'b6'] },
  // RFC-007 Spotlighting Phase S: M1 overhead <1% (delimiter tokens)
  spotlighting: { M1: +0.01, scope: ['b5'] }, // B5만 외부 리서치 대상
};

// Overlap discount (F7 "단순 합산 금지")
const OVERLAP_DISCOUNT = 0.15; // 여러 RFC가 동일 경로 공유 시 15% 할인

// ─── 시뮬레이션 ─────────────────────────────────────────────────────────
const results = {
  tag: TAG,
  timestamp: new Date().toISOString(),
  runs: baseline.runs,
  mode: 'estimate-only',
  warning: 'This is NOT real measurement. Phase 2 실측 필요. Earned Integration: estimate ≠ accept.',
  benchmarks: {},
  rfc_effects: RFC_EFFECTS,
  overlap_discount: OVERLAP_DISCOUNT,
};

for (const [bid, bench] of Object.entries(baseline.benchmarks)) {
  const baseMean = bench.stats;
  if (!baseMean?.M1_tokens) continue;

  // 적용되는 RFC들 추출
  const applied = Object.entries(RFC_EFFECTS).filter(([_, eff]) => eff.scope.includes(bid));

  // M1 효과 합산 (additive 후 overlap 할인)
  let m1_delta = 0;
  let m2_delta = 0;
  let m4_delta = 0;
  for (const [rfcName, eff] of applied) {
    if (eff.M1) m1_delta += eff.M1;
    if (eff.M2) m2_delta += eff.M2;
    if (eff.M4) m4_delta += eff.M4;
  }
  // Overlap discount (2개 이상 RFC 겹칠 때)
  if (applied.length >= 2) {
    m1_delta *= (1 - OVERLAP_DISCOUNT);
    m2_delta *= (1 - OVERLAP_DISCOUNT);
  }

  const candidate_m1 = Math.round(baseMean.M1_tokens.mean * (1 + m1_delta));
  const candidate_m2 = Number((baseMean.M2_time_s.mean * (1 + m2_delta)).toFixed(2));
  const candidate_m3 = baseMean.M3_tool_calls.mean; // 변화 없음
  const candidate_m4 = Math.min(1.0, (baseMean.M4_correctness.mean + m4_delta));

  results.benchmarks[bid] = {
    name: bench.name,
    baseline: {
      M1: baseMean.M1_tokens.mean,
      M2: baseMean.M2_time_s.mean,
      M3: baseMean.M3_tool_calls.mean,
      M4: baseMean.M4_correctness.mean,
    },
    candidate: {
      M1: candidate_m1,
      M2: candidate_m2,
      M3: candidate_m3,
      M4: candidate_m4,
    },
    delta_pct: {
      M1: Number((m1_delta * 100).toFixed(1)),
      M2: Number((m2_delta * 100).toFixed(1)),
      M4: Number((m4_delta * 100).toFixed(2)),
    },
    applied_rfcs: applied.map(([n]) => n),
    // fake stats for G7 comparability
    stats: {
      M1_tokens: { mean: candidate_m1, stddev: 0, cv: 0 },
      M2_time_s: { mean: candidate_m2, stddev: 0, cv: 0 },
      M3_tool_calls: { mean: candidate_m3, stddev: 0, cv: 0 },
      M4_correctness: { mean: candidate_m4, stddev: 0, cv: 0 },
      M5_regressions: { mean: 0, stddev: 0, cv: 0 },
    },
    mode: 'estimate',
  };
}

// 총합 리포트
let total_baseline = 0;
let total_candidate = 0;
for (const b of Object.values(results.benchmarks)) {
  total_baseline += b.baseline.M1;
  total_candidate += b.candidate.M1;
}
results.total_m1_delta_pct = Number(((total_candidate - total_baseline) / total_baseline * 100).toFixed(1));

writeFileSync(join(OUTPUT_DIR, 'results.json'), JSON.stringify(results, null, 2));

console.log('\n=== Wave 1 Candidate Estimate (⚠️ NOT real measurement) ===\n');
for (const [bid, b] of Object.entries(results.benchmarks)) {
  console.log(`[${bid.toUpperCase()}] ${b.name}`);
  console.log(`  baseline: M1=${b.baseline.M1}, M2=${b.baseline.M2}s, M4=${b.baseline.M4}`);
  console.log(`  candidate: M1=${b.candidate.M1} (${b.delta_pct.M1}%), M2=${b.candidate.M2}s (${b.delta_pct.M2}%), M4=${b.candidate.M4}`);
  console.log(`  applied: ${b.applied_rfcs.join(', ')}`);
  console.log('');
}
console.log(`Total M1 delta: ${results.total_m1_delta_pct}%\n`);
console.log(`Output: ${join(OUTPUT_DIR, 'results.json')}`);
console.log(`Verify G7: node scripts/verify-g7.mjs v-baseline ${TAG}\n`);
console.log('⚠️ Earned Integration 원칙: 이 추정은 수용 근거 아님. Phase 2 실측 필수.\n');
