# 주간 인사이트 — 2026년 19주차 (2026-05-04 ~ 2026-05-11)

## 모듈 사용 현황
| 모듈 | 사용 횟수 | 평균 점수 | 성공률 | 전주 대비 |
|------|---------|---------|-------|---------|
| design-auditor | 0 | - | - | -160회 (-100%) |
| unknown | 1 | - | - | -5회 (-83%) |

## 주요 관찰
1. **design-auditor 사용 중단**: 전주 160회 실행되던 design-auditor가 이번 주 완전히 사용되지 않음. 전주 성공률 53%로 낮은 수준이었으나 활발히 사용되던 모듈의 급격한 사용 중단은 워크플로우 변화 또는 마찰 증가를 시사
2. **데이터 수집 부족**: 이번 주 전체 이벤트가 1건에 불과해 의미있는 통계 분석 불가. analytics.jsonl 로깅 누락 또는 시스템 비활성 상태 가능성
3. **friction 분산**: marketing.publishing, operations.autonomous-mode 등 6개 영역에서 각 1건의 friction 발생. 특정 영역 집중보다는 전반적 기능 갭 상태

## 다음 주 우선순위 제안
1. **Zero-capability 영역 해소**: capability_snapshot에서 0점인 영역들(marketing.performance-marketing, marketing.crm-lifecycle, design.prototyping, qa.usability-testing, analytics.external-bi, analytics.anomaly-detection, operations.user-feedback, operations.incident-response, operations.pr-cs, sales-cs 전체)이 friction 발생 중. 우선순위:
   - marketing.publishing (0.2) → friction 발생 + 낮은 capability
   - analytics.external-bi (0.0) → friction 발생 + 완전 미구현
   - operations.autonomous-mode (0.8이지만 friction 발생) → 고성능 모듈이나 특정 시나리오 갭 존재

2. **로깅 시스템 점검**: 주간 이벤트 1건은 비정상. analytics.jsonl 작성 코드 경로, auto-sync 데몬 상태, 또는 최근 governance 변경사항 검토 필요

3. **design-auditor 재활성화 또는 대체**:
   - 사용 중단 원인 조사 (UX 마찰? 결과 품질? 워크플로우 변경?)
   - 전주 성공률 53%였던 점 고려 시 품질 개선 필요
   - 대안: design.quality-audit capability는 0.85로 높음 → 별도 워크플로우 존재 가능

## 플래그
- `high_failure`: design-auditor (전주 53% 성공률, 이번 주 미사용)
- `no_usage`: design-auditor (전주 160회 → 0회)
- `coverage_drop`: 전체 시스템 (주간 이벤트 1건으로 사실상 coverage 붕괴)
- `data_quality_issue`: 총 이벤트 1건은 정상 운영 상태 아님. 로깅 파이프라인 점검 필요

## 긴급 액션 아이템
1. `.context/analytics.jsonl` 마지막 7일 엔트리 확인 → 로깅 중단 시점 특정
2. `scripts/auto-switch/trigger.mjs` 및 auto-sync 데몬 상태 확인
3. design-auditor 최근 실행 기록 조회 (git log, session history)
4. friction 발생한 6개 영역 중 marketing.publishing, analytics.external-bi 우선 구현

---
_자동 생성: /insights 에이전트 | 데이터: .context/analytics.jsonl | 생성 시각: 2026-05-04T10:29:04.598Z_
