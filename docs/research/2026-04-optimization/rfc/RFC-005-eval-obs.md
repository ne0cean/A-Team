# RFC-005 Eval + Observability Stack

**Status**: Draft | **Target**: Stage 5.5 Prototype → 5.6 A/B → 5.7 G5 Gate
**Scope**: promptfoo (correctness eval) + Langfuse (OTEL observability), self-hosted

## 1. Problem Statement

**공백 A — Correctness Gate 부재**: TDD(P7 153 tests)는 함수 레벨 검증만. 에이전트가 **명세 자체를 올바르게 생성하는가**(RED phase 실제 실패 테스트, refactor 품질 개선, multi-file dep graph)는 측정 수단 없음. 9-subagent(P1) 특성상 메인이 볼 수 없는 산출물이 90%+ → **외부 correctness gate 필요**. Stage 5.6 A/B 벤치가 의미 가지려면 B1–B6에 기계 검증 assertion 걸려 있어야.

**공백 B — Agent Trace 불투명**: PostToolUse hook(P4) 파일 로그만. "B3에서 어느 subagent가 몇 tool call했고 어디서 token 소진?" "이번 Ralph Loop가 지난 주 대비 느려진 원인?" 답 못함. Stage 9 호출 그래프 시각화, Stage 10 drift 감지는 **분산 trace** 전제.

두 공백 모두 자산 교체 없이 보강 가능.

## 2. Strength Claim

| PA | 현재 | 보강 |
|----|-----|------|
| **P4 Hooks** | Pre/PostToolUse 존재, 파일 로그만 | 기존 PostToolUse에 **OTEL span emitter** 추가 (확장, 신규 훅 아님) |
| **P6 Sovereignty** | 외부 SaaS 금지 | Langfuse **self-hosted Docker**, postgres/redis 로컬, 외부 송출 0 |
| **P7 TDD** | 153 unit tests | promptfoo **eval gate** = agent-output correctness (TDD 한 레이어 위) |

P1/P8 비침해 — 훅/Docker는 subagent system prompt 외부.

## 3. Integration Design

### 3.1 Repository Layout
```
eval/
├── templates/b1~b6.yml
├── scripts/run-gate.js        # G5-a..e validator
├── scores/results-{date}.jsonl
└── package.json

observability/
├── docker-compose.yml         # postgres + redis + langfuse
├── .env.example
└── hooks/
    ├── post-tool-use.js       # ~150 LOC OTEL span
    ├── sampling.js            # 10% default
    └── masking.js             # email/phone/apikey/SSN
```

### 3.2 promptfoo B1–B6 YAML
Weighted assertion + threshold 0.85. B2의 RED phase assertion `weight: 2` (구현부터 쓰는 안티패턴 fail 처리). `metadata.benchmark: b{n}` 태그 → Langfuse eval.id ↔ trace.id 역조회.

### 3.3 `eval/scripts/run-gate.js`
MANIFEST G5-a..e 5조건 검증. `performance-gate-g5` root span 생성, gate 결과를 attribute. 하나 실패 → `process.exit(1)` → CI/Ralph Loop 자동 중단.

### 3.4 PostToolUse OTEL Hook (~150 LOC)
- `getSamplingDecision()` → 10% 통과 시 `tracer.startSpan('tool:{name}')`
- `tool_input/response`는 `maskPII()` + **500자 truncate**
- 세션 root span `ateam-session` 자동 parenting → 9-subagent 호출 그래프 tree
- `global.__PROMPTFOO_EVAL_ID__` 있으면 `eval.id` attribute
- try/catch — OTEL 장애가 tool 실행 차단 금지

### 3.5 Sampling + Masking
- **sampling.js**: `LANGFUSE_ENABLED=false` → false, `ATEAM_TRACE_ALL=1` → true, else `OTEL_SAMPLER_ARG` (default 0.1) 확률
- **masking.js**: 4 regex (email / E.164 phone / `sk-*` API key / SSN). 외부 JSON config로 확장, Langfuse 서버 측 이중 마스킹

### 3.6 Langfuse Docker Compose
`postgres:15-alpine + redis:7-alpine + langfuse/langfuse:latest`. ENV: `LANGFUSE_MASK_PII=true`, `LANGFUSE_DATA_RETENTION_DAYS=30`, `OTEL_ENABLED=true`. **포트 localhost 바인딩** (P6). 볼륨 mount postgres만.

