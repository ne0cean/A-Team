const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1200 });  // 더 큰 뷰포트
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Day Frames (Admin) 패널 헤더 클릭
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  // 패널 헤더 클릭 (panel-header 클릭)
  const headers = await page.evaluate(() => {
    return [...document.querySelectorAll('.panel-header')].map(h => ({
      text: h.innerText?.trim(),
      rect: h.getBoundingClientRect()
    }));
  });
  console.log('Panel headers:', JSON.stringify(headers));

  // Day Frames 패널 헤더 클릭
  const dayFramesHeader = await page.evaluate(() => {
    const headers = [...document.querySelectorAll('.panel-header')];
    const target = headers.find(h => h.innerText?.includes('Day Frames'));
    if (target) {
      target.click();
      return { clicked: true, text: target.innerText };
    }
    return { clicked: false };
  });
  console.log('Clicked:', dayFramesHeader);
  await page.waitForTimeout(600);

  // 스크롤해서 패널 보이게
  await page.evaluate(() => {
    document.getElementById('framesPanel')?.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);

  const panelState = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    return { cls: panel?.className, rect: panel?.getBoundingClientRect() };
  });
  console.log('Panel state after click:', JSON.stringify(panelState));

  await page.screenshot({ path: '/tmp/ui-inspect/11-frames-open.png' });

  await browser.close();
})();
