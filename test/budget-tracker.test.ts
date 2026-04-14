// RFC-006 Phase 2 Budget Tracker — TDD
import { describe, it, expect, afterEach } from 'vitest';
import {
  isBudgetAwareEnabled,
  estimateToolCost,
  createBudgetState,
  recordToolCost,
  decideBudgetAction,
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
