#!/usr/bin/env bash
# post-bash-diagnostic.sh — Bash 실패 시 관련 진단 플레이북 자동 서페이싱
# PostToolUse:Bash 훅으로 설치됨 (~/.claude/settings.json)

DIAG_DIR="$HOME/Projects/a-team/governance/diagnostics"

# stdin에서 tool result JSON 읽기
INPUT=$(cat)

# 에러 텍스트 추출
ERROR_TEXT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    r = d.get('tool_response', {})
    if isinstance(r, dict):
        out = str(r.get('output', '')) + str(r.get('error', '') or '')
        if any(k in out for k in ['Error', 'error', 'FAILED', 'failed', 'Timeout', 'timeout']):
            print(out[:3000])
except Exception:
    pass
" 2>/dev/null)

[ -z "$ERROR_TEXT" ] && exit 0

# 패턴 → 진단 파일 매핑
if echo "$ERROR_TEXT" | grep -qiE "timeout|TimeoutError|playwright|ariaSnapshot|page\.|chromium|browser automation|networkidle"; then
    echo ""
    echo "==> 진단 플레이북: browser-automation-failures.md"
    echo "    경로: $DIAG_DIR/browser-automation-failures.md"
    echo "    섹션: [A] timeout  [B] ARIA 빈값  [C] 빈 페이지  [D] 에이전트 의존성  [E] --url 무시"
elif echo "$ERROR_TEXT" | grep -qiE "HTTP 500|status 500|status.*405|405 Method|ASSETS\.fetch|D1_ERROR|wrangler.*error|Worker.*error|cloudflare.*error"; then
    echo ""
    echo "==> 진단 플레이북: cloudflare-worker-errors.md"
    echo "    경로: $DIAG_DIR/cloudflare-worker-errors.md"
    echo "    섹션: [A] 500  [B] 404 미반환  [C] D1 실패  [D] 수정 미반영  [E] CORS"
fi

exit 0
