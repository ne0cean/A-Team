#!/usr/bin/env bash
# post-edit-cortex.sh — POST-EDIT 생존 확인 게이트 (Layer 2)
# PostToolUse hook: Edit|Write 도구 실행 후
# cortex-dashboard 파일 편집 후 필수 함수/로직 생존 여부 확인
# Exit 0 + additionalContext = Claude에게 경고 주입 (차단하지 않음 — 즉시 수정 유도)

set -uo pipefail

input=$(cat)

file_path=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

[ -z "$file_path" ] && exit 0
echo "$file_path" | grep -q "cortex-dashboard" || exit 0

CORTEX_ROOT=$(echo "$file_path" | sed 's|\(.*cortex-dashboard\)/.*|\1|')
[ -d "$CORTEX_ROOT" ] || exit 0

# ── 파일 타입별 체크 ──────────────────────────────────────────

CHECK_APP=false
CHECK_WORKER=false
CHECK_CSS=false

case "$file_path" in
  *app.js)    CHECK_APP=true; CHECK_CSS=true ;;
  *index.js)  CHECK_WORKER=true ;;
  *main.css)  CHECK_CSS=true ;;
  *cortex*)   CHECK_APP=true; CHECK_WORKER=true; CHECK_CSS=true ;;
esac

MISSING=()

if $CHECK_APP; then
  APP="$CORTEX_ROOT/public/js/app.js"
  if [ -f "$APP" ]; then
    grep -q "parseSoDate\|setSoDate" "$APP"   || MISSING+=("parseSoDate/setSoDate")
    grep -q "showToast"              "$APP"   || MISSING+=("showToast")
    grep -q "window\.fetch = "       "$APP"   || MISSING+=("window.fetch 인터셉터")
    grep -q "capture: true"          "$APP"   || MISSING+=("capture:true (CTRL+S)")
    grep -q "renderWorkoutBar\|toggleWorkout" "$APP" || MISSING+=("renderWorkoutBar/toggleWorkout")
    grep -q "saveStandingData\|_version"      "$APP" || MISSING+=("saveStandingData/_version")
  fi
fi

if $CHECK_WORKER; then
  WORKER="$CORTEX_ROOT/worker/src/index.js"
  if [ -f "$WORKER" ]; then
    grep -q "Preserve workout" "$WORKER" || MISSING+=("Preserve workout (worker)")
    grep -q "!i\._frame"       "$WORKER" || MISSING+=("!i._frame (worker carry)")
  fi
fi

if $CHECK_CSS; then
  CSS="$CORTEX_ROOT/public/css/main.css"
  if [ -f "$CSS" ]; then
    grep -q "so-date-input"                     "$CSS" || MISSING+=(".so-date-input")
    grep -q "visibility:hidden\|visibility: hidden" "$CSS" || MISSING+=("visibility:hidden")
  fi
fi

# ── 결과 처리 ─────────────────────────────────────────────────
if [ ${#MISSING[@]} -eq 0 ]; then
  exit 0  # 모두 생존 — 조용히 통과
fi

# 누락 발견 — additionalContext로 경고 주입
WARN="⚠️ POST-EDIT REGRESSION DETECTED\n\n방금 편집으로 인해 다음 필수 항목이 사라졌습니다:\n"
for m in "${MISSING[@]}"; do
  WARN="${WARN}  • ${m}\n"
done
WARN="${WARN}\n즉시 위 항목을 복원하세요. 이 경고를 무시하고 계속하면 다음 배포에서 기능이 소실됩니다."

CTX=$(echo -e "$WARN" | python3 -c "import sys; import json; print(json.dumps(sys.stdin.read())[1:-1])")
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$CTX"
exit 0
