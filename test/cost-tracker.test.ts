import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CostTracker,
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
});
