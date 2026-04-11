/**
 * Cost Tracker — Per-session token and cost tracking
 *
 * Records each LLM call's token usage and cost.
 * Provides per-model breakdown and budget enforcement.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── 모델별 가격 상수 ───────────────────────────────────────────────────────────

/**
 * Anthropic 모델별 공식 가격 ($/M tokens, 2026-04 기준)
 * 가격 변동 시 이 객체만 업데이트하면 됨
 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadMultiplier: number;   // input 대비 (보통 0.1)
  cacheWriteMultiplier: number;  // input 대비 (보통 1.25)
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6': {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheReadMultiplier: 0.1,
    cacheWriteMultiplier: 1.25,
  },
  'claude-sonnet-4-6': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheReadMultiplier: 0.1,
    cacheWriteMultiplier: 1.25,
  },
  'claude-haiku-4-5-20251001': {
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheReadMultiplier: 0.1,
    cacheWriteMultiplier: 1.25,
  },
  // 별칭 (모델 ID만 다른 경우)
  'claude-haiku-4-5': {
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheReadMultiplier: 0.1,
    cacheWriteMultiplier: 1.25,
  },
};

/**
 * 토큰 사용량을 USD 비용으로 환산
 *
 * 입력 형식은 Anthropic API의 usage 객체 또는 iterations[] 엔트리 둘 다 지원.
 * 모델이 MODEL_PRICING에 없으면 fallback으로 Sonnet 가격 사용 + console.warn (개발 편의).
 *
 * @param params.model - 모델 ID
 * @param params.inputTokens - 순수 입력 토큰
 * @param params.outputTokens - 출력 토큰
 * @param params.cacheReadInputTokens - 캐시 히트 토큰 (0.1x 할인)
 * @param params.cacheCreationInputTokens - 캐시 쓰기 토큰 (1.25x 할증)
 * @returns USD 비용 (소수점 6자리)
 */
export function estimateCostUsd(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}): number {
  const pricing = MODEL_PRICING[params.model] ?? MODEL_PRICING['claude-sonnet-4-6'];
  if (!MODEL_PRICING[params.model]) {
    console.warn(`[cost-tracker] 미등록 모델 "${params.model}" — Sonnet 가격으로 fallback`);
  }

  const MILLION = 1_000_000;
  const inputCost = (params.inputTokens * pricing.inputPerMillion) / MILLION;
  const outputCost = (params.outputTokens * pricing.outputPerMillion) / MILLION;
  const cacheReadCost =
    ((params.cacheReadInputTokens ?? 0) * pricing.inputPerMillion * pricing.cacheReadMultiplier) / MILLION;
  const cacheWriteCost =
    ((params.cacheCreationInputTokens ?? 0) * pricing.inputPerMillion * pricing.cacheWriteMultiplier) / MILLION;

  return Number((inputCost + outputCost + cacheReadCost + cacheWriteCost).toFixed(6));
}

/**
 * Anthropic advisor tool 응답의 usage.iterations[] 전체를 합산해 USD로 환산.
 * executor 모델과 advisor 모델이 다를 수 있으므로 이터레이션마다 가격 조회.
 *
 * iterations entry 형태:
 *   { type: 'message', input_tokens, output_tokens, cache_read_input_tokens?, cache_creation_input_tokens? }
 *   { type: 'advisor_message', model: 'claude-opus-4-6', input_tokens, output_tokens, ... }
 *
 * 'message' 타입은 executorModel 파라미터를 사용, 'advisor_message' 타입은 자체 model 필드 사용.
 */
export function estimateIterationsCostUsd(
  iterations: Array<{
    type: string;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  }>,
  executorModel: string
): number {
  let total = 0;
  for (const iter of iterations) {
    const model = iter.type === 'advisor_message' ? (iter.model ?? 'claude-opus-4-6') : executorModel;
    total += estimateCostUsd({
      model,
      inputTokens: iter.input_tokens ?? 0,
      outputTokens: iter.output_tokens ?? 0,
      cacheReadInputTokens: iter.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: iter.cache_creation_input_tokens ?? 0,
    });
  }
  return Number(total.toFixed(6));
}

