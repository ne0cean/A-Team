/**
 * lib/research-io.ts — GatewayIO 어댑터 (로컬 JSONL + Vectorize 이중 저장)
 *
 * #1 발견(Vectorize upsert는 비동기 eventual-consistency) 대응 설계:
 *  - 로컬 JSONL: 동기·즉시 회상(최근/세션내). dedup·복리의 authority.
 *  - Vectorize: 시맨틱·지연 회상(전체 히스토리). best-effort.
 *  - recall = 시맨틱 우선 + 로컬 보충 병합. Vectorize 실패 시 로컬로 graceful degrade.
 *  - deposit = JSONL append(필수) + Vectorize upsert(best-effort, 실패해도 검색 안 죽음).
 *
 * 모든 IO를 deps로 주입 → 인프라 없이 테스트 가능.
 */

import type { GatewayIO } from './research-gateway.js';
import type { CortexHit, RecallHit, Deposit } from './research-memory.js';
import { parseMemoryJsonl, rankRecall, serializeDeposit } from './research-memory.js';
import { matchesToRecall, depositToVectorMetadata, type VectorMatch } from './vectorize.js';

/** returnMetadata:'all' 일 때 Vectorize topK 상한 */
const VECTORIZE_TOPK_MAX = 20;

export interface VectorizeAdapter {
  embed(texts: string[]): Promise<number[][]>;
  query(vector: number[], topK: number): Promise<VectorMatch[]>;
  upsert(items: Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>): Promise<unknown>;
  minScore: number;
}

export interface FileVectorizeDeps {
  readMemory(): string;                       // jsonl 내용('' 가능)
  appendMemory(line: string): void;           // 한 줄 append(개행 포함)
  loadProfile(): string[];
  cortexSearch(query: string, k: number): Promise<CortexHit[]>;
  now(): string;
  vectorize?: VectorizeAdapter;               // 없으면 로컬 전용 모드
}

/** 시맨틱 우선 + 로컬 보충, query(정규화) 중복 제거, k 상한 */
export function mergeRecall(semantic: RecallHit[], local: RecallHit[], k: number): RecallHit[] {
  const out: RecallHit[] = [];
  const seen = new Set<string>();
  for (const h of [...semantic, ...local]) {
    const key = h.query.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
    if (out.length >= k) break;
  }
  return out;
}

/** storage IO만 제공(webSearch/synthesize는 게이트웨이 소관 — 호출자가 합성). */
export type StorageIO = Omit<GatewayIO, 'webSearch' | 'synthesize'>;

export function createGatewayIO(deps: FileVectorizeDeps): StorageIO {
  return {
    async loadProfile() { return deps.loadProfile(); },

    async cortexSearch(query, k) { return deps.cortexSearch(query, k); },

    now() { return deps.now(); },

    async embed(text) {
      if (!deps.vectorize) return [];
      const vecs = await deps.vectorize.embed([text]);
      return vecs[0] ?? [];
    },

    async recall(query, k) {
      const local = rankRecall(parseMemoryJsonl(deps.readMemory()), query, k);
      if (!deps.vectorize) return local;
      // Vectorize 시맨틱 회상은 best-effort — 실패해도 로컬은 살린다(graceful degrade).
      try {
        const vec = (await deps.vectorize.embed([query]))[0];
        if (!vec || vec.length === 0) return local;
        const topK = Math.min(k, VECTORIZE_TOPK_MAX);
        const matches = await deps.vectorize.query(vec, topK);
        const semantic = matchesToRecall(matches, deps.vectorize.minScore);
        return mergeRecall(semantic, local, k);
      } catch {
        return local;
      }
    },

    async deposit(d: Deposit, vector: number[]) {
      deps.appendMemory(serializeDeposit(d) + '\n');   // 동기·필수
      if (!deps.vectorize || vector.length === 0) return;
      // Vectorize 적재는 best-effort — 실패해도 로컬 적립은 유지(검색 안 죽음).
      try {
        await deps.vectorize.upsert([{ id: d.hash, values: vector, metadata: depositToVectorMetadata(d) }]);
      } catch { /* 무시: eventual-consistency, 다음 회상은 로컬이 커버 */ }
    },
  };
}
