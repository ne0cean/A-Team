# /pipeline — Campaign Pipeline Orchestrator

> Analytics: `node scripts/log-event.mjs command_start name=pipeline` — 실행 시작 시 반드시 호출

**용도**: 마케팅 E2E 사이클(brief→plan→produce→qa→publish→measure→feedback)을 상태머신으로 자율 실행. 창업자는 딱 2개 터치포인트(방향 설정 = brief 승인, 발행 승인 = publish 승인)에만 개입.

상세 메소돌로지는 스킬 플레이북(`.claude/skills/pipeline/SKILL.md`) 참조. 이 커맨드는 운영 진입점.

## 빠른 시작

```bash
# 1. 캠페인 생성 (과거 캠페인 lesson 키워드 매칭 자동 주입)
node scripts/pipeline/campaign-new.mjs --slug=YYYY-MM-DD-name --title="..."

# 2-A. 자율 실행 (claude 단계는 WORKORDER.md 생성 후 정지)
npx tsx scripts/pipeline/pipeline-run.mjs run <slug> --auto
#   → WORKORDER 수행 후: pipeline-run.mjs complete <slug> <stage>
#   → 터치포인트 도달 시 정지: pipeline-run.mjs approve <slug> <stage>

# 2-B. 완전 자율 데모/회귀 (claude 단계 placeholder 자동 + 승인 자동)
npx tsx scripts/pipeline/pipeline-run.mjs run <slug> --auto --simulate --yes

# 3. 상태 확인
npx tsx scripts/pipeline/pipeline-run.mjs status <slug>
```

## 단계별 standalone CLI

통합 러너(`scripts/pipeline/pipeline-run.mjs`) 외에 각 script 단계를 독립 실행할 수 있다. 모두 `--root=` 격리 지원, 로직은 `scripts/pipeline/stage-handlers.mjs` 단일 진실 공급원에서 공유.

```bash
node scripts/pipeline/campaign-new.mjs --slug=... --title="..."   # 매니페스트 생성 + 지식 주입
node scripts/pipeline/pipeline-publish.mjs <slug>                 # publish-log.md 엔트리 (dry-run)
node scripts/pipeline/pipeline-measure.mjs <slug>                 # content/analytics/<slug>-measure.md
node scripts/pipeline/campaign-debrief.mjs <slug>                # DEBRIEF.md + 캠페인 지식 캡처
```

## 아키텍처

| 레이어 | 파일 | 역할 |
|--------|------|------|
| 순수 로직 | `lib/pipeline.ts` | 매니페스트/게이트/전이 (fs 없음, GateContext 주입) |
| 상태머신 | `lib/state-machine.ts` | Transition 테이블 재사용 |
| 러너 CLI | `scripts/pipeline/pipeline-run.mjs` | IO 결합 (npx tsx 호출) |
| 단계 핸들러 | `scripts/pipeline/stage-handlers.mjs` | qa/publish/measure/feedback 산출물 (DRY) |
| 분석 | `scripts/log-event.mjs` | 전이마다 `pipeline_stage` 이벤트 축적 |
| 벤치마크 | `scripts/benchmark-gap.mjs` | 실측 vs 엔터프라이즈 갭 표 |

## 게이트 (자동 품질 판정)

- `outputs_exist` — 산출물 글롭 존재
- `markers_filled` — `[HUMAN INSERT]` 잔존 시 fail
- `design_score` — audit 점수 ≥ 70
- `publish_logged` — publish-log.md에 slug 기록

게이트 실패 → `blocked` + friction-log 자동 기록 → `retry`(max 3회).

## Cortex 복리 루프

feedback 단계가 `.context/loop/campaign-knowledge.jsonl`에 lesson + 키워드 append → 다음 `campaign-new`가 title 키워드로 과거 lesson 매칭 → 자동 주입. **캠페인 1회 완주 = 학습 루프 1사이클.**

## 검증

```bash
npx vitest run test/pipeline.test.ts test/pipeline-cli.test.ts
npx tsx scripts/benchmark-gap.mjs   # 실측 데이터 누적 시 갭 표 출력
```
