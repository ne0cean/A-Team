import { describe, it, expect } from 'vitest';
import {
  findEscalations,
  renderEscalationBlock,
  extractPreflightGate,
  shouldArchive,
  computeCoverageProposals,
  gardenerNeeded,
  runLoopCloser,
  emptyState,
  parseAnalytics60d,
  type LoopIO,
  type LoopState,
} from '../lib/loop-closer.js';

const NOW = '2026-06-13T00:00:00.000Z';

function fl(entries: Array<Record<string, unknown>>): string {
  return entries.map(e => JSON.stringify(e)).join('\n');
}

describe('findEscalations', () => {
  const three = (path: string, ts = '2026-06-10T00:00:00Z') =>
    [1, 2, 3].map(i => ({ ts, type: 'manual-step', context: `c${i}`, capability_path: path }));

  it('임계치 미달(2회)은 에스컬레이션 안 함', () => {
    const content = fl(three('x.y').slice(0, 2));
    expect(findEscalations(content, emptyState(), '', { now: NOW })).toHaveLength(0);
  });

  it('임계치 도달(3회) + 최근이면 에스컬레이션', () => {
    const r = findEscalations(fl(three('x.y')), emptyState(), '', { now: NOW });
    expect(r).toHaveLength(1);
    expect(r[0].capability_path).toBe('x.y');
    expect(r[0].count).toBe(3);
  });

  it('윈도우 밖(30일 초과) 마찰은 제외', () => {
    const old = three('x.y', '2026-01-01T00:00:00Z');
    expect(findEscalations(fl(old), emptyState(), '', { now: NOW })).toHaveLength(0);
  });

  it('resolved 마찰은 제외', () => {
    const resolved = three('x.y').map(e => ({ ...e, resolved: '2026-06-11' }));
    expect(findEscalations(fl(resolved), emptyState(), '', { now: NOW })).toHaveLength(0);
  });

  it('pending.md에 LOOP 마커 있으면 dedup', () => {
    const pending = '## old\n<!-- LOOP:x.y:2026-06-01 -->';
    expect(findEscalations(fl(three('x.y')), emptyState(), pending, { now: NOW })).toHaveLength(0);
  });

  it('state 기록된 동일 latest는 재점화 안 함', () => {
    const state: LoopState = { ...emptyState(), escalated: { 'x.y': { last_escalated: '2026-06-10T00:00:00Z', friction_count: 3 } } };
    expect(findEscalations(fl(three('x.y')), state, '', { now: NOW })).toHaveLength(0);
  });
});

describe('renderEscalationBlock', () => {
  it('빈 입력은 빈 문자열', () => {
    expect(renderEscalationBlock([], NOW)).toBe('');
  });
  it('P1 체크박스 + LOOP 마커 포함', () => {
    const block = renderEscalationBlock([{ capability_path: 'a.b', count: 4, latest_ts: NOW, contexts: ['ctx'] }], NOW);
    expect(block).toContain('P1: a.b');
    expect(block).toContain('<!-- LOOP:a.b:2026-06-13 -->');
  });
});

describe('extractPreflightGate / shouldArchive', () => {
  const md = `# CURRENT\n\n## Pre-flight Gate — 2026-06-13 (debrief)\n- [ ] item one\n- [ ] item two\n\n## Status\nok`;

  it('Pre-flight 섹션 추출', () => {
    const g = extractPreflightGate(md);
    expect(g?.date).toBe('2026-06-13');
    expect(g?.content).toContain('item one');
    expect(g?.content).not.toContain('## Status');
  });

  it('섹션 없으면 null', () => {
    expect(extractPreflightGate('# CURRENT\n\n## Status\nok')).toBeNull();
  });

  it('shouldArchive: 동일 날짜 이미 있으면 false', () => {
    const gate = { date: '2026-06-13' };
    expect(shouldArchive('# Archive\n## Pre-flight Gate — 2026-06-13\n', gate)).toBe(false);
    expect(shouldArchive('# Archive\n', gate)).toBe(true);
  });
});

