import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CostTracker,
  estimateCostUsd,
  estimateIterationsCostUsd,
} from '../lib/cost-tracker.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-cost-test-' + process.pid);

beforeEach(() => { fs.mkdirSync(TEST_DIR, { recursive: true }); });
afterEach(() => { fs.rmSync(TEST_DIR, { recursive: true, force: true }); });

describe('CostTracker', () => {
  it('should record and accumulate costs', () => {
    const tracker = new CostTracker(TEST_DIR);
    tracker.record({ inputTokens: 1000, outputTokens: 500, costUsd: 0.05, model: 'sonnet' });
    tracker.record({ inputTokens: 2000, outputTokens: 800, costUsd: 0.08, model: 'sonnet' });

    const summary = tracker.getSummary();
    expect(summary.totalInputTokens).toBe(3000);
    expect(summary.totalOutputTokens).toBe(1300);
    expect(summary.totalCostUsd).toBeCloseTo(0.13, 2);
    expect(summary.callCount).toBe(2);
  });

  it('should track per-model breakdown', () => {
    const tracker = new CostTracker(TEST_DIR);
    tracker.record({ inputTokens: 1000, outputTokens: 500, costUsd: 0.05, model: 'sonnet' });
    tracker.record({ inputTokens: 500, outputTokens: 200, costUsd: 0.15, model: 'opus' });

    const summary = tracker.getSummary();
    expect(summary.byModel['sonnet'].costUsd).toBeCloseTo(0.05, 2);
    expect(summary.byModel['opus'].costUsd).toBeCloseTo(0.15, 2);
  });

  it('should persist to file and reload', () => {
    const tracker1 = new CostTracker(TEST_DIR);
    tracker1.record({ inputTokens: 1000, outputTokens: 500, costUsd: 0.05, model: 'haiku' });
    tracker1.save();

    const tracker2 = new CostTracker(TEST_DIR);
    tracker2.load();
    const summary = tracker2.getSummary();
    expect(summary.totalCostUsd).toBeCloseTo(0.05, 2);
  });

  it('should warn when budget exceeded', () => {
    const tracker = new CostTracker(TEST_DIR, { budgetUsd: 0.10 });
    tracker.record({ inputTokens: 5000, outputTokens: 2000, costUsd: 0.12, model: 'opus' });

    expect(tracker.isOverBudget()).toBe(true);
    expect(tracker.getBudgetRemaining()).toBeLessThan(0);
  });

  // ── Advisor 확장 필드 + 파생 지표 ──────────────────────────────────────────

  it('should handle advisor fields and compute advisorCallAvg', () => {
    const tracker = new CostTracker(TEST_DIR);
    tracker.record({
      inputTokens: 1000, outputTokens: 500, costUsd: 0.05, model: 'sonnet',
      advisorCalls: 2, advisorInputTokens: 800, advisorOutputTokens: 400,
    });
    tracker.record({
      inputTokens: 2000, outputTokens: 800, costUsd: 0.08, model: 'sonnet',
      advisorCalls: 1, advisorInputTokens: 400, advisorOutputTokens: 200,
    });
    tracker.record({
      inputTokens: 500, outputTokens: 200, costUsd: 0.02, model: 'haiku',
      // no advisor fields
    });

    const summary = tracker.getSummary();
    // advisorCallAvg = (2 + 1 + 0) / 3 = 1
    expect(summary.advisorCallAvg).toBeCloseTo(1.0, 5);
    expect(summary.callCount).toBe(3);
  });

  it('should compute cacheHitRate correctly', () => {
    const tracker = new CostTracker(TEST_DIR);
    // cacheRead=600, advisorIn=1200 → rate = 600/1800 = 0.333...
    tracker.record({
      inputTokens: 1000, outputTokens: 500, costUsd: 0.05, model: 'sonnet',
      advisorInputTokens: 1200, cacheReadInputTokens: 600,
    });

    const summary = tracker.getSummary();
    expect(summary.cacheHitRate).toBeCloseTo(600 / 1800, 5);
  });

  it('should compute preCheckSkipRate, reviewerCallRate, judgeCallRate', () => {
    const tracker = new CostTracker(TEST_DIR);
    tracker.record({
      inputTokens: 100, outputTokens: 50, costUsd: 0.01, model: 'haiku',
      phase: 'pre-check', skipReason: 'pre-check-skip',
    });
    tracker.record({
      inputTokens: 200, outputTokens: 100, costUsd: 0.02, model: 'sonnet',
      phase: 'reviewer',
    });
    tracker.record({
      inputTokens: 300, outputTokens: 150, costUsd: 0.03, model: 'opus',
      phase: 'judge',
    });
    tracker.record({
      inputTokens: 400, outputTokens: 200, costUsd: 0.04, model: 'sonnet',
      phase: 'exec',
    });

    const summary = tracker.getSummary();
    expect(summary.preCheckSkipRate).toBeCloseTo(1 / 4, 5);  // 1 skip / 4 total
    expect(summary.reviewerCallRate).toBeCloseTo(1 / 4, 5);
    expect(summary.judgeCallRate).toBeCloseTo(1 / 4, 5);
  });

  it('should compute moaAvgRounds', () => {
    const tracker = new CostTracker(TEST_DIR);
    tracker.record({ inputTokens: 100, outputTokens: 50, costUsd: 0.01, model: 'sonnet', phase: 'moa-r1' });
    tracker.record({ inputTokens: 100, outputTokens: 50, costUsd: 0.01, model: 'sonnet', phase: 'moa-r2' });
    tracker.record({ inputTokens: 100, outputTokens: 50, costUsd: 0.01, model: 'sonnet', phase: 'moa-r3' });
    tracker.record({ inputTokens: 100, outputTokens: 50, costUsd: 0.01, model: 'haiku', phase: 'exec' });

    const summary = tracker.getSummary();
    // moa rounds: [1, 2, 3] → avg = 2
    expect(summary.moaAvgRounds).toBeCloseTo(2.0, 5);
  });

  it('should return zero derived metrics when no records', () => {
    const tracker = new CostTracker(TEST_DIR);
    const summary = tracker.getSummary();

    expect(summary.preCheckSkipRate).toBe(0);
    expect(summary.reviewerCallRate).toBe(0);
    expect(summary.judgeCallRate).toBe(0);
    expect(summary.moaAvgRounds).toBe(0);
    expect(summary.advisorCallAvg).toBe(0);
    expect(summary.cacheHitRate).toBe(0);
  });

  it('should handle optional advisor fields being absent (backward compat)', () => {
    const tracker = new CostTracker(TEST_DIR);
    // 기존 코드처럼 advisor 필드 없이 기록해도 에러 없음
    tracker.record({ inputTokens: 1000, outputTokens: 500, costUsd: 0.05, model: 'sonnet' });
    tracker.record({ inputTokens: 2000, outputTokens: 800, costUsd: 0.08, model: 'opus' });

    const summary = tracker.getSummary();
    expect(summary.totalCostUsd).toBeCloseTo(0.13, 2);
    expect(summary.advisorCallAvg).toBe(0);
    expect(summary.cacheHitRate).toBe(0);
  });
});

