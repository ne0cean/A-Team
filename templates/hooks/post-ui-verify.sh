#!/usr/bin/env bash
# post-ui-verify.sh — PostToolUse hook: UI 파일 수정 후 자동 시각 검증
# Edit|Write 도구 실행 후 자동 트리거
# Exit 0 + additionalContext JSON = Claude 컨텍스트에 검증 결과 주입

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

# ── UI 파일 필터 (PreToolUse와 동일) ─────────────────────────────
case "$file_path" in
  *.tsx|*.jsx|*.css|*.scss|*.styled.ts|*.styled.tsx) ;;
  *) exit 0 ;;
esac

case "$file_path" in
  *.test.*|*.spec.*|*.d.ts|*node_modules*|*.stories.*) exit 0 ;;
esac

# ── 환경 변수 ────────────────────────────────────────────────────
UI_INSPECT_URL="${UI_INSPECT_URL:-http://localhost:3000}"
UI_INSPECT_ENABLED="${UI_INSPECT_ENABLED:-true}"
UI_INSPECT_HMR_WAIT="${UI_INSPECT_HMR_WAIT:-2}"
OUT_DIR="/tmp/ui-inspect"

[ "$UI_INSPECT_ENABLED" = "false" ] && exit 0

# ── Dev server 체크 ──────────────────────────────────────────────
if ! curl -s --max-time 2 "$UI_INSPECT_URL" >/dev/null 2>&1; then
  exit 0
fi

# ── A-Team 스크립트 경로 탐색 ────────────────────────────────────
SCRIPT_DIR=""
SEARCH_PATHS=(
  "$HOME/Projects/a-team/A-Team/scripts/browser"
  "$(dirname "$0")/../../scripts/browser"
  ".claude/scripts/browser"
)
for p in "${SEARCH_PATHS[@]}"; do
  if [ -f "$p/snapshot.js" ]; then
    SCRIPT_DIR="$p"
    break
  fi
done

[ -z "$SCRIPT_DIR" ] && exit 0
[ ! -d "$SCRIPT_DIR/node_modules/playwright" ] && exit 0

# ── Before 캡처 타임스탬프 읽기 ──────────────────────────────────
TIMESTAMP=$(cat "$OUT_DIR/.current-capture" 2>/dev/null || echo "")
if [ -z "$TIMESTAMP" ]; then
  TIMESTAMP=$(date +%s)
fi

VIEWPORT="${UI_INSPECT_VIEWPORT:-375x812}"

# ── HMR/리빌드 대기 ─────────────────────────────────────────────
sleep "$UI_INSPECT_HMR_WAIT"

# ── After 스크린샷 캡처 ──────────────────────────────────────────
AFTER_RESULT=$(node "$SCRIPT_DIR/snapshot.js" \
  --url "$UI_INSPECT_URL" \
  --viewport "$VIEWPORT" \
  --out "$OUT_DIR" \
  --prefix "after-$TIMESTAMP" \
  --timeout 8000 \
  2>/dev/null)

if [ $? -ne 0 ]; then
  # 캡처 실패 — 조용히 스킵
  exit 0
fi

# ── Before 파일 존재 확인 ────────────────────────────────────────
BEFORE_PNG="$OUT_DIR/before-$TIMESTAMP.png"
AFTER_PNG="$OUT_DIR/after-$TIMESTAMP.png"

if [ ! -f "$BEFORE_PNG" ]; then
  # Before 캡처가 완료되지 않음 (백그라운드 실행 중이었을 수 있음)
  # 최대 3초 대기
  for i in 1 2 3; do
    [ -f "$BEFORE_PNG" ] && break
    sleep 1
  done
fi

