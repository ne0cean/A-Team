---
description: /prioritize — RICE 스코어링 기반 기능 우선순위 자동 매기기
---

> Analytics: `node scripts/log-event.mjs command_start name=prioritize` — 실행 시작 시 반드시 호출

CURRENT.md의 Next Tasks 또는 사용자가 제시한 기능 목록을 RICE 프레임워크로 우선순위를 매긴다.

## RICE 공식

```
RICE Score = (Reach × Impact × Confidence) / Effort
```

| 요소 | 정의 | 스케일 |
|------|------|--------|
| **Reach** | 분기 내 영향받는 사용자/세션 수 | 숫자 (추정) |
| **Impact** | 개인당 영향도 | 3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal |
| **Confidence** | 추정 확신도 | 100%=높음, 80%=중간, 50%=낮음 |
| **Effort** | 사람-주 (person-weeks) | 숫자 (1인 기준) |

## Step 1 — 후보 수집

사용자가 목록을 제시하면 그대로 사용.
제시하지 않으면 CURRENT.md의 Next Tasks에서 미완료 항목 수집.

## Step 2 — RICE 스코어링

각 항목에 대해:

1. **Reach 추정**: "이 기능이 분기(3개월) 내 몇 번 사용/영향될까?"
   - 1인 팀 기준: 일 1회 = 90, 주 1회 = 13, 월 1회 = 3
   - 외부 사용자 있으면: 예상 MAU × 관련 비율

2. **Impact 판단**: "사용자 경험에 미치는 영향은?"
   - 3.0 = 핵심 차단 해제 (없으면 사용 불가)
   - 2.0 = 주요 워크플로우 개선
   - 1.0 = 보통 개선
   - 0.5 = 미미한 개선

3. **Confidence 평가**: "이 추정이 얼마나 확실한가?"
   - 100% = 데이터/증거 있음
   - 80% = 경험적 판단
   - 50% = 추측

4. **Effort 추정**: "구현에 몇 주 걸리나?"
   - 실제 작업 일수 / 5 = 사람-주
   - 하루면 0.2, 이틀이면 0.4, 1주면 1.0

## Step 3 — 랭킹 + 의사결정

RICE Score 내림차순 정렬. 출력 형식:

```
## Feature Prioritization (RICE)

| Rank | Feature | Reach | Impact | Confidence | Effort | RICE Score |
|------|---------|-------|--------|------------|--------|------------|
| 1 | ... | 90 | 3.0 | 100% | 0.4 | 675 |
| 2 | ... | 13 | 2.0 | 80% | 1.0 | 20.8 |

### 권장 실행 순서
1. [1위 항목] — 이유: ...
2. [2위 항목] — 이유: ...

### Quick Wins (높은 스코어 + 낮은 Effort)
- ...

### 보류 권장 (낮은 스코어 또는 낮은 Confidence)
- ...
```

## Step 4 — CURRENT.md 갱신 (선택)

사용자 승인 시 Next Tasks를 RICE 순서로 재정렬.
