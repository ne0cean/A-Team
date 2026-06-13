#!/bin/bash
# research-tg.sh — Cortex Research Gateway 텔레그램 surface launchd 래퍼
# set -e 금지(crash-loop 레슨). TELEGRAM_BOT_TOKEN 없으면 봇이 exit 2 → KeepAlive 전에
# 토큰 설정 필수(.env). 토큰 없는 상태로 load 금지.
set -uo pipefail

cd /Users/noir/Projects/a-team || exit 1
export PATH="/Users/noir/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

exec npx tsx scripts/research/telegram-bot.mjs
