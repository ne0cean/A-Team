#!/usr/bin/env bash
# RFC-007 Spotlighting — PreToolUse hook
# WebFetch/WebSearch/RAG 같은 무신뢰 tool의 결과를 spotlight 처리 준비
# Opt-in: A_TEAM_SPOTLIGHT env (default=0)
# 실제 content 변환은 agent system prompt에 spotlight module 사용 지시로 위임
# 이 hook은 logging + env flag 활성 여부 보고만 수행 (안전한 observational)

set -eu

# Opt-in 체크
if [ "${A_TEAM_SPOTLIGHT:-0}" = "0" ] || [ "${A_TEAM_SPOTLIGHT:-0}" = "false" ]; then
  exit 0  # 미활성 → pass through
fi

# JSON input에서 tool_name 추출
input=$(cat)
tool_name=""
if command -v python3 &>/dev/null; then
  tool_name=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_name', ''))
except:
    print('')
" 2>/dev/null || echo "")
fi

# 무신뢰 tool 리스트 (scripts/spotlight.mjs isUntrustedTool과 일치)
UNTRUSTED_TOOLS="WebFetch WebSearch RAG mcp__fetch"

# 로그 파일
LOG_DIR="${HOME}/.a-team/spotlight"
mkdir -p "$LOG_DIR" 2>/dev/null || true
LOG_FILE="$LOG_DIR/hook.log"

IS_UNTRUSTED=0
for t in $UNTRUSTED_TOOLS; do
  if [ "$tool_name" = "$t" ]; then
    IS_UNTRUSTED=1
    break
  fi
done

if [ "$IS_UNTRUSTED" = "1" ]; then
  echo "[$(date -Iseconds)] spotlight-active tool=$tool_name mode=${A_TEAM_SPOTLIGHT}" >> "$LOG_FILE"
  # Hook은 차단하지 않음 (observational).
  # 실제 content wrapping은 subagent system prompt에 "scripts/spotlight.mjs 사용 지시"로 위임.
fi

exit 0
