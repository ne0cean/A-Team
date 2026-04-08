#!/usr/bin/env node
/**
 * report.js — Generate compact markdown report from diff results
 * Designed to be injected into Claude's additionalContext
 *
 * Usage:
 *   node report.js --diff-json '{"diffPercent":8.2,...}' --file src/App.tsx --out /tmp/report.md
 *
 * Stdout: Compact markdown report (< 500 tokens)
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { diffJson: null, file: '', out: null, beforeAria: null, afterAria: null };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--diff-json': opts.diffJson = args[++i]; break;
      case '--file': opts.file = args[++i]; break;
      case '--out': opts.out = args[++i]; break;
      case '--before-aria': opts.beforeAria = args[++i]; break;
      case '--after-aria': opts.afterAria = args[++i]; break;
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs();

  let diff;
  try {
    diff = JSON.parse(opts.diffJson || '{}');
  } catch {
    diff = {};
  }

  const lines = [];
  lines.push(`## UI Inspection Report`);
  lines.push(`**File**: \`${opts.file}\``);
  lines.push(`**Diff**: ${diff.diffPercent || 0}% pixels changed`);
  lines.push('');

  // Changed regions
  if (diff.changedRegions?.length > 0) {
    lines.push('### Changed Regions');
    for (const r of diff.changedRegions.slice(0, 5)) {
      lines.push(`- Area (${r.x},${r.y}) ${r.width}x${r.height}px`);
    }
    lines.push('');
  }

  // Changed elements (most important for Claude)
  if (diff.changedElements?.length > 0) {
    lines.push('### Changed Elements');
    for (const el of diff.changedElements.slice(0, 10)) {
      if (el.change === 'moved' && el.description) {
        lines.push(`- **${el.selector}**: ${el.description}`);
        lines.push(`  before: (${el.before.x},${el.before.y}) ${el.before.width}x${el.before.height}`);
        lines.push(`  after:  (${el.after.x},${el.after.y}) ${el.after.width}x${el.after.height}`);
      } else if (el.change === 'added') {
        lines.push(`- **${el.selector}**: NEW at (${el.after.x},${el.after.y}) ${el.after.width}x${el.after.height}`);
      } else if (el.change === 'removed') {
        lines.push(`- **${el.selector}**: REMOVED (was at ${el.before.x},${el.before.y})`);
      }
    }
    lines.push('');
  }

  // Verdict helper
  const pct = diff.diffPercent || 0;
  if (pct === 0) {
    lines.push('### Verdict: NO VISUAL CHANGE');
    lines.push('수정이 시각적 변경을 만들지 않았습니다. CSS가 적용되었는지 확인하세요.');
  } else if (pct < 5) {
    lines.push('### Verdict: MINOR CHANGE');
    lines.push('소규모 시각 변경. diff 이미지로 의도한 변경인지 확인하세요.');
  } else if (pct < 20) {
    lines.push('### Verdict: MODERATE CHANGE');
    lines.push('중간 규모 변경. 레이아웃 깨짐 여부를 diff 이미지에서 확인하세요.');
  } else {
    lines.push('### Verdict: MAJOR CHANGE');
    lines.push('대규모 시각 변경. 반드시 diff 이미지를 확인하여 의도하지 않은 부작용이 없는지 검증하세요.');
  }

  lines.push('');
  lines.push('### Files');
  if (diff.diffImagePath) lines.push(`- Diff image: \`${diff.diffImagePath}\``);
  if (diff.beforePath) lines.push(`- Before: \`${diff.beforePath}\``);
  if (diff.afterPath) lines.push(`- After: \`${diff.afterPath}\``);

  const report = lines.join('\n');

  if (opts.out) {
    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, report, 'utf-8');
  }

  console.log(report);
}

main();
