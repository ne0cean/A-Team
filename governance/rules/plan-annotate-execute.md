# Plan-Annotate-Execute 패턴

> **원칙**: 계획 승인 전 코드 작성 절대 금지.

## 4단계 파이프라인

### 1. Research
- 리서치 결과를 **파일**에 작성 (채팅 구두 요약 금지)
- "깊이/매우 상세히/세부사항" 키워드 포함
- A-Team: /intel, Explore 에이전트 활용

### 2. Plan
- `plan.md` 또는 blueprint 파일에 별도 작성
- 포함: 접근방식 + 코드 스니펫 + 파일 경로 + 트레이드오프
- 내장 plan mode보다 파일 방식 권장 (에디터 편집 가능, 세션 소멸 방지)
- A-Team: /blueprint 출력물 활용

### 3. Annotate (핵심)
- 사용자가 plan 파일을 에디터에서 열고 인라인 메모 삽입
- "아직 구현하지 마" 명시 필수
- 1~수회 반복 가능 — 방향이 맞을 때까지

### 4. Execute
- 사용자 승인 후에만 구현 시작
- "전부 구현해라. 완료 시 plan에 완료 표시. 멈추지 마라."
- 잘못된 방향 → git reset + 범위 재설정

## A-Team 적용

- `/blueprint` 실행 후 → 사용자 annotate 대기 → 승인 시 coder 에이전트 실행
- `/autoplan` 내 검토 단계에 annotate 체크포인트 추가
- PARALLEL_PLAN.md 작성 시에도 동일 원칙 적용

## 출처
- 김플립 "찐 개발자의 바이브 코딩" (150K views, Boris Tane 원저자)
