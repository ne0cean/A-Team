/**
 * lib/research-memory.ts — L3 복리 메모리 (Cortex Research Gateway)
 *
 * 매 검색의 과정·결과를 구조화해 적립(deposit)하고, 다음 검색에서 회상(recall)한다.
 * 이 적립→회상 순환이 "복리"의 코드 구현. 퍼플렉시티/구글이 못 하는 지점.
 *
 * 설계 원칙:
 *  - 순수 로직만 여기. D1/Vectorize/임베딩 IO는 MemoryIO로 주입(CLI가 오케스트레이션).
 *  - 적립은 항상 신규 레코드. 기존 데이터 덮어쓰기 금지(D1 SSOT read-modify-write).
 */

import type { SearchHit } from './exa.js';

/** 이전 검색에서 적립된 항목(회상 결과) */
export interface RecallHit {
  query: string;
  reformulated: string;
  summary: string;
  entities: string[];
  sources: string[];        // url[]
  ts: string;
  score?: number;           // 시맨틱 유사도(있으면)
}

/** Cortex 노트 검색 결과(cortex_search) */
export interface CortexHit {
  title: string;
  snippet: string;
  path?: string;
}

/** L2가 소비하는 개인화 맥락 번들 */
export interface ContextBundle {
  profile: string[];            // 나에 대한 안정적 사실(취향/역할/제약)
  priorFindings: RecallHit[];   // 관련 과거 검색
  relatedCortexDocs: CortexHit[];
  entities: string[];           // 회상+Cortex에서 합친 핵심 엔티티
}

/** 한 번의 검색을 적립하는 단위 */
export interface Deposit {
  query: string;
  reformulated: string;
  summary: string;        // 합성 답의 요약(또는 답 전체)
  entities: string[];
  sources: string[];      // url[]
  ts: string;
  hash: string;           // dedup 키
}

/** 주입되는 IO 경계(테스트에서 mock) */
export interface MemoryIO {
  embed(text: string): Promise<number[]>;
  recall(queryText: string, k: number): Promise<RecallHit[]>;
  cortexSearch(queryText: string, k: number): Promise<CortexHit[]>;
  append(deposit: Deposit, vector: number[]): Promise<void>;
}

/** djb2 안정 해시(결정적, 테스트 가능) */
export function hashContent(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'is', 'are',
  '그', '이', '저', '것', '수', '등', '및', '에', '를', '을', '은', '는', '가',
]);

/** 텍스트에서 핵심 엔티티 후보 추출: 따옴표/대문자토큰/길이≥2 토큰 정규화 */
export function extractEntities(text: string, cap = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    const norm = t.trim();
    const key = norm.toLowerCase();
    if (norm.length < 2 || STOPWORDS.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(norm);
  };
  // 1) 따옴표/백틱 안 구절 우선
  for (const m of text.matchAll(/[`"']([^`"']{2,40})[`"']/g)) add(m[1]);
  // 2) CamelCase·대문자 시작 토큰, 한글 2+ 토큰, 영숫자 토큰
  for (const m of text.matchAll(/[A-Z][A-Za-z0-9_-]{1,}|[가-힣]{2,}|[a-z][a-z0-9_-]{2,}/g)) add(m[0]);
  return out.slice(0, cap);
}

/** 회상 결과 + Cortex 노트를 개인화 맥락 번들로 병합 */
export function buildContextBundle(
  recallHits: RecallHit[],
  cortexHits: CortexHit[],
  profile: string[] = []
): ContextBundle {
  const entities: string[] = [];
  const seen = new Set<string>();
  const pushE = (e: string) => {
    const k = e.toLowerCase();
    if (!seen.has(k)) { seen.add(k); entities.push(e); }
  };
  for (const r of recallHits) for (const e of r.entities) pushE(e);
  for (const c of cortexHits) for (const e of extractEntities(c.title)) pushE(e);
  return {
    profile: [...profile],
    priorFindings: [...recallHits],
    relatedCortexDocs: [...cortexHits],
    entities: entities.slice(0, 20),
  };
}

/** 한 검색을 Deposit으로 구조화(ts 주입 → 결정적/테스트 가능) */
export function extractDeposit(
  input: { query: string; reformulated: string; answer: string; sources: string[] },
  ts: string
): Deposit {
  const entities = extractEntities(`${input.query} ${input.answer}`);
  const sources = [...new Set(input.sources.filter(Boolean))];
  const summary = input.answer.length > 1200 ? input.answer.slice(0, 1200) + '…' : input.answer;
  return {
    query: input.query,
    reformulated: input.reformulated,
    summary,
    entities,
    sources,
    ts,
    hash: hashContent(`${input.query.toLowerCase().trim()}|${sources.slice().sort().join(',')}`),
  };
}

/** SearchHit[] → url[] (sources 헬퍼) */
export function sourcesOf(hits: SearchHit[]): string[] {
  return hits.map(h => h.url).filter(Boolean);
}

/** 이미 적립된 것과 중복인지: 같은 hash 또는 동일 질의+출처집합 */
export function isDuplicate(existing: Deposit[], candidate: Deposit): boolean {
  return existing.some(d => d.hash === candidate.hash);
}

const RANK_RE = /[a-z0-9]{2,}|[가-힣]{2,}/g;
function rankTokens(s: string): string[] {
  return (s.toLowerCase().match(RANK_RE) ?? []);
}

/** 적립된 Deposit[]에서 질의와 토큰 겹침으로 회상(L3 recall 코어). */
export function rankRecall(deposits: Deposit[], queryText: string, k: number): RecallHit[] {
  const q = new Set(rankTokens(queryText));
  if (q.size === 0) return [];
  return deposits
    .map(d => {
      const toks = rankTokens(`${d.query} ${d.entities.join(' ')}`);
      const seen = new Set<string>();
      let hit = 0;
      for (const t of toks) if (q.has(t) && !seen.has(t)) { hit++; seen.add(t); }
      return { d, s: hit };
    })
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(({ d }): RecallHit => ({
      query: d.query, reformulated: d.reformulated, summary: d.summary,
      entities: d.entities, sources: d.sources, ts: d.ts,
    }));
}

/** JSONL 텍스트 → Deposit[] (깨진 줄은 건너뜀). 로컬 메모리 파일 파서. */
export function parseMemoryJsonl(text: string): Deposit[] {
  const out: Deposit[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.query === 'string' && typeof o.hash === 'string') out.push(o as Deposit);
    } catch { /* 깨진 줄 무시 */ }
  }
  return out;
}

/** Deposit → JSONL 한 줄 */
export function serializeDeposit(d: Deposit): string {
  return JSON.stringify(d);
}
