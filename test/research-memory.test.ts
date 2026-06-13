import { describe, it, expect } from 'vitest';
import {
  hashContent, extractEntities, buildContextBundle, extractDeposit,
  sourcesOf, isDuplicate, type RecallHit, type CortexHit, type Deposit,
} from '../lib/research-memory.js';

const TS = '2026-06-13T00:00:00.000Z';

describe('hashContent', () => {
  it('결정적이고 입력 다르면 다름', () => {
    expect(hashContent('a')).toBe(hashContent('a'));
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('extractEntities', () => {
  it('따옴표 구절·대문자·한글 토큰 추출, stopword/중복 제거', () => {
    const ents = extractEntities('Cortex는 "복리 루프"를 만든다 Exa Vectorize Vectorize');
    expect(ents).toContain('복리 루프');
    expect(ents).toContain('Cortex');
    expect(ents).toContain('Exa');
    // 중복 제거
    expect(ents.filter(e => e === 'Vectorize')).toHaveLength(1);
  });

  it('cap 적용', () => {
    const ents = extractEntities('Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel', 3);
    expect(ents).toHaveLength(3);
  });

  it('빈 문자열 안전', () => {
    expect(extractEntities('')).toEqual([]);
  });
});

describe('buildContextBundle', () => {
  const recall: RecallHit[] = [
    { query: '토큰 절감', reformulated: '토큰 절감 (RTK)', summary: 'RTK로 60% 절감', entities: ['RTK', 'token'], sources: ['https://a.com'], ts: TS },
  ];
  const cortex: CortexHit[] = [{ title: 'Cortex 대시보드', snippet: 'D1 SSOT' }];

  it('recall + cortex 엔티티 병합, profile 전달', () => {
    const b = buildContextBundle(recall, cortex, ['1인 AI 팀']);
    expect(b.profile).toEqual(['1인 AI 팀']);
    expect(b.priorFindings).toHaveLength(1);
    expect(b.relatedCortexDocs).toHaveLength(1);
    expect(b.entities).toContain('RTK');
    expect(b.entities).toContain('Cortex');
  });

  it('엔티티 중복 제거(대소문자 무시)', () => {
    const b = buildContextBundle(
      [{ ...recall[0], entities: ['RTK', 'rtk'] }], [], []
    );
    expect(b.entities.filter(e => e.toLowerCase() === 'rtk')).toHaveLength(1);
  });

  it('빈 입력 안전', () => {
    const b = buildContextBundle([], [], []);
    expect(b.entities).toEqual([]);
    expect(b.profile).toEqual([]);
  });
});

describe('extractDeposit', () => {
  it('질의+답에서 엔티티 추출, 출처 dedup, ts 주입, hash 생성', () => {
    const d = extractDeposit({
      query: 'Cortex 검색',
      reformulated: 'Cortex 검색 (D1)',
      answer: 'Cortex는 D1과 Vectorize를 쓴다',
      sources: ['https://a.com', 'https://a.com', 'https://b.com'],
    }, TS);
    expect(d.ts).toBe(TS);
    expect(d.sources).toEqual(['https://a.com', 'https://b.com']);
    expect(d.entities).toContain('Cortex');
    expect(d.hash).toMatch(/^[0-9a-f]+$/);
  });

  it('긴 답은 summary 절단', () => {
    const long = 'x'.repeat(2000);
    const d = extractDeposit({ query: 'q', reformulated: 'q', answer: long, sources: [] }, TS);
    expect(d.summary.length).toBeLessThanOrEqual(1201);
    expect(d.summary.endsWith('…')).toBe(true);
  });

  it('같은 질의+출처면 hash 동일(순서 무관)', () => {
    const a = extractDeposit({ query: 'Q', reformulated: '', answer: '', sources: ['https://x', 'https://y'] }, TS);
    const b = extractDeposit({ query: 'q', reformulated: '', answer: 'different', sources: ['https://y', 'https://x'] }, '2026-07-01T00:00:00Z');
    expect(a.hash).toBe(b.hash);
  });
});

describe('sourcesOf', () => {
  it('SearchHit[]에서 url만 추출, 빈 url 제거', () => {
    const urls = sourcesOf([
      { id: '1', url: 'https://a.com', title: '', text: '', author: null, publishedDate: null, score: null },
      { id: '2', url: '', title: '', text: '', author: null, publishedDate: null, score: null },
    ]);
    expect(urls).toEqual(['https://a.com']);
  });
});

describe('isDuplicate (복리 dedup)', () => {
  const base: Deposit = extractDeposit({ query: 'Q', reformulated: '', answer: '', sources: ['https://x'] }, TS);

  it('같은 hash면 중복', () => {
    const dup = extractDeposit({ query: 'q', reformulated: '', answer: 'x', sources: ['https://x'] }, '2026-08-01T00:00:00Z');
    expect(isDuplicate([base], dup)).toBe(true);
  });

  it('다른 출처면 비중복', () => {
    const fresh = extractDeposit({ query: 'Q', reformulated: '', answer: '', sources: ['https://z'] }, TS);
    expect(isDuplicate([base], fresh)).toBe(false);
  });

  it('빈 기존 목록이면 비중복', () => {
    expect(isDuplicate([], base)).toBe(false);
  });
});
