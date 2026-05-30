#!/bin/bash
# Cortex Dashboard deploy — always targets 'cortex' worker
set -e
cd "$(dirname "$0")"
echo "Building..."
cd app && npm run build && cd ..
echo "Deploying to 'cortex' worker..."
cd worker && npx wrangler deploy --name cortex
echo "Verifying..."
curl -sf "https://cortex.feat-breeze.workers.dev/sw.js" > /dev/null && echo "OK: sw.js served" || echo "FAIL: sw.js not found"
curl -sf "https://cortex.feat-breeze.workers.dev/api/month?ym=2026-06" > /dev/null && echo "OK: API working" || echo "FAIL: API broken"
