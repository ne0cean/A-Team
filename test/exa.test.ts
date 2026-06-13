import { describe, it, expect } from 'vitest';
import {
  exaSearch, exaContents, exaAnswer, normalizeHit, ExaError,
  type FetchLike, type ExaClientConfig,
} from '../lib/exa.js';

/** mock fetch: 요청을 캡처하고 미리 준비된 응답을 돌려준다 */
function mockFetch(response: { ok?: boolean; status?: number; json?: any; text?: string }): {
  fetchImpl: FetchLike;
  calls: Array<{ url: string; body: any; headers: Record<string, string> }>;
} {
  const calls: Array<{ url: string; body: any; headers: Record<string, string> }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json ?? {},
      text: async () => response.text ?? '',
    };
  };
  return { fetchImpl, calls };
}

function cfg(fetchImpl: FetchLike, apiKey = 'test-key'): ExaClientConfig {
  return { apiKey, fetchImpl };
}

describe('normalizeHit', () => {
  it('완전한 raw를 SearchHit으로 정규화', () => {
    const h = normalizeHit({
      id: 'x1', url: 'https://a.com', title: '  T  ', text: 'body',
      author: 'Kim', publishedDate: '2026-01-01', score: 0.91,
    });
    expect(h).toEqual({
      id: 'x1', url: 'https://a.com', title: 'T', text: 'body',
      author: 'Kim', publishedDate: '2026-01-01', score: 0.91,
    });
  });

  it('누락 필드는 안전한 기본값(id는 url fallback, null/빈문자)', () => {
    const h = normalizeHit({ url: 'https://b.com' });
    expect(h.id).toBe('https://b.com');
    expect(h.text).toBe('');
    expect(h.author).toBeNull();
    expect(h.publishedDate).toBeNull();
    expect(h.score).toBeNull();
  });

  it('완전 빈 객체도 크래시 없음', () => {
    const h = normalizeHit({});
    expect(h.id).toBe('');
    expect(h.title).toBe('');
  });
});

describe('exaSearch', () => {
  it('정규화된 hit 배열 반환 + 기본 파라미터', async () => {
    const { fetchImpl, calls } = mockFetch({
      json: { results: [{ id: '1', url: 'https://a.com', title: 'A', score: 0.8 }] },
    });
    const hits = await exaSearch(cfg(fetchImpl), '토큰 절감');
    expect(hits).toHaveLength(1);
    expect(hits[0].url).toBe('https://a.com');
    expect(calls[0].url).toBe('https://api.exa.ai/search');
    expect(calls[0].body.numResults).toBe(8);
    expect(calls[0].body.type).toBe('auto');
    expect(calls[0].body.contents).toBeUndefined();
    expect(calls[0].headers['x-api-key']).toBe('test-key');
  });

  it('includeText 옵션 → contents 포함', async () => {
    const { fetchImpl, calls } = mockFetch({ json: { results: [] } });
    await exaSearch(cfg(fetchImpl), 'q', { includeText: true, numResults: 3, type: 'neural', startPublishedDate: '2026-01-01' });
    expect(calls[0].body.contents).toBeDefined();
    expect(calls[0].body.numResults).toBe(3);
    expect(calls[0].body.type).toBe('neural');
    expect(calls[0].body.startPublishedDate).toBe('2026-01-01');
  });

  it('results 없으면 빈 배열', async () => {
    const { fetchImpl } = mockFetch({ json: {} });
    expect(await exaSearch(cfg(fetchImpl), 'q')).toEqual([]);
  });
});

describe('exaContents', () => {
  it('빈 ids는 네트워크 호출 없이 빈 배열', async () => {
    const { fetchImpl, calls } = mockFetch({ json: { results: [] } });
    expect(await exaContents(cfg(fetchImpl), [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('ids 주면 contents 엔드포인트 호출', async () => {
    const { fetchImpl, calls } = mockFetch({ json: { results: [{ url: 'https://c.com' }] } });
    const hits = await exaContents(cfg(fetchImpl), ['id1']);
    expect(hits[0].url).toBe('https://c.com');
    expect(calls[0].url).toBe('https://api.exa.ai/contents');
    expect(calls[0].body.ids).toEqual(['id1']);
  });
});

describe('exaAnswer', () => {
  it('answer + 정규화 citations 반환', async () => {
    const { fetchImpl, calls } = mockFetch({
      json: { answer: '결론', citations: [{ url: 'https://s.com', title: 'S' }] },
    });
    const r = await exaAnswer(cfg(fetchImpl), 'q');
    expect(r.answer).toBe('결론');
    expect(r.citations[0].url).toBe('https://s.com');
    expect(calls[0].url).toBe('https://api.exa.ai/answer');
  });

  it('citations 없으면 빈 배열', async () => {
    const { fetchImpl } = mockFetch({ json: { answer: 'x' } });
    const r = await exaAnswer(cfg(fetchImpl), 'q');
    expect(r.citations).toEqual([]);
  });
});

describe('에러 처리 (fail fast)', () => {
  it('apiKey 없으면 ExaError(401) — 네트워크 호출 전', async () => {
    const { fetchImpl, calls } = mockFetch({ json: {} });
    await expect(exaSearch(cfg(fetchImpl, ''), 'q')).rejects.toThrow(ExaError);
    expect(calls).toHaveLength(0);
  });

  it('HTTP 에러는 status 포함 ExaError로 던짐', async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 429, text: 'rate limited' });
    await expect(exaSearch(cfg(fetchImpl), 'q')).rejects.toMatchObject({ name: 'ExaError', status: 429 });
  });

  it('fetchImpl 없고 global fetch도 없으면 ExaError', async () => {
    const orig = (globalThis as any).fetch;
    (globalThis as any).fetch = undefined;
    try {
      await expect(exaSearch({ apiKey: 'k' }, 'q')).rejects.toThrow(ExaError);
    } finally {
      (globalThis as any).fetch = orig;
    }
  });
});
