/**
 * RFC-006 Phase 2 — Budget-Aware Tool Routing
 *
 * PreToolUse/PostToolUse hook에서 tool call 비용 추정/집계.
 * PIOP 프로토콜에 budget 필드 추가 가능.
 * Opt-in via A_TEAM_BUDGET_AWARE env (default=0).
 *
 * Governance: rfc/RFC-006-cost-routing.md, MANIFEST.md G5 compliance.
 * Reference: arXiv 2511.17006 Budget-Aware Tool-Use.
 */

export interface ToolCostEstimate {
  tool: string;
  estimatedUsd: number;
  estimatedTokens: number;
}

export interface BudgetState {
  totalUsd: number;
  remainingUsd: number;
  spentByPhase: Record<string, number>;
  spentByTool: Record<string, number>;
  lastUpdate: number; // epoch ms
}

// Tool 원가 테이블 (대략 실측 기반 근사, Phase 2에서 실측 보정)
// 단위: USD per invocation
const TOOL_COST_TABLE: Record<string, number> = {
  // Cheap tools (classical, near-zero LLM cost)
  ripgrep: 0.0001,
  fd: 0.0001,
  jq: 0.0005,
  yq: 0.0005,
  'ast-grep': 0.001,

  // Medium
  Read: 0.002,
  Write: 0.003,
  Edit: 0.003,
  Grep: 0.003,
  Glob: 0.002,
  Bash: 0.005,

  // Expensive (LLM-intensive)
  WebFetch: 0.02,
  WebSearch: 0.01,
  Agent: 0.15, // subagent 호출 — 가장 비쌈
  Task: 0.15,

  // Default (unknown tool)
  _default: 0.01,
};

export function isBudgetAwareEnabled(): boolean {
  return process.env.A_TEAM_BUDGET_AWARE === '1' || process.env.A_TEAM_BUDGET_AWARE === 'true';
}

export function estimateToolCost(tool: string): ToolCostEstimate {
  const cost = TOOL_COST_TABLE[tool] ?? TOOL_COST_TABLE._default;
  // Rough tokens estimate (Anthropic Sonnet @ $3.75/M input + $18.75/M output, avg blend)
  const tokens = Math.round(cost / 0.0000115);
  return { tool, estimatedUsd: cost, estimatedTokens: tokens };
}

export function createBudgetState(totalUsd = 5.0): BudgetState {
  return {
    totalUsd,
    remainingUsd: totalUsd,
    spentByPhase: {},
    spentByTool: {},
    lastUpdate: Date.now(),
  };
}

export function recordToolCost(
  state: BudgetState,
  tool: string,
  actualUsd: number,
  phase = 'exec'
): BudgetState {
  const next: BudgetState = {
    ...state,
    remainingUsd: Math.max(0, state.remainingUsd - actualUsd),
    spentByPhase: {
      ...state.spentByPhase,
      [phase]: (state.spentByPhase[phase] ?? 0) + actualUsd,
    },
    spentByTool: {
      ...state.spentByTool,
      [tool]: (state.spentByTool[tool] ?? 0) + actualUsd,
    },
    lastUpdate: Date.now(),
  };
  return next;
}

export type BudgetDecision = 'proceed' | 'cheaper' | 'halt';

/**
 * Decide next action based on budget + confidence.
 * - Budget 고갈 → halt
 * - Tool이 LLM cost의 10% 미만이고 budget 충분 → proceed (cheap tool)
 * - 불확실 + budget 있음 → cheaper (cheap tool 먼저 시도)
 */
export function decideBudgetAction(
  state: BudgetState,
  tool: string,
  confidence: number
): BudgetDecision {
  if (state.remainingUsd <= 0) return 'halt';

  const est = estimateToolCost(tool);
  if (state.remainingUsd < est.estimatedUsd) return 'halt';

  const llmCost = TOOL_COST_TABLE.Agent;
  const isCheap = est.estimatedUsd < llmCost * 0.1;

  if (isCheap && state.remainingUsd > 0.01) return 'proceed';
  if (confidence < 0.7 && state.remainingUsd > 0.05) return 'cheaper';
  return 'proceed';
}
