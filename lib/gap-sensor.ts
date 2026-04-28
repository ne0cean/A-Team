import { appendFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

export interface FrictionEntry {
  ts: string;
  type: 'missing-capability' | 'manual-step' | 'external-tool-required' | 'low-quality-output';
  context: string;
  capability_path: string;
  blocked_module?: string;
  user_workaround?: string;
}

const DEFAULT_LOG_PATH = resolve(__dirname, '..', '.context', 'friction-log.jsonl');

export function logFriction(
  entry: Omit<FrictionEntry, 'ts'>,
  logPath: string = DEFAULT_LOG_PATH,
): FrictionEntry {
  const full: FrictionEntry = { ts: new Date().toISOString(), ...entry };
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, JSON.stringify(full) + '\n', 'utf-8');
  return full;
}

export function parseFrictionLog(content: string): FrictionEntry[] {
  return content
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try { return JSON.parse(l) as FrictionEntry; }
      catch { return null; }
    })
    .filter((e): e is FrictionEntry => e !== null);
}

export function frictionsByCapability(entries: FrictionEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.capability_path] = (counts[e.capability_path] || 0) + 1;
  }
  return counts;
}
