#!/bin/bash
# Orchestration v2: UserPromptSubmit pre-answer
# Fires when user sends a message. If it's a file/code question,
# pre-computes answer via Groq and injects as additionalContext.
#
# This means Claude gets the answer BEFORE it even starts thinking,
# potentially avoiding Agent calls entirely.

INPUT=$(cat)
MSG=$(echo "$INPUT" | jq -r '.message // .content // ""' 2>/dev/null)

LOG="/tmp/orchestration-userprompt.log"
GROQ_API_KEY="${GROQ_API_KEY:-}"

echo "$(date +%H:%M:%S) FIRE msg=$(echo $MSG | head -c 60)" >> "$LOG"

# No API key or empty message → pass
[ -z "$GROQ_API_KEY" ] && { echo '{}'; exit 0; }
[ -z "$MSG" ] && { echo '{}'; exit 0; }

# Only for questions about code/files (not every message)
IS_QUESTION=false
echo "$MSG" | grep -qE '[?？]' && IS_QUESTION=true
echo "$MSG" | grep -qiE 'what|how|which|explain|summarize|where|count|list|몇|뭐|어떤|설명|요약|찾아|어디' && IS_QUESTION=true

if ! $IS_QUESTION; then
  echo '{}'; exit 0
fi

# Must reference files/code/directories
HAS_CODE_REF=false
echo "$MSG" | grep -qE '[a-zA-Z0-9_/-]+\.(ts|js|mjs|md|json|sh|py|tsx|css|yaml)' && HAS_CODE_REF=true
echo "$MSG" | grep -qE 'scripts/|lib/|test/|\.claude/|governance/' && HAS_CODE_REF=true
echo "$MSG" | grep -qE '[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*|[a-z]+[A-Z][a-zA-Z]+' && HAS_CODE_REF=true

if ! $HAS_CODE_REF; then
  echo '{}'; exit 0
fi

# Skip Korean generation requests
echo "$MSG" | grep -qE '[가-힣].*(작성|생성|만들|써줘)' && { echo '{}'; exit 0; }

# Gather context (same logic as preempt-agent.sh)
REPO_ROOT="/Users/noir/Projects/a-team"
cd "$REPO_ROOT" 2>/dev/null || { echo '{}'; exit 0; }

CONTEXT=""

# Extract file paths
FILES=$(echo "$MSG" | grep -oE '[a-zA-Z0-9_./-]+\.(mjs|ts|js|md|json|sh|yaml|tsx|css|py)' | head -3)
for F in $FILES; do
  [ -f "$F" ] && CONTEXT="${CONTEXT}=== $F ===\n$(head -40 "$F")\n\n"
done

# Extract search terms
TERM=$(echo "$MSG" | grep -oE '[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*|[a-z]+[A-Z][a-zA-Z]+' | head -1)
if [ -n "$TERM" ]; then
  HITS=$(grep -r --include="*.ts" --include="*.mjs" --include="*.js" -l "$TERM" . 2>/dev/null | grep -v node_modules | head -10)
  [ -n "$HITS" ] && CONTEXT="${CONTEXT}=== grep $TERM ===\n$HITS\n"
fi

# Extract directories
DIRS=$(echo "$MSG" | grep -oE 'scripts/[a-zA-Z0-9/_.-]*|lib/[a-zA-Z0-9/_.-]*|test/[a-zA-Z0-9/_.-]*' | head -2)
for D in $DIRS; do
  [ -d "$D" ] && CONTEXT="${CONTEXT}=== $D/ ===\n$(ls "$D" 2>/dev/null)\n\n"
done

[ -z "$CONTEXT" ] && { echo '{}'; exit 0; }
CONTEXT=$(echo -e "$CONTEXT" | head -c 2000)

# Call Groq
ANSWER=$(curl -s -m 3 https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "Context:\n$CONTEXT\n\nAnswer concisely: $MSG" \
    '{model:"llama-3.1-8b-instant",messages:[{role:"user",content:$p}],max_tokens:200}')" \
  | jq -r '.choices[0].message.content // ""' 2>/dev/null)

[ -z "$ANSWER" ] && { echo '{}'; exit 0; }

# Confidence check
echo "$ANSWER" | grep -qiE "I don't know|cannot|not sure|don't have" && { echo '{}'; exit 0; }

echo "$(date +%H:%M:%S) ANSWERED" >> "$LOG"

jq -n --arg ctx "Pre-computed (Groq, free): $ANSWER" \
  '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$ctx}}'