## 4. Implementation Plan

| Phase | 산출물 | Agent | 기간 |
|-------|-------|-------|-----|
| 1 promptfoo bench | B1~B6 YAML, npm scripts (`eval:b1..all:gate`) | coder | 2일 |
| 2 Obs infra | docker-compose + .env.example + README | coder | 0.5일 |
| 3 OTEL hook | post-tool-use.js + sampling.js + masking.js + 단위 테스트 | coder TDD | 1일 |
| 4 Baseline + A/B | baseline (LANGFUSE_ENABLED=false, PROMPTFOO_SKIP=1) 3회 → 활성 3회, PERFORMANCE_LEDGER | researcher+coder | 1일 |

**총 4.5일, ~800 LOC** (DD-04 일치).

## 5. Test Plan — 3 RED Tests (TDD 자율 적용, >50 LOC 비즈니스 로직)

1. **`eval-gate.red.test.js`**: `run-gate.js`에 `correctness < 1.0` 있으면 `exit(1)` + `gate.g5.passed=false`. RED: 미구현 → FAIL.
2. **`pii-mask.red.test.js`**: `tool_input`에 `sk-ant-abc.../user@example.com/010-1234-5678` → `maskPII()` 출력에 원본 substring 0회. RED: 구현 전 FAIL.
3. **`sampling-distribution.red.test.js`**: `OTEL_SAMPLER_ARG=0.1` × 10,000 → true 비율 0.08~0.12. `ATEAM_TRACE_ALL=1` → 100%, `LANGFUSE_ENABLED=false` → 0%. RED: 구현 전 FAIL.

`npx vitest run` RED 확인 → 구현 → GREEN → refactor.

## 6. Rollout + Rollback

**점진 활성화**:
1. Default OFF — `.env.example` `LANGFUSE_ENABLED=false`, `PROMPTFOO_SKIP=1`
2. Stage 5.6 A/B dev only 활성
3. G5 통과 → `governance/rules/ateam-sovereignty.md`에 "observability 10% sampling 허용" 추가 후 전체 활성

**즉시 Rollback 훅**:
```bash
export LANGFUSE_ENABLED=false   # OTEL 차단
export PROMPTFOO_SKIP=1          # eval gate bypass
export ATEAM_TRACE_ALL=1         # debug 100% 샘플
docker compose -f observability/docker-compose.yml down
```

훅 try/catch → OTEL 장애 ≠ tool 실패 격리 계약.

## 7. Success Criteria (G5)

| Metric | Target | 측정 |
|--------|-------|-----|
| **M4 correctness** | **+2~5pp** | promptfoo B1–B6 가중평균, gate-enforcement |
| **M1 token overhead** | **<0.5%** | 10% × 500자 truncate × 150 tool call/세션 |
| M2 latency | +1% 이내 | per-span 2–5ms, async flush |
| M4 regression | 0 | threshold 0.85 + weight 2 RED |
| Benchmark coverage | B1–B6 ≥ 4/6 | B2/B5 최대 상승 |
| Variability | σ<m×0.1 | 3회, Langfuse outlier 식별 |
| Trace visibility | 호출 그래프 | `ateam-session` root → subagent tree |

## 8. Risks

- **R1 OTEL SDK 2–3 MB**: `optionalDependencies`로 격리, LANGFUSE_ENABLED=false 시 스킵
- **R2 Docker (Windows)**: WSL2 호환 확인, Phase 2 smoke test
- **R3 PII regex false negative**: 외부 JSON config + 서버 측 이중 마스킹 + 30일 retention 안전망
- **R4 promptfoo LLM-rubric 비용**: Haiku rubric 고정 (A1 cascade 정합)
- **R5 Eval-trace linking API 의존**: `promptfoo@^0.x` 버전 고정 + CHANGELOG 모니터링

**Reviewer checklist**: P1/P2/P8 비침해 / Docker localhost-only / `.env.example` default OFF / 3 RED 우선 / rollback 4-liner 검증.

## References
- DD-04: `docs/research/2026-04-optimization/round-3/DD-04-eval-obs.md`
- [promptfoo](https://github.com/promptfoo/promptfoo), [Langfuse](https://github.com/langfuse/langfuse)
- [Langfuse OTEL](https://langfuse.com/integrations/native/opentelemetry)
