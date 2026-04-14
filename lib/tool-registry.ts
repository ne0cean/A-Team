/**
 * Tool Registry — RFC-003 × RFC-006 Cross-RFC 통합
 *
 * Haiku는 tool_search 미지원 → Haiku tier-2 subagent는 non-deferred catalog 사용.
 * Sonnet/Opus tier → defer_loading 활용.
 *
 * 이 모듈은 모델별 tool list를 해석하여 올바른 catalog를 반환한다.
 *
 * Governance: governance/rules/tool-search.md §6 (Haiku 미지원 fallback)
 * Reference: rfc/RFC-003-toolsearch-artifact.md, rfc/RFC-006-cost-routing.md
 */

import type { CascadeModel } from './cascade-gate.js';

export interface McpTool {
  name: string;
  description?: string;
  defer_loading?: boolean;
  [key: string]: unknown;
}

export interface ResolvedToolset {
  tools: McpTool[];
  model: CascadeModel;
  /** Haiku의 경우 defer_loading 무시 → 전체 로드 */
  defer_applied: boolean;
  /** 로드된 tool 수 (non-deferred + deferred) */
  loaded_count: number;
}

/**
 * 모델별 tool catalog 해석.
 *
 * @param tools 전체 MCP tool 목록 (.mcp.json 기준)
 * @param model 현재 사용 중인 모델 (Cascade에서 결정)
 * @returns 실제 로드할 tool 목록
 */
export function resolveToolset(tools: McpTool[], model: CascadeModel): ResolvedToolset {
  // Haiku는 tool_search 미지원 → defer_loading 무시, 전체 로드
  if (model === 'haiku') {
    return {
      tools: tools.map(t => ({ ...t, defer_loading: false })),
      model,
      defer_applied: false,
      loaded_count: tools.length,
    };
  }

  // Sonnet/Opus는 defer_loading 준수
  const nonDeferred = tools.filter(t => !t.defer_loading);
  const deferred = tools.filter(t => t.defer_loading === true);

  return {
    tools: [
      ...nonDeferred,
      // Deferred tools는 tool_search가 on-demand로 로드 (초기에는 제외)
    ],
    model,
    defer_applied: true,
    loaded_count: nonDeferred.length + deferred.length, // 카탈로그 총량
  };
}

/**
 * Tool catalog 분석 — 최적화 가이드용.
 */
export function analyzeToolCatalog(tools: McpTool[]): {
  total: number;
  non_deferred: number;
  deferred: number;
  recommendation: string;
} {
  const nonDeferred = tools.filter(t => !t.defer_loading).length;
  const deferred = tools.filter(t => t.defer_loading === true).length;
  const total = tools.length;

  let recommendation = '';
  if (total < 5) {
    recommendation = 'Tool 수가 적어 defer_loading 이득 미미. 그대로 유지 권장.';
  } else if (nonDeferred > 5) {
    recommendation = `Hot tools ${nonDeferred}개 — 3-5개로 축소 권장 (tool-search.md §1).`;
  } else if (deferred === 0) {
    recommendation = 'defer_loading 미적용. RFC-003 효과 없음.';
  } else {
    recommendation = 'Balanced: Hot 3-5 + deferred nn 구성 양호.';
  }

  return { total, non_deferred: nonDeferred, deferred, recommendation };
}
