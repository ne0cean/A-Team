#!/usr/bin/env node
// B1–B6 Benchmark Runner — Wave 1 A/B 측정용
// Usage: node scripts/bench-runner.mjs [--suite all|b1|b2|...] [--runs 3] [--tag v-baseline]
// Output: .bench/<tag>/results.json + summary

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    suite: { type: 'string', default: 'all' },
    runs: { type: 'string', default: '3' },
    tag: { type: 'string', default: 'untagged' },
    'dry-run': { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

const RUNS = parseInt(args.runs, 10);
const TAG = args.tag;
const DRY_RUN = args['dry-run'];
const OUTPUT_DIR = join(process.cwd(), '.bench', TAG);

// ─── Bench Suite 정의 ─────────────────────────────────────────────────────
// BASELINE_SPEC.md B1–B6 참조
// 현재 Phase: 합성 검증 태스크 (실제 Claude 호출 없이 메트릭 수집)
// Phase 2: 실제 Claude API 호출로 M1 (실 토큰), M2 (실 시간) 측정

const BENCHMARKS = {
  b1: {
    name: 'B1 Small Fix (≤50 LOC)',
    task: '이메일 검증 버그 2개 찾기 + 테스트 3개',
    expected_tokens: 5000,
    expected_time_s: 60,
    expected_tool_calls: 8,
    correctness_assertion: 'email-validator.test.ts 3 tests pass + 2 bugs fixed',
  },
  b2: {
    name: 'B2 TDD Feature',
    task: 'Token Bucket Rate Limiter TDD (RED→GREEN→REFACTOR)',
    expected_tokens: 12000,
    expected_time_s: 180,
    expected_tool_calls: 15,
    correctness_assertion: 'RED 단계 실패 테스트 존재 + 최종 npm test pass',
  },
  b3: {
    name: 'B3 Multi-File Refactor',
    task: '300 LOC monolith.ts → 4 모듈 분리',
    expected_tokens: 25000,
    expected_time_s: 360,
    expected_tool_calls: 20,
    correctness_assertion: '기존 테스트 전부 pass + 4개 파일 생성 + 단일책임 준수',
  },
  b4: {
    name: 'B4 UI + Visual Verification',
    task: 'ToggleButton.tsx (dark mode) + PostToolUse 훅 diff 자동 캡처',
    expected_tokens: 15000,
    expected_time_s: 300,
    expected_tool_calls: 12,
    correctness_assertion: '컴포넌트 렌더 + before/after 스크린샷 존재',
    optional: 'Playwright 미설치 시 skip',
  },
  b5: {
    name: 'B5 Research Synthesis',
    task: '3 MCP 구현체 비교 (병렬 subagent)',
    expected_tokens: 35000,
    expected_time_s: 600,
    expected_tool_calls: 6,
    correctness_assertion: '비교표에 3 후보 × 3 속성 이상',
  },
  b6: {
    name: 'B6 Root Cause Debug',
    task: 'TypeError stack trace → 근본 원인 + fix 제안',
    expected_tokens: 18000,
    expected_time_s: 240,
    expected_tool_calls: 8,
    correctness_assertion: '근본 원인(undefined API 응답) 식별 + defensive default 제안',
  },
};

// ─── Metric 집계 ──────────────────────────────────────────────────────────

function emptyMetrics() {
  return {
    M1_tokens: [],
    M2_time_s: [],
    M3_tool_calls: [],
    M4_correctness: [], // 0 / 0.5 / 1
    M5_regressions: [], // count
  };
}

function aggregate(metrics) {
  const stats = {};
  for (const [key, values] of Object.entries(metrics)) {
    if (!values.length) continue;
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sq = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
    const variance = sq / values.length;
    const stddev = Math.sqrt(variance);
    stats[key] = {
      mean: Number(mean.toFixed(2)),
      stddev: Number(stddev.toFixed(2)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      runs: values.length,
      cv: mean > 0 ? Number((stddev / mean).toFixed(3)) : 0, // coefficient of variation
    };
  }
  return stats;
}

// ─── Benchmark 실행 (Phase 1: placeholder — 실측은 프로토타입 완료 후) ───

function runBenchmark(benchId, bench, runIdx) {
  const start = Date.now();

  if (DRY_RUN) {
    // Dry run: expected 수치를 실측처럼 반환 (±10% 노이즈)
    const noise = () => 1 + (Math.random() - 0.5) * 0.1;
    return {
      M1_tokens: Math.round(bench.expected_tokens * noise()),
      M2_time_s: Number((bench.expected_time_s * noise()).toFixed(2)),
      M3_tool_calls: Math.round(bench.expected_tool_calls * noise()),
      M4_correctness: 1.0,
      M5_regressions: 0,
      elapsed_ms: Date.now() - start,
      mode: 'dry-run',
    };
  }

  // Phase 1 실제 실행: 아직 prototype 미완 → placeholder
  // Phase 2에서 실제 Claude API 호출로 대체 예정
  return {
    M1_tokens: null,
    M2_time_s: null,
    M3_tool_calls: null,
    M4_correctness: null,
    M5_regressions: null,
    elapsed_ms: Date.now() - start,
    mode: 'not-implemented',
    note: 'Phase 1 placeholder — actual Claude invocation is Phase 2 work. Use --dry-run for synthetic data.',
  };
}

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const suites = args.suite === 'all'
    ? Object.keys(BENCHMARKS)
    : args.suite.split(',').map(s => s.toLowerCase());

  console.log(`\n=== Bench Run: tag=${TAG}, runs=${RUNS}, suite=${suites.join(',')}, dry-run=${DRY_RUN} ===\n`);

  const results = { tag: TAG, timestamp: new Date().toISOString(), runs: RUNS, benchmarks: {} };

  for (const bid of suites) {
    const bench = BENCHMARKS[bid];
    if (!bench) {
      console.warn(`Unknown benchmark: ${bid}`);
      continue;
    }

    console.log(`[${bid.toUpperCase()}] ${bench.name}`);
    const metrics = emptyMetrics();

    for (let r = 0; r < RUNS; r++) {
      const result = runBenchmark(bid, bench, r);
      if (result.mode === 'not-implemented') {
        console.log(`  run ${r + 1}: not implemented (see note)`);
      } else {
        for (const key of Object.keys(metrics)) {
          if (result[key] !== null && result[key] !== undefined) {
            metrics[key].push(result[key]);
          }
        }
        console.log(`  run ${r + 1}: tokens=${result.M1_tokens}, time=${result.M2_time_s}s, calls=${result.M3_tool_calls}, correct=${result.M4_correctness}`);
      }
    }

    const stats = aggregate(metrics);
    results.benchmarks[bid] = {
      name: bench.name,
      stats,
      raw: metrics,
      mode: metrics.M1_tokens.length > 0 ? (DRY_RUN ? 'dry-run' : 'actual') : 'not-implemented',
    };

    // G5-e σ/mean check
    for (const [m, s] of Object.entries(stats)) {
      if (s.cv > 0.1) {
        console.warn(`  ⚠ ${m} cv=${s.cv} > 0.1 (G5-e 위반, 추가 runs 필요)`);
      }
    }
    console.log('');
  }

  const outputPath = join(OUTPUT_DIR, 'results.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved: ${outputPath}`);
  console.log('\nG7 verification: run `node scripts/verify-g7.mjs <prev-tag> ' + TAG + '`\n');
}

main();
