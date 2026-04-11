# Advisor Tool — 데몬 운영 가이드

## 적용 범위

- **적용**: `ralph-daemon.mjs`, `research-daemon.mjs` (Layer B만)
- **미적용**: Claude Code 서브에이전트 (Layer A). 이유는 [advisor-architecture.md](./advisor-architecture.md) 참조.

Layer B 데몬은 장기 루프(야간 배치, 다중 iteration)이므로 advisor call의 비용 대비 효과가 높습니다. Layer A 서브에이전트는 단발 호출로 advisor break-even을 충족하기 어렵습니다.

## Tool 기본 설정 tiering

| 태스크 유형 | max_uses | caching | 이유 |
|---|---|---|---|
| 단기 (<5분, 단일 파일) | 1 | off | 캐시 break-even 미달 |
| 중기 (5-30분, 멀티 파일) | 2 | 5m | 중간 길이 |
| 장기 (ralph 야간 loop) | 3 | 1h | 3+ calls 확실 |

ralph-daemon.mjs에서는 기본값 `max_uses=3`, `cacheTtl='1h'`. `state.json`에서 per-task 오버라이드 가능:

```json
{
  "useSdkPath": true,
  "advisorEnabled": true,
  "advisorModel": "claude-opus-4-6",
  "advisorMaxUses": 3,
  "advisorCacheTtl": "1h"
}
```

## Opt-in 활성화

CLI fallback이 기본값입니다. SDK Advisor 경로는 state.json에서 명시적으로 opt-in해야 활성화됩니다:

```json
{
  "useSdkPath": true,
  "advisorEnabled": true
}
```

두 플래그가 모두 true일 때만 `callSdkWithAdvisor()`가 호출됩니다. 어느 하나라도 false이면 기존 CLI 경로를 사용합니다.

## 시스템 프롬프트 (공식 권장)

### 타이밍 블록

공식 권장 문구 (Anthropic Platform Docs 기준):

> You have access to an advisor tool backed by a stronger reviewer model. Call advisor BEFORE substantive work — before writing, before committing to an interpretation. Also call advisor when the task is complete, when stuck, or when considering a change of approach. On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done.

핵심 타이밍:
1. 실질 작업 시작 **전** (접근법 확정 전)
2. 완료 **직전** (선언 전 검증)
3. 막혔을 때 (3회 이상 같은 오류 반복)
4. 접근법 변경을 고려할 때

### 압축 지시

"The advisor should respond in under 100 words and use enumerated steps, not explanations."

이 지시는 advisor 응답을 간결하게 유지하여 executor 컨텍스트 낭비를 방지합니다.

## 비용 제어

- `circuit-breaker.ts`의 `ADVISOR_TOOL_BREAKER_CONFIG` 임계치: 실패율 20% 초과 → CLI 자동 fallback
- ralph-daemon에서 `advisorStats.failures / currentIteration >= 0.20` 또는 누적 3회 실패 시 `state.useSdkPath=false` 자동 전환
- conversation-level cap 없음 → 데몬에서 iteration 당 1회 측정
- `max_uses` 로 advisor 호출 횟수 상한 설정

## 측정 지표 (cost-tracker)

`CostRecord`에 다음 필드로 기록:

| 필드 | 설명 |
|---|---|
| `advisorCalls` | 해당 iteration의 advisor 호출 횟수 |
| `advisorInputTokens` | advisor에 전송된 토큰 |
| `advisorOutputTokens` | advisor가 생성한 토큰 |
| `cacheReadInputTokens` | 캐시 히트로 절약된 토큰 |
| `cacheCreationInputTokens` | 캐시 생성 비용 토큰 |

`getSummary()` 파생 지표 목표:

| 지표 | 목표 |
|---|---|
| `advisorCallAvg` | 1.5–2.5 / iteration |
| `cacheHitRate` | >60% (장기 loop) |
| `reviewerCallRate` | 태스크별 모니터링 |

실패율 모니터: 일일 집계, >5% 경고.

## Fallback 시나리오

1. beta API 응답 에러 → `sdkResult.error` 반환 → `advisorStats.failures++`
2. 실패율 20% 도달 또는 누적 3회 실패 → 경고 로그 + `state.useSdkPath=false` 자동 전환
3. 이후 모든 iteration은 기존 CLI 경로로 처리 (데몬 재시작 없음)
4. 수동 복구: state.json에서 `useSdkPath: true` 재설정 후 데몬 재시작

## state.json 스키마 확장

```json
{
  "useSdkPath": false,
  "advisorEnabled": false,
  "advisorModel": "claude-opus-4-6",
  "advisorMaxUses": 3,
  "advisorCacheTtl": "1h",
  "advisorStats": {
    "totalCalls": 0,
    "totalInputTokens": 0,
    "totalOutputTokens": 0,
    "failures": 0
  }
}
```

`advisorStats`는 atomicWriteJSON으로 매 iteration 후 저장됩니다.

## 모델 페어 제약

Executor 모델은 Advisor 모델보다 같거나 약해야 합니다:

| Executor | Advisor |
|---|---|
| claude-haiku-4-5 | claude-opus-4-6 |
| claude-sonnet-4-6 | claude-opus-4-6 |
| claude-opus-4-6 | claude-opus-4-6 |

ralph-daemon 기본값: executor=`claude-sonnet-4-6`, advisor=`claude-opus-4-6`.
