#!/bin/bash
# Model Compliance Auditor — SubagentStop hook
#
# 매 서브에이전트 종료 시 실행. 위반 패턴 감지 + 누적 기록.
# 5건 누적 시 additionalContext로 경고 주입.
#
# 위반 조건:
#   1. model=inherit 또는 미지정 (Explore/general-purpose/coder에서)
#   2. 단순 탐색(Explore)인데 Opus로 실행됨
#   3. 연속 5턴 이상 서브에이전트 없이 직접 작업

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // .subagent_type // "unknown"' 2>/dev/null)
MODEL=$(echo "$INPUT" | jq -r '.model // "inherit"' 2>/dev/null)

LOG="/tmp/model-compliance.jsonl"
VIOLATION_COUNT=$(wc -l < "$LOG" 2>/dev/null || echo 0)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Detect violations
VIOLATION=""

# Rule 1: Explore/general-purpose should be haiku or sonnet, not opus/inherit
case "$AGENT_TYPE" in
  Explore|general-purpose)
    if [ "$MODEL" = "inherit" ] || [ "$MODEL" = "opus" ] || [ -z "$MODEL" ]; then
      VIOLATION="agent=$AGENT_TYPE used model=$MODEL (should be haiku/sonnet)"
    fi
    ;;
  coder|researcher)
    if [ "$MODEL" = "inherit" ] || [ "$MODEL" = "opus" ]; then
      VIOLATION="agent=$AGENT_TYPE used model=$MODEL (should be sonnet)"
    fi
    ;;
esac

if [ -n "$VIOLATION" ]; then
  echo "{\"ts\":\"$NOW\",\"violation\":\"$VIOLATION\"}" >> "$LOG"
  VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
fi

# Every 5 violations: inject warning
if [ "$VIOLATION_COUNT" -ge 5 ] && [ $((VIOLATION_COUNT % 5)) -eq 0 ]; then
  jq -n --arg ctx "⚠️ MODEL COMPLIANCE: ${VIOLATION_COUNT}건 위반 누적. Agent 호출 시 model 파라미터를 명시하세요 (Explore→haiku, coder/researcher→sonnet, 설계만→opus). 'inherit' 사용 금지." \
    '{hookSpecificOutput:{additionalContext:$ctx}}'
  exit 0
fi

echo '{}'
