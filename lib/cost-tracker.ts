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

    return {
      totalInputTokens: totalIn,
      totalOutputTokens: totalOut,
      totalCostUsd: totalCost,
      callCount: this.records.length,
      byModel,
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
