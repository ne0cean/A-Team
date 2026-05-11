#!/bin/bash
# Orchestration v2: PostToolUse Read Summary Injection
#
# After Claude reads a large file (>50 lines), automatically sends
# first 40 lines to Groq 8B for a 1-sentence summary.
# Injects summary as additionalContext — helps Claude process faster.
#
# Mechanism (verified 2026-05-11):
#   - PostToolUse hookSpecificOutput.additionalContext → model context
#
# Cost: $0 (Groq free tier, 8B model for speed)
# Latency: ~200-400ms (async, non-blocking to user)

set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
GROQ_API_KEY="${GROQ_API_KEY:-}"

# Skip conditions
[ -z "$GROQ_API_KEY" ] && { echo '{}'; exit 0; }
[ -z "$FILE" ] && { echo '{}'; exit 0; }
[ ! -f "$FILE" ] && { echo '{}'; exit 0; }

# Only for large files
LINES=$(wc -l < "$FILE" 2>/dev/null || echo 0)
[ "$LINES" -lt 50 ] && { echo '{}'; exit 0; }

# Skip binary/generated files
case "$FILE" in
  *.png|*.jpg|*.gif|*.ico|*.woff*|*.ttf|*.lock|*.map) echo '{}'; exit 0 ;;
  */node_modules/*|*/coverage/*|*/.git/*) echo '{}'; exit 0 ;;
esac

# Get first 40 lines for summary
CONTENT=$(head -40 "$FILE")

SUMMARY=$(curl -s -m 3 https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "Summarize this file in 1 sentence (be specific about what it does):\n$CONTENT" \
    '{model:"llama-3.1-8b-instant",messages:[{role:"user",content:$p}],max_tokens:60}')" \
  | jq -r '.choices[0].message.content // ""' 2>/dev/null)

[ -z "$SUMMARY" ] && { echo '{}'; exit 0; }

jq -n --arg ctx "Quick summary ($LINES lines): $SUMMARY" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
