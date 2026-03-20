---
description: 추가 및 조회를 위한 프로젝트 TODO 관리 (GitHub 동기화 포함)
---

A-Team 중앙 TODO 시스템을 사용합니다. 모든 작업은 `A-Team/TODO.md`에 기록됩니다.

## 사용 방법

사용자의 요청에 따라 아래 명령어를 실행하세요:

### 추가
```bash
bash A-Team/scripts/todo.sh add "할 일 내용" "프로젝트명"
```
- 프로젝트명 생략 시 현재 디렉토리 이름이 자동 태깅됩니다.

### 조회
```bash
# 전체 대기 목록
bash A-Team/scripts/todo.sh list

# 특정 프로젝트만
bash A-Team/scripts/todo.sh list A-Team
```

### 완료 처리
```bash
bash A-Team/scripts/todo.sh done "검색어"
```
- 검색어에 해당하는 첫 번째 대기 항목이 `[x]`로 변경되고 날짜가 추가됩니다.

### 통계
```bash
bash A-Team/scripts/todo.sh stats
```
- 프로젝트별 대기/완료 수를 보여줍니다.

## 규칙
- 모든 작업에는 반드시 `[프로젝트명]` 태그가 붙어야 합니다.
- 추가/완료 시 자동으로 git commit & push 합니다.
