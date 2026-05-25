# Cortex 운영 규칙

> cortex 워크스페이스의 입력/분류/연결/균형을 관리하는 거버넌스.

## 1. 입력 의무

- `/end` 실행 시 세션에서 새로 배운 교훈이 있으면 `/idea` 또는 wiki-ingest 제안 (선택)
- YouTube `/yt` 분석 리포트 → `cortex/resources/videos/`에 자동 저장 제안

## 2. Inbox Zero

- inbox/에 3일 이상 파일 방치 금지
- `/morning` 실행 시 inbox 파일 수 체크 → 3개+ 이면 알림: "inbox에 N건. /tidy-inbox 권장"
- `/tidy-inbox`에서 Claude가 분류 제안, 사용자가 승인

## 3. 분류 규칙

- 사용자는 PARA만 지정 (또는 생략)
- 6기둥은 Claude가 내용 기반 자동 분류 → 1줄 제안 → 사용자 승인
- 승인 없이 이동하지 않음
- 판단 어려우면 inbox 유지

## 4. 연결 복리

- 노트 작성 시 기존 cortex 노트와 관련 있으면 [[wikilink]] 자동 삽입 제안
- 주간 리뷰에서 cortex-graph --stats 포함:
  - 고립 노트 비율 (목표: 20% 이하)
  - 평균 연결 수 (목표: 3+)
  - 이번 주 신규 연결 수

## 5. 6기둥 균형

- weekly-review에서 기둥별 입력 수 집계
- 0건 기둥 알림: "이번 주 {기둥}에 입력 없음"
- 편중 경고: 80%+ 한 기둥에 집중 시 알림

## 6. 성숙도 추적

| 단계 | 조건 | 의미 |
|------|------|------|
| seed | 초안 (version 1) | 방금 작성 |
| growing | version 2+ (갱신됨) | 한 번 이상 보강 |
| mature | links 3+ (연결됨) | 다른 노트와 교차 |
| evergreen | 실전 사용 확인 | 의사결정/프로젝트에 인용됨 |

## 7. Archive 정책

- projects/ 완료 시 → archive/로 이동
- archive는 읽기 전용 — 수정하지 않음
- archive 내용이 현재에 필요하면 → areas/ 또는 resources/에 새 노트 작성 + archive 참조 링크
