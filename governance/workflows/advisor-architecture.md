# Advisor Tool — 아키텍처 설계 문서

## 핵심 아이디어: Layer A / Layer B 분리

Advisor Tool의 핵심 통찰은 "모든 에이전트에 advisor를 붙이면 안 된다"입니다.

- **Layer A** (Claude Code 서브에이전트): 단발 호출, 짧은 컨텍스트, advisor break-even 미달
- **Layer B** (Ralph/Research 데몬): 장기 루프, 반복 호출, 캐시 효과 극대화

Layer B에서만 advisor를 활성화하고, Layer A는 기존 MoA/Reviewer 체계를 유지합니다.

## 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│                     A-Team Orchestrator                   │
└─────────────────────────┬────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
     Layer A (Claude Code)       Layer B (Daemon)
     서브에이전트 직접 호출        ralph/research loop
            │                           │
     기존 MoA 체계                SDK Advisor 경로
     Reviewer/Judge               callSdkWithAdvisor()
                                        │
                                 ┌──────┴──────┐
                                 │  Executor   │
                                 │ (Sonnet 4.6)│
                                 │      │      │
                                 │  advisor    │
                                 │  tool call  │
                                 │      │      │
                                 │  Advisor    │
                                 │ (Opus 4.6)  │
                                 └─────────────┘
```

## 4-Way 역할 분리 매트릭스

| 역할 | 위치 | 모델 | 발동 조건 |
|---|---|---|---|
| **MoA** | Layer A | 복수 모델 | 복잡 태스크 초기 다양성 확보 |
| **Advisor** | Layer B | Opus 4.6 | Executor가 advisor tool 호출 |
| **Reviewer** | Layer A/B | Sonnet+ | 코드/결과 품질 검증 |
| **Judge** | Layer A | Opus 4.6 | 복수 후보 중 최적 선택 |

MoA와 Advisor는 겹치지 않습니다. MoA는 초기 다양성, Advisor는 진행 중 가이던스입니다.

## 핵심 경로 시퀀스

### Layer A (기존, 변경 없음)

```
User Task
  → Pre-check gate (L1)
  → MoA Round 1/2/3 (선택적)
  → Reviewer (선택적)
  → Judge (MoA 시)
  → Output
```

### Layer B (Advisor 추가)

```
Daemon Iteration
  → state.useSdkPath && state.advisorEnabled?
      YES → callSdkWithAdvisor()
              → Executor (Sonnet 4.6)
                  → [advisor tool call] → Advisor (Opus 4.6) → 가이던스
                  → [advisor tool call] → Advisor (Opus 4.6) → 최종 검토
              → usage.iterations[] 파싱
              → advisorStats 갱신
              → 실패 시 CLI fallback
      NO  → spawnClaudeProcess() (기존 CLI 경로, 변경 없음)
  → Pre-check gate 검증
  → saveState()
