const { chromium } = require('./node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Step 1: Day 4 클릭 (day-num 텍스트 4로 시작하는 것)
  // day-num 요소들 좌표 확인
  const dayNums = await page.evaluate(() => {
    return [...document.querySelectorAll('.day-num')].map(e => ({
      text: e.innerText?.trim(),
      rect: e.getBoundingClientRect()
    }));
  });
  console.log('=== DAY NUMS ===', JSON.stringify(dayNums));

  // Day 4 클릭
  const day4 = dayNums.find(d => d.text?.startsWith('4'));
  if (day4) {
    await page.mouse.click(day4.rect.x + day4.rect.width/2, day4.rect.y + day4.rect.height/2);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/ui-inspect/03-day4-click.png' });
    console.log('Clicked Day 4');
  }

  // Step 2: 사이드바 열기 (☰ 버튼)
  await page.click('.sidebar-toggle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/ui-inspect/04-sidebar-open.png' });
  console.log('Sidebar opened');

  // 사이드바 내용 확인
  const sidebarContent = await page.evaluate(() => {
    const sb = document.querySelector('#sidebar, .sidebar, [class*="sidebar"]');
    return sb ? sb.innerText?.slice(0, 500) : 'NOT FOUND';
  });
  console.log('Sidebar content:', sidebarContent);

  // tree-item 들 확인
  const treeItems = await page.evaluate(() => {
    return [...document.querySelectorAll('.tree-item')].map(e => ({
      text: e.innerText?.trim().slice(0, 50),
      cls: e.className
    }));
  });
  console.log('Tree items:', JSON.stringify(treeItems));

  await browser.close();
})();
