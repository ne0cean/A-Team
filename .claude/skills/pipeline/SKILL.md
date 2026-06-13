---
name: pipeline
description: Campaign Pipeline Orchestrator — 마케팅 E2E 사이클(brief→plan→produce→qa→publish→measure→feedback)을 상태머신으로 자율 실행. 인간 개입은 승인 2회로 압축. "캠페인 돌려줘", "파이프라인 실행", "campaign run" 시 사용.
---

# Campaign Pipeline — 메소돌로지 플레이북

A-Team의 진짜 자산은 산출물이 아니라 **이 방법론**이다. 대기업이 부서로 나눠 처리하는
마케팅 사이클 전체를 1인+AI가 상태머신 하나로 돌리고, 창업자는 딱 2개 터치포인트
(**방향 설정** = brief 승인, **발행 승인** = publish 승인)에만 개입한다.

## 아키텍처 (재사용 패턴)

| 레이어 | 파일 | 역할 |
|--------|------|------|
| 순수 로직 | `lib/pipeline.ts` | 매니페스트/게이트/전이. fs 없음(GateContext 주입) → vitest coverage 80% 충족 |
| 상태머신 | `lib/state-machine.ts` (재사용) | Transition 테이블 + guard. 신규 FSM 작성 금지 |
| 러너 CLI | `scripts/pipeline/pipeline-run.mjs` | IO 결합. `npx tsx`로 호출(.js→.ts 해석은 tsx 필요) |
| 분석 | `scripts/log-event.mjs` (재사용) | 전이마다 `pipeline_stage` 이벤트 → 벤치마크 데이터 자동 축적 |

## 운영 절차

```bash
# 1. 캠페인 생성 (과거 캠페인 lesson 키워드 매칭 자동 주입)
npx tsx scripts/pipeline/pipeline-run.mjs new --slug=YYYY-MM-DD-name --title="..."

# 2-A. 자율 실행 (claude 단계는 WORKORDER.md 생성 후 정지)
npx tsx scripts/pipeline/pipeline-run.mjs run <slug> --auto
#   → WORKORDER 수행 후: ... complete <slug> <stage>
#   → 터치포인트 도달 시 정지: ... approve <slug> <stage>

# 2-B. 완전 자율 데모/회귀 (claude 단계 placeholder 자동 생성 + 승인 자동)
npx tsx scripts/pipeline/pipeline-run.mjs run <slug> --auto --simulate --yes

# 3. 상태 확인
npx tsx scripts/pipeline/pipeline-run.mjs status <slug>
```

## 단계 × 모델 할당 (어떤 작업을 어떤 모델로)

| 단계 | executor | 모델/도구 | 근거 |
|------|----------|-----------|------|
| brief | claude (WORKORDER) | Sonnet + `/intel brief` | 요약·방향성, Opus 불필요 |
| brief_approval | **human** | — | 터치포인트 1 (방향 설정) |
| plan | claude | Sonnet + `/marketing` | 채널 플랜 |
| produce | claude | Sonnet + `/marketing-generate`,`/marketing-social` | 카피 생성 |
| qa | script | 모델 없음 (`audit-design` 22룰) | 결정론적 게이트 |
| publish_approval | **human** | — | 터치포인트 2 (발행 승인) |
| publish | script | 모델 없음 (dry-run, Postiz 어댑터) | I/O |
| measure | script | 모델 없음 (내부 데이터) | 집계 |
| feedback | script | 모델 없음 (DEBRIEF + Cortex 기록) | 환류 |

서브태스크 요약/번역 → Groq 70B (`llm`). 아키텍처 변경만 Opus.

## 게이트 (자동 품질 판정 — 사람 대신)

- `outputs_exist` — 산출물 글롭 존재
- `markers_filled` — `[HUMAN INSERT]` 잔존 시 fail
- `design_score` — audit 점수 ≥ 70 (ship 게이트)
- `publish_logged` — publish-log.md에 slug 기록

게이트 실패 → `blocked` + friction-log 자동 기록 → `retry`(max 3회).

## Cortex 복리 루프 (Axis 3 — 코드로 닫힘)

feedback 단계가 `recordToCortex()` 실행:
1. `.context/loop/campaign-knowledge.jsonl`에 캠페인 lesson + 키워드 append
2. `gap-priority --write`로 `.context/gaps.md` 갱신
3. 다음 `new`가 title 키워드로 과거 lesson 매칭 → `knowledge.lessons` 자동 주입

→ **캠페인 1회 완주 = 학습 루프 1사이클**. 일할수록 매니페스트가 똑똑해진다.

## 검증

```bash
npx vitest run test/pipeline.test.ts test/pipeline-cli.test.ts
# pipeline.test.ts: 코어 30개 (검증/전이/게이트)
# pipeline-cli.test.ts: e2e 자율 완주 + 복리 주입 (격리 root)
```

## /zzz 연계

`run --auto`가 claude 단계에서 만든 WORKORDER.md는 RESUME.md와 동형 핸드오프 —
자율 모드가 큐로 읽어 수행 가능.
