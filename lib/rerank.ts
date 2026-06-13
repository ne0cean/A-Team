/**
 * lib/rerank.ts — 리랭킹 순수 로직 (Cortex Research Gateway)
 *
 * 목적은 "raw 검색 품질"이 아니라 정리(整理): Exa가 가져온 결과를
 * 질의 관련도로 재정렬해 합성 LLM에 *제일 관련된 출처를 앞에* 넘긴다.
 * → 합성이 더 깔끔하고, 입력이 작아져 토큰초과(3043)도 완화.
 *
 * 네트워크(@cf/baai/bge-reranker-base 호출)는 호출자. 여기는 순수.
 */

export interface RerankScore {
  id: number;     // contexts 배열 원본 인덱스
  score: number;
}

/** Workers AI bge-reranker 응답 {result:{response:[{id,score}]}} → RerankScore[] */
export function parseRerankResponse(raw: unknown): RerankScore[] {
  const r = (raw as { result?: { response?: unknown } } | null)?.result?.response;
  if (!Array.isArray(r)) return [];
  const out: RerankScore[] = [];
  for (const item of r) {
    const it = item as { id?: unknown; score?: unknown };
    if (typeof it.id === 'number' && typeof it.score === 'number') {
      out.push({ id: it.id, score: it.score });
    }
  }
  return out;
}

/**
 * docs를 rerank 점수순으로 재정렬 + topN 절단 + rerankScore 부착.
 * scores 비어있으면(리랭크 실패) 원본 순서 그대로 topN — graceful 폴백.
 */
export function applyReranking<T extends object>(
  docs: T[],
  scores: RerankScore[],
  topN: number,
): Array<T & { rerankScore?: number }> {
  if (docs.length === 0) return [];
  if (scores.length === 0) return docs.slice(0, topN);

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const out: Array<T & { rerankScore?: number }> = [];
  const seen = new Set<number>();
  for (const s of sorted) {
    if (s.id < 0 || s.id >= docs.length || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({ ...docs[s.id], rerankScore: s.score });
    if (out.length >= topN) break;
  }
  return out;
}