export interface CostRecord {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: string;
  ts?: string;
  advisorCalls?: number;
  advisorInputTokens?: number;
  advisorOutputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  layer?: 'A' | 'B';
  phase?: 'pre-check' | 'exec' | 'guardrail' | 'reviewer' | 'judge' | 'moa-r1' | 'moa-r2' | 'moa-r3';
  skipReason?: 'pre-check-skip' | 'reviewer-skip' | 'judge-skip' | null;
  abVariant?: 'advisor-on' | 'advisor-off' | null;
}

export interface ModelBreakdown {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  callCount: number;
}

export interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  callCount: number;
  byModel: Record<string, ModelBreakdown>;
  preCheckSkipRate: number;
  reviewerCallRate: number;
  judgeCallRate: number;
  moaAvgRounds: number;
  advisorCallAvg: number;
  cacheHitRate: number;
}

export interface CostTrackerOptions {
  budgetUsd?: number;
}

const COST_FILE = 'session-costs.json';

export class CostTracker {
  private records: CostRecord[] = [];
  private dir: string;
  private budget: number | undefined;

  constructor(dir: string, opts?: CostTrackerOptions) {
    this.dir = dir;
    this.budget = opts?.budgetUsd;
  }

  record(entry: CostRecord): void {
    this.records.push({ ...entry, ts: entry.ts ?? new Date().toISOString() });
  }

  getSummary(): CostSummary {
    const byModel: Record<string, ModelBreakdown> = {};
    let totalIn = 0, totalOut = 0, totalCost = 0;

    for (const r of this.records) {
      totalIn += r.inputTokens;
      totalOut += r.outputTokens;
      totalCost += r.costUsd;

      if (!byModel[r.model]) {
        byModel[r.model] = { inputTokens: 0, outputTokens: 0, costUsd: 0, callCount: 0 };
      }
      byModel[r.model].inputTokens += r.inputTokens;
      byModel[r.model].outputTokens += r.outputTokens;
      byModel[r.model].costUsd += r.costUsd;
      byModel[r.model].callCount++;
    }

    const n = this.records.length;

    const preCheckSkips = this.records.filter(r => r.skipReason === 'pre-check-skip').length;
    const reviewerCalls = this.records.filter(r => r.phase === 'reviewer').length;
    const judgeCalls    = this.records.filter(r => r.phase === 'judge').length;

    const moaRecords = this.records.filter(r => r.phase?.startsWith('moa-r'));
    const moaRoundNums = moaRecords.map(r => {
      const m = r.phase?.match(/moa-r(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const moaAvgRounds = moaRoundNums.length > 0
      ? moaRoundNums.reduce((a, b) => a + b, 0) / moaRoundNums.length
      : 0;

    const totalAdvisorCalls = this.records.reduce((s, r) => s + (r.advisorCalls ?? 0), 0);
    const advisorCallAvg = n > 0 ? totalAdvisorCalls / n : 0;

    const totalCacheRead  = this.records.reduce((s, r) => s + (r.cacheReadInputTokens ?? 0), 0);
    const totalAdvisorIn  = this.records.reduce((s, r) => s + (r.advisorInputTokens ?? 0), 0);
    const cacheDenom = totalCacheRead + totalAdvisorIn;
    const cacheHitRate = cacheDenom > 0 ? totalCacheRead / cacheDenom : 0;

    return {
      totalInputTokens: totalIn,
      totalOutputTokens: totalOut,
      totalCostUsd: totalCost,
      callCount: n,
      byModel,
      preCheckSkipRate: n > 0 ? preCheckSkips / n : 0,
      reviewerCallRate: n > 0 ? reviewerCalls / n : 0,
      judgeCallRate:    n > 0 ? judgeCalls / n : 0,
      moaAvgRounds,
      advisorCallAvg,
      cacheHitRate,
    };
  }

  save(): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, COST_FILE), JSON.stringify(this.records, null, 2));
  }

  load(): void {
    const file = path.join(this.dir, COST_FILE);
    if (!fs.existsSync(file)) return;
    this.records = JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  isOverBudget(): boolean {
    if (this.budget === undefined) return false;
    return this.getSummary().totalCostUsd > this.budget;
  }

  getBudgetRemaining(): number {
    if (this.budget === undefined) return Infinity;
    return this.budget - this.getSummary().totalCostUsd;
  }
}
