# C3 (Context Engineering) + A7 (Cross-Project State) Survey

**Date**: 2026-04-13 | **Patterns**: 17 (9 C3 + 8 A7) | **P0 accept**: 6 | **Reject**: 4 | **Defer Stage 4**: 4

## C3 — Context Engineering

| # | Pattern | Maturity | Verdict | Rationale |
|---|---------|----------|---------|-----------|
| **C3.1** | **Anthropic Prompt Caching** | ⭐⭐⭐⭐⭐ | ✅ ACCEPT P0 | 5m/1h TTL, 90% 절감 (cache_read=0.1×), CURRENT.md 캐시 블록화, workspace isolation (2026-02). P5 강화. |
| **C3.7** | **Handoff Compression (5-layer)** | ⭐⭐⭐⭐ | ✅ ACCEPT P0 | Facts/Story/Reasoning/Action/Caution. CURRENT.md + checkpointing.md 이미 부분 구현. 공식화 필요. `governance/rules/handoff-compression.md` 신설. |
| **C3.9** | **Artifact Caching (File-based)** | ⭐⭐⭐⭐ | ✅ ACCEPT P0 | Playwright 스크린샷/벤치 결과 캐시. UI Auto-Inspect(2026-03) 부분 구현. `.context/artifacts/` + LRU. P8 유지 (<500B per key). |
| C3.8 | G-Memory Hierarchy (NeurIPS 2025) | ⭐⭐⭐⭐ | 🔍 DEFER Stage 4 | 3-tier graph (Insight/Query/Interaction) + 백그라운드 daemon. Stage 9 holistic에 적합. |
| C3.2 | LLMLingua-2 Compression | ⭐⭐⭐⭐ | ⏱ CONDITIONAL | 3–6x 압축 95–98% 정확도 유지. 외부 서버 호출 지연. A-Team docs 라이브러리(INDEX.md)에만 검토. |
| C3.3 | Semantic Chunking | ⭐⭐⭐⭐ | ⏱ CONDITIONAL | INDEX.md 발견 레이어 용. 핸드오프 경로 외. |
| C3.4 | **Letta/MemGPT** | ⭐⭐⭐ | ❌ REJECT | Core/Recall/Archival 런타임 통합 요구 → **P1 thin-wrapper 대체 위협**. A-Team learnings.ts로 충분. |
| C3.5 | **Mem0** | ⭐⭐⭐ | ❌ REJECT | Cloud SaaS, API key 필요 → **P6 Sovereignty 위반**. |
| C3.6 | Context Pruning (H2O/SnapKV) | ⭐⭐⭐ | ❌ REJECT | 1M+ token 대상. A-Team <100K. 자연 sliding window 충분. |

## A7 — Cross-Project State Sharing

| # | Pattern | Maturity | Verdict | Rationale |
|---|---------|----------|---------|-----------|
| **A7.1** | **Cross-Project Index** | ⭐⭐⭐ (A-Team native) | ✅ ACCEPT P0 | learnings.ts에 `crossProject=true` 모드. `docs/LEARNINGS_GLOBAL.md` 자동 생성 (top-5 insights). |
| **A7.3** | **UCC Mitigation (Context Isolation)** | ⭐⭐⭐⭐ | ✅ ACCEPT P0 | instinct dedup by `(projectId, domain)` 전 promotion. `governance/rules/context-isolation.md`. P6 강화. |
| **A7.7** | **Semantic Skill Matching** | ⭐⭐⭐⭐ | ✅ ACCEPT P0 | `findSimilarLearnings()` + `/find-skill "problem"` 커맨드. embedding 유사도. 3일 effort. |
| A7.2 | Collaborative Memory (NeurIPS 2025) | ⭐⭐⭐⭐ | 🔍 DEFER Stage 4 | 양분 ACL graphs + 2-tier memory. 다중 팀/workspace 대상, P0 과잉. |
| A7.4 | Memory Poisoning Defense | ⭐⭐⭐⭐ | 🔍 DEFER Stage 4 | AgentPoison/MemoryGraft 방어. Stage 4 보안 감사로 연기. |
| A7.5 | Git-Native Coordination (GNAP) | ⭐⭐⭐⭐ | 🔍 DEFER Stage 4 | Shared git board vs SESSIONS.md 비교. |
| A7.6 | Workspace-Project-User Hierarchy | ⭐⭐⭐ | ⏱ CONDITIONAL | `~/.a-team/{workspace}/{project}/` opt-in. 5+ 코드베이스 대상. |
| A7.8 | Differential Privacy | ⭐⭐⭐ | 🔍 DEFER Stage 7 | 엔터프라이즈 10+ 프로젝트 스케일링 시. |

## Performance Gate G5 Pre-Estimate
- **Prompt Caching**: M1 -30%, M2 -40% → **G5-a 통과 (15%+)** 확실
- **Cross-Project Index**: M1 +2%, M2 -10%
- **Handoff Compression**: M4 +0.1 (state clarity)
- **All P0 candidates → G5 통과 예상**

## Protected Asset Impact
- **P5 CURRENT.md**: 강화 (caching + formal handoff)
- **P6 Sovereignty**: 강화 (UCC 명시적 격리)
- **P1 thin-wrapper**: 무영향 (Letta 거부로 보호)
- **P7 TDD**: 6개 신규 테스트 추가 (dedup + isolation)

## Cross-cutting Integrations
1. **Cache + Cross-Project**: /vibe 시 cross-project learnings 로드 → 1h 캐시 (첫 ~100 tok, 재사용 <10 tok)
2. **Handoff + Collaborative Memory**: 핸드오프 시 relevant learnings 주입
3. **Artifact Cache + UCC**: `.context/artifacts/{projectId}/{key}` 네임스페이스

## Sources
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [G-Memory NeurIPS 2025](https://arxiv.org/abs/2506.07398)
- [Collaborative Memory 2025](https://arxiv.org/abs/2505.18279)
- [AgentPoison](https://arxiv.org/abs/2407.12784)
- [MemoryGraft](https://arxiv.org/abs/2512.16962)
- [LLMLingua Series](https://www.llmlingua.com/)
- [Letta MemGPT docs](https://docs.letta.com/concepts/memgpt/)
