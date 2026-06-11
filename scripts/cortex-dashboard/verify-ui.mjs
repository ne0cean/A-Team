#!/usr/bin/env node
/**
 * verify-ui.mjs — cortex-dashboard 시각 검증 (Playwright)
 * 배포 후 훅에서 자동 호출 또는 수동 실행
 *
 * 사용: node scripts/cortex-dashboard/verify-ui.mjs [url]
 * 출력: 스크린샷 파일 경로 (stdout)
 * 종료: 0=pass, 1=fail
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const URL = process.argv[2] || 'https://cortex.feat-breeze.workers.dev';
const strict = process.argv.includes('--strict');
const outDir = 'C:/tmp';
const ts = Date.now();
const screenshotPath = join(outDir, `cortex-verify-${ts}.png`);

try {
  mkdirSync(outDir, { recursive: true });
} catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // JS render 완료 대기 — networkidle 직후 셀 미생성 race condition 방지
  // day-cell=월간뷰, week-cell=주간뷰(기본값)
  try {
    await page.waitForSelector('.day-cell, .week-cell', { timeout: 10000 });
  } catch {
    process.stderr.write('[verify-ui] WARN: .day-cell/.week-cell 10초 내 미출현\n');
  }

  // 기본 요소 확인 (항상 검사) — .day-event는 제외 (이벤트 없는 날 오탐 방지)
  const checks = [
    { selector: '.day-cell, .week-cell', label: 'day/week cells', strictFail: true },
    { selector: '.week-grid, .month-grid, [class*="grid"]', label: 'calendar grid', strictFail: true },
  ];

  let failed = false;
  for (const { selector, label, strictFail } of checks) {
    const el = await page.$(selector);
    if (!el) {
      process.stderr.write(`[verify-ui] WARN: ${label} 셀렉터(${selector}) 미발견\n`);
      if (strictFail || strict) failed = true;
    }
  }

  // one-thing이 day-event보다 앞에 오는지 DOM 순서 검증
  const orderCheck = await page.evaluate(() => {
    const cell = document.querySelector('.week-cell, .day-cell');
    if (!cell) return 'no-cell';
    const ot = cell.querySelector('.one-thing');
    const ev = cell.querySelector('.day-event');
    if (!ot || !ev) return 'no-events';
    return (ot.compareDocumentPosition(ev) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'correct' : 'wrong';
  });
  if (orderCheck === 'wrong') {
    process.stderr.write('[verify-ui] LAYOUT FAIL: .day-event가 .one-thing 위에 렌더됨 (LAYOUT CONTRACT 위반)\n');
    failed = true;
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  process.stdout.write(screenshotPath + '\n');

  if (failed) {
    process.stderr.write(`[verify-ui] PARTIAL: 일부 요소 미발견. 스크린샷 확인 필요: ${screenshotPath}\n`);
    process.exit(1);
  }

  process.stderr.write(`[verify-ui] PASS: ${screenshotPath}\n`);
  process.exit(0);

} catch (e) {
  process.stderr.write(`[verify-ui] ERROR: ${e.message}\n`);
  // 에러 시에도 스크린샷 시도
  try {
    await page.screenshot({ path: screenshotPath, fullPage: false });
    process.stdout.write(screenshotPath + '\n');
  } catch {}
  process.exit(1);
} finally {
  await browser.close();
}
