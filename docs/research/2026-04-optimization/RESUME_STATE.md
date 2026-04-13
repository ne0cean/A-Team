# RESUME_STATE — SSOT

## Current State
- **Last updated**: 2026-04-14 Iteration 3 complete
- **Current stage**: **Stage 5 — RFC 작성 (통과 후보 × architect 병렬)**
- **Phase**: ready-for-Stage-5
- **Active iteration**: 4 (upcoming wake-up)

## Next Action (Iteration 4)
```
1. Read RESUME_STATE.md + MANIFEST.md Progress
2. Read round-3/DD-01~06 (6개 deep-dive 결과)
3. Stage 5 — architect 서브에이전트 병렬 (6개, background):
   각 DD 문서 기반 RFC 작성:
   - rfc/RFC-001-prompt-caching.md (DD-01)
   - rfc/RFC-002-handoff-compression.md (DD-01)
   - rfc/RFC-003-toolsearch.md (DD-02)
   - rfc/RFC-004-artifact-cache.md (DD-02)
   - rfc/RFC-005-classical-tools.md (DD-03)
   - rfc/RFC-006-promptfoo-langfuse.md (DD-04)
   - rfc/RFC-007-cascade-budget-routing.md (DD-05)
   - rfc/RFC-008-spotlighting-worktree.md (DD-06)
4. RFC 템플릿:
   - Problem statement + strength claim
   - Integration design (exact file paths)
   - Implementation plan (phase 1/2/3)
   - Test plan (TDD RED tests)
   - Rollout + rollback
   - Success criteria (G5 mapping)
5. 결과 수집 후 RESUME_STATE 갱신
6. Round 3 + RFC commit/push
7. ScheduleWakeup (25min) for Stage 5.5 prototype planning
```

## Completed Checkpoints
- [x] MANIFEST v2 + Sovereignty 7원칙
- [x] RESUME_STATE.md (SSOT)
- [x] BASELINE_SPEC (B1–B6, M1–M5, G5)
- [x] Round 1: C1~C7+A1~A7 (7 researcher 병렬, 모든 결과 저장)
- [x] Round 1 commit/push (aadf13e)
- [x] Round 2 Stage 2: shortlist-reviewed.md (13 PASS, 13 FAIL)
- [x] Round 2 Stage 3: strength-mapping.md (22 GREEN, 11 YELLOW, 5 RED)
- [x] Round 2 commit/push (a772f46)
- [x] Round 3 Stage 4 Deep-dive: DD-01~06 (6 DD 모두 saved)
- [ ] Round 3 commit/push
- [ ] Stage 5 RFC 작성 (8개 RFC)
- [ ] Round 4 RFC commit/push
- [ ] Stage 5.5 prototype planning + worktree 세팅
- [ ] Stage 5.6 A/B 벤치 실행
- [ ] Stage 5.7 Performance Gate G5 판정
- [ ] Stage 6 Priority Matrix
- [ ] Stage 7 Final 4 docs
- [ ] Stage 8 final commit + push
- [ ] Stage 9 Holistic optimization
- [ ] Stage 10 Weekly cron protocol

## Stage 4 Deep-dive Summary (All 6 PASS G5 projection)

| DD | Candidates | Porting | M1 Δ | M4 Impact | P_n 강화 |
|----|-----------|---------|------|-----------|---------|
| DD-01 | Prompt Caching + Handoff Compression | S + M | **−35%** / **−74%** | +1pp / 0 | P5 |
| DD-02 | ToolSearch + Artifact Cache | S + M | **−15%** / **−12%** | 0 / 0 | P1/P4/P8 |
| DD-03 | rg + fd + jq + ast-grep | S/S/S/M | **−20~30%** Phase 1, +30~50% Phase 2 | 0 | P4/P8 |
| DD-04 | promptfoo + Langfuse | M | <80B overhead | **+2~5pp** | P4/P6/P7 |
| DD-05 | Cascade + Budget-Aware | M (권장) | **−32~43%** avg | 0 (+guardrails) | P2/P3 |
| DD-06 | Spotlighting + Git worktree | S→L phased | <1% | **security** +90%+ mitigation | P4/P5/P6 |

**조합 시 예상 M1 절감**: 단순 합산 불가하지만 최소 **−40~50%** (겹치는 절감 제거 후).

## Recovery Protocol
1. 이 파일 먼저 읽기
2. MANIFEST.md Progress Log 확인
3. Current stage + Next Action 실행
4. `round-*/` 부분 산출물 있으면 이어서
5. ScheduleWakeup 자동 재개 지속

## Boundaries (Sovereignty)
- 모든 산출물: `c:/Users/SKTelecom/tools/A-Team/...` 내부만
- 타 프로젝트 금지
- A-Team 외부 변경 감지 → G4 발동 → 중단

## Iteration Log

### Iteration 1 — 2026-04-13
- MANIFEST v2, Sovereignty 7원칙, RESUME_STATE, BASELINE_SPEC
- 7 researcher 병렬 → round-1/*.md 7개 저장

### Iteration 2 — 2026-04-14
- Round 1 commit (aadf13e) + push
- Stage 2+3 병렬 (reviewer + architect)
- round-2/shortlist-reviewed.md + strength-mapping.md 저장
- Round 2 commit (a772f46) + push

### Iteration 3 — 2026-04-14
- 6개 deep-dive researcher 병렬 kickoff
- round-3/DD-01~06 모두 저장
- **모든 6 DD G5 통과 예상**

### Iteration 4 — Planned
- Round 3 commit/push
- Stage 5 RFC × 6~8개 (architect 병렬)
- RFC commit/push
