const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 초기 상태: framesPanel이 open인지 확인
  const initialState = await page.evaluate(() => {
    return document.getElementById('framesPanel')?.className;
  });
  console.log('Initial state:', initialState);

  // Day Frames 헤더 클릭 (이미 open이면 닫히고, 닫혀있으면 열림)
  // 먼저 스크롤해서 보이게
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  // open 상태면 그냥 두고, 닫혀있으면 클릭
  const needClick = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    return !panel?.classList.contains('open');
  });
  
  if (needClick) {
    await page.evaluate(() => {
      const headers = [...document.querySelectorAll('.panel-header')];
      headers.find(h => h.innerText?.includes('Day Frames'))?.click();
    });
    await page.waitForTimeout(600);
  }

  const finalState = await page.evaluate(() => {
    return document.getElementById('framesPanel')?.className;
  });
  console.log('Final state:', finalState, '| needClick was:', needClick);

  // 패널로 스크롤
  await page.evaluate(() => {
    document.getElementById('framesPanel')?.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/ui-inspect/12-frames-correct.png' });

  await browser.close();
})();
