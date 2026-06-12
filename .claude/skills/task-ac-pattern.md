---
name: task-ac-pattern
description: Task Acceptance Criteria 작성 패턴 — 완료 기준 정의, VERIFY CMD, ac-verifier 연동
tags: [ac, acceptance-criteria, verification, quality, task]
---

# Task AC Pattern

## 언제 사용

트리거 조건 (하나 이상이면 AC 작성 의무):
- 수정 대상 파일 2개 이상
- "추가/수정/마이그레이션/동기화/이식/반영" 패턴 포함
- 이전 세션에서 동일 태스크 실패 이력

## 패턴

### Risk Tier 먼저 판정

```bash
node scripts/impact.mjs <수정할-파일> | grep "→" | wc -l
```

| 영향 파일 수 | 등급 | AC 요구사항 |
|------------|------|-----------|
| 0 / 수정 1파일 | LOW | AC 생략 가능 |
| 1-3 / 수정 2-5파일 | MEDIUM | AC 필수 |
| 4-9 / 수정 6-9파일 | HIGH | AC + vigil + reviewer |
| 10+ / 아키텍처/보안 | CRITICAL | 사용자 승인 먼저 |

### AC 작성 형식

```
TASK: [태스크 이름]
RISK: [LOW|MEDIUM|HIGH|CRITICAL]
FILES: [수정 대상 파일 목록]
AC:
  - [ ] [grep/bash로 검증 가능한 기준 1]
  - [ ] [grep/bash로 검증 가능한 기준 2]
  - [ ] [빌드 통과]
DONE WHEN: 모든 AC 체크됨
VERIFY CMD: [각 AC를 실행으로 검증하는 명령]
```

AC를 `~/.claude/current-task-ac.txt`에 저장 → ac-verifier hook 자동 차단.

### 완료 선언 프로토콜

1. 구현 후 각 AC에 대해 VERIFY CMD 실행
2. tool call 출력 직접 확인 (성공 ≠ 의도 달성)
3. 모든 `[ ]` → `[x]` 전환 후에만 "완료" 선언
4. 하나라도 미통과 → 완료 선언 불가, 미통과 항목 명시

## 예시

```
TASK: skills 디렉토리 10개 파일 생성
RISK: MEDIUM
FILES: .claude/skills/*.md
AC:
  - [x] ls .claude/skills/*.md | wc -l → 11 이상 (README + 10개)
  - [x] 각 파일에 frontmatter (---) 포함
  - [x] 각 파일 100줄 이내
DONE WHEN: 모든 AC 체크됨
VERIFY CMD: ls /Users/noir/Projects/a-team/.claude/skills/*.md | wc -l
```

## 주의사항

- AC는 구현 시작 **전** 작성 (사후 작성 금지)
- "됐어 보여" / "아마 동작할 거야" = AC 미통과
- VERIFY CMD는 grep/bash로 기계적 검증 가능해야 함
- 상세 규칙: `governance/rules/task-ac.md`
