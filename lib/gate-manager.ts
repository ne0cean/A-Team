/**
 * Quality Gate Manager — Phase-level quality gates with 3 verdicts
 *
 * Each gate defines pass/retry/fail conditions using metric thresholds.
 * Fail takes precedence over retry. Pass requires ALL pass conditions met.
 */

export type GateVerdict = 'pass' | 'retry' | 'fail';
export type ComparisonOp = '>=' | '<=' | '===' | '<' | '>';

export interface GateCondition {
  metric: string;
  op: ComparisonOp;
  value: number;
}

export interface GateDefinition {
  pass: GateCondition[];
  retry: GateCondition[];
  fail: GateCondition[];
}

export type GateMetrics = Record<string, number>;

export interface GateResult {
  verdict: GateVerdict;
  failedConditions: GateCondition[];
  metrics: GateMetrics;
}

function evaluate(condition: GateCondition, metrics: GateMetrics): boolean {
  const actual = metrics[condition.metric];
  if (actual === undefined) return false;
  switch (condition.op) {
    case '>=': return actual >= condition.value;
    case '<=': return actual <= condition.value;
    case '===': return actual === condition.value;
    case '<': return actual < condition.value;
    case '>': return actual > condition.value;
    default: return false;
  }
}

export function evaluateGate(gate: GateDefinition, metrics: GateMetrics): GateResult {
  // Fail conditions checked first (highest precedence)
  for (const cond of gate.fail) {
    if (evaluate(cond, metrics)) {
      return { verdict: 'fail', failedConditions: [cond], metrics };
    }
  }

  // Retry conditions
  const retryHits = gate.retry.filter(c => evaluate(c, metrics));
  if (retryHits.length > 0) {
    return { verdict: 'retry', failedConditions: retryHits, metrics };
  }

  // Pass: all conditions must be true (empty = pass)
  const passFails = gate.pass.filter(c => !evaluate(c, metrics));
  if (passFails.length > 0) {
    return { verdict: 'retry', failedConditions: passFails, metrics };
  }

  return { verdict: 'pass', failedConditions: [], metrics };
}
