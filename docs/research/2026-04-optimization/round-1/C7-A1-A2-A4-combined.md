# C7 (OSS Mining) + A1 (Multi-model) + A2 (Failure) + A4 (Security)

**Date**: 2026-04-13 | **Repos**: 11 | **Candidates**: 9 (1 duplicate, 2 reference)

## C7 — OSS Agent Repo Mining

| Repo | Verdict | Portable Patterns |
|------|---------|---------------------|
| **OpenHands SDK V1** (64k⭐) | ✅ ACCEPT | (1) Event-sourcing append-only log → P5 CURRENT.md 강화 (2) 계층적 subagent delegation API |
| **Cline** (20k⭐, VS Code de facto) | ✅ ACCEPT | (1) Diff-based file patching → 토큰 30% 절감, P4 hooks 통합 (2) 명시적 approval + state isolation |
| **Roo Code** (Cline fork) | ✅ ACCEPT | (1) Mode-aware dispatch (Architect/Act/Ask) → subagent mode 태깅 (2) Cline diff 패턴과 consolidation |
| **BMAD** (Claude Code 생태계) | ✅ ACCEPT | (1) 스프린트 계획 orchestrator → 전담 subagent (2) Interactive requirements + architecture gate → RED phase 이전 주입 (P7 강화) |
| **SWE-agent** (3.5k⭐, NeurIPS 2024) | ✅ ACCEPT | (1) 원자적 diff operator → 환각 rewrite 방지, P4 통합 (2) Repo 네비게이션 추상화 (ripgrep, LSP) → A6 연결 |
| **SuperClaude** (1.2k⭐) | ✅ ACCEPT | (1) Cognitive persona injection → P8 슬래시 커맨드 persona (2) Orchestration directives (<100B per rule) |
| Claude Flow v2.7 | ⏱ BORDERLINE | SQLite 메모리 → P5 보조 백엔드 (optional). TDD 검증 약함. |
| LangGraph | ✅ REFERENCE | Supervisor 패턴 reference (직접 포팅 아님). |
| Live-SWE-agent | 🔍 DEFER Stage 4 | 자가 진화 프로토타입, Stage 10 Weekly Auto-Research 영감. |
| **AgentCircuit** | ❌ SKIP DUPLICATE | **bkit (P2) circuit-breaker와 중복**. 통합 안 함. |
| Awesome-claude-code | REFERENCE only | 메타 레지스트리 |

## A1 — Multi-Model Routing (2026 landscape)

### 모델 비용 / 용도 (Anthropic 2026)
| 모델 | Input/Output ($/1M) | 용도 | 분포 목표 |
|-----|---------------------|------|----------|
| Haiku 4.5 | $1 / $5 | 라우팅, 분류, 추출, 포맷팅 | **60%** |
| Sonnet 4.6 | $3.75 / $18.75 | 기본 (코딩/분석/중간 추론) | **30%** |
| Opus 4.6 | $5 / $25 (context 1M, output 128k) | 심층 추론, 멀티 에이전트 조율 | **10%** |

### Cascade Routing 전략
- **Haiku 먼저** → 실패/불확실 시 Sonnet → 복잡 시 Opus
- **Escalation 트리거**: tool call confidence <0.85, 출력 검증 실패, 다단계 추론 >3 hop
- **예상 절감**: **40–60%** (단일 개발자 월 $450 → $120, 73% 절감)
- **A-Team 통합**: bkit gate-manager(P2)에 cascade gate 추가 (opt-in flag)
- **비침습**: P1 unchanged, 기본 Sonnet 4.6

**Verdict**: ✅ ACCEPT. Stage 5.6 A/B 벤치 필수.

## A2 — Failure Mode Taxonomy

### 14개 실패 모드 정리 (OWASP ASI Top 10 2026 기반)

**System Design Failures**:
- Infinite loops — bkit circuit-breaker(P2) 이미 대응, 모니터링 강화
- Premature termination — P5 state machine gate
- **Cascading failures** — MAST study: 87% downstream propagation 4h. P2 gates 이미 격리. Stage 9 거버넌스 문서화.
- Resource exhaustion — $250M+ 연간 손실 (Deepchecks 2025). Per-subagent token budget (bkit gate-manager).

