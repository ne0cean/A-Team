const { chromium } = require('./node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // badge 클릭
  const badge = await page.$('.day-type-badge');
  if (badge) await badge.click();
  await page.waitForTimeout(800);

  // framesPanel 위치 확인
  const panelInfo = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (!panel) return { found: false };
    const rect = panel.getBoundingClientRect();
    const style = window.getComputedStyle(panel);
    return {
      found: true,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      position: style.position,
      overflow: style.overflow,
      zIndex: style.zIndex,
      classList: panel.className,
      innerHTML: panel.innerHTML?.slice(0, 800)
    };
  });
  console.log('Panel info:', JSON.stringify(panelInfo, null, 2));

  // 전체 페이지 스크린샷
  await page.screenshot({ path: '/tmp/ui-inspect/06-fullpage.png', fullPage: true });

  // framesPanel로 스크롤
  await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (panel) panel.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ui-inspect/07-panel-scrolled.png' });

  await browser.close();
})();