describe('computeCoverageProposals', () => {
  const capMap = {
    departments: {
      eng: { capabilities: { build: { coverage: 0.5, modules: ['coder'] }, idle: { coverage: 0.6, modules: ['ghost'] } } },
      mkt: { capabilities: { pub: { coverage: 0.3, modules: ['publisher'] } } },
    },
  };

  it('usage≥10 & cov<0.8 → +0.05', () => {
    const events = Array.from({ length: 12 }, () => ({ name: 'coder' }));
    const p = computeCoverageProposals(capMap, events, '', { now: NOW }).find(x => x.path === 'eng.build')!;
    expect(p.reason).toBe('usage-up');
    expect(p.proposed).toBe(0.55);
  });

  it('friction 30일 2회+ → −0.10', () => {
    const fr = fl([1, 2].map(i => ({ ts: '2026-06-10T00:00:00Z', type: 'manual-step', context: `c${i}`, capability_path: 'mkt.pub' })));
    const p = computeCoverageProposals(capMap, [], fr, { now: NOW }).find(x => x.path === 'mkt.pub')!;
    expect(p.reason).toBe('friction-down');
    expect(p.proposed).toBe(0.2);
  });

  it('usage 0 & cov≥0.5 → stale-review (proposed null)', () => {
    const p = computeCoverageProposals(capMap, [], '', { now: NOW }).find(x => x.path === 'eng.idle')!;
    expect(p.reason).toBe('stale-review');
    expect(p.proposed).toBeNull();
  });

  it('modules 없는 capability도 크래시 없음', () => {
    const noMod = { departments: { x: { capabilities: { y: { coverage: 0.4 } } } } };
    expect(() => computeCoverageProposals(noMod as any, [], '', { now: NOW })).not.toThrow();
  });
});

describe('gardenerNeeded', () => {
  it('신호 없으면 false', () => {
    expect(gardenerNeeded(emptyState(), { escalations: 0, proposals: 0 }, NOW)).toBe(false);
  });
  it('에스컬레이션 있으면 주간 상한 무시하고 true', () => {
    const state: LoopState = { ...emptyState(), last_gardener: NOW };
    expect(gardenerNeeded(state, { escalations: 1, proposals: 0 }, NOW)).toBe(true);
  });
  it('제안만 있고 7일 안 지났으면 false', () => {
    const state: LoopState = { ...emptyState(), last_gardener: '2026-06-10T00:00:00Z' };
    expect(gardenerNeeded(state, { escalations: 0, proposals: 1 }, NOW)).toBe(false);
  });
});

describe('parseAnalytics60d', () => {
  it('60일 이내만 + 깨진 라인 skip', () => {
    const content = [
      JSON.stringify({ ts: '2026-06-10T00:00:00Z', name: 'a' }),
      'broken{',
      JSON.stringify({ ts: '2026-01-01T00:00:00Z', name: 'old' }),
    ].join('\n');
    const r = parseAnalytics60d(content, NOW);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('a');
  });
});

describe('runLoopCloser (mock IO)', () => {
  function mockIO(files: Record<string, string>) {
    const writes: Record<string, string> = {};
    const appends: Record<string, string> = {};
    const execs: string[] = [];
    const logs: string[] = [];
    const io: LoopIO = {
      readFile: (p) => (p in writes ? writes[p] : files[p] ?? null),
      writeFile: (p, c) => { writes[p] = c; },
      appendFile: (p, c) => { appends[p] = (appends[p] ?? '') + c; writes[p] = (files[p] ?? '') + (appends[p]); },
      exec: (_c, a) => { execs.push(a.join(' ')); return { status: 0 }; },
      log: (e) => { logs.push(e); },
    };
    return { io, writes, appends, execs, logs };
  }

  const threeFriction = fl([1, 2, 3].map(i => ({ ts: '2026-06-10T00:00:00Z', type: 'manual-step', context: `c${i}`, capability_path: 'mkt.x' })));

  it('dry-run: 쓰기 0회', () => {
    const { io, writes, appends, execs } = mockIO({ '.context/friction-log.jsonl': threeFriction });
    const report = runLoopCloser(io, { trigger: 'manual', now: NOW, dryRun: true });
    expect(report.escalations).toHaveLength(1);
    expect(Object.keys(writes)).toHaveLength(0);
    expect(Object.keys(appends)).toHaveLength(0);
    expect(execs).toHaveLength(0);
  });

  it('실행: 에스컬레이션 append + gap-priority exec + state/report write', () => {
    const { io, writes, appends, execs, logs } = mockIO({ '.context/friction-log.jsonl': threeFriction });
    const report = runLoopCloser(io, { trigger: 'daily', now: NOW });
    expect(appends['improvements/pending.md']).toContain('P1: mkt.x');
    expect(execs.some(e => e.includes('gap-priority'))).toBe(true);
    expect(writes['.context/loop/state.json']).toBeDefined();
    expect(writes['.context/loop/last-report.json']).toBeDefined();
    expect(report.gardener_needed).toBe(true);
    expect(writes['.context/loop/gardener-queue.md']).toBeDefined();
    expect(logs).toContain('loop_closer_run');
  });

  it('Pre-flight Gate 아카이브', () => {
    const { io, appends } = mockIO({
      '.context/friction-log.jsonl': '',
      '.context/CURRENT.md': '## Pre-flight Gate — 2026-06-13 (debrief)\n- [ ] x\n\n## Status\nok',
    });
    const report = runLoopCloser(io, { trigger: 'manual', now: NOW });
    expect(report.preflight_archived).toBe('2026-06-13');
    expect(appends['.context/preflight-archive.md']).toContain('Pre-flight Gate — 2026-06-13');
  });
});
