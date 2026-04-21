// RFC-006 Phase 2 Budget Tracker — TDD
import { describe, it, expect, afterEach } from 'vitest';
import {
  isBudgetAwareEnabled,
  estimateToolCost,
  createBudgetState,
  recordToolCost,
  decideBudgetAction,
  mergeCosts,
  mergeCostsFromSummary,
} from '../lib/budget-tracker.js';

describe('RFC-006 Phase 2 Budget Tracker', () => {
  afterEach(() => {
    delete process.env.A_TEAM_BUDGET_AWARE;
  });

  describe('Opt-in', () => {
    it('isBudgetAwareEnabled default false', () => {
      delete process.env.A_TEAM_BUDGET_AWARE;
      expect(isBudgetAwareEnabled()).toBe(false);
    });

    it('true when A_TEAM_BUDGET_AWARE=1', () => {
      process.env.A_TEAM_BUDGET_AWARE = '1';
      expect(isBudgetAwareEnabled()).toBe(true);
    });
  });

  describe('estimateToolCost', () => {
    it('ripgrep is cheap (<$0.001)', () => {
      const est = estimateToolCost('ripgrep');
      expect(est.estimatedUsd).toBeLessThan(0.001);
    });

    it('Agent (subagent) is most expensive (>=$0.1)', () => {
      const est = estimateToolCost('Agent');
      expect(est.estimatedUsd).toBeGreaterThanOrEqual(0.1);
    });

    it('unknown tool uses default', () => {
      const est = estimateToolCost('nonexistent');
      expect(est.estimatedUsd).toBe(0.01);
    });
  });

  describe('BudgetState', () => {
    it('createBudgetState initializes correctly', () => {
      const s = createBudgetState(10);
      expect(s.totalUsd).toBe(10);
      expect(s.remainingUsd).toBe(10);
      expect(s.spentByPhase).toEqual({});
    });

    it('recordToolCost updates remaining and breakdowns', () => {
      const s0 = createBudgetState(5);
      const s1 = recordToolCost(s0, 'Grep', 0.003, 'exec');
      expect(s1.remainingUsd).toBeCloseTo(4.997, 3);
      expect(s1.spentByPhase.exec).toBeCloseTo(0.003, 3);
      expect(s1.spentByTool.Grep).toBeCloseTo(0.003, 3);
    });

    it('remainingUsd never goes below 0', () => {
      const s0 = createBudgetState(0.001);
      const s1 = recordToolCost(s0, 'Agent', 0.15, 'exec');
      expect(s1.remainingUsd).toBe(0);
    });
  });

  describe('mergeCosts (budget × cost-tracker integration)', () => {
    it('combines LLM + tool costs', () => {
      const budget = createBudgetState(10);
      const s1 = recordToolCost(budget, 'Grep', 0.003, 'exec');
      const s2 = recordToolCost(s1, 'WebFetch', 0.02, 'exec');
      const merged = mergeCosts(s2, 1.25);
      expect(merged.llmUsd).toBe(1.25);
      expect(merged.toolUsd).toBeCloseTo(0.023, 3);
      expect(merged.total).toBeCloseTo(1.273, 3);
      expect(merged.toolBreakdown.Grep).toBeCloseTo(0.003, 3);
    });

    it('handles empty budget state', () => {
      const merged = mergeCosts(createBudgetState(5), 0);
      expect(merged.total).toBe(0);
      expect(merged.toolBreakdown).toEqual({});
    });
  });

  describe('mergeCostsFromSummary (CostSummary 직수신)', () => {
    it('basic: combines tool + LLM summary into CombinedSessionCost', () => {
      const budget = createBudgetState(10);
      const s1 = recordToolCost(budget, 'Bash', 0.005, 'exec');
      const s2 = recordToolCost(s1, 'Read', 0.002, 'exec');
      const summary = {
        totalCostUsd: 2.5,
        callCount: 42,
        cacheHitRate: 0.0,
        byModel: {},
      };
      const combined = mergeCostsFromSummary(s2, summary);
      expect(combined.llmUsd).toBe(2.5);
      expect(combined.toolUsd).toBeCloseTo(0.007, 3);
      expect(combined.total).toBeCloseTo(2.507, 3);
      expect(combined.budgetRemaining).toBeCloseTo(9.993, 3);
      expect(combined.llmCallCount).toBe(42);
    });

    it('with byModel breakdown: preserves per-model cost and callCount', () => {
      const budget = createBudgetState(5);
      const s1 = recordToolCost(budget, 'Agent', 0.15, 'plan');
      const summary = {
        totalCostUsd: 3.0,
        callCount: 100,
        cacheHitRate: 0.35,
        byModel: {
          'claude-sonnet-4-20250514': { costUsd: 2.0, callCount: 60 },
          'claude-haiku-3': { costUsd: 1.0, callCount: 40 },
        },
      };
      const combined = mergeCostsFromSummary(s1, summary);
      expect(combined.llmByModel).toBeDefined();
      expect(combined.llmByModel!['claude-sonnet-4-20250514']).toEqual({
        costUsd: 2.0,
        callCount: 60,
      });
      expect(combined.llmByModel!['claude-haiku-3']).toEqual({
        costUsd: 1.0,
        callCount: 40,
      });
      expect(combined.toolBreakdown.Agent).toBeCloseTo(0.15, 2);
      expect(combined.total).toBeCloseTo(3.15, 2);
    });

    it('cache hit rate: propagates cacheHitRate from summary', () => {
      const budget = createBudgetState(5);
      const summary = {
        totalCostUsd: 0.5,
        callCount: 20,
        cacheHitRate: 0.72,
        byModel: {
          'claude-sonnet-4-20250514': { costUsd: 0.5, callCount: 20 },
        },
      };
      const combined = mergeCostsFromSummary(budget, summary);
      expect(combined.cacheHitRate).toBe(0.72);
      expect(combined.llmCallCount).toBe(20);
      // No tool costs recorded — toolUsd should be 0
      expect(combined.toolUsd).toBe(0);
      expect(combined.total).toBe(0.5);
    });
  });

  describe('decideBudgetAction', () => {
    it('halt when budget exhausted', () => {
      const s = createBudgetState(0);
      expect(decideBudgetAction(s, 'Grep', 0.9)).toBe('halt');
    });

    it('halt when tool cost exceeds remaining', () => {
      const s = createBudgetState(0.001);
      expect(decideBudgetAction(s, 'Agent', 0.9)).toBe('halt');
    });

    it('proceed for cheap tool with budget', () => {
      const s = createBudgetState(5);
      expect(decideBudgetAction(s, 'ripgrep', 0.9)).toBe('proceed');
    });

    it('cheaper when low confidence + expensive tool', () => {
      const s = createBudgetState(5);
      expect(decideBudgetAction(s, 'Agent', 0.5)).toBe('cheaper');
    });

    it('proceed when confidence high', () => {
      const s = createBudgetState(5);
      expect(decideBudgetAction(s, 'Agent', 0.95)).toBe('proceed');
    });
  });
});
