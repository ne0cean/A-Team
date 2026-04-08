#!/usr/bin/env bash
# pre-ui-capture.sh — PreToolUse hook: UI 파일 수정 전 baseline 스크린샷 캡처
# Edit|Write 도구 실행 전 자동 트리거
# Exit 0 = 허용 (항상). 캡처 실패해도 수정은 진행.

input=$(cat)

# JSON에서 file_path 추출
if command -v python3 &>/dev/null; then
  file_path=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)
else
  file_path=""
fi

[ -z "$file_path" ] && exit 0

# ── UI 파일 필터 ─────────────────────────────────────────────────
# tsx/jsx/css/scss만 대상. 테스트/타입/node_modules 제외.
case "$file_path" in
  *.tsx|*.jsx|*.css|*.scss|*.styled.ts|*.styled.tsx) ;;
  *) exit 0 ;;
esac

# 테스트/타입 파일 제외
case "$file_path" in
  *.test.*|*.spec.*|*.d.ts|*node_modules*|*.stories.*) exit 0 ;;
esac

# ── 환경 변수 ────────────────────────────────────────────────────
UI_INSPECT_URL="${UI_INSPECT_URL:-http://localhost:3000}"
UI_INSPECT_ENABLED="${UI_INSPECT_ENABLED:-true}"
OUT_DIR="/tmp/ui-inspect"
TIMESTAMP=$(date +%s)

[ "$UI_INSPECT_ENABLED" = "false" ] && exit 0

# ── Dev server 접근 가능한지 빠르게 체크 ──────────────────────────
if ! curl -s --max-time 2 "$UI_INSPECT_URL" >/dev/null 2>&1; then
  # Dev server 미실행 — 조용히 스킵
  exit 0
fi

# ── A-Team 스크립트 경로 탐색 ────────────────────────────────────
# 훅은 프로젝트 루트에서 실행되므로, A-Team 글로벌 경로 탐색
SNAPSHOT_SCRIPT=""
SEARCH_PATHS=(
  "$HOME/Projects/a-team/A-Team/scripts/browser/snapshot.js"
  "$(dirname "$0")/../../scripts/browser/snapshot.js"
  ".claude/scripts/browser/snapshot.js"
)
for p in "${SEARCH_PATHS[@]}"; do
  if [ -f "$p" ]; then
    SNAPSHOT_SCRIPT="$p"
    break
  fi
done

[ -z "$SNAPSHOT_SCRIPT" ] && exit 0

# ── Playwright 설치 여부 확인 ────────────────────────────────────
SCRIPT_DIR="$(dirname "$SNAPSHOT_SCRIPT")"
if [ ! -d "$SCRIPT_DIR/node_modules/playwright" ]; then
  # 미설치 — 조용히 스킵 (첫 사용 시 install.sh 안내)
  exit 0
fi

# ── Before 스크린샷 캡처 (백그라운드, 타임아웃 방지) ──────────────
mkdir -p "$OUT_DIR"

# 뷰포트 설정
VIEWPORT="${UI_INSPECT_VIEWPORT:-375x812}"

# 타임스탬프 기록 (PostToolUse에서 매칭용)
echo "$TIMESTAMP" > "$OUT_DIR/.current-capture"
echo "$file_path" > "$OUT_DIR/.current-file"

# 백그라운드로 캡처 실행 (훅 타임아웃 5초 이내 반환)
(
  node "$SNAPSHOT_SCRIPT" \
    --url "$UI_INSPECT_URL" \
    --viewport "$VIEWPORT" \
    --out "$OUT_DIR" \
    --prefix "before-$TIMESTAMP" \
    --timeout 8000 \
    >/dev/null 2>&1
) &

exit 0
