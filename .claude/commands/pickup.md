---
description: 세션 재개 기본 진입점 — 상황 자동 감지 후 경량 복구 또는 /vibe 분기
---

> **기본 진입점**: 세션이 끊겼을 때 무조건 `/pickup` 사용.
> 내부에서 상황 판단 → 작업 흔적 있으면 경량 복구, 없으면 /vibe 제안.

## Step 0 — 작업 흔적 감지 (자동 분기)

```bash
node scripts/log-event.mjs command_start name=pickup
# 1. RESUME.md 존재 + 미완료?
RESUME_ACTIVE=""
[ -f ".context/RESUME.md" ] && ! grep -q "status:.*completed" ".context/RESUME.md" && RESUME_ACTIVE="1"

# 2. git에 uncommitted 변경?
GIT_DIRTY=$(git status --porcelain 2>/dev/null | head -1)

# 3. CURRENT.md에 In Progress Files?
IN_PROGRESS=""
[ -f ".context/CURRENT.md" ] && \
  IN_PROGRESS=$(awk '/^## In Progress Files/,/^## /' ".context/CURRENT.md" 2>/dev/null | grep -vE "^##|없음|\(없음\)" | grep -v "^$" | head -1)

# 판정
if [ -n "$RESUME_ACTIVE" ] || [ -n "$GIT_DIRTY" ] || [ -n "$IN_PROGRESS" ]; then
  echo "✅ 작업 흔적 감지 — 경량 복구 진행"
else
  echo "📭 작업 흔적 없음 — 새 세션입니다. /vibe 실행할까요? (Y/n)"
  # 사용자가 Y 또는 Enter → /vibe 실행
  # N → 빈 상태로 시작
fi
```

**분기 결과**:
- 흔적 있음 → Step 1~4 경량 복구 진행
- 흔적 없음 → 사용자에게 `/vibe` 제안 (1줄), 거절 시 빈 상태 시작

---

## Step 1 — 상태 확인 (흔적 있을 때만)

```bash
git log --oneline -5
git status --short
git diff --stat HEAD~1 2>/dev/null | tail -5
```

## Step 2 — 컨텍스트 로드

다음 파일을 순서대로 읽는다:

1. **`.context/RESUME.md`** — 최우선. 존재 + `status != completed` 이면 sleep-mode 재개 포인트
2. `.context/CURRENT.md` — 현재 상태 / In Progress / Next Tasks / Blockers
3. `memory/MEMORY.md` — 프로젝트 패턴 및 규칙
4. `CLAUDE.md` — 거버넌스 규칙 (있으면)

## Step 2.5 — Zzz-Mode 감지 (자동, 과거 Sleep-Mode)

`.context/RESUME.md` frontmatter 에 `mode: zzz` (또는 legacy `sleep`) + `status != completed` 확인 시:
- `governance/rules/autonomous-loop.md` **의무 Read** (6개 강제 조항, 특히 **조항 6 나레이션 금지**)
- RESUME.md `Completed` 섹션 파싱 → 중복 실행 방지
- `next_wakeup_scheduled` 있으면 OS-level launchd 살아있는지 확인 (`launchctl list | grep com.ateam.sleep-resume`)
- `In Progress` 부터 재개, 사용자 대상 텍스트 최소화

## Step 2.7 — Daily Growth Brief 확인

```bash
TODAY=$(date +%Y-%m-%d)
[ -f ".context/briefs/${TODAY}-brief.md" ] && echo "BRIEF_EXISTS" || echo "NO_BRIEF"
```

- `NO_BRIEF` + 일반 pickup (zzz 아님) → 1줄 제안: "`/daily-brief` 로 오늘 성장 브리핑을 받아보세요"
- `BRIEF_EXISTS` → Executive Summary 1줄 표시 후 재개
- zzz/sleep 모드 → 스킵 (나레이션 금지)

## Step 3 — 재개

- `In Progress Files` (CURRENT.md) 또는 `In Progress` (RESUME.md) 에 파일이 있으면: 해당 파일을 읽고 중단된 작업 파악
- `Next Tasks` 최우선 항목을 즉시 시작
- 브리핑 없이 바로 실행
- sleep-mode이면 첫 액션 전에 "어디서 이어받는지" 보고 **금지** (조항 6)
- 일반 pickup이면 한 줄로만 보고

## Step 4 — CURRENT.md 갱신

작업 재개 후 CURRENT.md의 `In Progress Files`를 현재 상태로 업데이트.
