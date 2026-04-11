/**
 * Cost Tracker — Per-session token and cost tracking
 *
 * Records each LLM call's token usage and cost.
 * Provides per-model breakdown and budget enforcement.
 */

import * as fs from 'fs';
import * as path from 'path';

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
