const { chromium } = require('./node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // day-type-badge 클릭해서 어떤 패널 열리는지
  // 먼저 Day 4의 badge 클릭
  const badge4 = await page.$('.day-type-badge');
  if (badge4) {
    const box = await badge4.boundingBox();
    console.log('Badge box:', JSON.stringify(box));
    await badge4.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: '/tmp/ui-inspect/05-badge-click.png' });
    console.log('Badge clicked');
  }

  // modal이나 popup 열렸는지 확인
  const modals = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.modal, .popup, .dialog, [class*="modal"], [class*="popup"], [class*="overlay"], [class*="dropdown"], [class*="frame-editor"], [id*="modal"], [id*="frame"]')];
    return els.filter(e => e.offsetParent !== null).map(e => ({
      tag: e.tagName,
      id: e.id,
      cls: e.className?.slice(0, 80),
      visible: true,
      text: e.innerText?.slice(0, 100)
    }));
  });
  console.log('Modals/popups:', JSON.stringify(modals, null, 2));

  // day-frame 관련 HTML 구조 확인
  const frameHTML = await page.evaluate(() => {
    const el = document.querySelector('[id*="frame"], [class*="frame-editor"], [class*="day-frame"]');
    return el ? el.outerHTML?.slice(0, 500) : 'NOT FOUND';
  });
  console.log('Frame HTML:', frameHTML);

  // JS 소스에서 frame editor 진입점 찾기 (app.js URL 체크)
  const scripts = await page.evaluate(() => {
    return [...document.scripts].map(s => s.src).filter(Boolean);
  });
  console.log('Scripts:', scripts);

  await browser.close();
})();
