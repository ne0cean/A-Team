/**
 * RFC-006 Cascade Gate — Cascade Routing (Haiku→Sonnet→Opus) 결정 로직
 *
 * bkit gate-manager(P2) 확장. 기본 gate-manager는 교체하지 않고 별도 모듈로 추가.
 * Opt-in via A_TEAM_CASCADE env (default="0", off).
 *
 * Governance: rfc/RFC-006-cost-routing.md, MANIFEST.md G5/G7
 */

import type { GateDefinition, GateMetrics, GateVerdict, GateResult } from './gate-manager.js';
import { evaluateGate } from './gate-manager.js';

export interface CascadeMetrics extends GateMetrics {
  confidence: number;                  // 0..1 self-assess
  output_validation_pass: 0 | 1;
  tool_call_depth: number;
  budget_remaining_usd: number;
  escalation_count: number;
}

export type CascadeModel = 'haiku' | 'sonnet' | 'opus';

/**
 * Default cascade gate definition.
 * pass → 현 model 유지
 * retry → escalate (Haiku→Sonnet→Opus)
 * fail → halt (budget 고갈 or thrashing)
 */
export const CASCADE_GATE: GateDefinition = {
  pass: [
    { metric: 'confidence', op: '>=', value: 0.85 },
    { metric: 'output_validation_pass', op: '===', value: 1 },
    { metric: 'tool_call_depth', op: '<=', value: 3 },
  ],
  retry: [
    { metric: 'confidence', op: '<', value: 0.70 },
  ],
  fail: [
    { metric: 'escalation_count', op: '>', value: 5 },
    { metric: 'budget_remaining_usd', op: '<=', value: 0 },
  ],
};

/**
 * Determine next model based on current model + verdict.
 */
export function nextModel(current: CascadeModel, verdict: GateVerdict): CascadeModel | 'halt' {
  if (verdict === 'fail') return 'halt';
  if (verdict === 'pass') return current;
  // retry: escalate
  if (current === 'haiku') return 'sonnet';
  if (current === 'sonnet') return 'opus';
  return 'opus'; // already opus, stay
}

/**
 * Check if cascade routing is enabled.
 */
export function isCascadeEnabled(): boolean {
  return process.env.A_TEAM_CASCADE === '1' || process.env.A_TEAM_CASCADE === 'true';
}

/**
 * Select initial model based on subagent frontmatter or default.
 */
export function selectInitialModel(
  preferredModel?: string,
  modelCascadeEnabled?: boolean
): CascadeModel {
  if (!isCascadeEnabled() || !modelCascadeEnabled) {
    // cascade 비활성 시 preferred_model 우선, 없으면 sonnet
    if (preferredModel === 'haiku' || preferredModel === 'sonnet' || preferredModel === 'opus') {
      return preferredModel;
    }
    return 'sonnet';
  }
  // cascade 활성 시 preferred_model부터 시작 (일반적으로 haiku)
  if (preferredModel === 'haiku' || preferredModel === 'sonnet' || preferredModel === 'opus') {
    return preferredModel;
  }
  return 'haiku'; // cascade default starts with cheapest
}

/**
 * Evaluate cascade decision.
 */
export function evaluateCascade(
  metrics: CascadeMetrics,
  current: CascadeModel
): { verdict: GateVerdict; next: CascadeModel | 'halt'; result: GateResult } {
  const result = evaluateGate(CASCADE_GATE, metrics);
  const next = nextModel(current, result.verdict);
  return { verdict: result.verdict, next, result };
}
