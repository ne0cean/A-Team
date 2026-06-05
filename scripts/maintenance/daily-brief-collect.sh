#!/bin/bash
cd ~/Projects/a-team || exit 1

TODAY=$(date +%Y-%m-%d)
mkdir -p .context/briefs

# 이미 오늘 collect.json 있으면 스킵
if [ -f ".context/briefs/${TODAY}-collect.json" ]; then
  echo "daily-brief-collect: already done today (${TODAY})"
  exit 0
fi

echo "daily-brief-collect: running collect..."
node scripts/daily-brief-collect.mjs --save &&   echo "daily-brief-collect: done" ||   echo "daily-brief-collect: FAILED"
