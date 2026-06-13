/**
 * test/vectorize.test.ts — TDD RED: lib/vectorize.ts 전체 커버
 *
 * 전략: 네트워크 없음. 모든 HTTP는 mock fetchImpl로 격리.
 * 분기 커버 기준: 80% 이상 (vitest.config.ts 강제)
 */

import { describe, it, expect, vi } from 'vitest';
import type { FetchLike } from '../lib/exa.js';
import type { Deposit } from '../lib/research-memory.js';
import {
  embedText,
  upsertVectors,
  queryVectors,
  matchesToRecall,
  depositToVectorMetadata,
  VectorizeError,
} from '../lib/vectorize.js';
import type { VectorizeConfig, VectorMatch } from '../lib/vectorize.js';

// ---------------------------------------------------------------------------
// 헬퍼: mock fetch 빌더
// ---------------------------------------------------------------------------

function mockFetch(status: number, body: unknown): FetchLike {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as FetchLike;
}

const BASE_CFG: Omit<VectorizeConfig, 'fetchImpl'> = {
  accountId: 'test-account',
  apiToken: 'test-token',
  indexName: 'test-index',
};

// ---------------------------------------------------------------------------
// embedText
// ---------------------------------------------------------------------------

describe('embedText', () => {
  it('정상 응답 → number[][] 반환', async () => {
    const vectors = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
    const fetch = mockFetch(200, { result: { data: vectors } });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };

    const result = await embedText(cfg, ['hello', 'world']);

    expect(result).toEqual(vectors);
    // URL 패턴 확인
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/ai/run/@cf/baai/bge-m3');
    expect(call[0]).toContain('test-account');
    // Authorization 헤더
    expect(call[1].headers['Authorization']).toBe('Bearer test-token');
    // body에 texts 전달
    const body = JSON.parse(call[1].body);
    expect(body.text).toEqual(['hello', 'world']);
  });

  it('data 없는 응답 → []', async () => {
    const fetch = mockFetch(200, { result: {} });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const result = await embedText(cfg, ['hello']);
    expect(result).toEqual([]);
  });

  it('result 자체가 없는 응답 → []', async () => {
    const fetch = mockFetch(200, {});
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const result = await embedText(cfg, ['hello']);
    expect(result).toEqual([]);
  });

  it('HTTP 에러 → VectorizeError throw', async () => {
    const fetch = mockFetch(500, { error: 'internal' });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    await expect(embedText(cfg, ['hello'])).rejects.toBeInstanceOf(VectorizeError);
  });

  it('HTTP 401 → VectorizeError.status === 401', async () => {
    const fetch = mockFetch(401, 'unauthorized');
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const err = await embedText(cfg, ['x']).catch(e => e);
    expect(err).toBeInstanceOf(VectorizeError);
    expect(err.status).toBe(401);
  });

  it('apiToken 빈 문자열 → VectorizeError throw (키 없음)', async () => {
    const cfg: VectorizeConfig = { ...BASE_CFG, apiToken: '', fetchImpl: mockFetch(200, {}) };
    await expect(embedText(cfg, ['x'])).rejects.toBeInstanceOf(VectorizeError);
  });

  it('apiToken 공백만 → VectorizeError throw', async () => {
    const cfg: VectorizeConfig = { ...BASE_CFG, apiToken: '   ', fetchImpl: mockFetch(200, {}) };
    await expect(embedText(cfg, ['x'])).rejects.toBeInstanceOf(VectorizeError);
  });
});

// ---------------------------------------------------------------------------
// upsertVectors
// ---------------------------------------------------------------------------

