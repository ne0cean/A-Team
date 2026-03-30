/**
 * Eval Store — Eval run persistence and comparison
 *
 * Stores eval runs as JSON files, supports listing, loading, and comparing.
 * Two-tier system: gate (blocks merge) and periodic (weekly/manual).
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

export type EvalTier = 'gate' | 'periodic' | 'all';

export interface EvalResult {
  name: string;
  passed: boolean;
  durationMs: number;
  tier: 'gate' | 'periodic';
  error?: string;
  score?: number;
}

export interface EvalRun {
  id: string;
  ts: string;
  branch: string;
  commit: string;
  tier: EvalTier;
  results: EvalResult[];
  totalDurationMs: number;
  totalCostUsd: number;
}

export interface RunComparison {
  regressions: string[];  // passed → failed
  fixes: string[];        // failed → passed
  stable: string[];       // same result
  newTests: string[];     // only in runB
  removedTests: string[]; // only in runA
  passRateDelta: number;  // runB% - runA%
  costDelta: number;      // runB$ - runA$
}

// --- Store ---

export class EvalStore {
  private dir: string;

  constructor(baseDir: string) {
    this.dir = baseDir;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  save(run: EvalRun): void {
    const filePath = path.join(this.dir, `${run.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(run, null, 2));
  }

  load(id: string): EvalRun | undefined {
    const filePath = path.join(this.dir, `${id}.json`);
    if (!fs.existsSync(filePath)) return undefined;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as EvalRun;
  }

  list(): EvalRun[] {
    if (!fs.existsSync(this.dir)) return [];

    const files = fs.readdirSync(this.dir).filter(f => f.endsWith('.json'));
    const runs: EvalRun[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.dir, file), 'utf-8');
        runs.push(JSON.parse(content) as EvalRun);
      } catch {
        // skip malformed
      }
    }

    // Sort by timestamp descending
    runs.sort((a, b) => b.ts.localeCompare(a.ts));
    return runs;
  }
}

// --- Comparison ---

function passRate(run: EvalRun): number {
  if (run.results.length === 0) return 0;
  const passed = run.results.filter(r => r.passed).length;
  return Math.round((passed / run.results.length) * 1000) / 10;
}

export function compareRuns(runA: EvalRun, runB: EvalRun): RunComparison {
  const mapA = new Map(runA.results.map(r => [r.name, r]));
  const mapB = new Map(runB.results.map(r => [r.name, r]));

  const regressions: string[] = [];
  const fixes: string[] = [];
  const stable: string[] = [];
  const newTests: string[] = [];
  const removedTests: string[] = [];

  // Compare common tests
  for (const [name, resultB] of mapB) {
    const resultA = mapA.get(name);
    if (!resultA) {
      newTests.push(name);
      continue;
    }

    if (resultA.passed && !resultB.passed) {
      regressions.push(name);
    } else if (!resultA.passed && resultB.passed) {
      fixes.push(name);
    } else {
      stable.push(name);
    }
  }

  // Find removed tests
  for (const name of mapA.keys()) {
    if (!mapB.has(name)) removedTests.push(name);
  }

  return {
    regressions,
    fixes,
    stable,
    newTests,
    removedTests,
    passRateDelta: Math.round((passRate(runB) - passRate(runA)) * 10) / 10,
    costDelta: runB.totalCostUsd - runA.totalCostUsd,
  };
}
