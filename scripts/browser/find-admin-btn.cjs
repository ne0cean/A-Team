const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://cortex.feat-breeze.workers.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const els = await page.evaluate(() => {
    const all = [...document.querySelectorAll('button, a, [onclick], .nav-item, .menu-item')];
    return all.slice(0, 60).map(e => ({
      tag: e.tagName,
      text: e.innerText?.trim().slice(0, 50),
      id: e.id,
      cls: e.className?.slice(0, 70)
    }));
  });
  
  console.log('=== BUTTONS/LINKS ===');
  els.forEach((e, i) => console.log(i, JSON.stringify(e)));

  await browser.close();
})();
