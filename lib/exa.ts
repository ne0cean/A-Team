/**
 * lib/exa.ts — L1 웹 검색 레이어 (Cortex Research Gateway)
 *
 * Exa API(https://exa.ai) 얇은 래퍼. "퍼플렉시티를 이긴다"의 L1은 자작하지 않고 사 온다.
 * 월 20,000 req 무료 → 1인 사용량은 사실상 $0.
 *
 * 설계 원칙:
 *  - 순수성: fetch와 apiKey를 주입받는다(기본값 global fetch). → 테스트는 mock fetch로 격리.
 *  - 응답 정규화: Exa raw 응답을 SearchHit으로 표준화해 상위 레이어가 Exa 스키마에 결합되지 않게.
 *  - 에러 명시: 키 없음/HTTP 에러를 삼키지 않고 ExaError로 던진다(fail fast).
 */

export interface SearchHit {
  id: string;
  url: string;
  title: string;
  text: string;            // 풀텍스트(contents 요청 시) 또는 ''
  author: string | null;
  publishedDate: string | null;
  score: number | null;    // Exa relevance score
}

export interface ExaSearchOptions {
  numResults?: number;            // 기본 8
  type?: 'auto' | 'neural' | 'keyword' | 'fast';  // 기본 auto
  includeText?: boolean;          // true면 contents 풀텍스트 포함(1콜)
  startPublishedDate?: string;    // ISO, 신선도 필터
}

export interface ExaAnswerResult {
  answer: string;
  citations: SearchHit[];
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }>;

export interface ExaClientConfig {
  apiKey: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;       // 기본 https://api.exa.ai
}

export class ExaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ExaError';
    this.status = status;
  }
}

const DEFAULT_BASE = 'https://api.exa.ai';

function resolveFetch(cfg: ExaClientConfig): FetchLike {
  if (cfg.fetchImpl) return cfg.fetchImpl;
  const g = (globalThis as any).fetch;
  if (!g) throw new ExaError('global fetch unavailable — pass fetchImpl', 0);
  return g as FetchLike;
}

function requireKey(cfg: ExaClientConfig): string {
  if (!cfg.apiKey || cfg.apiKey.trim().length === 0) {
    throw new ExaError('EXA_API_KEY 미설정 — exa.ai에서 무료 발급 후 .env에 EXA_API_KEY=... 추가', 401);
  }
  return cfg.apiKey;
}

async function post(cfg: ExaClientConfig, path: string, body: unknown): Promise<any> {
  const key = requireKey(cfg);
  const fetchImpl = resolveFetch(cfg);
  const base = cfg.baseUrl ?? DEFAULT_BASE;
  const res = await fetchImpl(`${base}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new ExaError(`Exa ${path} HTTP ${res.status}: ${detail.slice(0, 200)}`, res.status);
  }
  return res.json();
}

/** Exa raw result → SearchHit 정규화 */
export function normalizeHit(raw: any): SearchHit {
  return {
    id: String(raw?.id ?? raw?.url ?? ''),
    url: String(raw?.url ?? ''),
    title: String(raw?.title ?? '').trim(),
    text: typeof raw?.text === 'string' ? raw.text : '',
    author: raw?.author ? String(raw.author) : null,
    publishedDate: raw?.publishedDate ? String(raw.publishedDate) : null,
    score: typeof raw?.score === 'number' ? raw.score : null,
  };
}

/** L1 검색: 쿼리 → 정규화된 SearchHit[] */
export async function exaSearch(
  cfg: ExaClientConfig,
  query: string,
  opts: ExaSearchOptions = {}
): Promise<SearchHit[]> {
  const body: Record<string, unknown> = {
    query,
    numResults: opts.numResults ?? 8,
    type: opts.type ?? 'auto',
  };
  if (opts.includeText) body.contents = { text: { maxCharacters: 8000 } };
  if (opts.startPublishedDate) body.startPublishedDate = opts.startPublishedDate;
  const data = await post(cfg, '/search', body);
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  return results.map(normalizeHit);
}

/** 특정 결과들의 풀텍스트 회수(검색과 분리 호출 시) */
export async function exaContents(cfg: ExaClientConfig, ids: string[]): Promise<SearchHit[]> {
  if (ids.length === 0) return [];
  const data = await post(cfg, '/contents', { ids, text: { maxCharacters: 8000 } });
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  return results.map(normalizeHit);
}

/** Exa 합성 답변(인용 포함). L2 개인화 합성과 별개의 "기본" 답변. */
export async function exaAnswer(cfg: ExaClientConfig, query: string): Promise<ExaAnswerResult> {
  const data = await post(cfg, '/answer', { query, text: true });
  const citations: any[] = Array.isArray(data?.citations) ? data.citations : [];
  return {
    answer: String(data?.answer ?? ''),
    citations: citations.map(normalizeHit),
  };
}
