# Task Acceptance Criteria (AC) Gate

> **목적**: 소규모 태스크(feature 레벨 미만)에서 발생하는 "완료 거짓 보고" 차단.
> /craft, /ship은 큰 기능용. 이 규칙은 "CSS 추가", "함수 수정", "파일 동기화" 같은 일상 작업용.

## 트리거 조건 (하나 이상이면 AC 의무)

- 수정 대상 파일 2개 이상
- "추가/수정/마이그레이션/동기화/이식/반영" 패턴
- 이전 세션에서 동일 태스크가 실패한 이력

## AC 작성 형식

구현 시작 **전** Claude가 이 형식으로 작성:

```
TASK: [태스크 이름]
FILES: [수정 대상 파일 목록]
AC:
  - [ ] [grep/bash로 검증 가능한 기준 1]
  - [ ] [grep/bash로 검증 가능한 기준 2]
DONE WHEN: 모든 AC 체크됨
VERIFY CMD: [각 AC를 실행으로 검증하는 명령]
```

## 완료 선언 프로토콜 (Truth Contract 제7조 통합)

1. 구현 후 각 AC에 대해 VERIFY CMD 실행
2. tool call 출력 확인 (성공 ≠ 의도 달성 — 사이드 이펙트 포함 검증)
3. 모든 AC 체크박스 `[x]` 전환 후에만 "완료" 단어 사용
4. AC 중 하나라도 미통과 → 완료 선언 불가, 미통과 항목 명시

## AC 예시

```
TASK: vision-board CSS main.css 이식
FILES: public/css/main.css
AC:
  - [x] grep -c "vision-" public/css/main.css → 12 이상
  - [x] .vision-board, .vision-card 등 핵심 클래스 존재
DONE WHEN: 모든 AC 체크됨
VERIFY CMD: grep -c "vision-" scripts/cortex-dashboard/public/css/main.css
```

## 면제 조건

- 1개 파일, 1개 변경, 30줄 미만: AC 생략 가능
- 탐색/읽기 전용 작업
- 사용자가 "빠르게", "그냥" 명시 시

## current-task-ac.txt 워크플로우

AC 작성 시 `~/.claude/current-task-ac.txt`에도 동일하게 저장:
- ac-verifier hook이 Edit/Write 후 미완료 AC 감지 시 자동 차단
- 완료 선언 전 모든 `[ ]` → `[x]` 전환 필수
- 태스크 완료 후 파일 비우기

```
# 저장 형식 (current-task-ac.txt)
TASK: [태스크 이름]
AC:
  - [ ] [검증 기준 1]
  - [ ] [검증 기준 2]
VERIFY CMD: [각 AC 검증 명령]
```

## TASKS.md 확장 필드 (선택)

복잡한 태스크는 다음 필드 추가 사용 가능:
- `Acceptance`: 수락 기준 (what makes this done)
- `Verification`: 실행 가능한 검증 명령어
- `Hypothesis`: 기대 결과 수치 (예: grep count > 12)
- `Success`: 성공 판정 임계값

```
TASK: [태스크 이름]
FILES: [수정 대상 파일 목록]
Acceptance: [완료 기준 서술]
Verification: [bash 실행 가능한 검증 명령]
Hypothesis: [기대 수치/결과]
Success: [판정 임계값]
AC:
  - [ ] [검증 가능한 기준 1]
  - [ ] [검증 가능한 기준 2]
DONE WHEN: 모든 AC 체크됨
VERIFY CMD: [각 AC를 실행으로 검증하는 명령]
```

## Vigil 연동

완료 선언 후 의심스러우면: `/vigil` 또는 "vigil 돌려줘"
Vigil이 git diff + 파일 존재 + 빌드 + AC를 교차 검증.

- 에이전트 정의: `.claude/agents/vigil.md`
- AC 파일 경로: `~/.claude/current-task-ac.txt`
- orchestrator가 coder 완료 선언 후 자동 호출 가능

## 상시 원칙 (Truth Contract 연계)

`tool 성공 ≠ 의도 달성` — push 성공해도 wrong branch, fetch 성공해도 wrong endpoint 가능.
AC의 VERIFY CMD가 이 괴리를 명시적으로 차단한다.

---

**연관 규칙**: `truth-contract.md`, `verification-gate.md`, `checkpointing.md`
**Last updated**: 2026-06-04
