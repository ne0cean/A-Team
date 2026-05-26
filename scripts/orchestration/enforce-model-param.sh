#!/bin/bash
# Enforce Model Parameter — PreToolUse Agent hook (추가)
#
# Agent 호출 시 model 파라미터가 없거나 "inherit"이면 DENY.
# 명시적으로 sonnet/haiku/opus 중 하나를 지정해야 통과.
#
# 예외:
#   - orchestrator (자체적으로 라우팅)
#   - judge (MoA 충돌 해소, Opus 필요)
#   - marp-writer, ppt-strategist (특수 에이전트)

INPUT=$(cat)
SUBTYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)
MODEL=$(echo "$INPUT" | jq -r '.tool_input.model // ""' 2>/dev/null)

# Exempt agent types that handle their own routing
case "$SUBTYPE" in
  orchestrator|judge|marp-writer|ppt-strategist)
    echo '{}'; exit 0
    ;;
esac

# If model is explicitly set and valid, pass through
case "$MODEL" in
  sonnet|haiku|opus)
    echo '{}'; exit 0
    ;;
esac

# Model not specified or "inherit" → DENY with instruction
REASON="Agent 호출에 model 파라미터 누락. 명시하세요: Explore/general-purpose→haiku, coder/researcher/reviewer→sonnet, architect/설계→opus"

jq -n --arg reason "$REASON" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
