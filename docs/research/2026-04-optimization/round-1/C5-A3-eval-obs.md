# C5 (Eval) + A3 (Observability) Survey

**Date**: 2026-04-13 | **Tools**: 14 | **Top candidates**: 2 | **Rejects**: SaaS-only, Python-friction

## Top 2 Candidates

### C5 Leader — **promptfoo** (13.2k⭐, MIT, OpenAI 2026)
- 300k+ dev, F500 127사, Anthropic/OpenAI 검증
- **MIT 라이선스**, CLI + YAML (A-Team 파일 기반 철학 일치)
- 에이전트 테스트, red-teaming, 멀티모델 비교 (GPT/Claude/Gemini/Llama)
- CI/CD 통합, SaaS lock-in 없음
- **통합**: 200–400 LOC `eval/` subagent + B1–B6 YAML 템플릿
- **Criteria 8/8 PASS**: maturity ✓, compat ✓, context <50B ✓, MIT ✓, 결정론(seed) ✓, P7 강화 ✓, opt-in ✓
- **P1–P8 영향**: 전부 외부 레이어, 비침습

### A3 Leader — **Langfuse** (24.8k⭐, MIT since 2025-06, YC W23)
- MIT 전환으로 모든 기능 unlock (tracing/eval/prompt mgmt/experiments)
- **OTEL native v3 SDK** — span 자동 변환
- OpenAI SDK / LiteLLM / LangChain / LangGraph / CrewAI / Pydantic-AI 통합
- Docker Compose → K8s 확장
- **2026 AgentGateway 통합** (solo.io): zero-code infra 레벨 트레이싱
- **통합**: 150–250 LOC PostToolUse 훅 (P4 이미 존재)
- **Context cost**: file-based trace log ~50–200B/call, 10% 샘플링 시 0.1–0.3%
- **Criteria 8/8 PASS**

## Other Findings

### C5 Strong Runner-up: **inspect-ai** (UK AISI, MIT)
- Anthropic/DeepMind/Grok 프로덕션
- dataset → Task → Solver → Scorer primitives, Docker/K8s 샌드박스
- **2–3k LOC Python wrapper 필요** — Stage 9 (P6 sovereignty audit) 보류

### C5 Specialized
- **RAGAS**: ref-free RAG eval, B2 TDD feature의 RAG 전용만
- **LLM-as-judge**: 단일 출력 score + pairwise. COT 추론으로 일치도 개선. 20–50 LOC 내장 judge agent.
- **Giskard** (5.1k⭐, Apache 2.0): adversarial test 자동 생성 (OWASP Top 10), Python 전용 → **Stage 9 보안 audit로 연기**

### A3 Foundation: **OpenLLMetry** (Apache 2.0)
- OTEL 벤더 뉴트럴 트레이싱 레이어
- OpenAI/Anthropic/벡터 DB/에이전트 프레임워크 계측
- **시너지**: Langfuse = OpenLLMetry OTEL + rich UI

### Rejected
| 도구 | 사유 |
|-----|------|
| **Braintrust** | SaaS 백엔드 필수, no self-host, no MIT → Criteria 4 위반 |
| **LangSmith** | SaaS $39/user/mo → Criteria 4, API leak → Criteria 3 |
| **Phoenix/Arize** | Cloud-first, self-host 마찰, 상용 라이선스 |
| **Helicone proxy** | Proprietary 백엔드. 빠른 POC fallback만 |
| **Datadog** | $8/10k req, SaaS 전용 |
| **OpenAI evals** | Legacy, promptfoo가 대체 |
| Property-based agent testing | 연구 단계 (2025-10 arxiv), 프로덕션 도구 부재 → Stage 10 |

## Performance Gate G5 Pre-Estimate
- **promptfoo**: M4 gate enforcement (correctness 퇴행 방지), M1 <50B
- **Langfuse**: M1 +0.1–0.3% (10% 샘플링), M2 <5ms/call
- **두 도구 합산**: M4 +2–5pp, M1 오버헤드 <0.5%

## Integration Sketch

```
eval/                           # promptfoo 기반
├── templates/
│   ├── b1-small-fix.yml
│   ├── b2-tdd-feature.yml
│   └── b6-debug.yml
├── scores/
│   └── results-{date}.jsonl
└── index.js                    # CLI: npm run eval:b1 (게이트 차단)

observability/                  # Langfuse 기반
├── hooks/
│   └── post-tool-use.js       # OTEL span emit
├── config/
│   └── langfuse.json
└── index.js                    # 세션 시작 시 OTEL context init
```

## Protected Asset Impact
- **P1 thin-wrapper**: 무관 (별도 subagent)
- **P2 bkit**: 보완 (eval + obs → 153 tests 확장)
- **P4 hooks**: Langfuse가 PostToolUse 기존 훅 사용 → 신규 훅 불필요
- **P5 CURRENT.md**: eval state + trace metadata 선택적 저장
- **P6 Sovereignty**: self-hosted → 보호
- **P7 TDD**: 강화 (eval gate = correctness gate)

## Sources
- [promptfoo](https://github.com/promptfoo/promptfoo)
- [Langfuse](https://github.com/langfuse/langfuse)
- [Langfuse MIT 전환](https://langfuse.com/handbook/chapters/open-source)
- [inspect-ai](https://github.com/UKGovernmentBEIS/inspect_ai)
- [OpenLLMetry](https://github.com/traceloop/openllmetry)
- [Giskard OSS](https://github.com/Giskard-AI/giskard-oss)
- [RAGAS](https://github.com/vibrantlabsai/ragas)
- [LLM-as-Judge Guide](https://www.confident-ai.com/blog/why-llm-as-a-judge-is-the-best-llm-evaluation-method)
- [Agentic Property-Based Testing](https://arxiv.org/html/2510.09907v1)
