import { describe, it, expect, vi } from 'vitest';
import { mergeRecall, createGatewayIO, type FileVectorizeDeps } from '../lib/research-io.js';
import { extractDeposit, type RecallHit, type Deposit } from '../lib/research-memory.js';
import type { VectorMatch } from '../lib/vectorize.js';

const TS = '2026-06-13T00:00:00.000Z';
function rh(query: string, score?: number): RecallHit {
  return { query, reformulated: '', summary: '', entities: [], sources: [], ts: TS, score };
}

describe('mergeRecall', () => {
  it('시맨틱 우선 + 로컬로 보충, query 중복 제거', () => {
    const semantic = [rh('A', 0.9), rh('B', 0.8)];
    const local = [rh('B'), rh('C')];
    const merged = mergeRecall(semantic, local, 5);
    expect(merged.map(h => h.query)).toEqual(['A', 'B', 'C']);  // B는 시맨틱본 유지
    expect(merged[1].score).toBe(0.8);
  });

  it('k 상한 적용', () => {
    const merged = mergeRecall([rh('A', 1), rh('B', 1)], [rh('C')], 2);
    expect(merged).toHaveLength(2);
  });

  it('대소문자·공백 무시 중복 제거', () => {
    const merged = mergeRecall([rh('Cloudflare D1', 0.9)], [rh('  cloudflare d1  ')], 5);
    expect(merged).toHaveLength(1);
  });

  it('한쪽이 비어도 동작', () => {
    expect(mergeRecall([], [rh('X')], 5).map(h => h.query)).toEqual(['X']);
    expect(mergeRecall([rh('Y', 0.5)], [], 5).map(h => h.query)).toEqual(['Y']);
  });
});

// --- createGatewayIO ---

function baseDeps(over: Partial<FileVectorizeDeps> = {}): FileVectorizeDeps {
  return {
    readMemory: () => '',
    appendMemory: vi.fn(),
    loadProfile: () => ['프로필1'],
    cortexSearch: async () => [],
    now: () => TS,
    ...over,
  };
}

function deposit(query: string, sources: string[] = ['https://x']): Deposit {
  return extractDeposit({ query, reformulated: '', answer: 'a', sources }, TS);
}

describe('createGatewayIO — 로컬 전용 모드(vectorize 없음)', () => {
  it('recall은 JSONL 토큰겹침만 사용', async () => {
    const mem = JSON.stringify(deposit('Cloudflare D1 검색')) + '\n';
    const io = createGatewayIO(baseDeps({ readMemory: () => mem }));
    const hits = await io.recall('D1 검색 인덱스', 5);
    expect(hits).toHaveLength(1);
    expect(hits[0].query).toBe('Cloudflare D1 검색');
  });

  it('embed는 빈 배열(벡터 불필요)', async () => {
    const io = createGatewayIO(baseDeps());
    expect(await io.embed('x')).toEqual([]);
  });

  it('deposit은 JSONL append만, vectorize 호출 없음', async () => {
    const append = vi.fn();
    const io = createGatewayIO(baseDeps({ appendMemory: append }));
    await io.deposit(deposit('q'), []);
    expect(append).toHaveBeenCalledOnce();
    expect(append.mock.calls[0][0]).toContain('"query":"q"');
  });

  it('loadProfile/now 패스스루', async () => {
    const io = createGatewayIO(baseDeps());
    expect(await io.loadProfile()).toEqual(['프로필1']);
    expect(io.now()).toBe(TS);
  });
});

describe('createGatewayIO — Vectorize 모드', () => {
  function vecDeps(over: Partial<FileVectorizeDeps> = {}) {
    const vectorize = {
      embed: vi.fn(async () => [[0.1, 0.2, 0.3]]),
      query: vi.fn(async (): Promise<VectorMatch[]> => [
        { id: 'h1', score: 0.95, metadata: { query: 'Zep 시맨틱 결과', entities: '[]', sources: '[]' } },
      ]),
      upsert: vi.fn(async () => ({})),
      minScore: 0.5,
    };
    return { deps: baseDeps({ vectorize, ...over }), vectorize };
  }

  it('recall은 시맨틱 + 로컬 병합', async () => {
    const mem = JSON.stringify(deposit('Cloudflare D1 로컬결과')) + '\n';
    const { deps, vectorize } = vecDeps({ readMemory: () => mem });
    const io = createGatewayIO(deps);
    const hits = await io.recall('D1 검색', 5);
    expect(vectorize.embed).toHaveBeenCalledOnce();
    expect(vectorize.query).toHaveBeenCalledOnce();
    const qs = hits.map(h => h.query);
    expect(qs).toContain('Zep 시맨틱 결과');     // 시맨틱
    expect(qs).toContain('Cloudflare D1 로컬결과'); // 로컬
  });

  it('topK는 20으로 상한(returnMetadata all 제약)', async () => {
    const { deps, vectorize } = vecDeps();
    const io = createGatewayIO(deps);
    await io.recall('q', 50);
    expect(vectorize.query.mock.calls[0][1]).toBeLessThanOrEqual(20);
  });

  it('deposit은 JSONL + Vectorize upsert 둘 다', async () => {
    const append = vi.fn();
    const { deps, vectorize } = vecDeps({ appendMemory: append });
    const io = createGatewayIO(deps);
    await io.deposit(deposit('q'), [0.1, 0.2]);
    expect(append).toHaveBeenCalledOnce();
    expect(vectorize.upsert).toHaveBeenCalledOnce();
    const items = vectorize.upsert.mock.calls[0][0];
    expect(items[0].values).toEqual([0.1, 0.2]);
    expect(items[0].id).toBe(deposit('q').hash);
  });

  it('embed는 Vectorize 임베딩 사용', async () => {
    const { deps } = vecDeps();
    const io = createGatewayIO(deps);
    expect(await io.embed('x')).toEqual([0.1, 0.2, 0.3]);
  });

  it('★ Vectorize query 실패 → 로컬로 graceful degrade(검색은 살아있음)', async () => {
    const mem = JSON.stringify(deposit('Cloudflare D1 로컬결과')) + '\n';
    const vectorize = {
      embed: vi.fn(async () => [[0.1]]),
      query: vi.fn(async () => { throw new Error('CF 500'); }),
      upsert: vi.fn(async () => ({})),
      minScore: 0.5,
    };
    const io = createGatewayIO(baseDeps({ readMemory: () => mem, vectorize }));
    const hits = await io.recall('D1 검색', 5);
    expect(hits.map(h => h.query)).toContain('Cloudflare D1 로컬결과'); // 로컬은 반환됨
  });

  it('★ Vectorize upsert 실패 → deposit의 JSONL은 살아있음(best-effort)', async () => {
    const append = vi.fn();
    const vectorize = {
      embed: vi.fn(async () => [[0.1]]),
      query: vi.fn(async () => []),
      upsert: vi.fn(async () => { throw new Error('CF 500'); }),
      minScore: 0.5,
    };
    const io = createGatewayIO(baseDeps({ appendMemory: append, vectorize }));
    await io.deposit(deposit('q'), [0.1]);   // throw 안 해야 함
    expect(append).toHaveBeenCalledOnce();    // 로컬 적립은 성공
  });
});
