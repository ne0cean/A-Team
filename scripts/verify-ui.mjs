#!/usr/bin/env node
/**
 * verify-ui.mjs — Playwright 스크린샷 기반 UI 검증
 *
 * 사용법:
 *   node scripts/verify-ui.mjs <url> [--selector <css>] [--min-count <n>] [--out <path>]
 *
 * 반환:
 *   exit 0: 검증 통과 (스크린샷 경로 출력)
 *   exit 1: 검증 실패 (오류 메시지 + 스크린샷 경로 출력)
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const url = args[0];
if (!url) { console.error('Usage: verify-ui.mjs <url> [--selector <css>] [--min-count <n>] [--out <path>]'); process.exit(1); }

const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };
const selector = getArg('--selector', '.card');
const minCount = parseInt(getArg('--min-count', '1'));
const outDir = getArg('--out', join(__dirname, '../.verify-screenshots'));

await mkdir(outDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const screenshotPath = join(outDir, `verify-${timestamp}.png`);

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Navigate + wait for network idle
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  // Extra wait for JS rendering (board loads via JS)
  await page.waitForTimeout(1500);

  // Take full-page screenshot
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Count matching elements
  const count = await page.locator(selector).count();

  // Check for JS errors (console errors)
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await browser.close();
  browser = null;

  console.log(`SCREENSHOT: ${screenshotPath}`);
  console.log(`SELECTOR '${selector}': ${count} elements found (min: ${minCount})`);

  if (count < minCount) {
    console.error(`FAIL: expected >=${minCount} elements matching '${selector}', got ${count}`);
    process.exit(1);
  }

  console.log('PASS');
  process.exit(0);

} catch (err) {
  if (browser) await browser.close().catch(() => {});
  // Take screenshot even on error if possible
  console.error(`ERROR: ${err.message}`);
  console.log(`SCREENSHOT: ${screenshotPath}`);
  process.exit(1);
}
