#!/bin/bash
# Orchestration v2: PreToolUse Agent Preemption
#
# Intercepts Agent tool calls. For simple tasks (search/summarize/list),
# gathers local context via bash + sends to Groq for free/fast answer.
# Blocks Agent and injects answer via permissionDecision:deny.
#
# Complex tasks pass through to Agent unchanged.
#
# Mechanism (verified 2026-05-11):
#   - hookSpecificOutput.permissionDecision: "deny" → blocks Agent
#   - hookSpecificOutput.additionalContext → injects into model context
#   - hookSpecificOutput.permissionDecisionReason → also injected
#
# Known limitations:
#   - Korean generation fails on Groq (mixed CJK scripts)
#   - Groq has no web access (researcher agents pass through)
#   - 5s timeout: complex multi-file analysis may not complete
#   - Groq may give wrong answers (confidence check mitigates)

set -uo pipefail
# Note: no -e because grep returns exit 1 when no match, which is expected

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""' 2>/dev/null)
SUBTYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)

GROQ_API_KEY="${GROQ_API_KEY:-}"
LOG="/tmp/orchestration-preempt.log"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Passthrough rules (never intercept) ---

# No API key → pass through
[ -z "$GROQ_API_KEY" ] && { echo '{}'; exit 0; }

# Only intercept Explore and general-purpose agents
case "$SUBTYPE" in
  Explore|general-purpose|"") ;;
  *) echo '{}'; exit 0 ;;
esac

# Skip if prompt contains Korean generation intent (Groq can't generate Korean)
if echo "$PROMPT" | grep -qE '[가-힣].*(작성|생성|만들|써줘|캡션|카피)'; then
  echo '{}'; exit 0
fi

# Skip complex tasks (architecture, refactoring, multi-step)
if echo "$PROMPT" | grep -qiE 'refactor|architect|design|plan|implement|create|build|write code|fix bug|debug|deploy|migration'; then
  echo '{}'; exit 0
fi

# --- Context gathering ---

cd "$REPO_ROOT" 2>/dev/null || cd "$(pwd)"

CONTEXT=""

# Strategy 1: Extract search terms and grep
SEARCH_TERM=""
# Quoted strings
SEARCH_TERM=$(echo "$PROMPT" | grep -oE "'[^']+'" | head -1 | tr -d "'")
# Double-quoted
[ -z "$SEARCH_TERM" ] && SEARCH_TERM=$(echo "$PROMPT" | grep -oE '"[^"]+"' | head -1 | tr -d '"')
# CamelCase identifiers
[ -z "$SEARCH_TERM" ] && SEARCH_TERM=$(echo "$PROMPT" | grep -oE '[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*|[a-z]+[A-Z][a-zA-Z]+' | head -1)
# snake_case identifiers
[ -z "$SEARCH_TERM" ] && SEARCH_TERM=$(echo "$PROMPT" | grep -oE '[a-z]+_[a-z_]+' | head -1)

if [ -n "$SEARCH_TERM" ] && echo "$PROMPT" | grep -qiE 'find|search|grep|import|where|which|who|what.*use|how.*use|contain'; then
  GREP_RESULT=$(grep -r --include="*.ts" --include="*.mjs" --include="*.js" --include="*.md" --include="*.json" \
    -l "$SEARCH_TERM" . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v coverage | head -15)
  if [ -n "$GREP_RESULT" ]; then
    CONTEXT="Files containing '$SEARCH_TERM':\n$GREP_RESULT\n\n"
    for GF in $(echo "$GREP_RESULT" | head -5); do
      MATCH_LINES=$(grep -n "$SEARCH_TERM" "$GF" 2>/dev/null | head -5)
      CONTEXT="${CONTEXT}${GF}:\n${MATCH_LINES}\n\n"
    done
  fi
fi

# Strategy 2: Read specific files mentioned in prompt
FILES=$(echo "$PROMPT" | grep -oE '[a-zA-Z0-9_./-]+\.(mjs|ts|js|md|json|sh|yaml|tsx|css|py)' | head -5)
for F in $FILES; do
  if [ -f "$F" ]; then
    LINES=$(wc -l < "$F")
    CONTEXT="${CONTEXT}=== $F (${LINES}L) ===\n$(head -60 "$F")\n\n"
  fi
done

# Strategy 3: Directory listings
DIRS=$(echo "$PROMPT" | grep -oE 'scripts/[a-zA-Z0-9/_.-]*|lib/[a-zA-Z0-9/_.-]*|test/[a-zA-Z0-9/_.-]*|\.claude/[a-zA-Z0-9/_.-]*|governance/[a-zA-Z0-9/_.-]*' | head -3)
for D in $DIRS; do
  [ -d "$D" ] && CONTEXT="${CONTEXT}=== $D/ ($(ls "$D" 2>/dev/null | wc -l | tr -d ' ') files) ===\n$(ls "$D" 2>/dev/null | head -50)\n\n"
done

# No context gathered → pass through
if [ -z "$CONTEXT" ]; then
  echo '{}'; exit 0
fi

# Truncate to 3000 chars for speed
CONTEXT=$(echo -e "$CONTEXT" | head -c 3000)

# --- Groq call ---

GROQ_RESULT=$(curl -s -m 4 https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "Codebase context:\n$CONTEXT\n\nAnswer concisely and accurately: $PROMPT" \
    '{model:"llama-3.3-70b-versatile",messages:[{role:"user",content:$p}],max_tokens:500}')" \
  | jq -r '.choices[0].message.content // ""' 2>/dev/null)

# Groq failed → pass through
[ -z "$GROQ_RESULT" ] && { echo '{}'; exit 0; }

# --- Confidence check ---

if echo "$GROQ_RESULT" | grep -qiE "I don't know|cannot determine|not enough|cannot find|I'm not sure|I don't have access|unable to"; then
  echo "$(date +%H:%M:%S) PASS subtype=$SUBTYPE (low confidence)" >> "$LOG"
  echo '{}'; exit 0
fi

# --- Success: block Agent, provide answer ---

echo "$(date +%H:%M:%S) DENY subtype=$SUBTYPE term=$SEARCH_TERM" >> "$LOG"

jq -n --arg reason "Pre-computed (Groq 70B, free): $GROQ_RESULT" \
      --arg ctx "Answer pre-computed by Groq 70B with local codebase context (zero cost). Use directly if sufficient: $GROQ_RESULT" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason,additionalContext:$ctx}}'
