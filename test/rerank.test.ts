import { describe, it, expect } from 'vitest';
import { applyReranking, parseRerankResponse, type RerankScore } from '../lib/rerank.js';

interface Doc { url: string; title: string; }
const docs: Doc[] = [
  { url: 'https://a', title: 'A' },
  { url: 'https://b', title: 'B' },
  { url: 'https://c', title: 'C' },
];

describe('parseRerankResponse', () => {
  it('Workers AI bge-reranker 응답({result:{response:[{id,score}]}}) → RerankScore[]', () => {
    const raw = { result: { response: [{ id: 2, score: 0.9 }, { id: 0, score: 0.1 }] } };
    expect(parseRerankResponse(raw)).toEqual([{ id: 2, score: 0.9 }, { id: 0, score: 0.1 }]);
  });

  it('response 없으면 []', () => {
    expect(parseRerankResponse({ result: {} })).toEqual([]);
    expect(parseRerankResponse(null)).toEqual([]);
    expect(parseRerankResponse({})).toEqual([]);
  });

  it('잘못된 항목은 건너뜀', () => {
    const raw = { result: { response: [{ id: 0, score: 0.5 }, { id: 'x', score: 0.2 }, { foo: 1 }] } };
    expect(parseRerankResponse(raw)).toEqual([{ id: 0, score: 0.5 }]);
  });
});

describe('applyReranking', () => {
  it('점수순으로 재정렬 + topN 절단 + rerankScore 부착', () => {
    const scores: RerankScore[] = [{ id: 2, score: 0.9 }, { id: 0, score: 0.5 }, { id: 1, score: 0.1 }];
    const out = applyReranking(docs, scores, 2);
    expect(out.map(d => d.url)).toEqual(['https://c', 'https://a']);  // id2, id0
    expect(out[0].rerankScore).toBe(0.9);
  });

  it('점수가 이미 정렬돼 있어도 id 매핑 정확', () => {
    const scores: RerankScore[] = [{ id: 1, score: 0.8 }, { id: 0, score: 0.3 }];
    const out = applyReranking(docs, scores, 5);
    expect(out.map(d => d.title)).toEqual(['B', 'A']);
  });

  it('범위 밖 id는 무시', () => {
    const scores: RerankScore[] = [{ id: 99, score: 0.9 }, { id: 0, score: 0.5 }];
    const out = applyReranking(docs, scores, 5);
    expect(out.map(d => d.url)).toEqual(['https://a']);
  });

  it('scores 비어있으면 원본 순서 그대로 topN (graceful — 리랭크 실패 시 폴백)', () => {
    const out = applyReranking(docs, [], 2);
    expect(out.map(d => d.url)).toEqual(['https://a', 'https://b']);
    expect(out[0].rerankScore).toBeUndefined();
  });

  it('topN이 문서수보다 크면 전체', () => {
    const scores: RerankScore[] = [{ id: 0, score: 0.5 }];
    expect(applyReranking(docs, scores, 10)).toHaveLength(1);
  });

  it('빈 docs 안전', () => {
    expect(applyReranking([], [{ id: 0, score: 1 }], 5)).toEqual([]);
  });

  it('중복 id는 첫 번째만(방어)', () => {
    const scores: RerankScore[] = [{ id: 0, score: 0.9 }, { id: 0, score: 0.8 }];
    expect(applyReranking(docs, scores, 5)).toHaveLength(1);
  });
});
