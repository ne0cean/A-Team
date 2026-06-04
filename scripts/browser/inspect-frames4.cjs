const { chromium } = require('./node_modules/playwright');

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

  // 하단으로 완전 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ui-inspect/09-bottom-scroll.png' });

  // 전체 페이지 높이 확인
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('Total page height:', height);

  // framesPanel 텍스트 내용 (display name만)
  const frameNames = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    const titles = [...panel.querySelectorAll('.frame-section-title, .frame-cat-header, .frame-item')];
    return titles.map(t => t.innerText?.trim()).filter(Boolean);
  });
  console.log('Frame items:', JSON.stringify(frameNames));

  await browser.close();
})();
