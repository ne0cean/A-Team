# RESUME_STATE — SSOT (Research 종료)

## Current State
- **Last updated**: 2026-04-14 Final
- **Current stage**: **Stage 10 완료 — 이번 밤샘 리서치 종료**
- **Status**: 전 Stage (0 → 10) 완료, 사용자 승인 대기

## Stage 종료 요약

| Stage | 산출물 | 커밋 |
|-------|-------|------|
| 0 | MANIFEST v2, Sovereignty 7원칙, BASELINE_SPEC | aadf13e |
| 1 | 7 parallel researchers, round-1/ 7개 | aadf13e |
| 2 | shortlist-reviewed (13 PASS, 13 FAIL) | a772f46 |
| 3 | strength-mapping (22 GREEN, 11 YELLOW, 5 RED) | a772f46 |
| 4 | 6 deep-dives, round-3/ 6개 | 14ffd5a |
| 5 | RFC 7개 (001-007) | ee7fd96 |
| Governance | ateam-first + autonomous-loop + truth-contract + session-preflight + sovereignty 제8원칙 | c6e9388, 349f473 |
| 5.5 | (skip — option b, 설계만) | - |
| 6 | PRIORITY_MATRIX | 0bba418 |
| 7 | EXECUTIVE_SUMMARY + INTEGRATION_ROADMAP + REJECTED | 0bba418 |
| 8 | Stage 6-7 push | 0bba418 |
| 9 | STAGE9_HOLISTIC.md (실행은 Wave 3 이후) | 이번 커밋 |
| 10 | weekly-research.sh + eternal-growth.md + GH workflow + MANIFEST template | 이번 커밋 |

## ACCEPT 후보 최종 (7건)

| RFC | 주요 강화 | Wave |
|-----|----------|------|
| RFC-001 Prompt Caching | P5, M1 -35% | Wave 1 |
| RFC-002 Handoff Compression | P5, M1 -74% | Wave 2 |
| RFC-003 ToolSearch + Artifact | P1/P4/P8 | Wave 1 |
| RFC-004 Classical Tools | P4/P8, M1 -20~30% | Wave 1 (P1) + Wave 3 (P2) |
| RFC-005 promptfoo + Langfuse | P4/P6/P7, M4 +2~5pp | Wave 2 |
| RFC-006 Cascade + Budget | P2/P3, M1 -32~43% | Wave 3 |
| RFC-007 Spotlighting + Worktree | P4/P5/P6, security +90% | Wave 1 (S) + Wave 2 (M) |

## REJECT 후보 9개 (REJECTED.md 참조)
Agno, Letta, Mem0, Braintrust, LangSmith, Phoenix, Helicone, Datadog, Self-Consistency, ToT, AutoGen 0.4, Swarm, Pydantic-AI, (edge: CrewAI/DSPy/BMAD 재심사 대기)

## 예상 집합 효과 (⚠️ 실측 전 추정 — Earned Integration 원칙)

**중요**: 아래 수치는 **RFC 설계 단계 추정**. 실제 수용은 Stage 5.5 prototype + Stage 5.6 A/B 측정 후 G5/G6 gate 통과 시에만 확정. `ADVERSARIAL_REVIEW.md` F3 준수.

- M1 토큰: **-30~50% 범위 추정** (overlap 미검증, 단순 합산 금지)
- M4 correctness: **+2~5pp 추정**
- 월 API 비용: $22,500 → ~$15,000 (33% 절감 projection)
- Security ASR: >50% → <2% (Microsoft 2025 논문 기반, 자체 측정 미완)
- Observability: 호출 그래프 가시화 (Langfuse self-hosted)

**Gate 판정 전까지 수치는 "estimate"로 보고**. 승인은 실측만.

## 남은 사용자 액션 (Stage 11+, 사용자 세션)
1. RFC Wave 1 승인 여부
2. Wave 1 실제 구현 시작 (prototype + A/B benchmark)
3. Weekly cron 활성 여부 (cron -e or GH Actions enable)
4. Edge cases 재심사 (CrewAI, DSPy, BMAD)
5. Stage 9 Holistic 진행 시점 (Wave 1-3 완료 후)

## 이번 세션에서 생성된 governance
- `governance/rules/ateam-first.md` — Survey Before Invent
- `governance/rules/autonomous-loop.md` — 자율 루프 계약
- `governance/rules/truth-contract.md` — 거짓말 영구 금지
- `governance/rules/ateam-sovereignty.md` 제8원칙 추가
- `governance/workflows/eternal-growth.md` — Weekly cron protocol
- `scripts/session-preflight.sh` — 세션 시작 inventory
- `scripts/weekly-research.sh` — Weekly research bootstrap
- `.github/workflows/weekly-research.yml` — GH Actions
- `docs/research/_template/MANIFEST_TEMPLATE.md` — 재사용 템플릿

## 전역 메모리 업데이트
- `~/.claude/memory/feedback_ateam_survey_first.md`
- `~/.claude/memory/feedback_autonomous_loop_contract.md`
- `~/.claude/memory/feedback_truth_contract.md`
- `MEMORY.md` 인덱스 갱신

## 커밋 이력
```
aadf13e Round 1 — 7 researcher survey
a772f46 Round 2 — shortlist + mapping
14ffd5a Round 3 — 6 deep-dives
ee7fd96 Round 4 — 7 RFCs
c6e9388 governance v1 — ateam-first + autonomous-loop + sovereignty 제8
349f473 truth-contract.md 신설
0bba418 Final 4 docs (Stage 6-7)
(이번 커밋) Stage 9-10 (holistic plan + weekly cron protocol)
```

## 이번 세션의 구조적 교훈 (중요)
1. **A-Team 자체 자원 먼저 조사** (Ralph 모드 사건)
2. **Tool call 선행, 말은 나중** (자율 루프 끊김 사건)
3. **모를 때 모른다 말하기** (아는 척 금지)
4. **ScheduleWakeup ≠ 토큰 리셋 감지** (오버엔지니어링)

모든 교훈은 governance/rules/*.md + ~/.claude/memory/에 영구 박힘.

## Resumability
이번 리서치는 종료. 다음 작업은:
- Wave 1 실제 구현 (사용자 별도 세션)
- Weekly cron 활성화 시 2026-W16부터 자동 진행
- RESUME_STATE는 Wave 1 시작 시 갱신

**자율 루프는 종료**. 사용자 다음 지시 대기 상태.
