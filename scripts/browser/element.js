#!/usr/bin/env node
/**
 * element.js — Capture a specific element by CSS selector
 * Ultra-light: element-only screenshot = ~54-200 tokens
 *
 * Usage:
 *   node element.js --url http://localhost:3000 --selector ".bottom-bar" --out /tmp/ui-inspect/element.png
 *
 * Stdout: JSON { path, selector, box: {x,y,width,height}, tokens }
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: 'http://localhost:3000',
    viewport: '375x812',
    selector: null,
    out: '/tmp/ui-inspect/element.png',
    timeout: 10000,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': opts.url = args[++i]; break;
      case '--viewport': opts.viewport = args[++i]; break;
      case '--selector': opts.selector = args[++i]; break;
      case '--out': opts.out = args[++i]; break;
      case '--timeout': opts.timeout = parseInt(args[++i], 10); break;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();

  if (!opts.selector) {
    console.log(JSON.stringify({ error: 'Missing --selector' }));
    process.exit(1);
  }

  const [vw, vh] = opts.viewport.split('x').map(Number);
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(opts.url, { waitUntil: 'networkidle', timeout: opts.timeout });

    const locator = page.locator(opts.selector).first();
    await locator.waitFor({ state: 'visible', timeout: 5000 });

    // Get bounding box before screenshot
    const box = await locator.boundingBox();
    if (!box) {
      console.log(JSON.stringify({ error: `Element not found or not visible: ${opts.selector}` }));
      await browser.close();
      process.exit(1);
    }

    await locator.screenshot({ path: opts.out });

    // Get computed styles for the element
    const styles = await locator.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        overflow: cs.overflow,
        zIndex: cs.zIndex,
        padding: cs.padding,
        margin: cs.margin,
      };
    });

    // Calculate token cost: (width * height) / 750
    const tokenCost = Math.ceil((box.width * box.height) / 750);

    console.log(JSON.stringify({
      path: opts.out,
      selector: opts.selector,
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      styles,
      tokens: tokenCost,
    }));

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.log(JSON.stringify({ error: err.message, selector: opts.selector }));
    process.exit(1);
  }
}

main();
