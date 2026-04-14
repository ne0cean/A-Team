# Stage 3 — Protected Asset (P1–P8) Strength Mapping

**Date**: 2026-04-14 | **Candidates**: 38 | **GREEN**: 22 | **YELLOW**: 11 | **RED**: 5
**Gate G1 status**: NOT triggered (G1/G2/G3/G4 모두 통과). Stage 4 진행 가능.

## GREEN (strengthens without threat) — 22개

| Candidate | Strengthens | Integration sketch |
|-----------|-------------|---------------------|
| ToolSearch | P1, P8 | `.mcp.json { defer_loading: true }`, thin-wrapper lean 유지 |
| Prompt Caching (workspace) | P5 | CLAUDE.md 1h TTL, CURRENT.md 5m TTL |
| Handoff Compression 5-layer | P5 | `governance/rules/handoff-compression.md` |
| Artifact Caching LRU | P4, P8 | `.context/artifacts/{projectId}/{key}`, <500B keys |
| Cross-Project Learnings Index | P5, P6 | learnings.ts crossProject=true + docs/LEARNINGS_GLOBAL.md |
| UCC Context Isolation | P6 | Dedup `(projectId, domain)` 전 promotion |
| Semantic Skill Matching | P8 | `/find-skill` thin wrapper + embedding |
| ReAct profiling | P3, P4 | Trajectory Metrics trace export via PostToolUse |
| Self-Refine | P4, P7 | PostToolUse verification, M4 gate |
| DSPy compilation | P3, P7 | PIOP payload signature compiler |
| Trajectory Metrics | P3, P7 | Reason-step scoring → BASELINE_SPEC 확장 |
| promptfoo eval | P7 | eval/ subagent + B1–B6 YAML templates |
| Langfuse (self-hosted) | P4, P6, P7 | PostToolUse OTEL emitter 150–250 LOC |
| OpenLLMetry OTEL shim | P4 | Vendor-neutral tracing → Langfuse |
| MCP 2025-11-25 Streamable HTTP | P4 | Session-Id + Last-Event-ID 문서 |
| ripgrep default | P8 | 모든 Grep tool → rg, grep fallback |
| fd companion | P8 | Glob tool 보강 |
| jq / yq 표준화 | P4, P8 | JSON/YAML 파싱 외부화 |
| git-worktree speculative | P2, P5 | coder 격리 정식화, 실패 branch가 CURRENT.md 오염 안 함 |
| OpenHands event log | P5 | Append-only mirror, recovery + audit |
| SWE-agent atomic diff | P4, P7 | Full-rewrite 환각 방지 |
| Spotlighting (datamark/delimit) | P4, P6 | PreToolUse hook wrap untrusted input |

## YELLOW (mitigation required) — 11개

| Candidate | Strengthens | Risk | Mitigation |
|-----------|-------------|------|------------|
| CrewAI | P1, P5 | Flow interceptor plumbing + 메모리 drift | Crews만 optional subagent 래핑, 단일 메모리 권위 MEMORY.md |
| Pydantic-AI | P6, P7 | Python 전용 (A-Team TS) | researcher/eval 파이썬 subagent만 |
| LangGraph | P3, P4 | State flattening +5–10% | Stage 5.5 A/B ≤2% 입증 시만 |
| smolagents CodeAgent | P2 | 코드 gen 실패율 ↑ | B2 PASS 이후 opt-in |
| Adaptive Thinking | P4 | +8–40% 토큰 | Per-subagent effort: coder=medium, researcher=low, architect=max |
| STORM | P1 | M1 +20% | B5 전용, Haiku brainstorm + Sonnet synthesis |
| Chain-of-Verification | P2, P4 | M2 +5–10% | M4-critical path만 (architect, security) |
| Budget-Aware Tool Routing | P3 | +50–100ms + tiktoken 의존 | opt-in, hook thread |
| ast-grep | P4, P8 | Tree-sitter grammar per lang + ~2% | `/review` skill, grep fallback |
| Bubblewrap/Firejail | P2 | Linux-only | Windows는 git-worktree 대체 |
| Cline/Roo diff + mode dispatch | P4, P8 | Mode tagging이 P1 role 드리프트 | 메타데이터만, 신규 agent 파일 금지 |
| Cascade Routing | P2 | M4 dip (Haiku over-accept) | gate-manager 검증 레이어 + Stage 5.6 A/B 필수 |
| BMAD | P7 | Full sprint = ceremony > YAGNI | 오직 pre-RED architecture-gate 패턴만 |
| SuperClaude personas | P8 | Persona drift → P1 role 희석 | 기존 9 agent에 메타데이터 only |
| MindGuard provenance | P4, P5 | +76–162ms | Async hook, 10% 샘플, 무신뢰 소스만 100% |

## RED (REJECT) — 5개

| Candidate | Threat | Reason |
|-----------|--------|--------|
| Agno | P6 | MPL copyleft, derivative 공개 강제 |
| Letta/MemGPT | P1 | thin-wrapper 대체 요구 |
| Mem0 | P6 | Cloud SaaS + API key 의존 |
| Braintrust/LangSmith/Phoenix/Helicone/Datadog | P6 | SaaS-only 백엔드 cluster |
| Self-Consistency / Tree of Thoughts | P1, Criteria 3 | 18.6× token + branch 폭증 |

## Top 5 Integration Ordering

1. **Prompt Caching (workspace-isolated)** — P5, 90% savings, 측정 baseline unlock
2. **ToolSearch** — P1+P8, −93% 시스템 프롬프트, 신규 tool 추가 prerequisite
3. **ripgrep + fd + jq (A6 Phase 1)** — P8+P4, 20–30% 절감, 제로-리스크
4. **promptfoo + Langfuse (pair)** — P4+P6+P7, Performance Gate 인프라
5. **SWE-agent atomic diff + Handoff Compression** — P4+P5+P7, coder 환각 방지 + 상태 공식화

## Stage 4 Deep-dive Queue

**PASS ∩ GREEN intersection** (13개 후보) — 6개 그룹으로 묶어 병렬 deep-dive:
- DD-01: Prompt Caching + Handoff Compression (P5)
- DD-02: ToolSearch + Artifact Caching (P1/P4/P8)
- DD-03: ripgrep + fd + jq + ast-grep (A6 toolchain)
- DD-04: promptfoo + Langfuse (eval + obs stack)
- DD-05: Cascade Routing + Budget-Aware Routing (cost optimization)
- DD-06: Spotlighting + git-worktree (security + isolation)
