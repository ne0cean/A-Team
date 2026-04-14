# C1 — Multi-Agent Orchestration Frameworks Survey

**Survey Date**: 2026-04-13
**Surveyed**: 8 frameworks
**Status**: Round 1 Stage 1 complete

## Executive Summary
8개 멀티에이전트 오케스트레이션 프레임워크를 A-Team Protected Assets (P1–P8) 및 8개 Selection Criteria 대비 평가.

**Short-list (4개)**: CrewAI, LangGraph, Pydantic-AI, smolagents
**Reject (4개)**: Agno (MPL 라이선스), AutoGen 0.4 (deprecated), Swarm (deprecated), DSPy (카테고리 미스매치 → C3로 이관)

## Evaluation Table

| Framework | Stars | License | Version | Core Primitive | Criteria | P1–P8 Risk | Verdict |
|-----------|-------|---------|---------|----------------|----------|------------|---------|
| **CrewAI** | 48.8k | MIT | 1.10.1+ | Crews + Flows | 7/8 PASS | P1, P4 | ★ STRONG PASS |
| **Pydantic-AI** | 16.3k | MIT | 1.80.0 | Typed Agent | 7/8 PASS | P1, P5 | ★ STRONG PASS |
| **LangGraph** | 29.1k | MIT | 1.1.7a1 | Graph + State | 6/8 PASS | P1, P3 | CONDITIONAL |
| **smolagents** | 26.6k | Apache-2.0 | 1.24.0 | Code-first ReAct | 6/8 PASS | P1, P6 | CONDITIONAL |
| Agno | 39.1k | MPL | Active | Graph + Runtime | 5/8 PASS | P1–P8 | REJECT (license) |
| AutoGen 0.4 | ~20k | MIT/Apache | 0.4 Beta | Event async | 4/8 PASS | P1, P2, P7 | REJECT (deprecated) |
| Swarm | 6.8k | MIT | 0.1 | Handoff | 3/8 | P1–P8 | REJECT (deprecated) |
| DSPy | ~8k | BSD | 3.0 | Prompt compiler | 3/8 | — | DEFER to C3 |

## 1. CrewAI — 최상위 후보
- **Prod scale**: 12M daily agent executions (공개 지표 중 최고)
- **이중 모델**: Crews (자율 role-play) + Flows (이벤트 기반 FSM, Pydantic BaseModel)
- **MCP native** (v1.10+)
- **Integration surface**:
  - Crews → A-Team subagents (researcher/coder/reviewer 등) 래핑
  - Flows → orchestrator 로직 대체 옵션
  - Memory tiers (short/long/entity) → MEMORY.md 보강
- **강화 포인트**: P1 (진짜 autonomy 추가), P5 (메모리 계층)
- **리스크**: Flow interceptor 명시적 plumbing 필요, 메모리 시스템 중복 주의 (unified 안 하면 drift)
- **추천**: Stage 4 deep-dive 최우선

## 2. Pydantic-AI — 타입 안전 거버넌스
- **핵심**: `Agent[DepsType, OutputType]` 제네릭 파라미터화 — 타입 계약이 거버넌스 enforcement
- **Prod**: Amazon Bedrock 채택, v1 stable (2026-04-10)
- **Runtime 오버헤드 0** (타입은 파싱 시점만)
- **Integration surface**:
  - subagent base class 드롭인
  - RunContext → Hook 시스템 타입드 대체
  - Agent2Agent 네이티브
- **강화 포인트**: P6 (타입으로 sovereignty 강제), P7 (mypy로 pre-runtime 버그 검출)
- **리스크**: Python 전용 전제 (A-Team 일부 TS)
- **추천**: P6+P7 전용 보강 candidate, 보조로 배치

## 3. LangGraph — 그래프 표준
- **29.1k stars, LangChain 백엔드**
- **Primitive**: DAG + stateful nodes, checkpoint persistence
- **Integration surface**:
  - checkpoint → PIOP(P3)과 매핑 가능
  - reducer functions → pre/post hooks(P4)과 매핑
- **리스크**: 멀티에이전트 state를 단일 그래프 state로 평탄화 필요 → 컨텍스트 직렬화 +5–10% (Criteria 3 threshold 2% 초과 가능)
- **추천**: CONDITIONAL — Stage 5.5에서 컨텍스트 오버헤드 < 2% 입증 시만 수용

## 4. smolagents — 샌드박스 ReAct
- **HuggingFace 1000-line 철학**, Apache-2.0
- **코드 생성형**: JSON tool-call 대신 Python 스니펫 실행 (sandboxed)
- **Integration surface**:
  - CodeAgent → 샌드박스 실행이 P2(circuit-breaker)와 자연 결합
  - MCP/LangChain/custom tool 통합
- **리스크**: 코드 생성 실패율이 JSON tool보다 높을 수 있음 → B2 벤치에서 검증 필요
- **추천**: CONDITIONAL — B2(TDD) 벤치 통과 시 수용

## Rejected

### Agno — MPL 라이선스 블로커
- 5000x faster claim 공개 벤치마크 없음
- 60개 레포 분산, 불투명
- **MPL 2.0 copyleft-lite**: P6 sovereignty 모델과 비호환 (파생 공개 의무)
- **결론**: 라이선스만으로도 탈락

### AutoGen 0.4 — Deprecated
- Microsoft 공식: "stable API 유지, 신기능은 AG2로"
- v0.4 Beta + AG2 전환 → 기술 부채
- **결론**: AG2 + Semantic Kernel 합병 완료 후 재조사

### Swarm — Deprecated
- OpenAI: "Agents SDK로 마이그레이션"
- Stateless 설계가 CURRENT.md 연속성(P5)과 충돌
- 매 handoff마다 컨텍스트 재송 → 토큰 낭비 20%
- **결론**: OpenAI Agents SDK 오픈소스 공개 시 재조사

### DSPy — 카테고리 미스매치
- 프롬프트 컴파일러 (오케스트레이션 아님)
- **결론**: C3 (Context Engineering) 으로 이관. 프롬프트 자동 최적화 후보로 재평가

## Critical Findings

1. **컨텍스트 비용 공개 벤치 부재** — 모든 프레임워크가 A-Team baseline 대비 토큰 오버헤드 미공개. Stage 5.5 Baseline에서 기준 수립 후 측정.
2. **라이선스 함정** — Agno MPL 같은 copyleft-lite 주의. C2–C7에서도 동일 필터.
3. **Deprecated 2건** — AutoGen, Swarm 둘 다 EOL. 후속 프레임워크 (AG2, Agents SDK) 별도 리서치 필요.

## Next Stage (3 → 4)

**Stage 3 보호자산 매핑**:
- CrewAI → P1 (autonomy), P5 (memory tiers)
- Pydantic-AI → P6 (type-enforced sovereignty), P7 (TDD)
- LangGraph → P3 (PIOP checkpoint), P4 (reducer hooks)
- smolagents → P2 (sandbox isolation), P6 (MCP)

**Stage 4 Deep-dive 우선순위**: CrewAI → Pydantic-AI → LangGraph → smolagents

## Sources
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [CrewAI GitHub](https://github.com/crewaiinc/crewai)
- [Pydantic-AI GitHub](https://github.com/pydantic/pydantic-ai)
- [smolagents GitHub](https://github.com/huggingface/smolagents)
- [Agno GitHub](https://github.com/agno-agi/agno)
- [AutoGen v0.4 Blog](https://www.microsoft.com/en-us/research/blog/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)
- [OpenAI Swarm GitHub](https://github.com/openai/swarm)
- [DSPy GitHub](https://github.com/stanfordnlp/dspy)
