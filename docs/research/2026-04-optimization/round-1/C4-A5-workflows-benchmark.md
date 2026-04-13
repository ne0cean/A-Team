# C4 (Workflows) + A5 (Benchmark) Survey

**Date**: 2026-04-13 | **Patterns**: 12 C4 + 6 A5 | **Tier 1**: 3 | **Tier 2**: 3 | **Reject**: 2

## C4 — Reasoning/Workflow Patterns

### Tier 1 — 즉시 프로토타입
| Pattern | Verdict | Rationale |
|---------|---------|-----------|
| **ReAct profiling** | ✅ TIER 1 | Ralph Loop이 기존 ReAct 변형. 투명성 + 추적성 강화. P4 hooks + P5 state 호환. |
| **Self-Refine** | ✅ TIER 1 | PostToolUse 훅으로 검증 레이어. M4 correctness gate 강화. |
| **DSPy compilation** | ✅ TIER 1 | 시그니처 → 최적화 프롬프트 (10–40% 품질 향상). MIPROv2 optimizer. PIOP 직접 보강. HumanEval Pro 76.2%→96.2% (자가 호출 작업). 프롬프트 캐싱(C3)과 결합 시 M1 절감. |

### Tier 2 — Stage 4 RFC 검증
| Pattern | Verdict | Rationale |
|---------|---------|-----------|
| Reflexion (메모리 루프) | ✅ TIER 2 | 자가평가 + 메모리. CURRENT.md state sync 필요. |
| STORM (multi-perspective) | ✅ TIER 2 | B5 (research synthesis)에 최적. Co-STORM 2025 human-AI collab. 저가 모델로 대화, 고가 모델로 검증 → 모듈형. A-Team 9-subagent와 매핑. |
| Chain-of-Verification | ✅ TIER 2 | Multi-path verification + majority consensus. M4 gate. Post-tool-use 훅 통합. |

### Rejected / Conditional
| Pattern | Verdict | Rationale |
|---------|---------|-----------|
| **Self-Consistency** | ❌ REJECT | 18.6× token 샘플링 필요. M1 30% 가중치 위반. |
| **Tree of Thoughts** | ❌ REJECT | 병렬 branch 컨텍스트 폭증. C3 ≤+2% 게이트 위반. |
| Graph of Thoughts (AGoT 2025) | ⏱ CONDITIONAL | DAG 구조, ToT보다 유연. M1 gate 통과 시만. |
| Constitutional AI self-critique | ⏱ CONDITIONAL | Claude 3+ 내장. P6 sovereignty align RFC 필요. |
| Plan-and-Solve decompose | TIER 1.5 | 태스크 명확성 향상. ReAct/Self-Refine 이후 우선순위. |
| Temporal/Inngest durable exec | OUT of C4 | C2 (Claude Agent SDK orchestration) scope로 이관 |

## A5 — Benchmark Methodology

| Framework | Verdict | Relevance to B1–B6 |
|-----------|---------|---------------------|
| **Terminal-Bench 2.0** (Stanford 2025) | ✅ PASS | 실제 filesystem + 컴파일 + 환경. B1 (small fix), B3 (multi-file refactor)와 중첩. 합성 태스크보다 프로덕션 근접. |
| **Trajectory Metrics** (Google Vertex AI) | ✅ PASS | exact match, precision, recall on reasoning paths. **human judgment Spearman 0.86**. M4 이진 pass/fail → reason-step grading으로 확장. PIOP 투명성 연결. |
| **Galileo Agent Eval Framework** | ✅ PASS | 체계적 파이프라인. G5 correctness gate 연결. |
| **promptfoo** | ✅ PASS | B1–B6 TDD 벤치 통합 (C5와 중첩). |
| BigCodeBench / HumanEval Pro / MBPP Pro | ✅ PASS | B2 (TDD feature), B6 (debug) 관련. |
| τ-Bench | ⏱ RESEARCH | 대화형 에이전트 중심 — A-Team scope 외. |

## Cross-cutting Integration
- **Trajectory Metrics → BASELINE_SPEC 보완**: M4 이진값 대신 reason-step 정확도 도입 (σ<10% 요건 강화)
- **DSPy + Prompt Caching (C3)**: 컴파일 결과를 5분 캐시로 재사용
- **STORM → subagent orchestration**: 3-관점 병렬 researcher → 메인이 종합 (feedback_subagent_parallel.md 적합)
- **CoV + bkit gate-manager (P2)**: 검증 단계를 gate 조건으로

## Performance Gate G5 Pre-Estimate
- **DSPy**: M4 +10–40% (자가호출 태스크)
- **Self-Refine**: M4 +5% but M2 +10% 지연 리스크
- **STORM**: M1 +20% (다중 모델 호출) but M4 +15% (research 품질)
- **Trajectory Metrics**: M4 granularity 증가, correctness 퇴행 방지

## Protected Asset Impact
- **P2 bkit**: 중복 없음 (circuit/FSM/gate/self-heal과 직교)
- **P3 PIOP**: Trajectory metrics + CoV로 투명성 강화
- **P4 Hooks**: Self-Refine + CoV PostToolUse 삽입
- **P7 TDD**: DSPy signature는 선언형 — 테스트 쉬움

## Sources
- [ReAct + Reflexion Patterns](https://gm-spacagna.medium.com/react-reflexion-agentic-design-patterns-for-explicit-reasoning-1bb60dcdb611)
- [Stanford STORM](https://github.com/stanford-oval/storm)
- [DSPy](https://dspy.ai/)
- [Terminal-Bench 2.0](https://www.tbench.ai/leaderboard/terminal-bench/2.0)
- [Galileo Agent Eval](https://galileo.ai/blog/agent-evaluation-framework-metrics-rubrics-benchmarks)
- [Chain-of-Verification](https://arxiv.org/html/2603.24481v1)
- [Self-Consistency](https://arxiv.org/abs/2203.11171)
- [Adaptive Graph of Thoughts 2025](https://arxiv.org/pdf/2502.05078)
- [HumanEval Pro / MBPP Pro (ACL'25)](https://aclanthology.org/2025.findings-acl.686.pdf)
