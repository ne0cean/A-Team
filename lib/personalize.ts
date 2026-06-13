/**
 * lib/personalize.ts — L2 개인화 (Cortex Research Gateway의 모트)
 *
 * 퍼플렉시티/구글이 못 하는 단 하나: 나를 안다. 이 레이어가 그것을 한다.
 *  - reformulateQuery: 생질의를 *내 맥락*으로 확장 → Exa 적중률↑
 *  - buildSynthesisGrounding: 답을 *나에게* 맞춰 합성하도록 system 프롬프트 구성
 *
 * 순수 로직. LLM 호출은 상위(CLI)에서 grounding을 받아 주입한다.
 * 학술 근거: 사용자 맥락을 query reformulation/synthesis에 주입 (arxiv 2504.10147).
 */

import type { ContextBundle, RecallHit } from './research-memory.js';

const TOKEN_RE = /[A-Za-z0-9_-]{2,}|[가-힣]{2,}/g;

function tokens(s: string): string[] {
  return (s.toLowerCase().match(TOKEN_RE) ?? []);
}

/** 생질의와의 토큰 겹침으로 맥락 관련도 점수 */
export function relevanceScore(rawQuery: string, text: string): number {
  const q = new Set(tokens(rawQuery));
  if (q.size === 0) return 0;
  const t = tokens(text);
  let hit = 0;
  const counted = new Set<string>();
  for (const tok of t) {
    if (q.has(tok) && !counted.has(tok)) { hit++; counted.add(tok); }
  }
  return hit / q.size;
}

/** 번들에서 생질의에 가장 관련 깊은 맥락 요소를 골라낸다 */
export function selectSalientContext(
  rawQuery: string,
  bundle: ContextBundle,
  k = 3
): { findings: RecallHit[]; entities: string[]; docs: ContextBundle['relatedCortexDocs'] } {
  const findings = [...bundle.priorFindings]
    .map(f => ({ f, s: relevanceScore(rawQuery, `${f.query} ${f.summary} ${f.entities.join(' ')}`) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(x => x.f);

  const docs = [...bundle.relatedCortexDocs]
    .map(d => ({ d, s: relevanceScore(rawQuery, `${d.title} ${d.snippet}`) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(x => x.d);

  // 엔티티는 *관련 finding/doc*에서만 끌어온다(글로벌 풀 주입은 질의 오염).
  // 생질의에 이미 모든 토큰이 있는 엔티티는 제외(중복 주입 방지).
  const qTok = new Set(tokens(rawQuery));
  const entities: string[] = [];
  const seen = new Set<string>();
  const pushE = (e: string) => {
    const key = e.toLowerCase();
    if (seen.has(key)) return;
    const et = tokens(e);
    if (et.length === 0 || et.every(t => qTok.has(t))) return;  // 이미 질의에 있음
    seen.add(key);
    entities.push(e);
  };
  // 질의 확장은 고신호인 과거검색(finding) 엔티티에서만. doc 제목은 노이즈가 많아
  // 합성 grounding(buildSynthesisGrounding)에만 사용하고 질의에는 주입하지 않는다.
  for (const f of findings) for (const e of f.entities) pushE(e);

  return { findings, entities: entities.slice(0, k), docs };
}

/** 개인화 질의 재구성: 생질의 + 관련 엔티티(LLM 없이도 Exa 적중률↑) */
export function reformulateQuery(rawQuery: string, bundle: ContextBundle, k = 3): string {
  const { entities } = selectSalientContext(rawQuery, bundle, k);
  if (entities.length === 0) return rawQuery;
  return `${rawQuery} (${entities.join(', ')})`;
}

/** 합성 grounding: 답을 나에게 맞추도록 지시하는 system 프롬프트 */
export function buildSynthesisGrounding(rawQuery: string, bundle: ContextBundle): string {
  const lines: string[] = [];
  lines.push('당신은 이 사용자 전용 리서치 엔진이다. 일반 검색보다 뛰어나야 하는 이유는 사용자를 알기 때문이다.');
  if (bundle.profile.length) {
    lines.push('\n## 사용자 프로필');
    for (const p of bundle.profile) lines.push(`- ${p}`);
  }
  const { findings, docs } = selectSalientContext(rawQuery, bundle, 4);
  if (findings.length) {
    lines.push('\n## 사용자의 과거 관련 리서치(이미 아는 것 — 반복하지 말고 연결·심화)');
    for (const f of findings) lines.push(`- "${f.query}" → ${f.summary.slice(0, 200)}`);
  }
  if (docs.length) {
    lines.push('\n## 사용자 Cortex 노트(개인 맥락)');
    for (const d of docs) lines.push(`- ${d.title}: ${d.snippet.slice(0, 160)}`);
  }
  lines.push('\n## 합성 규칙');
  lines.push('- 사용자가 이미 아는 내용은 압축하고, 새로운 것·사용자 맥락에 특화된 함의에 집중.');
  lines.push('- 모든 주장에 출처 번호를 단다.');
  lines.push('- 일반론 금지. 이 사용자의 상황(프로필·과거 리서치)에 비춘 구체적 시사점을 낸다.');
  return lines.join('\n');
}