**Inter-agent Misalignment**:
- Goal hijack — tool 출력 검증 (sanity check)
- **Context poisoning** — MindGuard DDG 94–99% precision, <1s/check. **P5 메모리 provenance 도입** (source, injection time, trust, validation).
- Hallucinated tool calls — HaluGate 76–162ms 오버헤드, 50% 실패율 감소. P4 PostToolUse 훅 통합.

**Task Verification Failures**:
- Reward hacking — external test suite validation (P7 TDD 자연 방어)
- Inter-agent comms poison (ASI07) — message signing + 감사 로그

### OWASP Agentic Top 10 2026
ASI01 Goal Hijack | ASI02 Tool Misuse | ASI03 Identity/Privilege Abuse | ASI04 Supply Chain | ASI05 Unexpected Code Exec | ASI06 Memory Poisoning | ASI07 Inter-agent Comms | ASI08 Cascading Failures | ASI09 Human Trust Exploit | ASI10 Rogue Agents

**Verdict**: ✅ ACCEPT. `governance/rules/` 에 OWASP ASI 채택, MindGuard provenance 도입.

## A4 — Security / Prompt Injection Defense

### Threat landscape 2026
- **UK NCSC**: LLMs "inherently confusable deputies" — 완전 방어 불가
- **Direct injection 89.6% 성공률** (roleplay 기반 최다)
- **Indirect injection** (웹페이지, RAG, 파일) + **Log-to-Leak MCP 탈옥**

### Defense-in-Depth (P4 hooks + P6 governance)
1. **Spotlighting** (Microsoft 2025): delimiting/datamarking/encoding → **공격 성공률 >50% → <2%**
2. **Output validation**: tool 화이트리스트, 파라미터 스키마 검증, high-risk tool dry-run
3. **Role-based tool whitelist** (P1 thin-wrapper + P6 governance):
   - CSO agent: no file read/write, audit/report만
   - Researcher: no file-write
   - Coder: sandboxed write
4. **Context provenance tracking** (P5 CURRENT.md): source, injection time, trust, validation state
5. **Ensemble defense**: 고위험 질의 → 다른 alignment 모델 2개 이상 → consensus
6. **Human confirmation for lethal trifecta**: 특권 접근 + untrusted input + 유출 능력 조합 시 필수 승인
7. **Intent inspection**: DELETE/EXPORT/BYPASS + roleplay 우회 패턴 감지

**Verdict**: ✅ ACCEPT. 대부분 policy + hook 로직, 비침습.

## Performance Gate G5 Pre-Estimate
- **Cascade routing (A1)**: M1 -40–60% 비용, M4 유지 (검증 게이트로)
- **Diff-based editing (C7 Cline)**: M1 -30% (파일 전체 재작성 방지)
- **Spotlighting (A4)**: M4 +2pp (공격 방어), M1 +1% (delimiter 토큰)
- **MindGuard (A2)**: M4 +1–2pp, <1s overhead

## Protected Asset Impact
- **P1 thin-wrapper**: 건드리지 않음 (모두 외곽 레이어)
- **P2 bkit**: ZERO (AgentCircuit 중복 제외)
- **P4 hooks**: 강화 (spotlighting, HaluGate, diff-patch)
- **P5 CURRENT.md**: 강화 (provenance tracking)
- **P6 Sovereignty**: 강화 (OWASP ASI 거버넌스, whitelist)
- **P7 TDD**: 강화 (BMAD + SWE-agent 패턴)
- **P8 slash**: 유지 (SuperClaude persona <50B overhead)

## Sources
- [OpenHands SDK V1](https://arxiv.org/abs/2511.03690)
- [Cline](https://github.com/cline/cline) | [Roo Code](https://www.qodo.ai/blog/roo-code-vs-cline/)
- [BMAD-AT-CLAUDE](https://github.com/24601/BMAD-AT-CLAUDE)
- [SWE-agent](https://github.com/SWE-agent/SWE-agent)
- [Claude Model Routing](https://relayplane.com/blog/anthropic-claude-proxy)
- [Microsoft MAST Study](https://arxiv.org/html/2503.13657v1)
- [MindGuard](https://arxiv.org/abs/2508.20412)
- [OWASP Agentic Top 10 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [Microsoft Spotlighting](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
- [Log-To-Leak MCP Jailbreak](https://openreview.net/forum?id=UVgbFuXPaO)
- [Agentic Resource Exhaustion](https://medium.com/@instatunnel/agentic-resource-exhaustion-the-infinite-loop-attack-of-the-ai-era-76a3f58c62e3)
