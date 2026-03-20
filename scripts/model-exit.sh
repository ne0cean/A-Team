#!/usr/bin/env bash
# model-exit.sh — 모델 전환 전 맥락 보존 핸드오프 스크립트
# 사용: ./scripts/model-exit.sh
# Windows(Git Bash) / macOS / Linux 호환

set -e

PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HANDOFF_FILE="$PROJ_ROOT/.context/HANDOFF_PROMPT.txt"
CURRENT_FILE="$PROJ_ROOT/.context/CURRENT.md"

# ── 1. 현재 상태 저장 ─────────────────────────────────────────
echo "📦 현재 변경사항 커밋 중..." >&2
cd "$PROJ_ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "sync: model handoff $(date '+%Y-%m-%d %H:%M')" || true
fi

# ── 2. 핸드오프 프롬프트 생성 ──────────────────────────────────
echo "📝 핸드오프 프롬프트 생성 중..." >&2

LAST_COMMIT=$(git log --oneline -3 2>/dev/null || echo "(없음)")
CURRENT_STATUS=$(cat "$CURRENT_FILE" 2>/dev/null | head -60 || echo "(CURRENT.md 없음)")

cat > "$HANDOFF_FILE" << EOF
# 컨텍스트 핸드오프 — $(date '+%Y-%m-%d %H:%M')

이전 세션에서 이어받은 작업입니다. 아래 맥락을 읽고 즉시 작업을 재개하세요.

## 최근 커밋 (last 3)
$LAST_COMMIT

## 현재 프로젝트 상태 (CURRENT.md 요약)
$CURRENT_STATUS

## 지시
1. 위 맥락을 정독하세요.
2. \`git status\`와 \`git log --oneline -5\`로 현재 상태를 확인하세요.
3. CURRENT.md의 Next Tasks 최우선 항목을 즉시 시작하세요.
4. 브리핑 없이 바로 실행하세요.
EOF

# ── 3. 클립보드 복사 (플랫폼별) ───────────────────────────────
COPIED=false
if command -v pbcopy &>/dev/null; then
  # macOS
  cat "$HANDOFF_FILE" | pbcopy
  COPIED=true
elif command -v xclip &>/dev/null; then
  # Linux (xclip)
  cat "$HANDOFF_FILE" | xclip -selection clipboard
  COPIED=true
elif command -v xsel &>/dev/null; then
  # Linux (xsel)
  cat "$HANDOFF_FILE" | xsel --clipboard --input
  COPIED=true
elif command -v clip.exe &>/dev/null; then
  # Windows Git Bash
  cat "$HANDOFF_FILE" | clip.exe
  COPIED=true
fi

# ── 4. 알림 (플랫폼별) ─────────────────────────────────────────
OS_TYPE=$(uname -s)
if [ "$OS_TYPE" = "Darwin" ]; then
  osascript -e 'display notification "핸드오프 준비 완료 — 새 AI에서 붙여넣기" with title "Model Exit"' 2>/dev/null || true
fi
# Windows/Linux: 터미널 출력으로 대체

# ── 5. 결과 보고 ────────────────────────────────────────────────
echo "" >&2
echo "═══════════════════════════════════════════" >&2
echo "  ✅ 핸드오프 준비 완료" >&2
echo "═══════════════════════════════════════════" >&2
echo "  파일: $HANDOFF_FILE" >&2
if [ "$COPIED" = "true" ]; then
  echo "  클립보드: 복사 완료 — 새 AI에서 Ctrl+V / Cmd+V" >&2
else
  echo "  클립보드 자동 복사 실패 — 아래 파일을 수동으로 복사하세요:" >&2
  echo "  $HANDOFF_FILE" >&2
fi
echo "═══════════════════════════════════════════" >&2