describe('upsertVectors', () => {
  it('빈 items → 네트워크 호출 없이 {count: 0} 반환', async () => {
    const fetch = mockFetch(200, { result: { mutationId: 'abc' } });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const result = await upsertVectors(cfg, []);
    expect(result).toEqual({ count: 0 });
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it('정상 적재 → {count: items.length}', async () => {
    const fetch = mockFetch(200, { result: { mutationId: 'xyz' } });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const items = [
      { id: 'a', values: [0.1, 0.2], metadata: { query: 'test' } },
      { id: 'b', values: [0.3, 0.4], metadata: { query: 'test2' } },
    ];
    const result = await upsertVectors(cfg, items);
    expect(result).toEqual({ count: 2 });
  });

  it('NDJSON 포맷으로 전송', async () => {
    const fetch = mockFetch(200, { result: {} });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const items = [
      { id: 'v1', values: [1, 2, 3], metadata: { summary: 'hello' } },
    ];
    await upsertVectors(cfg, items);
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    // Content-Type 확인
    expect(call[1].headers['Content-Type']).toBe('application/x-ndjson');
    // body는 JSON 객체 한 줄
    const lines = (call[1].body as string).trim().split('\n');
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.id).toBe('v1');
    expect(parsed.values).toEqual([1, 2, 3]);
  });

  it('URL에 indexName 포함', async () => {
    const fetch = mockFetch(200, { result: {} });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    await upsertVectors(cfg, [{ id: 'x', values: [0.1], metadata: {} }]);
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('test-index');
    expect(call[0]).toContain('/upsert');
  });

  it('HTTP 에러 → VectorizeError', async () => {
    const fetch = mockFetch(400, 'bad request');
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    await expect(
      upsertVectors(cfg, [{ id: 'x', values: [0.1], metadata: {} }])
    ).rejects.toBeInstanceOf(VectorizeError);
  });

  it('apiToken 없음 → VectorizeError', async () => {
    const cfg: VectorizeConfig = { ...BASE_CFG, apiToken: '', fetchImpl: mockFetch(200, {}) };
    await expect(
      upsertVectors(cfg, [{ id: 'x', values: [0.1], metadata: {} }])
    ).rejects.toBeInstanceOf(VectorizeError);
  });
});

// ---------------------------------------------------------------------------
// queryVectors
// ---------------------------------------------------------------------------

describe('queryVectors', () => {
  it('정상 응답 → VectorMatch[] 반환', async () => {
    const matches = [
      { id: 'id1', score: 0.95, metadata: { query: 'test' } },
      { id: 'id2', score: 0.80, metadata: { query: 'foo' } },
    ];
    const fetch = mockFetch(200, { result: { matches } });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const result = await queryVectors(cfg, [0.1, 0.2, 0.3], 5);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('id1');
    expect(result[0].score).toBe(0.95);
    expect(result[0].metadata).toEqual({ query: 'test' });
  });

  it('matches 없는 응답 → []', async () => {
    const fetch = mockFetch(200, { result: {} });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const result = await queryVectors(cfg, [0.1], 5);
    expect(result).toEqual([]);
  });

  it('result 자체 없는 응답 → []', async () => {
    const fetch = mockFetch(200, {});
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    const result = await queryVectors(cfg, [0.1], 5);
    expect(result).toEqual([]);
  });

  it('body에 vector/topK/returnMetadata 전달', async () => {
    const fetch = mockFetch(200, { result: { matches: [] } });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    await queryVectors(cfg, [1, 2, 3], 10);
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.vector).toEqual([1, 2, 3]);
    expect(body.topK).toBe(10);
    expect(body.returnMetadata).toBe('all');
  });

  it('URL에 /query 포함', async () => {
    const fetch = mockFetch(200, { result: { matches: [] } });
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    await queryVectors(cfg, [0.1], 3);
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/query');
    expect(call[0]).toContain('test-index');
  });

  it('HTTP 에러 → VectorizeError', async () => {
    const fetch = mockFetch(403, 'forbidden');
    const cfg: VectorizeConfig = { ...BASE_CFG, fetchImpl: fetch };
    await expect(queryVectors(cfg, [0.1], 5)).rejects.toBeInstanceOf(VectorizeError);
  });

  it('apiToken 없음 → VectorizeError', async () => {
    const cfg: VectorizeConfig = { ...BASE_CFG, apiToken: '', fetchImpl: mockFetch(200, {}) };
    await expect(queryVectors(cfg, [0.1], 5)).rejects.toBeInstanceOf(VectorizeError);
  });
});

// ---------------------------------------------------------------------------
// matchesToRecall (순수 함수)
// ---------------------------------------------------------------------------

