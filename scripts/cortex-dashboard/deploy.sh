#!/bin/bash
# Cortex Dashboard deploy — always from worker/ dir with correct wrangler.toml
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Building..."
cd "$DIR/app" && npm run build
echo "Deploying 'cortex' worker..."
cd "$DIR/worker" && npx wrangler deploy
echo "Verifying..."
sleep 2
curl -sf "https://cortex.feat-breeze.workers.dev/api/month?ym=2026-06" > /dev/null && echo "OK: API" || echo "FAIL: API"
HTML=$(curl -s "https://cortex.feat-breeze.workers.dev/" | head -1)
echo "$HTML" | grep -q "doctype" && echo "OK: HTML" || echo "FAIL: HTML"
