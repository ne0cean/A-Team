#!/usr/bin/env bash
# session-event-logger.sh — Stop hook: log session end event to governance/events.jsonl
#
# 설치: ~/.claude/settings.json hooks[].stop 에 등록
# 입력: stdin으로 Claude stop JSON 수신
# 동작: governance/events.jsonl이 있는 프로젝트에서만 session_end 기록

INPUT=$(cat)

# CWD 추출 (Claude stop hook JSON에 cwd 포함)
CWD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('cwd', ''))
except Exception:
    pass
" 2>/dev/null)

# CWD 없으면 현재 디렉토리 사용
if [ -z "$CWD" ]; then
    CWD="$(pwd)"
fi

EVENTS_FILE="$CWD/governance/events.jsonl"

# governance/events.jsonl 없으면 skip (이 레포에서만 동작)
if [ ! -f "$EVENTS_FILE" ]; then
    exit 0
fi

SCRIPT="$CWD/scripts/log-session-event.mjs"

if [ ! -f "$SCRIPT" ]; then
    exit 0
fi

# session_end 이벤트 기록
node "$SCRIPT" observation observation=session_end details="claude_stop_hook" 2>/dev/null || true

exit 0
