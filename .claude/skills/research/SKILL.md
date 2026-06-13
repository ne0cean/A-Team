---
name: research
description: Cortex Research Gateway — 개인화 검색 복리 엔진. 퍼플렉시티/구글보다 뛰어난 이유는 "나를 알기" 때문. 매 검색의 과정·결과가 Cortex에 축적되어 다음 검색이 더 좋아진다(복리). "리서치", "검색해줘", "찾아봐", "research" 시 사용.
---

# Cortex Research Gateway

일반 검색(퍼플렉시티/구글)이 못 하는 두 가지 — **나를 아는 것**과 **복리** — 를 한다.

## 3-레이어 아키텍처

| 레이어 | 역할 | 구현 | 모델 |
|--------|------|------|------|
| **L1 웹** | 라이브 웹 출처 수집 | Exa API (`lib/exa.ts`) | — (외부 API, 월 20k 무료) |
| **L2 개인화** | 질의를 *내 맥락*으로 재구성 + 답을 *나에게* 합성 | `lib/personalize.ts` | 합성: Anthropic 또는 Groq `llm` |
| **L3 복리** | 검색 과정·결과를 축적, 다음 검색에 회상 | `lib/research-memory.ts` (로컬 JSONL → Phase 2 D1+Vectorize) | — |

오케스트레이터: `lib/research-gateway.ts`의 `runResearch(io, query)` — 모든 IO 주입.

## 운영 절차

```bash
# 전체 루프(실 검색, Exa 키 필요)
npx tsx scripts/research/research.mjs --q="질의" [--synth=groq|raw] [--json]

# Exa 없이 루프 검증(복리·개인화 동작 확인)
npx tsx scripts/research/research.mjs --q="질의" --dry-run --root=/tmp/x
```

흐름: `recall(L3)` → `personalize(L2)` → `web(L1, Exa)` → `synthesize(L2)` → `deposit(L3)`.
deposit은 `.context/research/memory.jsonl`에 append(기존 데이터 덮어쓰기 없음).

## 스킬 모드 합성 (권장: 최고 품질)

`--synth=raw`로 CLI를 실행하면 grounding + 웹 결과만 출력된다. **Claude(나)가 직접 그 grounding에 따라 합성**하면 Groq보다 품질이 높다:
1. `--synth=raw --json`으로 실행 → `reformulated`, `sources`, 그리고 개인화 맥락 확보
2. 출력의 grounding(사용자 프로필·과거 리서치·Cortex 노트)에 따라 인용 포함 답 합성
3. 일반론 금지 — 이 사용자의 상황에 특화된 시사점을 낸다

## 복리의 작동

- 1차 검색: 과거 맥락 0 → 일반 검색 수준 + 적립
- 2차(연관) 검색: 1차 적립을 회상 → 재구성 질의에 1차 엔티티 주입 + grounding에 "이미 아는 것" 포함 → **더 깊은 답**
- 무관한 검색은 끌어오지 않음(오염 방지)
- Cold-start 주의: 초기엔 효과 미미, 누적으로 발현. 조기 평가 금지.

## 역할 구분

- `/intel`: 시장·경쟁사·페르소나 수집(구조화 인텔리전스). 개인화·복리 없음.
- `researcher` 에이전트: 일회성 심층 조사. 축적 없음.
- **이 스킬**: 개인화 + 복리. 일상 검색을 퍼플렉시티 대신 여기로.

## Phase 2 업그레이드 (예정)

`lib/research-memory.ts`의 IO 인터페이스를 D1+Vectorize(시맨틱) 또는 Cognee(자가개선 그래프, memify)로 교체. 회상이 토큰 겹침 → 시맨틱으로 강화. lib 순수 로직·테스트는 불변.
