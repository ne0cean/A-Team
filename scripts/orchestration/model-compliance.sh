#!/bin/bash
# Orchestration v2: SubagentStop Model Compliance Audit
#
# Audits completed subagent calls for model parameter compliance.
# Logs violations (model=inherit) to /tmp/model-usage.jsonl.
# Non-blocking — always exits 0 (audit only, no deny).
#
# Hook event: SubagentStop
# Violation: model not explicitly set (defaults to main session model = Opus)
#
# Usage (settings.json):
#   "SubagentStop": [{"hooks": [{"type":"command","command":".../model-compliance.sh"}]}]

set -uo pipefail

INPUT=$(cat)
LOG="/tmp/model-usage.jsonl"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Extract fields
SUBTYPE=$(echo "$INPUT" | jq -r '.subagent_type // "unknown"' 2>/dev/null)
MODEL=$(echo "$INPUT" | jq -r '.model // "inherit"' 2>/dev/null)
DESCRIPTION=$(echo "$INPUT" | jq -r '.description // ""' 2>/dev/null | head -c 100)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)

# Determine compliance
COMPLIANT=true
VIOLATION=""

if [[ "$MODEL" == "inherit" || -z "$MODEL" || "$MODEL" == "null" ]]; then
  COMPLIANT=false
  VIOLATION="model_not_specified"
fi

# Log to /tmp/model-usage.jsonl
echo "{\"ts\":\"$TS\",\"event\":\"subagent_stop\",\"subtype\":\"$SUBTYPE\",\"model\":\"$MODEL\",\"compliant\":$COMPLIANT,\"violation\":\"$VIOLATION\",\"desc\":\"$DESCRIPTION\",\"session\":\"$SESSION_ID\"}" >> "$LOG"

# If violation, also append to a-team analytics
ANALYTICS="$HOME/Projects/a-team/.context/analytics.jsonl"
if [[ "$COMPLIANT" == "false" && -f "$ANALYTICS" ]]; then
  echo "{\"event\":\"model_violation\",\"ts\":\"$TS\",\"subtype\":\"$SUBTYPE\",\"violation\":\"$VIOLATION\",\"desc\":\"$DESCRIPTION\"}" >> "$ANALYTICS"
fi

# Weekly violation summary (if 10+ violations in log)
VIOLATION_COUNT=$(grep -c '"compliant":false' "$LOG" 2>/dev/null || echo 0)
if [[ "$VIOLATION_COUNT" -gt 0 && $(( VIOLATION_COUNT % 10 )) -eq 0 ]]; then
  echo "$(date +%H:%M:%S) model-compliance: $VIOLATION_COUNT total violations logged" >> /tmp/model-compliance-summary.log
fi

exit 0
