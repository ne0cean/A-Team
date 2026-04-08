#!/usr/bin/env node
/**
 * snapshot.js — Playwright CLI-based page capture
 * Token-efficient: saves to disk, outputs 1-line JSON to stdout
 *
 * Usage:
 *   node snapshot.js --url http://localhost:3000 --viewport 375x812 --out /tmp/ui-inspect --prefix before-123
 *   node snapshot.js --url http://localhost:3000 --selector ".bottom-bar" --out /tmp/ui-inspect
 *
 * Output files:
 *   {prefix}.png          — Screenshot
 *   {prefix}.yaml         — ARIA accessibility snapshot
 *   {prefix}-boxes.json   — Element bounding boxes
 *   {prefix}-console.json — Console errors
 *
 * Stdout: JSON { screenshotPath, ariaPath, boxesPath, consolePath, title, url, viewport }
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: 'http://localhost:3000',
    viewport: '375x812',
    out: '/tmp/ui-inspect',
    prefix: `snap-${Date.now()}`,
    selector: null,
    boundingBoxes: true,
    timeout: 10000,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': opts.url = args[++i]; break;
      case '--viewport': opts.viewport = args[++i]; break;
      case '--out': opts.out = args[++i]; break;
      case '--prefix': opts.prefix = args[++i]; break;
      case '--selector': opts.selector = args[++i]; break;
      case '--no-bounding-boxes': opts.boundingBoxes = false; break;
      case '--timeout': opts.timeout = parseInt(args[++i], 10); break;
    }
  }
  return opts;
}

async function captureAriaSnapshot(page) {
  try {
    const snapshot = await page.accessibility.snapshot({ interestingOnly: false });
    return snapshot ? formatAriaTree(snapshot, 0) : '# Empty accessibility tree';
  } catch {
    return '# Accessibility snapshot unavailable';
  }
}

function formatAriaTree(node, depth) {
  const indent = '  '.repeat(depth);
  let line = `${indent}- ${node.role || 'unknown'}`;
  if (node.name) line += ` "${node.name}"`;
  if (node.value) line += ` value="${node.value}"`;
  let result = line + '\n';
  if (node.children) {
    for (const child of node.children) {
      result += formatAriaTree(child, depth + 1);
    }
  }
  return result;
}

async function collectBoundingBoxes(page) {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const boxes = [];
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const tag = el.tagName.toLowerCase();
      const classes = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).join('.')
        : '';
      const id = el.id ? `#${el.id}` : '';
      const selector = `${tag}${id}${classes}`.substring(0, 120);
      const role = el.getAttribute('role') || el.ariaRoleDescription || '';
      const text = (el.textContent || '').trim().substring(0, 60);
      const computed = window.getComputedStyle(el);

      boxes.push({
        selector,
        role,
        text: text.length > 50 ? text.substring(0, 50) + '...' : text,
        box: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        visible: computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0',
        overflow: computed.overflow === 'auto' || computed.overflow === 'scroll' ||
                  computed.overflowY === 'auto' || computed.overflowY === 'scroll',
        position: computed.position,
        zIndex: computed.zIndex !== 'auto' ? parseInt(computed.zIndex, 10) : null,
      });
    }
    // Sort by visual order (top-left), limit to meaningful elements
    return boxes
      .filter(b => b.visible && (b.box.width > 10 || b.box.height > 10))
      .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
      .slice(0, 200);
  });
}

async function main() {
  const opts = parseArgs();
  const [vw, vh] = opts.viewport.split('x').map(Number);

  fs.mkdirSync(opts.out, { recursive: true });

  const screenshotPath = path.join(opts.out, `${opts.prefix}.png`);
  const ariaPath = path.join(opts.out, `${opts.prefix}.yaml`);
  const boxesPath = path.join(opts.out, `${opts.prefix}-boxes.json`);
  const consolePath = path.join(opts.out, `${opts.prefix}-console.json`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 1,  // 1x for token efficiency (no retina)
    });
    const page = await context.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), url: msg.location()?.url || '' });
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push({ text: err.message, stack: err.stack?.substring(0, 200) });
    });

    // Navigate
    await page.goto(opts.url, { waitUntil: 'networkidle', timeout: opts.timeout });

    // Screenshot
    if (opts.selector) {
      const el = page.locator(opts.selector).first();
      await el.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }

    // ARIA snapshot
    const aria = await captureAriaSnapshot(page);
    fs.writeFileSync(ariaPath, aria, 'utf-8');

    // Bounding boxes
    let boxes = [];
    if (opts.boundingBoxes) {
      boxes = await collectBoundingBoxes(page);
      fs.writeFileSync(boxesPath, JSON.stringify(boxes, null, 2), 'utf-8');
    }

    // Console errors
    fs.writeFileSync(consolePath, JSON.stringify(consoleErrors, null, 2), 'utf-8');

    const title = await page.title();

    // Output 1-line JSON to stdout
    const result = {
      screenshotPath,
      ariaPath,
      boxesPath: opts.boundingBoxes ? boxesPath : null,
      consolePath,
      title,
      url: opts.url,
      viewport: `${vw}x${vh}`,
      elementCount: boxes.length,
      consoleErrorCount: consoleErrors.length,
    };
    console.log(JSON.stringify(result));

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.log(JSON.stringify({
      error: err.message,
      url: opts.url,
      hint: 'Is dev server running? Try: UI_INSPECT_URL=http://localhost:PORT',
    }));
    process.exit(1);
  }
}

main();
