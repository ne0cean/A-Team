#!/bin/bash
# Orchestration Learnings Logger
#
# Called by hooks to log orchestration decisions for analysis.
# Appends to .context/orchestration-learnings.jsonl
#
# Usage:
#   orchestration-learnings.sh <event> <key=value>...
#   orchestration-learnings.sh preempt_success subtype=Explore term=detectDesignSmells
#   orchestration-learnings.sh preempt_fail reason=no_context
#   orchestration-learnings.sh passthrough subtype=researcher reason=needs_web

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$REPO_ROOT/.context/orchestration-learnings.jsonl"

EVENT="${1:-unknown}"
shift || true

# Build JSON from key=value pairs
JSON="{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"$EVENT\""
for KV in "$@"; do
  KEY="${KV%%=*}"
  VAL="${KV#*=}"
  JSON="$JSON,\"$KEY\":\"$VAL\""
done
JSON="$JSON}"

echo "$JSON" >> "$LOG_FILE"
