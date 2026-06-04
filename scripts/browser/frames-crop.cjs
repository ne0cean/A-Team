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

  // framesPanel 위치 확인
  const box = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (!panel) return null;
    const rect = panel.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  console.log('framesPanel rect:', JSON.stringify(box));

  // 패널 시작 부분 (헤더 포함) 캡처 - 스크롤해서
  await page.evaluate(() => window.scrollTo(0, 2300));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'frames-03-panel-header.png'), clip: { x: 0, y: 0, width: 1280, height: 900 } });
  console.log('저장: frames-03-panel-header.png');

  // weekday 섹션
  await page.evaluate(() => window.scrollTo(0, 2350));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'frames-04-weekday.png') });
  console.log('저장: frames-04-weekday.png');

  // 아이템 실제 텍스트 추출 (다른 방식)
  const itemTexts = await page.evaluate(() => {
    const result = {};
    // frame-item 안의 텍스트 노드만 추출 (링크/버튼 제외)
    const frameItems = document.querySelectorAll('.frame-item');
    const samples = Array.from(frameItems).slice(0, 10).map(item => {
      // 텍스트 노드만
      const clone = item.cloneNode(true);
      clone.querySelectorAll('.frame-del, .frame-link').forEach(el => el.remove());
      return clone.textContent.trim();
    });
    
    // frame-cat-name 요소 찾기
    const catNames = Array.from(document.querySelectorAll('.frame-cat-name, .frame-cat-label, .frame-type-label, h3, h4'))
      .filter(el => el.closest('#framesPanel'))
      .map(el => el.textContent.trim())
      .slice(0, 20);
    
    // framesPanel 내부 구조 확인
    const panel = document.getElementById('framesPanel');
    const panelHTML = panel ? panel.innerHTML.slice(0, 3000) : 'not found';
    
    return { samples, catNames, panelHTMLSnippet: panelHTML };
  });
  
  console.log('아이템 샘플 텍스트:', JSON.stringify(itemTexts.samples));
  console.log('카테고리 이름들:', JSON.stringify(itemTexts.catNames));
  console.log('패널 HTML 스니펫:', itemTexts.panelHTMLSnippet);

  await browser.close();
})();