if [ ! -f "$BEFORE_PNG" ] || [ ! -f "$AFTER_PNG" ]; then
  # Before/After 모두 있어야 diff 가능
  # After만 있으면 단일 스크린샷 정보만 제공
  if [ -f "$AFTER_PNG" ]; then
    CONSOLE_ERRORS=$(cat "$OUT_DIR/after-$TIMESTAMP-console.json" 2>/dev/null | python3 -c "
import sys, json
try:
    errors = json.load(sys.stdin)
    if errors:
        print('Console errors: ' + ', '.join(e.get('text','')[:80] for e in errors[:3]))
    else:
        print('No console errors')
except:
    print('Console check unavailable')
" 2>/dev/null)

    # additionalContext로 After 스크린샷만 주입
    python3 -c "
import json
ctx = '''## UI Auto-Verify (after-only)
File: \`$file_path\`
Screenshot: \`$AFTER_PNG\`
$CONSOLE_ERRORS

Read the screenshot to verify your UI change visually.'''
print(json.dumps({'additionalContext': ctx}))
"
    exit 0
  fi
  exit 0
fi

# ── Diff 생성 ────────────────────────────────────────────────────
DIFF_PNG="$OUT_DIR/diff-$TIMESTAMP.png"
DIFF_RESULT=$(node "$SCRIPT_DIR/diff.js" \
  --before "$BEFORE_PNG" \
  --after "$AFTER_PNG" \
  --out "$DIFF_PNG" \
  2>/dev/null)

if [ -z "$DIFF_RESULT" ]; then
  DIFF_RESULT='{"diffPercent":0,"changedElements":[]}'
fi

# ── 보고서 생성 ──────────────────────────────────────────────────
REPORT_PATH="$OUT_DIR/report-$TIMESTAMP.md"
REPORT=$(node "$SCRIPT_DIR/report.js" \
  --diff-json "$DIFF_RESULT" \
  --file "$file_path" \
  --out "$REPORT_PATH" \
  2>/dev/null)

# ── 변경된 요소 요약 추출 ────────────────────────────────────────
CHANGED_SUMMARY=$(echo "$DIFF_RESULT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    pct = d.get('diffPercent', 0)
    elements = d.get('changedElements', [])
    lines = []
    lines.append(f'Pixel diff: {pct}%')
    for el in elements[:5]:
        sel = el.get('selector', '?')[:60]
        change = el.get('change', '?')
        desc = el.get('description', '')
        if desc:
            lines.append(f'- {desc}')
        elif change == 'added':
            after = el.get('after', {})
            lines.append(f'- {sel}: NEW at ({after.get(\"x\",0)},{after.get(\"y\",0)})')
        elif change == 'removed':
            lines.append(f'- {sel}: REMOVED')
    if not elements:
        lines.append('No element-level changes detected (pixel-only diff)')
    print('\n'.join(lines))
except Exception as e:
    print(f'Parse error: {e}')
" 2>/dev/null)

# ── Console 에러 요약 ────────────────────────────────────────────
CONSOLE_SUMMARY=$(cat "$OUT_DIR/after-$TIMESTAMP-console.json" 2>/dev/null | python3 -c "
import sys, json
try:
    errors = json.load(sys.stdin)
    if errors:
        print('Console errors (' + str(len(errors)) + '): ' + '; '.join(e.get('text','')[:60] for e in errors[:3]))
except:
    pass
" 2>/dev/null)

# ── additionalContext 생성 — Claude 컨텍스트에 자동 주입 ──────────
python3 -c "
import json

ctx = '''## UI Auto-Verify Result
File: \`$file_path\`
$CHANGED_SUMMARY
${CONSOLE_SUMMARY:+$CONSOLE_SUMMARY}

### Visual Diff Files
- Diff: \`$DIFF_PNG\`
- Before: \`$BEFORE_PNG\`
- After: \`$AFTER_PNG\`
- Report: \`$REPORT_PATH\`

**Action Required**: Read the diff image (\`$DIFF_PNG\`) to visually verify your change. If layout is broken or unintended side effects exist, fix immediately.'''

print(json.dumps({'additionalContext': ctx}))
"

# ── 정리: 오래된 캡처 파일 삭제 (10분 이상) ──────────────────────
find "$OUT_DIR" -name "*.png" -mmin +10 -delete 2>/dev/null
find "$OUT_DIR" -name "*.yaml" -mmin +10 -delete 2>/dev/null
find "$OUT_DIR" -name "*.json" -not -name ".current-*" -mmin +10 -delete 2>/dev/null
find "$OUT_DIR" -name "*.md" -mmin +10 -delete 2>/dev/null

exit 0
