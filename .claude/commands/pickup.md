---
description: 토큰 소진 후 작업 재개 — 이전 AI가 중단한 지점부터 즉시 이어받기
---

> **자동 트리거**: SessionStart[resume] 훅이 세션 재개 시 컨텍스트를 자동 주입합니다.
> 수동 `/pickup`은 자동 재개가 작동하지 않았거나 특정 시점으로 복구할 때 사용하세요.

이전 AI 세션이 토큰 소진으로 갑자기 중단되었습니다. 아래 순서대로 컨텍스트를 복원하고 즉시 재개합니다.

## Step 1 — 상태 확인

```bash
git log --oneline -10
git status
git diff HEAD~1
```

## Step 2 — 컨텍스트 로드

다음 파일을 순서대로 읽는다:

1. `.context/CURRENT.md` — 현재 상태 / In Progress / Next Tasks / Blockers
2. `memory/MEMORY.md` — 프로젝트 패턴 및 규칙
3. `CLAUDE.md` — 거버넌스 규칙 (있으면)

## Step 3 — 재개

- `In Progress Files`에 파일이 있으면: 해당 파일을 읽고 중단된 작업 파악
- `Next Tasks` 최우선 항목을 즉시 시작
- 브리핑 없이 바로 실행
- 첫 번째 액션 전에 "어디서 이어받는지" 한 줄로만 보고

## Step 4 — CURRENT.md 갱신

작업 재개 후 CURRENT.md의 `In Progress Files`를 현재 상태로 업데이트.
