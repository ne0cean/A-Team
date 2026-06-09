#!/usr/bin/env bash
# deploy.sh — Cortex Worker 배포 + 데이터 무결성 검증
# Usage: bash scripts/cortex-dashboard/deploy.sh [--skip-verify]

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_VERIFY="${1:-}"

echo "━━━ CORTEX DEPLOY ━━━"

# 1. Deploy Worker
cd "$SCRIPT_DIR/worker"
npx wrangler deploy --config wrangler.toml
cd "$SCRIPT_DIR"

echo ""

if [ "$SKIP_VERIFY" = "--skip-verify" ]; then
  echo "verify 스킵 (--skip-verify)"
  exit 0
fi

# 2. Data integrity check
echo "━━━ VERIFY DATA ━━━"
node "$SCRIPT_DIR/verify-data.mjs"
