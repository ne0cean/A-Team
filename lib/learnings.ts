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
