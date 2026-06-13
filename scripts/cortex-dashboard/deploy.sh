#!/usr/bin/env bash
# deploy.sh — Cortex Worker 배포 + 데이터 무결성 검증
# Usage: bash scripts/cortex-dashboard/deploy.sh [--skip-verify]

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_VERIFY="${1:-}"

echo "━━━ CORTEX DEPLOY ━━━"

# 0. Regenerate browser carry.js from the tested worker source (single source of truth).
#    worker/src/carry.js is the ESM tested file; public/js/carry.js is the classic-script copy.
echo "// AUTO-GENERATED from worker/src/carry.js — do not edit directly. Regenerate via deploy.sh." > "$SCRIPT_DIR/public/js/carry.js"
sed 's/^export function/function/' "$SCRIPT_DIR/worker/src/carry.js" >> "$SCRIPT_DIR/public/js/carry.js"
echo "✓ public/js/carry.js regenerated"

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
