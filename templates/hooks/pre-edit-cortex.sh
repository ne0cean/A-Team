#!/usr/bin/env bash
# pre-edit-cortex.sh — PRE-EDIT 자동 차단 게이트 (Layer 1)
# PreToolUse hook: Edit|Write 도구 실행 전
# cortex-dashboard 파일 편집 시 DECISIONS.md PRE-EDIT 체크리스트 자동 실행
# Exit 2 = BLOCK / Exit 0 = 통과

set -uo pipefail

input=$(cat)

# file_path 추출
file_path=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

[ -z "$file_path" ] && exit 0

# cortex-dashboard 파일만 처리
echo "$file_path" | grep -q "cortex-dashboard" || exit 0

# CORTEX_ROOT 감지
CORTEX_ROOT=$(echo "$file_path" | sed 's|\(.*cortex-dashboard\)/.*|\1|')
[ -d "$CORTEX_ROOT" ] || exit 0

# ── 파일 타입별 체크 목록 결정 ────────────────────────────────

CHECK_APP=false
CHECK_WORKER=false
CHECK_CSS=false

case "$file_path" in
  *app.js)        CHECK_APP=true; CHECK_CSS=true ;;
  *index.js)      CHECK_WORKER=true ;;
  *main.css)      CHECK_CSS=true ;;
  *cortex*)       CHECK_APP=true; CHECK_WORKER=true; CHECK_CSS=true ;;
esac

FAILURES=()

# ── app.js 체크 ───────────────────────────────────────────────
if $CHECK_APP; then
  APP="$CORTEX_ROOT/public/js/app.js"
  if [ -f "$APP" ]; then
    grep -q "parseSoDate\|setSoDate" "$APP"   || FAILURES+=("app.js: parseSoDate/setSoDate 없음 — Standing 날짜 입력 소실")
    grep -q "showToast"              "$APP"   || FAILURES+=("app.js: showToast 없음 — Toast 알림 소실")
    grep -q "window\.fetch = "       "$APP"   || FAILURES+=("app.js: window.fetch 인터셉터 없음 — auth 헤더 주입 불가")
    grep -q "capture: true"          "$APP"   || FAILURES+=("app.js: capture:true 없음 — CTRL+S가 브라우저에 가로채임")
    grep -q "renderWorkoutBar\|toggleWorkout" "$APP" || FAILURES+=("app.js: renderWorkoutBar/toggleWorkout 없음 — Workout 바 소실")
    grep -q "saveStandingData\|_version"      "$APP" || FAILURES+=("app.js: saveStandingData/_version 없음 — 409 충돌 처리 소실")
  fi
fi

# ── worker 체크 ───────────────────────────────────────────────
if $CHECK_WORKER; then
  WORKER="$CORTEX_ROOT/worker/src/index.js"
  if [ -f "$WORKER" ]; then
    grep -q "Preserve workout" "$WORKER" || FAILURES+=("worker/index.js: 'Preserve workout' 없음 — workout 유실 재발")
    grep -q "!i\._frame"       "$WORKER" || FAILURES+=("worker/index.js: '!i._frame' 없음 — carry 시 routine 항목 이월됨")
  fi
fi

# ── CSS 체크 ──────────────────────────────────────────────────
if $CHECK_CSS; then
  CSS="$CORTEX_ROOT/public/css/main.css"
  if [ -f "$CSS" ]; then
    grep -q "so-date-input"                     "$CSS" || FAILURES+=("main.css: .so-date-input 없음 — Standing 날짜 입력 CSS 소실")
    grep -q "visibility:hidden\|visibility: hidden" "$CSS" || FAILURES+=("main.css: visibility:hidden 없음 — del-btn 레이아웃 시프트 발생")
  fi
fi

# ── 결과 처리 ─────────────────────────────────────────────────
if [ ${#FAILURES[@]} -eq 0 ]; then
  # 통과 — systemMessage로 확인 결과 주입
  CHECKED=""
  $CHECK_APP    && CHECKED="${CHECKED}app.js(6) "
  $CHECK_WORKER && CHECKED="${CHECKED}worker(2) "
  $CHECK_CSS    && CHECKED="${CHECKED}css(2) "
  printf '{"systemMessage":"✅ PRE-EDIT PASSED [%s]— 필수 함수/로직 전체 생존 확인"}\n' "$CHECKED"
  exit 0
fi

# 실패 — BLOCK
FAIL_MSG="🚫 PRE-EDIT FAILED — 편집 중단\n\n누락 항목:\n"
for f in "${FAILURES[@]}"; do
  FAIL_MSG="${FAIL_MSG}  • ${f}\n"
done
FAIL_MSG="${FAIL_MSG}\n편집 전 위 항목이 존재하지 않습니다.\n파일이 이미 손상되어 있을 가능성이 있습니다. 사용자에게 보고하세요."

printf '{"decision":"block","reason":"%s"}\n' "$(echo -e "$FAIL_MSG" | python3 -c "import sys; import json; print(json.dumps(sys.stdin.read())[1:-1])")" >&2
exit 2
