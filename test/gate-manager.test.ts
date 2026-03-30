import { describe, it, expect } from 'vitest';
import {
  evaluateGate,
  type GateDefinition,
  type GateMetrics,
  type GateVerdict,
} from '../lib/gate-manager.js';

const DESIGN_GATE: GateDefinition = {
  pass: [
    { metric: 'completeness', op: '>=', value: 80 },
    { metric: 'compliance', op: '>=', value: 70 },
  ],
  retry: [
    { metric: 'completeness', op: '<', value: 80 },
  ],
  fail: [
    { metric: 'completeness', op: '<', value: 40 },
  ],
};

describe('evaluateGate', () => {
  it('should return pass when all pass conditions met', () => {
    const metrics: GateMetrics = { completeness: 90, compliance: 85 };
    const result = evaluateGate(DESIGN_GATE, metrics);
    expect(result.verdict).toBe('pass');
  });

  it('should return retry when retry condition matched but not fail', () => {
    const metrics: GateMetrics = { completeness: 60, compliance: 75 };
    const result = evaluateGate(DESIGN_GATE, metrics);
    expect(result.verdict).toBe('retry');
  });

  it('should return fail when fail condition matched', () => {
    const metrics: GateMetrics = { completeness: 30, compliance: 50 };
    const result = evaluateGate(DESIGN_GATE, metrics);
    expect(result.verdict).toBe('fail');
  });

  it('should fail takes precedence over retry', () => {
    const metrics: GateMetrics = { completeness: 35, compliance: 80 };
    const result = evaluateGate(DESIGN_GATE, metrics);
    expect(result.verdict).toBe('fail');
  });

  it('should include failing conditions in result', () => {
    const metrics: GateMetrics = { completeness: 50, compliance: 75 };
    const result = evaluateGate(DESIGN_GATE, metrics);
    expect(result.failedConditions.length).toBeGreaterThan(0);
    expect(result.failedConditions[0].metric).toBe('completeness');
  });

  it('should handle empty gate definitions', () => {
    const emptyGate: GateDefinition = { pass: [], retry: [], fail: [] };
    const result = evaluateGate(emptyGate, {});
    expect(result.verdict).toBe('pass');
  });

  it('should support all comparison operators', () => {
    const gate: GateDefinition = {
      pass: [{ metric: 'issues', op: '===', value: 0 }],
      retry: [{ metric: 'issues', op: '>', value: 0 }],
      fail: [{ metric: 'issues', op: '>', value: 3 }],
    };

    expect(evaluateGate(gate, { issues: 0 }).verdict).toBe('pass');
    expect(evaluateGate(gate, { issues: 2 }).verdict).toBe('retry');
    expect(evaluateGate(gate, { issues: 5 }).verdict).toBe('fail');
  });
});
