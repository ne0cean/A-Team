const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // badge 클릭으로 패널 열기
  const badge = await page.$('.day-type-badge');
  if (badge) await badge.click();
  await page.waitForTimeout(800);

  // framesPanel 하단까지 스크롤
  await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    window.scrollBy(0, 200);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ui-inspect/08-frames-panel.png' });

  // 패널 내부 구조 상세 확인
  const panelContent = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (!panel) return 'NOT FOUND';
    // frame-section들 파악
    const sections = [...panel.querySelectorAll('.frame-section')].map(sec => ({
      type: sec.className,
      title: sec.querySelector('.frame-section-title')?.innerText,
      cats: [...sec.querySelectorAll('.frame-cat')].map(cat => ({
        catType: cat.dataset.cat,
        ftype: cat.dataset.ftype,
        items: [...cat.querySelectorAll('.frame-item, .frame-add')].map(i => i.innerText?.trim().slice(0, 40))
      }))
    }));
    return sections;
  });
  console.log('Panel sections:', JSON.stringify(panelContent, null, 2));

  await browser.close();
})();
