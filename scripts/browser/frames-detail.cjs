const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = '/tmp/ui-inspect';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 2400 }); // 긴 페이지 캡처
  await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache, no-store' });

  await page.goto('https://cortex.feat-breeze.workers.dev?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });

  // framesPanel이 collapsed 상태인지 확인 후 클릭해서 열기
  const panelState = await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (!panel) return { found: false };
    const style = window.getComputedStyle(panel);
    return { 
      found: true, 
      display: style.display, 
      visibility: style.visibility,
      height: style.height,
      classList: panel.className
    };
  });
  console.log('framesPanel 상태:', JSON.stringify(panelState));

  // 패널 헤더 클릭 (이미 열려있으면 상태 유지)
  await page.evaluate(() => {
    const panel = document.getElementById('framesPanel');
    if (panel) {
      const style = window.getComputedStyle(panel);
      // collapsed 상태라면 열기
      if (style.display === 'none' || style.height === '0px') {
        togglePanel('framesPanel');
      }
    }
  });
  await page.waitForTimeout(500);

  // 각 frame type별 카테고리/아이템 추출
  const frameData = await page.evaluate(() => {
    const result = {};
    const frameTypes = ['weekday', 'flow', 'block'];
    
    frameTypes.forEach(frameType => {
      result[frameType] = {};
      // 해당 frame type의 카테고리 섹션 찾기
      // delFrameItem('weekday','ritual',0) 패턴으로 아이템 수 계산
      const delButtons = document.querySelectorAll(`[onclick*="delFrameItem('${frameType}'"]`);
      const catCounts = {};
      delButtons.forEach(btn => {
        const match = btn.getAttribute('onclick').match(/delFrameItem\('[\w]+','([\w]+)',(\d+)\)/);
        if (match) {
          const cat = match[1];
          const idx = parseInt(match[2]);
          if (!catCounts[cat]) catCounts[cat] = [];
          catCounts[cat].push(idx);
        }
      });
      result[frameType].categories = catCounts;
      
      // 실제 아이템 텍스트 추출 (frame-item 클래스)
      const itemTexts = {};
    });

    // frame-item 텍스트 직접 추출
    const allFrameSections = document.querySelectorAll('.frame-cat');
    const itemsBySection = [];
    allFrameSections.forEach(sec => {
      const titleEl = sec.querySelector('.frame-cat-title');
      const items = sec.querySelectorAll('.frame-item');
      const frameTypeParent = sec.closest('[id]');
      itemsBySection.push({
        parent: frameTypeParent?.id || 'unknown',
        title: titleEl?.textContent.trim() || 'untitled',
        itemCount: items.length,
        items: Array.from(items).map(i => i.textContent.trim().replace('×','').trim()).slice(0,5)
      });
    });
    return { catsByType: result, sectionDetails: itemsBySection };
  });
  console.log('Frame 데이터:', JSON.stringify(frameData, null, 2));

  // framesPanel 섹션만 element 스크린샷
  const framesPanelEl = await page.$('#framesPanel');
  if (framesPanelEl) {
    const box = await framesPanelEl.boundingBox();
    console.log('framesPanel boundingBox:', JSON.stringify(box));
    
    // 뷰포트 조정해서 전체 패널 캡처
    if (box && box.height > 0) {
      await page.setViewportSize({ width: 1280, height: Math.min(Math.ceil(box.y + box.height + 50), 6000) });
      await page.screenshot({ path: path.join(outDir, 'frames-02-panel-full.png'), fullPage: true });
      console.log('저장: frames-02-panel-full.png');
    }
  } else {
    // fullPage 캡처
    await page.screenshot({ path: path.join(outDir, 'frames-02-fullpage.png'), fullPage: true });
    console.log('저장: frames-02-fullpage.png (framesPanel 없음)');
  }

  // weekday 섹션만 클리핑
  const weekdaySection = await page.evaluate(() => {
    const sections = document.querySelectorAll('.frame-type-section, [data-frame-type]');
    return Array.from(sections).map(s => ({ id: s.id, class: s.className.slice(0,60) }));
  });
  console.log('frame-type-section들:', JSON.stringify(weekdaySection));

  await browser.close();
})();
