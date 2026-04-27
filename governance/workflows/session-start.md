---
description: 세션 시작 시 상태 파악 및 브리핑 (vibe.md Step 1 구현)
---

## 1. 프로젝트 동기화
```bash
git pull --rebase --autostash origin $(git branch --show-current)
```

## 2. 컨텍스트 로드
- `.context/CURRENT.md` — 현재 상태, Phase, Next Tasks
- `.context/DECISIONS.md` — 최근 결정사항 5건
- `.context/RESUME.md` — 존재 시 중단 세션 감지 → `/pickup` 제안
- `.context/AUTORESEARCH-PLAN.md` — Mode 확인 (SHADOW-TRACKING이면 세션 집계 트리거)

## 3. Git 상태
```bash
git status --short
git log --oneline -5
```

## 4. 브리핑
"마지막 [{최근 커밋 요약}]. 다음 할 일: [{Next Tasks 1순위}]. 시작합니다."

## 관계
- 수동 `/vibe`가 이 워크플로우의 상위 오케스트레이터 (Step 0.2~4)
- SessionStart 훅이 자동 주입 시 이 워크플로우를 내부적으로 실행
- `turbo-auto.md` 적용: 탐색/상태확인은 승인 없이 자동 진행
