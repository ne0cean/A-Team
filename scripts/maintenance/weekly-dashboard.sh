#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "📊 Running dashboard check..."

node scripts/dashboard.mjs > /tmp/dashboard-$(date +%Y-%m-%d).json

WARNINGS=$(jq -r '.modules[] | select(.health < 50) | .name' /tmp/dashboard-$(date +%Y-%m-%d).json)

if [[ -n "$WARNINGS" ]]; then
  echo "⚠️  Low health modules detected:"
  echo "$WARNINGS"
fi

echo "✅ Dashboard check complete"
