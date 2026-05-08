---
description: 세션 시작 자동 분기 — 작업 흔적 감지 → pickup 경량 또는 vibe 풀 경로
---

## 0. 작업 흔적 감지 (자동 분기 — 최우선)

```bash
# 1. RESUME.md 미완료?
RESUME_ACTIVE=""
[ -f ".context/RESUME.md" ] && ! grep -q "status:.*completed" ".context/RESUME.md" && RESUME_ACTIVE="1"

# 2. git에 uncommitted 변경?
GIT_DIRTY=$(git status --porcelain 2>/dev/null | head -1)

# 3. CURRENT.md에 In Progress Files?
IN_PROGRESS=""
[ -f ".context/CURRENT.md" ] && IN_PROGRESS=$(awk '/^## In Progress Files/,/^## /' ".context/CURRENT.md" 2>/dev/null | grep -vE "^##|없음|\(없음\)" | grep -v "^$" | head -1)
```

**분기**:
- `RESUME_ACTIVE` 또는 `GIT_DIRTY` 또는 `IN_PROGRESS` → **pickup 경량 경로** (Step 1~3만)
- 모두 없음 → **vibe 풀 경로** (vibe.md Step 0.2~4)

---

## 1. 프로젝트 동기화 (공통)
```bash
git pull --rebase --autostash origin $(git branch --show-current) 2>&1 | tail -3 || true
```

## 2. 컨텍스트 로드 (경량)
- `.context/CURRENT.md` — In Progress Files + Next Tasks 1순위
- `.context/RESUME.md` — 존재 시 zzz-mode 감지 → 나레이션 금지 적용

## 3. 브리핑 (경량)
- zzz-mode: 브리핑 **금지** (autonomous-loop.md 조항 6)
- 일반: "이어서 진행합니다." (1줄)

---

## 관계
- `/pickup` — 이 워크플로우의 수동 진입점 (경량 경로 강제)
- `/vibe` — 풀 경로 강제 또는 흔적 없을 때 자동 분기
- SessionStart 훅 — 이 워크플로우를 자동 실행, Step 0에서 경로 결정
