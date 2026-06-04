const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 페이지 최하단 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  // "Day Frames (Admin)" 헤더 주변 DOM 확인
  const headerInfo = await page.evaluate(() => {
    // 텍스트로 요소 찾기
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    const results = [];
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.innerText?.includes('Day Frames')) {
        results.push({
          tag: el.tagName,
          id: el.id,
          cls: el.className,
          text: el.innerText?.trim().slice(0, 80),
          rect: el.getBoundingClientRect()
        });
      }
    }
    return results;
  });
  console.log('Day Frames elements:', JSON.stringify(headerInfo, null, 2));

  // framesPanelToggle 클릭 (이미 open인데 화면에 안 보임 - 다시 toggle)
  const toggleInfo = await page.evaluate(() => {
    const toggle = document.getElementById('framesPanelToggle');
    const panel = document.getElementById('framesPanel');
    return {
      toggleRect: toggle?.getBoundingClientRect(),
      panelRect: panel?.getBoundingClientRect(),
      panelClass: panel?.className,
      scrollY: window.scrollY
    };
  });
  console.log('Toggle/Panel info:', JSON.stringify(toggleInfo, null, 2));

  // framesPanelToggle 클릭
  await page.click('#framesPanelToggle');
  await page.waitForTimeout(500);
  
  // 스크롤해서 패널 보이게
  await page.evaluate(() => {
    document.getElementById('framesPanel')?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/ui-inspect/10-frames-panel-visible.png' });

  await browser.close();
})();
