import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  EvalStore,
  compareRuns,
  type EvalRun,
  type EvalResult,
  type EvalTier,
} from '../lib/eval-store.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-eval-test-' + process.pid);

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('EvalStore', () => {
  it('should save and load an eval run', () => {
    const store = new EvalStore(TEST_DIR);
    const run: EvalRun = {
      id: 'run-001',
      ts: new Date().toISOString(),
      branch: 'feature/auth',
      commit: 'abc1234',
      tier: 'gate',
      results: [
        { name: 'auth-login', passed: true, durationMs: 1200, tier: 'gate' },
        { name: 'auth-logout', passed: true, durationMs: 800, tier: 'gate' },
      ],
      totalDurationMs: 2000,
      totalCostUsd: 0.15,
    };

    store.save(run);

    const loaded = store.load('run-001');
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe('run-001');
    expect(loaded!.results).toHaveLength(2);
    expect(loaded!.results[0].passed).toBe(true);
  });

  it('should list runs sorted by timestamp descending', () => {
    const store = new EvalStore(TEST_DIR);

    store.save({ id: 'run-old', ts: '2026-01-01T00:00:00Z', branch: 'main', commit: 'a', tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0 });
    store.save({ id: 'run-new', ts: '2026-03-30T00:00:00Z', branch: 'main', commit: 'b', tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0 });

    const list = store.list();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('run-new');
  });

  it('should return undefined for nonexistent run', () => {
    const store = new EvalStore(TEST_DIR);
    expect(store.load('nonexistent')).toBeUndefined();
  });
});

describe('compareRuns', () => {
  const runA: EvalRun = {
    id: 'run-a', ts: '2026-03-29T00:00:00Z', branch: 'main', commit: 'a',
    tier: 'gate', totalDurationMs: 5000, totalCostUsd: 0.20,
    results: [
      { name: 'test-1', passed: true, durationMs: 1000, tier: 'gate' },
      { name: 'test-2', passed: true, durationMs: 2000, tier: 'gate' },
      { name: 'test-3', passed: false, durationMs: 2000, tier: 'gate' },
    ],
  };

  const runB: EvalRun = {
    id: 'run-b', ts: '2026-03-30T00:00:00Z', branch: 'feature/x', commit: 'b',
    tier: 'gate', totalDurationMs: 4000, totalCostUsd: 0.18,
    results: [
      { name: 'test-1', passed: true, durationMs: 800, tier: 'gate' },
      { name: 'test-2', passed: false, durationMs: 1500, tier: 'gate' },
      { name: 'test-3', passed: true, durationMs: 1700, tier: 'gate' },
    ],
  };

  it('should detect regressions (passed → failed)', () => {
    const comparison = compareRuns(runA, runB);
    expect(comparison.regressions).toContain('test-2');
  });

  it('should detect fixes (failed → passed)', () => {
    const comparison = compareRuns(runA, runB);
    expect(comparison.fixes).toContain('test-3');
  });

  it('should detect stable tests (same result)', () => {
    const comparison = compareRuns(runA, runB);
    expect(comparison.stable).toContain('test-1');
  });

  it('should calculate pass rate delta', () => {
    const comparison = compareRuns(runA, runB);
    // runA: 2/3 = 66.7%, runB: 2/3 = 66.7% → delta 0
    expect(comparison.passRateDelta).toBe(0);
  });

  it('should calculate cost delta', () => {
    const comparison = compareRuns(runA, runB);
    expect(comparison.costDelta).toBeCloseTo(-0.02, 2);
  });
});

describe('EvalTier filtering', () => {
  it('should filter results by tier', () => {
    const run: EvalRun = {
      id: 'run-mixed', ts: new Date().toISOString(), branch: 'main', commit: 'x',
      tier: 'all', totalDurationMs: 10000, totalCostUsd: 1.0,
      results: [
        { name: 'safety-check', passed: true, durationMs: 500, tier: 'gate' },
        { name: 'quality-bench', passed: true, durationMs: 5000, tier: 'periodic' },
        { name: 'codex-e2e', passed: false, durationMs: 4500, tier: 'periodic' },
      ],
    };

    const gateOnly = run.results.filter(r => r.tier === 'gate');
    expect(gateOnly).toHaveLength(1);
    expect(gateOnly[0].name).toBe('safety-check');

    const periodicOnly = run.results.filter(r => r.tier === 'periodic');
    expect(periodicOnly).toHaveLength(2);
  });
});