// ── 토큰 기반 비용 추정 함수 ────────────────────────────────────────────────

describe('estimateCostUsd', () => {
  it('Sonnet 단순 입출력: 1M in + 1M out = $18', () => {
    const cost = estimateCostUsd({
      model: 'claude-sonnet-4-6',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    // Sonnet: $3/M in + $15/M out = $18
    expect(cost).toBeCloseTo(18, 5);
  });

  it('Opus 캐시 히트: 캐시 읽기는 input의 0.1x 할인', () => {
    // Opus: $15/M in, cacheReadMultiplier=0.1
    // 1M 캐시 읽기 토큰 → $15 * 0.1 = $1.5
    // 순수 입력 0, 출력 0
    const cost = estimateCostUsd({
      model: 'claude-opus-4-6',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.5, 5);
  });

  it('캐시 쓰기 할증: cacheCreationInputTokens는 input의 1.25x', () => {
    // Sonnet: $3/M in, cacheWriteMultiplier=1.25
    // 1M 캐시 쓰기 토큰 → $3 * 1.25 = $3.75
    const cost = estimateCostUsd({
      model: 'claude-sonnet-4-6',
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(3.75, 5);
  });

  it('미등록 모델은 Sonnet 가격으로 fallback', () => {
    // 미등록 모델 → Sonnet($3/M in, $15/M out) fallback
    const cost = estimateCostUsd({
      model: 'claude-unknown-model',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    // Sonnet fallback: $3 + $15 = $18
    expect(cost).toBeCloseTo(18, 5);
  });
});

describe('estimateIterationsCostUsd', () => {
  it('Sonnet executor + Opus advisor 혼합 이터레이션 비용 합산', () => {
    // executor(message) 1회: Sonnet, 500K in + 200K out
    //   → $3/M * 0.5 + $15/M * 0.2 = $1.5 + $3.0 = $4.5
    // advisor(advisor_message) 1회: Opus, 100K in + 50K out
    //   → $15/M * 0.1 + $75/M * 0.05 = $1.5 + $3.75 = $5.25
    // 합계: $9.75
    const iterations = [
      { type: 'message', input_tokens: 500_000, output_tokens: 200_000 },
      { type: 'advisor_message', model: 'claude-opus-4-6', input_tokens: 100_000, output_tokens: 50_000 },
    ];
    const cost = estimateIterationsCostUsd(iterations, 'claude-sonnet-4-6');
    expect(cost).toBeCloseTo(9.75, 5);
  });
});
