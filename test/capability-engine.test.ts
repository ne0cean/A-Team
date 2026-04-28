import { describe, it, expect } from 'vitest';
import { logFriction, parseFrictionLog, frictionsByCapability, FrictionEntry } from '../lib/gap-sensor';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const TMP_LOG = resolve(__dirname, '..', '.context', 'friction-log-test.jsonl');

describe('gap-sensor', () => {
  it('logFriction writes valid JSONL entry', () => {
    try { unlinkSync(TMP_LOG); } catch {}
    const entry = logFriction({
      type: 'missing-capability',
      context: 'test gap',
      capability_path: 'engineering.deployment',
    }, TMP_LOG);

    expect(entry.ts).toBeTruthy();
    expect(entry.type).toBe('missing-capability');
    const raw = readFileSync(TMP_LOG, 'utf-8');
    const parsed = JSON.parse(raw.trim());
    expect(parsed.capability_path).toBe('engineering.deployment');
    unlinkSync(TMP_LOG);
  });

  it('parseFrictionLog handles multi-line JSONL', () => {
    const lines = [
      JSON.stringify({ ts: '2026-01-01T00:00:00Z', type: 'manual-step', context: 'a', capability_path: 'x.y' }),
      JSON.stringify({ ts: '2026-01-02T00:00:00Z', type: 'missing-capability', context: 'b', capability_path: 'x.z' }),
      '', // empty line
      'not json',
    ].join('\n');

    const entries = parseFrictionLog(lines);
    expect(entries).toHaveLength(2);
    expect(entries[0].context).toBe('a');
  });

  it('frictionsByCapability counts correctly', () => {
    const entries: FrictionEntry[] = [
      { ts: '', type: 'manual-step', context: '', capability_path: 'a.b' },
      { ts: '', type: 'manual-step', context: '', capability_path: 'a.b' },
      { ts: '', type: 'manual-step', context: '', capability_path: 'c.d' },
    ];
    const counts = frictionsByCapability(entries);
    expect(counts['a.b']).toBe(2);
    expect(counts['c.d']).toBe(1);
  });
});

describe('capability-map.json', () => {
  it('has valid structure with 7 departments', () => {
    const map = JSON.parse(readFileSync(resolve(__dirname, '..', 'lib', 'capability-map.json'), 'utf-8'));
    expect(Object.keys(map.departments)).toHaveLength(7);
    for (const [, dept] of Object.entries(map.departments) as [string, any][]) {
      expect(dept.weight).toBeGreaterThan(0);
      expect(dept.weight).toBeLessThanOrEqual(1);
      for (const [, cap] of Object.entries(dept.capabilities) as [string, any][]) {
        expect(cap.coverage).toBeGreaterThanOrEqual(0);
        expect(cap.coverage).toBeLessThanOrEqual(1);
      }
    }
  });

  it('weights sum to 1.0', () => {
    const map = JSON.parse(readFileSync(resolve(__dirname, '..', 'lib', 'capability-map.json'), 'utf-8'));
    const total = Object.values(map.departments).reduce((s: number, d: any) => s + d.weight, 0);
    expect(total).toBeCloseTo(1.0, 2);
  });
});

describe('friction-log seed', () => {
  it('has >= 5 seed entries', () => {
    const raw = readFileSync(resolve(__dirname, '..', '.context', 'friction-log.jsonl'), 'utf-8');
    const entries = raw.split('\n').filter(l => l.trim());
    expect(entries.length).toBeGreaterThanOrEqual(5);
    for (const line of entries) {
      const e = JSON.parse(line);
      expect(e.ts).toBeTruthy();
      expect(e.type).toBeTruthy();
      expect(e.capability_path).toBeTruthy();
    }
  });
});
