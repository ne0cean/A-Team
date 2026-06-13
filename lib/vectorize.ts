/**
 * lib/vectorize.ts — L3 시맨틱 검색 레이어 (Cortex Research Gateway)
 *
 * Cloudflare Workers AI(임베딩) + Vectorize(벡터 DB)를 사용한 시맨틱 회상.
 * 기존 토큰 겹침(rankRecall) 방식을 대체/보완.
 *
 * 설계 원칙:
 *  - lib/exa.ts와 동일한 fetch 주입 패턴: FetchLike 타입, cfg.fetchImpl, requireKey
 *  - 에러는 VectorizeError로 명시적 throw(fail fast). 삼키지 않는다.
 *  - 순수 함수(matchesToRecall, depositToVectorMetadata)는 네트워크 없음.
 *  - ESM: top-level __dirname 사용 금지.
 */

import type { FetchLike } from './exa.js';
import type { Deposit, RecallHit } from './research-memory.js';

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface VectorizeConfig {
  accountId: string;
  apiToken: string;
  indexName: string;
  fetchImpl?: FetchLike;
}

export interface VectorMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class VectorizeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'VectorizeError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// 내부 헬퍼
// ---------------------------------------------------------------------------

function resolveFetch(cfg: VectorizeConfig): FetchLike {
  if (cfg.fetchImpl) return cfg.fetchImpl;
  const g = (globalThis as Record<string, unknown>).fetch;
  if (!g) throw new VectorizeError('global fetch unavailable — pass fetchImpl', 0);
  return g as FetchLike;
}

function requireToken(cfg: VectorizeConfig): string {
  if (!cfg.apiToken || cfg.apiToken.trim().length === 0) {
    throw new VectorizeError('CLOUDFLARE_API_TOKEN 미설정 — cfg.apiToken을 주입하세요', 401);
  }
  return cfg.apiToken;
}

const CF_BASE = 'https://api.cloudflare.com/client/v4';

async function cfPost(
  cfg: VectorizeConfig,
  url: string,
  body: string,
  contentType: string,
): Promise<unknown> {
  const token = requireToken(cfg);
  const fetchImpl = resolveFetch(cfg);
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new VectorizeError(
      `Vectorize POST ${url} HTTP ${res.status}: ${detail.slice(0, 200)}`,
      res.status,
    );
  }
  return res.json();
}

const postJson = (cfg: VectorizeConfig, url: string, body: unknown): Promise<unknown> =>
  cfPost(cfg, url, JSON.stringify(body), 'application/json');

const postNdjson = (cfg: VectorizeConfig, url: string, lines: unknown[]): Promise<unknown> =>
  cfPost(cfg, url, lines.map(l => JSON.stringify(l)).join('\n'), 'application/x-ndjson');

// ---------------------------------------------------------------------------
// 공개 함수
// ---------------------------------------------------------------------------

/**
 * 1. embedText — Cloudflare Workers AI BGE-M3 임베딩
 *    POST /accounts/{accountId}/ai/run/@cf/baai/bge-m3
 */
export async function embedText(
  cfg: VectorizeConfig,
  texts: string[],
): Promise<number[][]> {
  const url = `${CF_BASE}/accounts/${cfg.accountId}/ai/run/@cf/baai/bge-m3`;
  const data = await postJson(cfg, url, { text: texts }) as Record<string, unknown>;
  const result = data?.result as Record<string, unknown> | undefined;
  const vectors = result?.data;
  if (!Array.isArray(vectors)) return [];
  return vectors as number[][];
}

/**
 * 2. upsertVectors — Vectorize에 벡터 적재(NDJSON)
 *    POST /accounts/{accountId}/vectorize/v2/indexes/{indexName}/upsert
 */
export async function upsertVectors(
  cfg: VectorizeConfig,
  items: Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>,
): Promise<{ count: number }> {
  if (items.length === 0) return { count: 0 };
  const url = `${CF_BASE}/accounts/${cfg.accountId}/vectorize/v2/indexes/${cfg.indexName}/upsert`;
  await postNdjson(cfg, url, items);
  return { count: items.length };
}

/**
 * 3. queryVectors — 시맨틱 검색
 *    POST /accounts/{accountId}/vectorize/v2/indexes/{indexName}/query
 */
export async function queryVectors(
  cfg: VectorizeConfig,
  vector: number[],
  topK: number,
): Promise<VectorMatch[]> {
  const url = `${CF_BASE}/accounts/${cfg.accountId}/vectorize/v2/indexes/${cfg.indexName}/query`;
  const data = await postJson(cfg, url, { vector, topK, returnMetadata: 'all' }) as Record<string, unknown>;
  const result = data?.result as Record<string, unknown> | undefined;
  const matches = result?.matches;
  if (!Array.isArray(matches)) return [];
  return matches.map((m: Record<string, unknown>) => ({
    id: String(m.id ?? ''),
    score: typeof m.score === 'number' ? m.score : 0,
    metadata: (m.metadata ?? {}) as Record<string, unknown>,
  }));
}

// ---------------------------------------------------------------------------
// 순수 함수
// ---------------------------------------------------------------------------

/** JSON 문자열 또는 배열 → string[] (파싱 실패면 []) */
function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* ignore */ }
  }
  return [];
}

/**
 * 4. matchesToRecall — Vectorize match → RecallHit 복원 (순수)
 *    score < minScore 제외. entities/sources JSON 문자열 파싱.
 */
export function matchesToRecall(
  matches: VectorMatch[],
  minScore: number,
): RecallHit[] {
  const out: RecallHit[] = [];
  for (const m of matches) {
    if (m.score < minScore) continue;
    const md = m.metadata;
    out.push({
      query: String(md.query ?? ''),
      reformulated: String(md.reformulated ?? ''),
      summary: String(md.summary ?? ''),
      entities: parseStringArray(md.entities),
      sources: parseStringArray(md.sources),
      ts: String(md.ts ?? ''),
      score: m.score,
    });
  }
  return out;
}

/**
 * 5. depositToVectorMetadata — Deposit → Vectorize metadata (순수)
 *    배열은 JSON.stringify. 문자열 값만. id = d.hash (호출자가 별도로 사용).
 */
export function depositToVectorMetadata(d: Deposit): Record<string, string> {
  return {
    query: d.query,
    reformulated: d.reformulated,
    summary: d.summary,
    entities: JSON.stringify(d.entities),
    sources: JSON.stringify(d.sources),
    ts: d.ts,
  };
}
