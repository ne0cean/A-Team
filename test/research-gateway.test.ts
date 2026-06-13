import { describe, it, expect, vi } from 'vitest';
import { runResearch, inMemoryIO, type GatewayIO } from '../lib/research-gateway.js';
import type { SearchHit } from '../lib/exa.js';

function hit(url: string, title = 't', text = ''): SearchHit {
  return { id: url, url, title, text, author: null, publishedDate: null, score: 1 };
}

describe('runResearch — 단일 검색 흐름', () => {
  it('recall→personalize→web→synthesize→deposit 전체 실행 + 적립', async () => {
    const io = inMemoryIO({ profile: ['1인 + AI 팀'] });
    const r = await runResearch(io, 'Cloudflare D1 검색 최적화');
    expect(r.answer).toContain('Cloudflare D1 검색 최적화');
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.deposited).not.toBeNull();
    expect(io.store).toHaveLength(1);              // 적립됨
    expect(r.contextUsed.profile).toBe(1);
  });

  it('deposit:false면 적립하지 않음', async () => {
    const io = inMemoryIO({});
    const r = await runResearch(io, 'q', { deposit: false });
    expect(r.deposited).toBeNull();
    expect(io.store).toHaveLength(0);
  });

  it('cold-start: 과거 맥락 없으면 contextUsed.priorFindings=0', async () => {
    const io = inMemoryIO({});
    const r = await runResearch(io, '완전히 새로운 주제');
    expect(r.contextUsed.priorFindings).toBe(0);
  });
});

describe('★ 복리 증명 — 2차 검색이 1차 적립을 활용', () => {
  it('1차 적립 후 연관 2차 검색의 recall이 1차 맥락을 끌어와 grounding/질의에 반영', async () => {
    const groundings: string[] = [];
    const io = inMemoryIO({
      synthesize: (grounding, query) => { groundings.push(grounding); return `답: ${query}`; },
      webResults: (q) => [hit('https://d1.dev', 'D1 FTS5 가이드', q)],
      nowSeq: ['2026-06-13T01:00:00Z', '2026-06-13T02:00:00Z'],
    });

    // 1차: 맥락 없음
    const r1 = await runResearch(io, 'Cloudflare D1 FTS5 검색 최적화');
    expect(r1.contextUsed.priorFindings).toBe(0);
    expect(io.store).toHaveLength(1);

    // 2차: 1차와 연관된 질의 → recall이 1차 deposit을 회상해야 함
    const r2 = await runResearch(io, 'D1 검색 인덱스 어떻게');
    expect(r2.contextUsed.priorFindings).toBeGreaterThanOrEqual(1);  // ← 복리: 1차를 활용
    // 2차 grounding에 1차 질의가 "과거 리서치"로 포함됨
    const g2 = groundings[1];
    expect(g2).toContain('과거 관련 리서치');
    expect(g2).toContain('Cloudflare D1 FTS5 검색 최적화');
    expect(io.store).toHaveLength(2);
  });

  it('무관한 2차 검색은 1차를 끌어오지 않음(오염 방지)', async () => {
    const io = inMemoryIO({ nowSeq: ['2026-06-13T01:00:00Z', '2026-06-13T02:00:00Z'] });
    await runResearch(io, 'Cloudflare D1 검색');
    const r2 = await runResearch(io, '스쿼트 운동 자세 교정');
    expect(r2.contextUsed.priorFindings).toBe(0);
  });
});

describe('runResearch — IO 주입 계약', () => {
  it('주입된 webSearch/synthesize/embed/deposit가 모두 호출됨', async () => {
    const deposit = vi.fn(async () => {});
    const embed = vi.fn(async () => [1, 2, 3]);
    const webSearch = vi.fn(async () => [hit('https://x')]);
    const synthesize = vi.fn(async () => '답');
    const io: GatewayIO = {
      loadProfile: async () => [],
      recall: async () => [],
      cortexSearch: async () => [],
      webSearch, synthesize, embed, deposit,
      now: () => '2026-06-13T00:00:00Z',
    };
    await runResearch(io, 'q');
    expect(webSearch).toHaveBeenCalledOnce();
    expect(synthesize).toHaveBeenCalledOnce();
    expect(embed).toHaveBeenCalledOnce();
    expect(deposit).toHaveBeenCalledOnce();
  });
});
