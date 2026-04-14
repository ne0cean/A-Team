/**
 * Learnings — Cross-session institutional memory
 *
 * JSONL-based learning log per project.
 * Supports: log, search, dedup (latest-winner per key+type), cross-project discovery.
 *
 * Storage: {baseDir}/{slug}/learnings.jsonl
 * Each line is a JSON object with: ts, skill, type, key, insight, confidence, source, files, branch?, commit?
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

export type LearningType = 'pattern' | 'pitfall' | 'preference' | 'architecture' | 'tool';
export type LearningSource = 'observed' | 'user-stated' | 'inferred' | 'cross-model';

export interface Learning {
  skill: string;
  type: LearningType;
  key: string;
  insight: string;
  confidence: number;
  source: LearningSource;
  files: string[];
  branch?: string;
  commit?: string;
  ts?: string;
}

export interface LearningEntry extends Learning {
  ts: string;
}

export interface LogOptions {
  baseDir: string;
  slug: string;
}

export interface SearchOptions {
  baseDir: string;
  slug: string;
  skill?: string;
  type?: LearningType;
  limit?: number;
  crossProject?: boolean;
}

// --- Log ---

export function logLearning(learning: Learning, opts: LogOptions): void {
  const dir = path.join(opts.baseDir, opts.slug);
  fs.mkdirSync(dir, { recursive: true });

  const entry: LearningEntry = {
    ...learning,
    ts: learning.ts ?? new Date().toISOString(),
  };

  const filePath = path.join(dir, 'learnings.jsonl');
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
}

// --- Search ---

function readLearnings(filePath: string): LearningEntry[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];

  const entries: LearningEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as LearningEntry);
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

function dedup(entries: LearningEntry[]): LearningEntry[] {
  // Latest-winner: for same key+type, keep the last one
  const map = new Map<string, LearningEntry>();
  for (const entry of entries) {
    const dedupKey = `${entry.type}:${entry.key}`;
    map.set(dedupKey, entry);
  }
  return [...map.values()];
}

export function searchLearnings(opts: SearchOptions): LearningEntry[] {
  let allEntries: LearningEntry[] = [];

  if (opts.crossProject) {
    // Read from all project directories
    if (fs.existsSync(opts.baseDir)) {
      for (const dir of fs.readdirSync(opts.baseDir, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const filePath = path.join(opts.baseDir, dir.name, 'learnings.jsonl');
        allEntries.push(...readLearnings(filePath));
      }
    }
  } else {
    const filePath = path.join(opts.baseDir, opts.slug, 'learnings.jsonl');
    allEntries = readLearnings(filePath);
  }

  // Dedup
  let results = dedup(allEntries);

  // Filter by skill
  if (opts.skill) {
    results = results.filter(r => r.skill === opts.skill);
  }

  // Filter by type
  if (opts.type) {
    results = results.filter(r => r.type === opts.type);
  }

  // Sort by timestamp descending (newest first)
  results.sort((a, b) => b.ts.localeCompare(a.ts));

  // Apply limit
  if (opts.limit !== undefined) {
    results = results.slice(0, opts.limit);
  }

  return results;
}

// --- Format ---

/**
 * Format a learning entry as a single-line string.
 * Format: `[skill] (confidence N/10) key — insight`
 * @param entry The learning entry to format
 * @returns Formatted string representation
 * @example
 * const entry = {
 *   skill: 'review',
 *   confidence: 8,
 *   key: 'null-check',
 *   insight: 'Always null-check API responses',
 *   ts: '2026-03-30T12:00:00Z',
 *   type: 'pattern',
 *   source: 'observed',
 *   files: ['src/api.ts'],
 * };
 * formatLearning(entry) // => '[review] (confidence 8/10) null-check — Always null-check API responses'
 */
export function formatLearning(entry: LearningEntry): string {
  return `[${entry.skill}] (confidence ${entry.confidence}/10) ${entry.key} — ${entry.insight}`;
}

// --- Advisor Patterns ---

export interface AdvisorOutcome {
  model: string;
  advisorCalls: number;
  taskCategory?: string;
  failureCode?: string;
  iterationCount?: number;
}

/**
 * 어드바이저 호출 성공/실패 패턴을 learnings에 기록.
 * ralph-daemon SDK 경로에서 각 iteration 완료 시 호출.
 * 크로스 세션 학습으로 advisor 효과적 사용 패턴을 추적한다.
 */
export function logAdvisorOutcome(
  outcome: AdvisorOutcome,
  opts: LogOptions,
  success: boolean,
): void {
  const insight = success
    ? `advisor=${outcome.model} calls=${outcome.advisorCalls}/${outcome.iterationCount ?? 1} iter — 성공`
    : `advisor=${outcome.model} 실패 (${outcome.failureCode ?? 'unknown'}) — CLI fallback`;

  logLearning({
    skill: 'advisor',
    type: success ? 'pattern' : 'pitfall',
    key: `advisor-${success ? 'success' : 'failure'}-${outcome.taskCategory ?? 'general'}`,
    insight,
    confidence: success ? 7 : 8,
    source: 'observed',
    files: ['scripts/ralph-daemon.mjs', 'scripts/daemon-utils.mjs'],
  }, opts);
}

// --- Design Patterns ---

export interface DesignOutcome {
  tone?: string;
  variant?: string;
  score: number;
  rule?: string;            // violated rule (if negative feedback)
  userAction: 'accepted' | 'overridden' | 'partial' | 'rejected';
  reason?: string;
}

/**
 * 디자인 감사 결과에 대한 사용자 반응을 learnings에 기록.
 * - accepted: 사용자가 제안 반영 → pattern (confidence ↑)
 * - overridden: 사용자가 경고 무시 → pitfall (같은 rule 반복 override 시 globally 튜닝 고려)
 * - rejected: 사용자가 design 체인 자체 비활성화 → preference
 * cross-session 학습으로 false positive 패턴 감지.
 */
export function logDesignOutcome(
  outcome: DesignOutcome,
  opts: LogOptions,
): void {
  const type: LearningType =
    outcome.userAction === 'overridden' || outcome.userAction === 'rejected' ? 'pitfall'
    : outcome.userAction === 'partial' ? 'preference'
    : 'pattern';

  const toneHint = outcome.tone ? ` tone=${outcome.tone}` : '';
  const ruleHint = outcome.rule ? ` rule=${outcome.rule}` : '';
  const reasonHint = outcome.reason ? ` reason=${outcome.reason}` : '';

  const insight = outcome.userAction === 'accepted'
    ? `design-audit score=${outcome.score}${toneHint}${ruleHint} — 사용자 수용`
    : `design-audit score=${outcome.score}${toneHint}${ruleHint}${reasonHint} — ${outcome.userAction}`;

  logLearning({
    skill: 'design-auditor',
    type,
    key: `design-${outcome.userAction}-${outcome.rule ?? outcome.tone ?? 'general'}`,
    insight,
    confidence: outcome.userAction === 'accepted' ? 7 : 6,
    source: 'observed',
    files: ['lib/design-smell-detector.ts', 'governance/design/anti-patterns.md'],
  }, opts);
}