describe('matchesToRecall', () => {
  const makeMatch = (overrides: Partial<VectorMatch['metadata']> = {}, score = 0.9): VectorMatch => ({
    id: 'test-id',
    score,
    metadata: {
      query: 'test query',
      reformulated: 'reformulated query',
      summary: 'test summary',
      entities: JSON.stringify(['EntityA', 'EntityB']),
      sources: JSON.stringify(['https://a.com', 'https://b.com']),
      ts: '2026-06-13T00:00:00Z',
      ...overrides,
    },
  });

  it('score >= minScore → RecallHit 반환', () => {
    const matches = [makeMatch({}, 0.9), makeMatch({ query: 'other' }, 0.7)];
    const hits = matchesToRecall(matches, 0.7);
    expect(hits).toHaveLength(2);
    expect(hits[0].query).toBe('test query');
    expect(hits[0].score).toBe(0.9);
  });

  it('score < minScore → 필터됨', () => {
    const matches = [makeMatch({}, 0.5), makeMatch({ query: 'other' }, 0.9)];
    const hits = matchesToRecall(matches, 0.8);
    expect(hits).toHaveLength(1);
    expect(hits[0].score).toBe(0.9);
  });

  it('entities가 JSON 문자열 → 파싱', () => {
    const match = makeMatch({ entities: JSON.stringify(['A', 'B']) });
    const hits = matchesToRecall([match], 0.5);
    expect(hits[0].entities).toEqual(['A', 'B']);
  });

  it('entities가 배열(이미) → 그대로', () => {
    const match = makeMatch({ entities: ['X', 'Y'] as unknown as string });
    const hits = matchesToRecall([match], 0.5);
    expect(hits[0].entities).toEqual(['X', 'Y']);
  });

  it('entities가 깨진 JSON → []', () => {
    const match = makeMatch({ entities: 'not-valid-json[[[' });
    const hits = matchesToRecall([match], 0.5);
    expect(hits[0].entities).toEqual([]);
  });

  it('sources가 JSON 문자열 → 파싱', () => {
    const match = makeMatch({ sources: JSON.stringify(['https://c.com']) });
    const hits = matchesToRecall([match], 0.5);
    expect(hits[0].sources).toEqual(['https://c.com']);
  });

  it('sources가 배열 → 그대로', () => {
    const match = makeMatch({ sources: ['https://d.com'] as unknown as string });
    const hits = matchesToRecall([match], 0.5);
    expect(hits[0].sources).toEqual(['https://d.com']);
  });

  it('sources가 깨진 JSON → []', () => {
    const match = makeMatch({ sources: 'bad{{json' });
    const hits = matchesToRecall([match], 0.5);
    expect(hits[0].sources).toEqual([]);
  });

  it('빈 matches → []', () => {
    expect(matchesToRecall([], 0.5)).toEqual([]);
  });

  it('모든 match가 필터되면 → []', () => {
    const matches = [makeMatch({}, 0.3)];
    expect(matchesToRecall(matches, 0.9)).toEqual([]);
  });

  it('RecallHit 필드 완전성: query/reformulated/summary/entities/sources/ts/score', () => {
    const match = makeMatch();
    const hits = matchesToRecall([match], 0.5);
    const h = hits[0];
    expect(h.query).toBe('test query');
    expect(h.reformulated).toBe('reformulated query');
    expect(h.summary).toBe('test summary');
    expect(h.ts).toBe('2026-06-13T00:00:00Z');
    expect(h.score).toBe(0.9);
  });
});

// ---------------------------------------------------------------------------
// depositToVectorMetadata (순수 함수)
// ---------------------------------------------------------------------------

describe('depositToVectorMetadata', () => {
  const makeDeposit = (): Deposit => ({
    query: 'test query',
    reformulated: 'reformulated',
    summary: 'a summary',
    entities: ['EntityA', 'EntityB'],
    sources: ['https://x.com', 'https://y.com'],
    ts: '2026-06-13T00:00:00Z',
    hash: 'abc123',
  });

  it('배열 필드(entities, sources)는 JSON.stringify', () => {
    const meta = depositToVectorMetadata(makeDeposit());
    expect(meta.entities).toBe(JSON.stringify(['EntityA', 'EntityB']));
    expect(meta.sources).toBe(JSON.stringify(['https://x.com', 'https://y.com']));
  });

  it('문자열 필드는 그대로', () => {
    const meta = depositToVectorMetadata(makeDeposit());
    expect(meta.query).toBe('test query');
    expect(meta.reformulated).toBe('reformulated');
    expect(meta.summary).toBe('a summary');
    expect(meta.ts).toBe('2026-06-13T00:00:00Z');
  });

  it('hash 필드는 metadata에 포함하지 않음(id로만 사용)', () => {
    const meta = depositToVectorMetadata(makeDeposit());
    // hash는 vector id로 쓰이므로 metadata에 넣지 않는다
    expect('hash' in meta).toBe(false);
  });

  it('모든 값이 string 타입', () => {
    const meta = depositToVectorMetadata(makeDeposit());
    for (const [, v] of Object.entries(meta)) {
      expect(typeof v).toBe('string');
    }
  });

  it('round-trip: depositToVectorMetadata → matchesToRecall 복원', () => {
    const deposit = makeDeposit();
    const meta = depositToVectorMetadata(deposit);
    const match: VectorMatch = { id: deposit.hash, score: 0.95, metadata: meta };
    const hits = matchesToRecall([match], 0.5);
    const h = hits[0];
    expect(h.query).toBe(deposit.query);
    expect(h.reformulated).toBe(deposit.reformulated);
    expect(h.summary).toBe(deposit.summary);
    expect(h.entities).toEqual(deposit.entities);
    expect(h.sources).toEqual(deposit.sources);
    expect(h.ts).toBe(deposit.ts);
  });
});

// ---------------------------------------------------------------------------
// VectorizeError
// ---------------------------------------------------------------------------

describe('VectorizeError', () => {
  it('instanceof Error', () => {
    const e = new VectorizeError('test', 500);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(VectorizeError);
  });

  it('status 필드', () => {
    const e = new VectorizeError('msg', 404);
    expect(e.status).toBe(404);
    expect(e.message).toBe('msg');
  });

  it('name은 VectorizeError', () => {
    const e = new VectorizeError('x', 0);
    expect(e.name).toBe('VectorizeError');
  });
});
