#!/usr/bin/env bash
# install.sh — Install Playwright and dependencies for UI inspection
# Run once per machine. Safe to re-run.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== UI Inspector Setup ==="

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install Node.js 18+ first."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi

echo "[1/3] Installing Playwright..."
cd "$SCRIPT_DIR"

# Create package.json if needed
if [ ! -f package.json ]; then
  cat > package.json << 'EOF'
{
  "name": "a-team-browser-scripts",
  "version": "1.0.0",
  "private": true,
  "description": "Token-efficient browser automation for A-Team UI inspection",
  "dependencies": {
    "playwright": "^1.50.0",
    "pngjs": "^7.0.0"
  }
}
EOF
fi

npm install --no-audit --no-fund 2>/dev/null

echo "[2/3] Installing Chromium browser..."
npx playwright install chromium 2>/dev/null

echo "[3/3] Verifying installation..."
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('data:text/html,<h1>OK</h1>');
  const t = await p.textContent('h1');
  console.log('Browser test: ' + (t === 'OK' ? 'PASS' : 'FAIL'));
  await b.close();
})();
"

echo ""
echo "=== Setup Complete ==="
echo "Usage:"
echo "  node $SCRIPT_DIR/snapshot.js --url http://localhost:3000"
echo "  node $SCRIPT_DIR/diff.js --before a.png --after b.png --out diff.png"
echo ""
echo "Hook integration:"
echo "  Copy templates/hooks/pre-ui-capture.sh  -> .claude/hooks/"
echo "  Copy templates/hooks/post-ui-verify.sh  -> .claude/hooks/"
echo "  Update .claude/settings.json with hook registration"
