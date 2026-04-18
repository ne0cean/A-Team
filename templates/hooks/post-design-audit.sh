#!/usr/bin/env bash
# post-design-audit.sh — PostToolUse hook: UI 파일 수정 후 자동 디자인 감사
# Edit|Write 도구 실행 후 자동 트리거
# Exit 0 + additionalContext JSON = Claude 컨텍스트에 위반 결과 주입
#
# 설치: cp templates/hooks/post-design-audit.sh .claude/hooks/
#       + .claude/settings.json PostToolUse 훅에 등록 (templates/settings.json 참고)
# 또는: bash scripts/install-design-hook.sh

input=$(cat)

# JSON 에서 file_path 추출
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
case "$file_path" in
  *.tsx|*.jsx|*.css|*.scss|*.html|*.styled.ts|*.styled.tsx) ;;
  *) exit 0 ;;
esac

case "$file_path" in
  *.test.*|*.spec.*|*.d.ts|*node_modules*|*.stories.*) exit 0 ;;
esac

# ── 환경 변수 ────────────────────────────────────────────────────
DESIGN_AUDIT_ENABLED="${DESIGN_AUDIT_ENABLED:-true}"
DESIGN_AUDIT_GATE="${DESIGN_AUDIT_GATE:-default}"

[ "$DESIGN_AUDIT_ENABLED" = "false" ] && exit 0

# ── A-Team 루트 + 스크립트 탐색 ──────────────────────────────────
SCRIPT=""
SEARCH_PATHS=(
  "$(pwd)/scripts/audit-design.mjs"
  "$(pwd)/A-Team/scripts/audit-design.mjs"
  "$HOME/Projects/a-team/scripts/audit-design.mjs"
)
for p in "${SEARCH_PATHS[@]}"; do
  if [ -f "$p" ]; then
    SCRIPT="$p"
    break
  fi
done

[ -z "$SCRIPT" ] && exit 0

# ── opt-out 체크 (.design-override.md design: off) ───────────────
OVERRIDE="$(pwd)/.design-override.md"
if [ -f "$OVERRIDE" ] && grep -qE '^design:\s*off' "$OVERRIDE" 2>/dev/null; then
  exit 0
fi

# ── 감사 실행 ───────────────────────────────────────────────────
AUDIT_JSON=$(npx --yes tsx "$SCRIPT" "$file_path" --gate="$DESIGN_AUDIT_GATE" 2>/dev/null)
EXIT_CODE=$?

# 감사 자체 실패 (파일 없음, 스크립트 오류) — 조용히 스킵
[ -z "$AUDIT_JSON" ] && exit 0

# ── 결과 요약 추출 ──────────────────────────────────────────────
SUMMARY=$(echo "$AUDIT_JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    f = d['files'][0]
    score = f['score']
    passed = f['passed']
    a11y = f['summary']['a11y']
    ai_slop = f['summary']['ai_slop']
    total = len(f['violations'])
    status = 'PASS' if passed else 'FAIL'
    summary_line = f'{status} score={score} a11y={a11y} ai_slop={ai_slop} total={total}'
    print(summary_line)
    print('---')
    for v in f['violations'][:5]:
        print(f\"  [{v['rule']}] {v['severity']} L{v['line']}: {v['match'][:60]} → {v['fix'][:80]}\")
    if total > 5:
        print(f'  ... +{total-5} more')
except Exception as e:
    print(f'parse error: {e}')
" 2>/dev/null)

# 위반 0 + pass — 알림 불필요 (조용히 통과)
if [ $EXIT_CODE -eq 0 ] && echo "$SUMMARY" | grep -q "total=0"; then
  exit 0
fi

# ── additionalContext 생성 ───────────────────────────────────────
python3 -c "
import json
ctx = '''## Design Audit Result
File: \`$file_path\`
Gate: \`$DESIGN_AUDIT_GATE\`

\`\`\`
$SUMMARY
\`\`\`

자동 감사 (scripts/audit-design.mjs). FAIL 시 위반 우선순위대로 즉시 수정.
끄려면: \`DESIGN_AUDIT_ENABLED=false\` 또는 \`.design-override.md\` 에 \`design: off\`'''
print(json.dumps({'additionalContext': ctx}))
"

exit 0
