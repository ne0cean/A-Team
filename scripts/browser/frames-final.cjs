const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = '/tmp/ui-inspect';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache, no-store' });

  await page.goto('https://cortex.feat-breeze.workers.dev?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });

  // input value로 아이템 텍스트 추출
  const frameStructure = await page.evaluate(() => {
    const result = {};
    const sections = document.querySelectorAll('.frame-section');
    sections.forEach(sec => {
      const titleEl = sec.querySelector('.frame-section-title');
      const frameType = sec.className.match(/frame-type-(\w+)/)?.[1] || 'unknown';
      result[frameType] = { title: titleEl?.textContent.trim() || frameType, categories: {} };
      
      const cats = sec.querySelectorAll('.frame-cat');
      cats.forEach(cat => {
        const catName = cat.dataset.cat;
        const items = cat.querySelectorAll('input');
        result[frameType].categories[catName] = {
          count: items.length,
          items: Array.from(items).map(i => i.value)
        };
      });
    });
    return result;
  });
  
  console.log('=== Day Frames 구조 ===');
  Object.entries(frameStructure).forEach(([type, data]) => {
    console.log(`\n[${data.title}]`);
    Object.entries(data.categories).forEach(([cat, info]) => {
      console.log(`  ${cat}: ${info.count}개`);
      info.items.forEach((item, i) => console.log(`    ${i+1}. ${item}`));
    });
  });

  // framesPanel 영역 스크린샷 (3부분으로 분할)
  const panelY = 1283; // 확인된 Y 좌표
  const panelH = 1490;
  
  // 상단 1/3
  await page.evaluate((y) => window.scrollTo(0, y), panelY);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'frames-05-top.png') });
  
  // 중간
  await page.evaluate((y) => window.scrollTo(0, y + 450), panelY);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'frames-06-mid.png') });

  // 하단
  await page.evaluate((y) => window.scrollTo(0, y + 900), panelY);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'frames-07-bottom.png') });

  console.log('\n스크린샷 저장 완료');
  await browser.close();
})();
