# C2 — Claude-native Harness 2026 Survey

**Date**: 2026-04-13 | **Features**: 11 surveyed | **Top candidates**: 3

## Top 3 Candidates (All PASS 8/8 or 7.5/8)

| Rank | Feature | Token impact | P1–P8 영향 | 검증 근거 |
|------|---------|-------------|------------|----------|
| **1** | **ToolSearch (Deferred tool loading)** | **−93%** system prompt (14–16k → 968 tok) | **P1 강화** (thin-wrapper 이득 극대화) | Feb 2026 production. MCP `defer_loading: true`. 프롬프트 캐싱과 호환. |
| **2** | **Prompt Caching (workspace isolation)** | **−90%** on cache hits (5min/1hr TTL) | **P5 강화** (CURRENT.md 세션 연속성) | Feb 5 2026 workspace isolation 변경. CLAUDE.md (1h) + CURRENT.md (5m) mixed TTL. |
| **3** | **Adaptive Thinking (per-agent effort)** | +8–15% (high), +40% (max) | **P4 강화** (hooks + 추론 체인) | Opus/Sonnet 4.6 interleaved thinking. Per-subagent frontmatter: coder=medium, architect=max, researcher=low. B1 regression 리스크 있음 — per-agent 설정 필수. |

## Performance Gate G5 Pre-Estimate
| Metric | Baseline | Predicted | Δ | Verdict |
|--------|---------|-----------|---|---------|
| M1 Token/task | 150k | 110k | **−27%** | ✅ G5-a PASS |
| M2 Wall-clock | 45s | 42s | −7% | ✅ G5-b |
| M3 Tool calls | 18 | 17 | −6% | ✅ |
| M4 Correctness | 0.95 | 0.96 | +1pp | ✅ G5-c PASS |
| M5 Regression | 0 | 0 | 0 | ✅ |

**예상 복합 개선 27%** (G5-a 15% 목표 크게 상회).

## Already Used (No further leverage)
- Hooks (P4 현재 핵심)
- Skills system (mature)
- MCP 2026 stdio (partial)

## Out of C2 scope
- Agent SDK (외부 harness, Stage 6+)
- Batch API (Stage 5.5 성능 튜닝)
- Vision (A-Team UI는 Playwright)

## Stage 4 Deep-dive Checklist
**ToolSearch**: 5-subagent 병렬 시나리오에서 bootstrap 토큰 측정, `.mcp.json` `defer_loading:true` 패턴 문서화
**Prompt Caching**: Agent SDK 레이어에서 프로토타입, Session 1 (no cache) vs Session 2 (hit <5min) 벤치
**Adaptive Thinking**: B1–B6 × effort level, B1 회귀 확인, max effort는 architect/security 전용

## Sources
- [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks reference](https://code.claude.com/docs/en/hooks)
- [What's new Claude 4.6](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6)
