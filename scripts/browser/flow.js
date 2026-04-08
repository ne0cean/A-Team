#!/usr/bin/env node
/**
 * flow.js — Multi-step browser automation
 * Follows Vercel agent-browser minimal-response pattern:
 * each action returns "Done", only final step captures screenshot
 *
 * Usage:
 *   node flow.js --steps '[{"action":"goto","url":"http://localhost:3000"},{"action":"click","selector":".btn"},{"action":"screenshot"}]' --out /tmp/ui-inspect/flow
 *
 * Actions: goto, click, fill, select, scroll, wait, screenshot, snapshot
 *
 * Stdout: JSON { steps: [{action, status}], finalScreenshot, finalAria }
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    steps: '[]',
    viewport: '375x812',
    out: '/tmp/ui-inspect/flow',
    timeout: 10000,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--steps': opts.steps = args[++i]; break;
      case '--viewport': opts.viewport = args[++i]; break;
      case '--out': opts.out = args[++i]; break;
      case '--timeout': opts.timeout = parseInt(args[++i], 10); break;
    }
  }
  return opts;
}

async function executeStep(page, step, outDir, stepIndex) {
  const result = { action: step.action, status: 'Done' };

  switch (step.action) {
    case 'goto':
      await page.goto(step.url, { waitUntil: 'networkidle', timeout: step.timeout || 10000 });
      break;

    case 'click':
      await page.locator(step.selector).first().click({ timeout: 5000 });
      if (step.waitAfter) await page.waitForTimeout(step.waitAfter);
      break;

    case 'fill':
      await page.locator(step.selector).first().fill(step.value || '', { timeout: 5000 });
      break;

    case 'select':
      await page.locator(step.selector).first().selectOption(step.value, { timeout: 5000 });
      break;

    case 'scroll':
      await page.evaluate(({ selector, direction, amount }) => {
        const el = selector ? document.querySelector(selector) : window;
        const px = amount || 300;
        if (el === window) {
          window.scrollBy(0, direction === 'up' ? -px : px);
        } else {
          el.scrollBy(0, direction === 'up' ? -px : px);
        }
      }, { selector: step.selector, direction: step.direction || 'down', amount: step.amount });
      break;

    case 'wait':
      await page.waitForTimeout(step.ms || 1000);
      break;

    case 'screenshot': {
      const screenshotPath = path.join(outDir, `step-${stepIndex}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      result.screenshotPath = screenshotPath;
      result.tokens = Math.ceil((page.viewportSize().width * page.viewportSize().height) / 750);
      break;
    }

    case 'snapshot': {
      const snapshot = await page.accessibility.snapshot({ interestingOnly: false });
      const snapshotPath = path.join(outDir, `step-${stepIndex}.yaml`);
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      result.snapshotPath = snapshotPath;
      break;
    }

    default:
      result.status = `Unknown action: ${step.action}`;
  }

  return result;
}

async function main() {
  const opts = parseArgs();
  let steps;
  try {
    steps = JSON.parse(opts.steps);
  } catch {
    console.log(JSON.stringify({ error: 'Invalid --steps JSON' }));
    process.exit(1);
  }

  const [vw, vh] = opts.viewport.split('x').map(Number);
  fs.mkdirSync(opts.out, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const results = [];
    for (let i = 0; i < steps.length; i++) {
      try {
        const result = await executeStep(page, steps[i], opts.out, i);
        results.push(result);
      } catch (err) {
        results.push({ action: steps[i].action, status: 'Failed', error: err.message });
        break; // Stop on first failure
      }
    }

    // Final screenshot if not already taken in last step
    const lastStep = steps[steps.length - 1];
    let finalScreenshot = null;
    if (lastStep?.action !== 'screenshot') {
      finalScreenshot = path.join(opts.out, 'final.png');
      await page.screenshot({ path: finalScreenshot, fullPage: false });
    } else {
      finalScreenshot = results[results.length - 1]?.screenshotPath;
    }

    console.log(JSON.stringify({
      steps: results,
      finalScreenshot,
      stepsCompleted: results.filter(r => r.status === 'Done').length,
      totalSteps: steps.length,
    }));

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
