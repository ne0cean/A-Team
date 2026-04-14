// RFC-006 Cascade Gate — TDD
import { describe, it, expect, afterEach } from 'vitest';
import {
  CASCADE_GATE,
  nextModel,
  isCascadeEnabled,
  selectInitialModel,
  evaluateCascade,
  type CascadeMetrics,
} from '../lib/cascade-gate.js';

describe('RFC-006 Cascade Gate', () => {
  afterEach(() => {
    delete process.env.A_TEAM_CASCADE;
  });

  describe('Opt-in behavior (Criterion 8)', () => {
    it('isCascadeEnabled returns false by default', () => {
      delete process.env.A_TEAM_CASCADE;
      expect(isCascadeEnabled()).toBe(false);
    });

    it('returns true when A_TEAM_CASCADE=1', () => {
      process.env.A_TEAM_CASCADE = '1';
      expect(isCascadeEnabled()).toBe(true);
    });

    it('returns true when A_TEAM_CASCADE=true', () => {
      process.env.A_TEAM_CASCADE = 'true';
      expect(isCascadeEnabled()).toBe(true);
    });
  });

  describe('selectInitialModel', () => {
    it('defaults to sonnet when cascade disabled and no preference', () => {
      delete process.env.A_TEAM_CASCADE;
      expect(selectInitialModel()).toBe('sonnet');
    });

    it('respects preferred_model when cascade disabled', () => {
      delete process.env.A_TEAM_CASCADE;
      expect(selectInitialModel('opus')).toBe('opus');
    });

    it('starts with haiku when cascade enabled (no preference)', () => {
      process.env.A_TEAM_CASCADE = '1';
      expect(selectInitialModel(undefined, true)).toBe('haiku');
    });

    it('respects preferred_model even when cascade enabled', () => {
      process.env.A_TEAM_CASCADE = '1';
      expect(selectInitialModel('sonnet', true)).toBe('sonnet');
    });
  });

  describe('nextModel transitions', () => {
    it('escalates haiku → sonnet on retry', () => {
      expect(nextModel('haiku', 'retry')).toBe('sonnet');
    });

    it('escalates sonnet → opus on retry', () => {
      expect(nextModel('sonnet', 'retry')).toBe('opus');
    });

    it('stays at opus on retry (already highest)', () => {
      expect(nextModel('opus', 'retry')).toBe('opus');
    });

    it('stays at current on pass', () => {
      expect(nextModel('sonnet', 'pass')).toBe('sonnet');
    });

    it('halts on fail', () => {
      expect(nextModel('sonnet', 'fail')).toBe('halt');
    });
  });

  describe('evaluateCascade (RED-1, RED-2, RED-3)', () => {
    // RED-1: Confidence Escalation
    it('RED-1: low confidence + valid output + low depth → retry', () => {
      const metrics: CascadeMetrics = {
        confidence: 0.60,
        output_validation_pass: 1,
        tool_call_depth: 2,
        budget_remaining_usd: 5.0,
        escalation_count: 0,
      };
      const { verdict, next } = evaluateCascade(metrics, 'haiku');
      expect(verdict).toBe('retry');
      expect(next).toBe('sonnet');
    });

    // RED-2: Validation Fail
    it('RED-2: confidence high but validation fails → escalate via retry/fail path', () => {
      const metrics: CascadeMetrics = {
        confidence: 0.90,
        output_validation_pass: 0, // fail
        tool_call_depth: 1,
        budget_remaining_usd: 5.0,
        escalation_count: 0,
      };
      const { verdict } = evaluateCascade(metrics, 'haiku');
      // pass 조건 미충족 (validation fail) → retry (explicit retry condition 없으면 "not pass")
      // gate-manager evaluateGate는 pass 3조건 중 하나만 빠져도 pass 아님
      expect(verdict).not.toBe('pass');
    });

    // RED-3: Budget Halt
    it('RED-3: budget exhausted → fail', () => {
      const metrics: CascadeMetrics = {
        confidence: 0.90,
        output_validation_pass: 1,
        tool_call_depth: 2,
        budget_remaining_usd: 0,
        escalation_count: 0,
      };
      const { verdict, next } = evaluateCascade(metrics, 'sonnet');
      expect(verdict).toBe('fail');
      expect(next).toBe('halt');
    });

    // Thrashing protection
    it('fail when escalation_count > 5', () => {
      const metrics: CascadeMetrics = {
        confidence: 0.50,
        output_validation_pass: 1,
        tool_call_depth: 2,
        budget_remaining_usd: 5.0,
        escalation_count: 6,
      };
      const { verdict, next } = evaluateCascade(metrics, 'opus');
      expect(verdict).toBe('fail');
      expect(next).toBe('halt');
    });

    // Happy path — pass
    it('pass when all conditions met', () => {
      const metrics: CascadeMetrics = {
        confidence: 0.95,
        output_validation_pass: 1,
        tool_call_depth: 2,
        budget_remaining_usd: 5.0,
        escalation_count: 0,
      };
      const { verdict, next } = evaluateCascade(metrics, 'haiku');
      expect(verdict).toBe('pass');
      expect(next).toBe('haiku');
    });
  });

  describe('CASCADE_GATE structure', () => {
    it('has pass, retry, fail conditions', () => {
      expect(CASCADE_GATE.pass).toBeDefined();
      expect(CASCADE_GATE.retry).toBeDefined();
      expect(CASCADE_GATE.fail).toBeDefined();
      expect(CASCADE_GATE.pass.length).toBeGreaterThan(0);
    });
  });
});
