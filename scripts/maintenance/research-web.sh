#!/bin/bash
# research-web.sh — Cortex Research Gateway 브라우저 surface launchd 래퍼
# set -e 금지(launchd crash-loop 레슨). 서버라 KeepAlive로 상시 가동.
set -uo pipefail

cd /Users/noir/Projects/a-team || exit 1
export PATH="/Users/noir/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export PORT="${PORT:-4010}"

exec npx tsx scripts/research/web-server.mjs
