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

  console.log('1. 페이지 로드...');
  await page.goto('https://cortex.feat-breeze.workers.dev?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, 'frames-01-initial.png') });
  console.log('저장: frames-01-initial.png');

  // frame 관련 클릭 가능 요소 탐색
  const info = await page.evaluate(() => {
    const results = { buttons: [], frameRelated: [], allSections: [] };
    document.querySelectorAll('button, a, [onclick], [data-section], [data-panel]').forEach(el => {
      const text = el.textContent.trim().slice(0, 50);
      const cls = el.className.toString().slice(0, 60);
      const entry = { tag: el.tagName, id: el.id, class: cls, text, onclick: el.getAttribute('onclick')?.slice(0,60), section: el.dataset.section };
      results.buttons.push(entry);
      if (text.toLowerCase().includes('frame') || cls.toLowerCase().includes('frame') || (el.id||'').toLowerCase().includes('frame')) {
        results.frameRelated.push(entry);
      }
    });
    return results;
  });
  console.log('Frame 관련 요소:', JSON.stringify(info.frameRelated, null, 2));
  console.log('전체 버튼 (처음 10개):', JSON.stringify(info.buttons.slice(0,10), null, 2));

  await browser.close();
  console.log('완료');
})();
