#!/bin/bash
# loop-closer.sh — launchd 일일 자율 학습 루프 실행 래퍼
# set -e 금지 (launchd crash-loop 레슨: 에러 시 데몬 전체 종료 방지)
set -uo pipefail

cd /Users/noir/Projects/a-team || exit 0

# nvm node 경로 (plist EnvironmentVariables PATH로도 주입되지만 명시적 fallback)
NODE_BIN="/Users/noir/.nvm/versions/node/v24.13.0/bin"
export PATH="${NODE_BIN}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# npx tsx로 실행 (.ts import). 실패해도 exit 0 (loop-closer.mjs 자체도 exit 0 보장)
npx tsx scripts/loop-closer.mjs --trigger=daily 2>&1 || true

exit 0
