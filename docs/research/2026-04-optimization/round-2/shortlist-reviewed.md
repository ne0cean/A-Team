# Stage 2 — Selection Criteria Filter (Strict 8/8)

**Date**: 2026-04-14 | **Reviewed**: 26 candidates | **PASS**: 13 | **FAIL**: 13

## PASS Candidates (8/8 criteria met)

### C2 — Claude-Native
- **ToolSearch** — −93% system prompt, Anthropic prod Feb 2026, P1 강화
- **Prompt Caching (workspace isolation)** — −90% cache hit, P5 강화

### C3 — Context Engineering
- **Anthropic Prompt Caching (C3.1)** — 5m/1h TTL, 90% 절감
- **Handoff Compression 5-layer (C3.7)** — CURRENT.md 공식화
- **Artifact Caching file-based (C3.9)** — `.context/artifacts/` LRU

### C5 / A3
- **promptfoo** — 13.2k⭐, MIT, P7 강화
- **Langfuse** — 24.8k⭐, MIT, OTEL native, P2 보완

### C6
- **Budget-Aware Tool Routing** (arXiv 2511.17006, 33% 절감) — P3 확장
- **git worktree isolated exec** — 10–20% 토큰 절감, P4 정식화

### A6
- **ripgrep (rg)** — 13k⭐, 5–13x, 20–30% 토큰 절감
- **ast-grep (sg)** — 13.4k⭐, 500 vs 8000 tok, P4 강화

### A1
- **Cascade Routing (Haiku→Sonnet→Opus)** — 40–60% 비용 절감, P2 확장

### A4
- **Spotlighting (Microsoft 2025)** — 공격 성공률 >50%→<2%, P4 통합

## FAIL Candidates

| Candidate | Failed Criteria | Reason |
|-----------|----------------|--------|
| CrewAI | C7 | Flows가 orchestrator 대체 위협 |
| Pydantic-AI | C2 | Python 전용, A-Team TS와 호환 불확실 |
| LangGraph | C3 | 직렬화 +5–10% 컨텍스트 오버헤드 |
| smolagents | C5 | CONDITIONAL (B2 검증 필요) |
| Adaptive Thinking | C3 | +8–40% 컨텍스트 증가 |
| DSPy | C6 | "P_n 보강" 명시 없음 |
| Self-Refine | C3, C5 | M2 +10% 지연, 독립 검증 없음 |
| STORM | C3 | M1 +20% 초과 |
| OpenHands SDK V1 | C2 | 통합 범위 모호 (레포 전체 vs 패턴) |
| BMAD | C1 | GitHub stars/후기 미기재 |
| A7.1 Cross-Project Index | C1 | A-Team native only, 외부 프로덕션 없음 |
| A7.3 UCC Mitigation | C1 | 내부 설계안, 프로덕션 case 부재 |
| MindGuard (A2) | C1 | arxiv 단계, 프로덕션 미확인 |

## Edge Cases (Human Review 권장)

1. **CrewAI** — 48.8k⭐, 12M daily. opt-in Crews 메모리만 쓰면 P1 무침해 가능. 문서 보완 후 재심사.
2. **DSPy** — HumanEval 76.2→96.2% 실증, BSD. "P3 PIOP 보강 by prompt compilation" 명시 추가 시 통과.
3. **BMAD** — P7/Sprint 패턴 친화성. GitHub URL 및 프로덕션 후기 2건 확인 시 통과.

## 재심사 대기 (Iteration 3에서 명시 보강 후 재판정)
- **CrewAI** (opt-in Crews-only mode)
- **DSPy** (P3 명시 강화)
- **BMAD** (maturity 재확인)
- **A7.1/A7.3** (A-Team internal이므로 Criterion 1 면제 검토 필요)
