---
date: YYYY-MM-DD
module: <module name>
phase: <0-6>
gate_status: <pass | fail>
data_points_collected: <number>
---

# Retro — <module> @ Phase <N>

## 목표 (Define 단계의 PRD에서)

<원래 무엇을 하려 했는가>

## 빌드된 것 (Build 단계 산출물)

- <파일/커맨드/에이전트 목록>

## 실 사용 (Use 단계, 테스트/파일럿 아닌 진짜 사용)

| 일자 | 사용 맥락 | 결과 | 데이터 포인트 |
|------|---------|------|------------|
| | | | |

## 측정 (Measure 단계, analytics.jsonl 기반)

```
event 분포:
사용 빈도:
성공률:
```

## 발견한 것

- **잘 작동한 부분**:
- **부족한 부분**:
- **예상 못한 사용 패턴**:

## Iterate 결정

- [ ] 모듈 확장 (Sub-module N 추가)
- [ ] 모듈 축소 (사용 안 되는 부분 제거)
- [ ] 모듈 폐기 (가치 없음 입증)
- [ ] 다음 Phase 진입 (Gate 충족)

## Gate 평가

- [ ] 실 사용 데이터 ≥ 1회
- [ ] analytics.jsonl 기록
- [ ] 회고 작성 (이 파일)

→ Gate **PASS / FAIL** — 다음 모듈 진입 가능 여부

## 다음 액션

1.
2.
