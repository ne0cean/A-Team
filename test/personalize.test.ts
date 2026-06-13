import { describe, it, expect } from 'vitest';
import {
  relevanceScore, selectSalientContext, reformulateQuery, buildSynthesisGrounding,
} from '../lib/personalize.js';
import { buildContextBundle, type RecallHit, type CortexHit } from '../lib/research-memory.js';

const recall: RecallHit[] = [
  { query: 'Cloudflare D1 검색', reformulated: '', summary: 'D1은 SQLite 기반, FTS5 가능', entities: ['D1', 'FTS5', 'Cloudflare'], sources: ['https://a'], ts: '2026-06-01T00:00:00Z' },
  { query: '마케팅 자동화', reformulated: '', summary: '캠페인 파이프라인', entities: ['campaign', 'pipeline'], sources: ['https://b'], ts: '2026-06-02T00:00:00Z' },
];
const cortex: CortexHit[] = [
  { title: 'Cortex D1 대시보드', snippet: 'D1 Vectorize 검색 인프라' },
  { title: '운동 루틴', snippet: '주 3회 스쿼트' },
];
const bundle = buildContextBundle(recall, cortex, ['1인 + AI 팀', 'Cloudflare 스택 선호']);

describe('relevanceScore', () => {
  it('겹치는 토큰 비율', () => {
    expect(relevanceScore('D1 검색', 'D1 검색 인프라')).toBe(1);
    expect(relevanceScore('D1 검색', '운동 루틴')).toBe(0);
  });
  it('빈 질의는 0', () => {
    expect(relevanceScore('', 'anything')).toBe(0);
  });
});

describe('selectSalientContext', () => {
  it('생질의 관련 finding/doc만 골라냄', () => {
    const sel = selectSalientContext('D1 Vectorize 검색', bundle, 3);
    // D1 관련 finding이 마케팅보다 우선
    expect(sel.findings[0].query).toBe('Cloudflare D1 검색');
    expect(sel.findings.some(f => f.query === '마케팅 자동화')).toBe(false);
    // Cortex 노트도 D1 대시보드가 선택, 운동 루틴 제외
    expect(sel.docs.some(d => d.title.includes('D1'))).toBe(true);
    expect(sel.docs.some(d => d.title.includes('운동'))).toBe(false);
  });

  it('무관한 질의는 빈 선택', () => {
    const sel = selectSalientContext('전혀무관한질의키워드', bundle, 3);
    expect(sel.findings).toEqual([]);
    expect(sel.docs).toEqual([]);
  });
});

describe('reformulateQuery (개인화 확장)', () => {
  it('맥락 엔티티를 질의에 주입', () => {
    const q = reformulateQuery('검색 인프라 어떻게', bundle);
    // D1/FTS5/Vectorize 같은 내 맥락 엔티티가 붙어야 함
    expect(q).toContain('검색 인프라 어떻게');
    expect(q.length).toBeGreaterThan('검색 인프라 어떻게'.length);
  });

  it('관련 맥락 없으면 생질의 그대로', () => {
    const empty = buildContextBundle([], [], []);
    expect(reformulateQuery('아무거나', empty)).toBe('아무거나');
  });

  it('질의에 이미 있는 엔티티는 중복 주입 안 함', () => {
    const q = reformulateQuery('D1 FTS5 Cloudflare 검색', bundle);
    // 모든 엔티티가 이미 질의에 있으면 확장 없음
    expect(q).toBe('D1 FTS5 Cloudflare 검색');
  });
});

describe('buildSynthesisGrounding (나에게 맞춘 합성)', () => {
  it('프로필·과거리서치·Cortex노트·합성규칙 포함', () => {
    const g = buildSynthesisGrounding('D1 검색 인프라', bundle);
    expect(g).toContain('사용자 프로필');
    expect(g).toContain('1인 + AI 팀');
    expect(g).toContain('과거 관련 리서치');
    expect(g).toContain('Cloudflare D1 검색');
    expect(g).toContain('합성 규칙');
    expect(g).toContain('출처');
  });

  it('빈 번들이면 프로필/과거 섹션 생략하되 규칙은 유지', () => {
    const g = buildSynthesisGrounding('q', buildContextBundle([], [], []));
    expect(g).not.toContain('사용자 프로필');
    expect(g).toContain('합성 규칙');
  });
});
