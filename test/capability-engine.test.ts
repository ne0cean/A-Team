import { describe, it, expect } from 'vitest';
import {
  logFriction,
  parseFrictionLog,
  frictionsByCapability,
  detectFrictionKeywords,
  analyzeUsageGaps,
  autoLogFriction,
  FrictionEntry,
} from '../lib/gap-sensor';
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

describe('detectFrictionKeywords', () => {
  it('detects missing-capability keyword', () => {
    const results = detectFrictionKeywords('이 기능은 안 돼요, 지원이 안됩니다');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('missing-capability');
  });

  it('detects manual-step keyword', () => {
    const results = detectFrictionKeywords('수동으로 입력해야 합니다');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('manual-step');
  });

  it('detects external-tool-required keyword', () => {
    const results = detectFrictionKeywords('외부 도구를 써야 해');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('external-tool-required');
  });

  it('returns empty array for clean text', () => {
    const results = detectFrictionKeywords('잘 작동합니다, 완료됐습니다');
    expect(results).toHaveLength(0);
  });

  it('captures raw_text up to 200 chars', () => {
    const long = '안 돼 '.repeat(100);
    const results = detectFrictionKeywords(long);
    expect(results[0].raw_text.length).toBeLessThanOrEqual(200);
  });
});

describe('analyzeUsageGaps', () => {
  it('counts skill usage correctly', () => {
    const lines = [
      JSON.stringify({ skill: 'vibe', event: 'start', ts: new Date().toISOString() }),
      JSON.stringify({ skill: 'vibe', event: 'end', ts: new Date().toISOString() }),
      JSON.stringify({ skill: 'blueprint', event: 'run', ts: new Date().toISOString() }),
    ].join('\n');

    const gaps = analyzeUsageGaps(lines);
    const vibe = gaps.find(g => g.capability_path === 'vibe');
    const blueprint = gaps.find(g => g.capability_path === 'blueprint');
    expect(vibe?.usage_count).toBe(2);
    expect(blueprint?.usage_count).toBe(1);
  });

  it('marks stale entries (ts older than staleDays)', () => {
    const oldTs = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const lines = JSON.stringify({ skill: 'old-skill', event: 'run', ts: oldTs });
    const gaps = analyzeUsageGaps(lines, 14);
    const old = gaps.find(g => g.capability_path === 'old-skill');
    expect(old?.stale).toBe(true);
  });

  it('marks recent entries as not stale', () => {
    const recentTs = new Date().toISOString();
    const lines = JSON.stringify({ skill: 'new-skill', event: 'run', ts: recentTs });
    const gaps = analyzeUsageGaps(lines, 14);
    const recent = gaps.find(g => g.capability_path === 'new-skill');
    expect(recent?.stale).toBe(false);
  });

  it('handles malformed lines gracefully', () => {
    const lines = ['not json', JSON.stringify({ skill: 'ok', ts: new Date().toISOString() }), ''].join('\n');
    expect(() => analyzeUsageGaps(lines)).not.toThrow();
    const gaps = analyzeUsageGaps(lines);
    expect(gaps.find(g => g.capability_path === 'ok')).toBeDefined();
  });

  it('returns empty array for empty content', () => {
    expect(analyzeUsageGaps('')).toHaveLength(0);
  });
});

describe('autoLogFriction', () => {
  const TMP = resolve(__dirname, '..', '.context', 'friction-auto-test.jsonl');

  it('logs detected friction to file', () => {
    try { unlinkSync(TMP); } catch {}
    const logged = autoLogFriction('수동으로 처리해야 합니다', 'operations.manual', TMP);
    expect(logged).toHaveLength(1);
    expect(logged[0].type).toBe('manual-step');
    const raw = readFileSync(TMP, 'utf-8');
    expect(raw).toContain('operations.manual');
    unlinkSync(TMP);
  });

  it('returns empty array when no keywords detected', () => {
    try { unlinkSync(TMP); } catch {}
    const logged = autoLogFriction('모든 것이 잘 작동합니다', 'engineering.testing', TMP);
    expect(logged).toHaveLength(0);
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
