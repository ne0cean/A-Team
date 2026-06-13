/**
 * lib/research-gateway.ts — 복리 루프 오케스트레이터 (Cortex Research Gateway)
 *
 * recall(L3) → personalize(L2) → web(L1) → synthesize(L2) → deposit(L3)
 * 모든 IO를 GatewayIO로 주입한다 → 키/인프라 없이 복리 루프를 테스트로 증명 가능.
 *
 * "복리" = 이번 검색의 deposit이 다음 검색의 recall 입력이 되는 것. contextUsed로 가시화.
 */

import type { SearchHit } from './exa.js';
import {
  buildContextBundle, extractDeposit, sourcesOf, rankRecall,
  type RecallHit, type CortexHit, type Deposit,
} from './research-memory.js';
import { reformulateQuery, buildSynthesisGrounding, selectSalientContext } from './personalize.js';

export interface GatewayIO {
  loadProfile(): Promise<string[]>;
  recall(queryText: string, k: number): Promise<RecallHit[]>;
  cortexSearch(queryText: string, k: number): Promise<CortexHit[]>;
  webSearch(query: string): Promise<SearchHit[]>;
  /** grounding(system) + 생질의 + L1 결과 → 개인화 합성 답변 */
  synthesize(grounding: string, query: string, hits: SearchHit[]): Promise<string>;
  embed(text: string): Promise<number[]>;
  deposit(d: Deposit, vector: number[]): Promise<void>;
  now(): string;
}

export interface ResearchResult {
  query: string;
  reformulated: string;
  answer: string;
  sources: SearchHit[];
  contextUsed: { priorFindings: number; cortexDocs: number; profile: number };
  deposited: Deposit | null;
}

export interface RunOptions {
  recallK?: number;     // 회상 개수 (기본 5)
  deposit?: boolean;    // 적립 여부 (기본 true)
}

export async function runResearch(
  io: GatewayIO,
  rawQuery: string,
  opts: RunOptions = {}
): Promise<ResearchResult> {
  const k = opts.recallK ?? 5;

  // ① L3 recall + 프로필
  const [profile, recallHits, cortexHits] = await Promise.all([
    io.loadProfile(),
    io.recall(rawQuery, k),
    io.cortexSearch(rawQuery, k),
  ]);

  // ② L2 개인화: 맥락 번들 → 질의 재구성 + 합성 grounding
  const bundle = buildContextBundle(recallHits, cortexHits, profile);
  const reformulated = reformulateQuery(rawQuery, bundle);
  const grounding = buildSynthesisGrounding(rawQuery, bundle);
  const salient = selectSalientContext(rawQuery, bundle, 4);

  // ③ L1 웹 검색(재구성 질의로)
  const hits = await io.webSearch(reformulated);

  // ④ L2 합성(나에게 맞춘 답)
  const answer = await io.synthesize(grounding, rawQuery, hits);

  // ⑤ L3 deposit (복리 적립)
  let deposited: Deposit | null = null;
  if (opts.deposit !== false) {
    const d = extractDeposit(
      { query: rawQuery, reformulated, answer, sources: sourcesOf(hits) },
      io.now()
    );
    const vector = await io.embed(`${rawQuery}\n${answer}`);
    await io.deposit(d, vector);
    deposited = d;
  }

  return {
    query: rawQuery,
    reformulated,
    answer,
    sources: hits,
    contextUsed: {
      priorFindings: salient.findings.length,
      cortexDocs: salient.docs.length,
      profile: profile.length,
    },
    deposited,
  };
}

/** 인메모리 GatewayIO 어댑터(테스트·드라이런용). 실제 IO 없이 복리 루프 동작 검증. */
export function inMemoryIO(seed: {
  profile?: string[];
  synthesize?: (grounding: string, query: string, hits: SearchHit[]) => string;
  webResults?: (query: string) => SearchHit[];
  nowSeq?: string[];
}): GatewayIO & { store: Deposit[] } {
  const store: Deposit[] = [];
  const vectors: number[][] = [];
  let nowIdx = 0;
  const nowSeq = seed.nowSeq ?? [];

  return {
    store,
    async loadProfile() { return seed.profile ?? []; },
    async recall(queryText, k) { return rankRecall(store, queryText, k); },
    async cortexSearch() { return []; },
    async webSearch(query) {
      return seed.webResults
        ? seed.webResults(query)
        : [{ id: 'r1', url: 'https://example.com/1', title: `result for ${query}`, text: '', author: null, publishedDate: null, score: 1 }];
    },
    async synthesize(grounding, query, hits) {
      return seed.synthesize ? seed.synthesize(grounding, query, hits) : `답변: ${query} (출처 ${hits.length})`;
    },
    async embed() { return [0, 0, 0]; },
    async deposit(d, vector) { store.push(d); vectors.push(vector); },
    now() { return nowSeq[nowIdx++] ?? '2026-06-13T00:00:00.000Z'; },
  };
}