```

## 측정 지표 + 성공 기준

| 지표 | 목표값 | 측정 방법 |
|---|---|---|
| `advisorCallAvg` | 1.5–2.5 / iter | CostTracker.getSummary() |
| `cacheHitRate` | >60% (장기) | cacheRead / (cacheRead + advisorIn) |
| `preCheckSkipRate` | 모니터링 | skipReason='pre-check-skip' 비율 |
| `reviewerCallRate` | 모니터링 | phase='reviewer' 비율 |
| advisor 실패율 | <5% / 일 | advisorStats.failures / iterations |

Phase 1 성공 기준:
- 224 tests PASS 유지 (회귀 없음)
- CLI fallback 정상 동작 (SDK 없어도 동작)
- state.json opt-in 플래그로 안전하게 활성화

## Phase 1 / 2 / 3 마이그레이션 경로

### Phase 1 (현재)
- `lib/cost-tracker.ts`: CostRecord 확장 + 파생 지표
- `lib/circuit-breaker.ts`: ADVISOR_TOOL_BREAKER_CONFIG 상수
- `scripts/daemon-utils.mjs`: callSdkWithAdvisor() 추가
- `scripts/ralph-daemon.mjs`: useSdkPath flag 분기
- 기존 CLI 경로 100% 보존

### Phase 2
- research-daemon.mjs에 동일 패턴 적용
- A/B 테스트 인프라: abVariant 필드 활용
- cacheHitRate 60% 목표 달성 검증

### Phase 3
- Layer A advisor 도입 검토 (단, break-even 분석 선행 필수)
- 자동 tiering: 태스크 길이 예측 → max_uses 자동 결정
- 비용 대시보드 통합

## Decision Log

| ID | 결정 | 이유 |
|---|---|---|
| D1 | Layer B만 advisor 적용 | Layer A는 단발 호출, break-even 미달 |
| D2 | CLI fallback 기본값 | SDK 선택적 의존성, 환경 호환성 |
| D3 | state.json opt-in | 점진적 롤아웃, 안전한 실험 |
| D4 | Opus 4.6 advisor 고정 | 모델 페어 제약 (executor ≤ advisor) |
| D5 | 실패율 20% 임계치 | circuit-breaker 기준과 일관성 |
| D6 | advisorStats를 state.json에 저장 | 데몬 재시작 후에도 통계 유지 |
| D7 | cacheHitRate = cacheRead / (cacheRead + advisorIn) | advisor 입력 대비 캐시 절약 비율 |

## 리스크 + 완화

| 리스크 | 확률 | 완화 |
|---|---|---|
| beta API 불안정 | 중 | CLI fallback 자동 전환 (실패율 20%) |
| SDK 미설치 환경 | 고 | dynamic import + 에러 반환, CLI fallback |
| 비용 급증 | 중 | max_uses 상한 + advisorStats 모니터링 |
| 기존 테스트 회귀 | 저 | 모든 신규 필드 optional, CLI 경로 불변 |
| 캐시 미스 (cold start) | 중 | cacheTtl='1h' 기본값, 장기 loop에서 break-even |

## 구현 파일 의존성

```
governance/workflows/advisor.md          (운영 가이드)
governance/workflows/advisor-architecture.md  (이 파일)
         ↑
lib/cost-tracker.ts                      (CostRecord 확장)
lib/circuit-breaker.ts                   (ADVISOR_TOOL_BREAKER_CONFIG)
         ↑
scripts/daemon-utils.mjs                 (callSdkWithAdvisor)
         ↑
scripts/ralph-daemon.mjs                 (useSdkPath 분기)
```

변경 범위를 최소화하여 기존 224 tests에 영향을 주지 않는 것이 설계 원칙입니다.

## Threat Model (CSO-M04)

### Trust Boundaries

```
User Input → [XML Fence] → Pre-Check Agent → [Haiku] → Verdict
                                                          ↓
                                                    Phase 2 Router
                                                          ↓
                                                    Coder Agent
                                                          ↓
                                                    [Guardrail]
                                                          ↓
                                                    Reviewer (조건부)
```

### Attack Scenarios

| # | Threat | Mitigation | Layer |
|---|---|---|---|
| T1 | Prompt Injection via user input | XML fence + 판정 지시 무시 패턴 | pre-check.md |
| T2 | Model ID injection | ALLOWED_MODELS allowlist | ralph-daemon.mjs |
| T3 | Shell injection via checkCommand | ALLOWED_CHECK_COMMANDS + shell:false | ralph-daemon.mjs |
| T4 | SDK baseURL hijacking | 명시적 baseURL + DANGEROUS_ENV_VARS | daemon-utils.mjs |
| T5 | Session ID leakage | .gitignore (CSO-H01 패치) | .gitignore |
| T6 | bypassPermissions elevation | 'plan' 폴백 (CSO-H03 패치) | daemon-utils.mjs |
| T7 | SSRF via RALPH_NOTIFY_URL | isNotifyUrlAllowed() | ralph-daemon.mjs |

### Defense-in-Depth Matrix

| Asset | Layers |
|---|---|
| ANTHROPIC_API_KEY | env only + buildClaudeEnv + baseURL 명시 (3 layers) |
| state.json 무결성 | sh -c 제거 + ALLOWED_CHECK + freeze (3 layers) |
| 프롬프트 인젝션 | XML 펜스 + confidence ≥ 0.95 (2 layers) |

### Assumptions

1. 로컬 파일시스템은 trusted. 단 에이전트 Write 권한이 경계를 확장할 수 있음.
2. Anthropic API는 trusted. 하지만 베타 기능은 언제든 변경 가능.
3. `@anthropic-ai/sdk`는 optional — 미설치 시 graceful 실패.
