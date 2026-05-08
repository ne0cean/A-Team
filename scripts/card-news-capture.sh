#!/usr/bin/env bash
# card-news-capture.sh — HTML → PNG 변환 (Playwright)
set -e

OUTPUT_DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BROWSER_DIR="$SCRIPT_DIR/browser"

[ ! -d "$BROWSER_DIR/node_modules/playwright" ] && (cd "$BROWSER_DIR" && npm install playwright)

echo "📸 카드뉴스 캡처: $OUTPUT_DIR"

for i in $(seq -w 1 8); do
  HTML="$OUTPUT_DIR/slide-$i.html"
  PNG="$OUTPUT_DIR/slide-$i.png"
  [ ! -f "$HTML" ] && continue

  node -e "
    const { chromium } = require('$BROWSER_DIR/node_modules/playwright');
    (async () => {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
      await page.goto('file://' + require('path').resolve('$HTML'), { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: '$PNG', type: 'png' });
      await browser.close();
    })();
  " && echo "  ✅ slide-$i.png"
done

echo "✅ 캡처 완료"
