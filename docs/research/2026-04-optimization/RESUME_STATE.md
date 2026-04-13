# RESUME_STATE — SSOT for Autonomous Execution

> 매 wake-up 시작 시 이 파일을 먼저 읽고, 끝날 때 갱신한다. 토큰 소진 세션 중단 시 다음 wake-up이 여기서 재개.

## Current State
- **Last updated**: 2026-04-13 Iteration 1 complete
- **Current stage**: **Stage 2 — Selection Criteria filter + Stage 3 — Protected Asset mapping**
- **Phase**: ready-for-Stage-2
- **Active iteration**: 2 (upcoming wake-up)

## Next Action (Iteration 2)
```
1. Read round-1/*.md (7개 파일) — C1, C2, C3+A7, C4+A5, C5+A3, C6+A6, C7+A1+A2+A4
2. Aggregate all candidates into single short-list (round-2/shortlist-all.md)
3. Launch reviewer 서브에이전트 (1개): 후보별 Criteria 8개 AND 조건 엄격 필터
4. Launch architect 서브에이전트 (1개): P1–P8 보호자산 매핑 (round-2/strength-mapping.md)
5. 병렬 실행, 결과 수집 후 round-2/shortlist-reviewed.md 저장
6. Stage 3 종결: Decision Gate G1 체크 (P1–P8 침해만 있으면 범주 재정의)
7. ScheduleWakeup for Stage 4 (Deep-dive)
```

## Completed Checkpoints
- [x] MANIFEST v2 (Performance Gate + Resumability + Stage 9/10)
- [x] Sovereignty rule (`governance/rules/ateam-sovereignty.md` 7원칙)
- [x] RESUME_STATE.md (this file)
- [x] BASELINE_SPEC.md (B1–B6, M1–M5, G5)
- [x] Stage 1 launch (7 researchers parallel)
- [x] Stage 1 outputs saved: C1 / C2 / C3+A7 / C4+A5 / C5+A3 / C6+A6 / C7+A1+A2+A4
- [x] `round-1/_completion.log`
- [ ] Round 1 checkpoint commit to A-Team repo
- [ ] Stage 2: Selection Criteria filter
- [ ] Stage 3: Protected Asset mapping
- [ ] Stage 4: Deep-dive
- [ ] Stage 5: RFCs
- [ ] Stage 5.5 / 5.6 / 5.7: Prototype + A/B + Gate
- [ ] Stage 6: Priority Matrix
- [ ] Stage 7: Final 4 docs
- [ ] Stage 8: Final commit + push
- [ ] Stage 9: Holistic optimization
- [ ] Stage 10: Weekly cron protocol

## Short-list (Stage 1 결과, Stage 2 필터 대기)

### C1 (Orchestration)
- CrewAI (7/8 PASS) — P1/P5 강화 후보
- Pydantic-AI (7/8 PASS) — P6/P7 강화 후보
- LangGraph (6/8 CONDITIONAL) — 컨텍스트 비용 미검증
- smolagents (6/8 CONDITIONAL) — 코드 생성 실패율 B2 검증 필요

### C2 (Claude-native) ★ 최상위 ROI
- **ToolSearch** — −93% 시스템 프롬프트
- **Prompt Caching workspace isolation** — −90% hit
- **Adaptive Thinking (per-agent effort)** — P4 강화

### C3 / A7 (Context / Cross-project)
- **Prompt Caching (Anthropic)** — P5 강화
- **Handoff Compression 5-layer** — 기존 CURRENT.md 공식화
- **Artifact Caching (file-based)** — UI Auto-Inspect 확장
- **Cross-Project Index** — `docs/LEARNINGS_GLOBAL.md` 자동 생성
- **UCC Mitigation** — `governance/rules/context-isolation.md`
- **Semantic Skill Matching** — `/find-skill` 커맨드

### C4 / A5 (Workflow / Benchmark)
- **ReAct profiling** (Tier 1)
- **Self-Refine** (Tier 1)
- **DSPy compilation** (Tier 1) — 10–40% 품질 향상
- **Trajectory Metrics** (A5) — 0.86 human Spearman, BASELINE_SPEC 확장
- Reflexion / STORM / CoV (Tier 2, Stage 4 RFC)
- **REJECT**: Self-Consistency (18.6× token), ToT (컨텍스트 폭증)

### C5 / A3 (Eval / Observability)
- **promptfoo** (C5) — MIT, 13.2k⭐
- **Langfuse** (A3) — MIT (2025-06), 24.8k⭐, OTEL native

### C6 / A6 (MCP / Non-AI tools)
- **ripgrep + fd** (Phase 1) — 20–30% 토큰 절감
- **jq/yq** (Phase 1) — 10–20% 구조화 데이터 절감
- **ast-grep** (Phase 2) — 리팩터 30–50%
- **Budget-Aware Tool Routing** (Phase 2) — 33% API 비용 절감
- **Bubblewrap sandbox** (Phase 2 opt-in)
- **MCP 2025-11-25 spec** (docs-only)

### C7 / A1 / A2 / A4 (OSS + Routing + Security)
- **OpenHands event-sourcing** — P5 강화
- **Cline/Roo diff-based editing** — 30% 토큰 절감
- **BMAD sprint/architecture gates** — P7 강화
- **SWE-agent atomic operators** — P4 + A6 연결
- **SuperClaude personas** — P8 augment
- **Haiku→Sonnet cascade routing** (A1) — 40–60% 비용 절감
- **OWASP ASI Top 10 + MindGuard provenance** (A2)
- **Spotlighting + role whitelist + provenance** (A4)
- **SKIP DUPLICATE**: AgentCircuit (bkit 중복)

## Candidate Count
- Total surveyed: ~100
- Short-listed (Stage 1): ~25
- Expected Stage 2 pass: 15–20
- Expected Stage 4 deep-dive: 8–12
- Expected Stage 5.7 Gate pass: 5–8

## Recovery Protocol (토큰 소진 시)
1. 이 파일 먼저 읽기
2. MANIFEST.md Progress Log 확인
3. `Current stage` + `Next Action` 그대로 실행
4. `round-*/` 에 부분 산출물 있으면 이어서, 없으면 재시도
5. 병렬 subagent 호출 시 run_in_background=true 유지

## ScheduleWakeup Prompt Template
```
A-Team 밤샘 리서치 재개. RESUME_STATE.md 읽고 현재 stage부터 진행.
경로: c:/Users/SKTelecom/tools/A-Team/docs/research/2026-04-optimization/
Sovereignty: A-Team 레포 외부 변경 금지 (P6).
```

## Boundaries (Sovereignty Check)
- 모든 산출물: `c:/Users/SKTelecom/tools/A-Team/...` 내부만
- 타 프로젝트 레포 변경 금지
- A-Team 외부 변경 감지 시 **G4 발동 → 중단**

## Iteration Log

### Iteration 1 — 2026-04-13 (완료)
- MANIFEST v2, Sovereignty 7원칙, RESUME_STATE, BASELINE_SPEC 작성
- 7개 병렬 researcher 완료 → round-1/*.md 7개 저장
- Round 1 completion.log
- Short-list ~25 candidates

### Iteration 2 — Planned
- Round 1 checkpoint commit
- Stage 2 reviewer 필터
- Stage 3 Protected Asset 매핑
- 결과 → round-2/shortlist-reviewed.md + strength-mapping.md
