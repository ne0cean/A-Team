#!/usr/bin/env node
/**
 * Design Drift Detector — A-Team
 *
 * CSS/JSX에서 디자인 토큰을 사용하지 않는 매직넘버, 불일치 패턴을 감지.
 * design-auditor 에이전트와 연동하여 디자인 품질 자동 관리.
 *
 * Usage:
 *   node scripts/design-drift-detect.mjs [project-path]
 *   node scripts/design-drift-detect.mjs ~/Projects/connectome/flair --json
 *   node scripts/design-drift-detect.mjs . --severity high
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';

const args = process.argv.slice(2);
const flagJson = args.includes('--json');
const flagSeverity = args.includes('--severity') ? args[args.indexOf('--severity') + 1] : null;
const projectPath = args.find(a => !a.startsWith('--')) || '.';

// ── Scan targets ──
const SCAN_EXTS = new Set(['.css', '.scss', '.jsx', '.tsx', '.vue', '.svelte']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.git', '__pycache__', '.venv']);

// ── Detection rules ──
const rules = [
  {
    id: 'magic-color',
    severity: 'high',
    desc: 'Hardcoded color instead of token',
    // Match #hex colors in property values (not in var definitions or comments)
    test: (line, _file) => {
      if (/^\s*(\/\/|\/\*|\*|--|\$)/.test(line)) return false;
      if (/var\(--/.test(line)) return false;
      // hex colors in CSS properties or inline styles
      const match = line.match(/(?:color|background|border|fill|stroke|shadow)\s*[:=]\s*.*?(#[0-9a-fA-F]{3,8})\b/);
      if (match) return `Hardcoded color: ${match[1]}`;
      // rgb/rgba without var()
      const rgbMatch = line.match(/(?:color|background|border)\s*[:=]\s*.*?(rgba?\([^)]+\))/);
      if (rgbMatch && !line.includes('var(')) return `Hardcoded color: ${rgbMatch[1]}`;
      return false;
    },
  },
  {
    id: 'magic-spacing',
    severity: 'medium',
    desc: 'Non-standard spacing value',
    test: (line, _file) => {
      if (/^\s*(\/\/|\/\*|\*|--|\$)/.test(line)) return false;
      if (/var\(--/.test(line)) return false;
      // Spacing properties with pixel values not in the standard scale
      const STANDARD = new Set([0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 28, 30, 32, 36, 40, 48, 56, 64, 80, 96]);
      const match = line.match(/(?:margin|padding|gap|top|left|right|bottom)\s*[:=]\s*.*?(\d+)px/);
      if (match && !STANDARD.has(parseInt(match[1]))) {
        return `Non-standard spacing: ${match[1]}px (use token)`;
      }
      return false;
    },
  },
  {
    id: 'magic-radius',
    severity: 'low',
    desc: 'Non-standard border-radius',
    test: (line, _file) => {
      if (/var\(--/.test(line)) return false;
      const STANDARD = new Set([0, 4, 6, 8, 10, 12, 14, 16, 20, 9999]);
      const match = line.match(/border-radius\s*:\s*(\d+)px/);
      if (match && !STANDARD.has(parseInt(match[1]))) {
        return `Non-standard radius: ${match[1]}px`;
      }
      return false;
    },
  },
  {
    id: 'magic-font-size',
    severity: 'medium',
    desc: 'Hardcoded font-size instead of scale',
    test: (line, _file) => {
      if (/var\(--/.test(line)) return false;
      const STANDARD_PX = new Set([10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]);
      const match = line.match(/font-size\s*:\s*(\d+)px/);
      if (match && !STANDARD_PX.has(parseInt(match[1]))) {
        return `Non-standard font-size: ${match[1]}px`;
      }
      return false;
    },
  },
  {
    id: 'inline-style-color',
    severity: 'high',
    desc: 'Inline style with hardcoded color (JSX)',
    test: (line, file) => {
      if (!['.jsx', '.tsx'].includes(extname(file))) return false;
      const match = line.match(/style\s*=\s*\{\{[^}]*(?:color|background|border)\s*:\s*['"]?(#[0-9a-fA-F]{3,8})/);
      if (match) return `Inline hardcoded color: ${match[1]}`;
      return false;
    },
  },
  {
    id: 'inconsistent-transition',
    severity: 'low',
    desc: 'Non-standard transition duration',
    test: (line, _file) => {
      if (/var\(--/.test(line)) return false;
      const STANDARD = new Set([100, 150, 200, 250, 300, 400, 500]);
      const match = line.match(/transition[^:]*:\s*[^;]*?(\d+)ms/);
      if (match && !STANDARD.has(parseInt(match[1]))) {
        return `Non-standard transition: ${match[1]}ms`;
      }
      return false;
    },
  },
  {
    id: 'no-token-file',
    severity: 'critical',
    desc: 'No design token file found',
    // This is checked at project level, not per line
    projectLevel: true,
  },
];

// ── File scanner ──
function collectFiles(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) collectFiles(p, files);
    else if (SCAN_EXTS.has(extname(e))) files.push(p);
  }
  return files;
}

function hasTokenFile(dir) {
  const candidates = [
    'variables.css', 'tokens.css', 'design-tokens.css',
    'src/styles/variables.css', 'src/styles/tokens.css',
    'styles/variables.css', 'src/app/globals.css',
  ];
  for (const c of candidates) {
    const p = join(dir, c);
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf8');
      // Must have at least 5 CSS custom properties to count
      const varCount = (content.match(/--[\w-]+\s*:/g) || []).length;
      if (varCount >= 5) return { file: c, varCount };
    }
  }
  // Check tailwind.config for theme.extend
  for (const tc of ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs']) {
    if (existsSync(join(dir, tc))) {
      const content = readFileSync(join(dir, tc), 'utf8');
      if (/theme\s*:\s*\{/.test(content) && /extend\s*:\s*\{/.test(content)) {
        const extendSize = content.length;
        if (extendSize > 200) return { file: tc, varCount: '(tailwind)' };
      }
    }
  }
  return null;
}

// ── Main ──
const violations = [];
const resolvedPath = join(process.cwd(), projectPath);
const dir = existsSync(resolvedPath) ? resolvedPath : projectPath;

// Project-level check
const tokenFile = hasTokenFile(dir);
if (!tokenFile) {
  violations.push({
    rule: 'no-token-file',
    severity: 'critical',
    file: '(project)',
    line: 0,
    message: 'No design token file found — every component will use ad-hoc values',
  });
}

// Per-file scan
const files = collectFiles(dir);
let scannedFiles = 0;
let totalLines = 0;

for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = content.split('\n');
  scannedFiles++;
  totalLines += lines.length;

  for (let i = 0; i < lines.length; i++) {
    for (const rule of rules) {
      if (rule.projectLevel) continue;
      if (flagSeverity && rule.severity !== flagSeverity) continue;
      const result = rule.test(lines[i], file);
      if (result) {
        violations.push({
          rule: rule.id,
          severity: rule.severity,
          file: relative(dir, file),
          line: i + 1,
          message: result,
        });
      }
    }
  }
}

// ── Scoring (density-based: violations per 100 lines) ──
const weights = { critical: 20, high: 3, medium: 1, low: 0.5 };
const totalWeight = violations.reduce((s, v) => s + (weights[v.severity] || 1), 0);
const density = totalLines > 0 ? (totalWeight / totalLines) * 100 : 0;
// Token file bonus: having one at all is worth 30 points
const tokenBonus = tokenFile ? 30 : 0;
const driftScore = Math.min(100, Math.max(0, Math.round(100 - density * 8 + tokenBonus)));

const counts = { critical: 0, high: 0, medium: 0, low: 0 };
for (const v of violations) counts[v.severity] = (counts[v.severity] || 0) + 1;

// ── Output ──
const result = {
  project: dir,
  scannedFiles,
  totalLines,
  tokenFile: tokenFile ? tokenFile.file : null,
  tokenCount: tokenFile ? tokenFile.varCount : 0,
  driftScore,
  rating: driftScore >= 90 ? 'A' : driftScore >= 70 ? 'B' : driftScore >= 50 ? 'C' : driftScore >= 30 ? 'D' : 'F',
  violations: { total: violations.length, ...counts },
  details: violations.slice(0, 50), // cap output
};

if (flagJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\n  Design Drift Report — ${relative(process.cwd(), dir) || '.'}`);
  console.log(`  ${'─'.repeat(50)}`);
  console.log(`  Files scanned: ${scannedFiles} (${totalLines.toLocaleString()} lines)`);
  console.log(`  Token file:    ${tokenFile ? `${tokenFile.file} (${tokenFile.varCount} vars)` : '!! NONE !!'}`);
  console.log(`  Drift score:   ${driftScore}/100 (${result.rating})`);
  console.log(`  Violations:    ${violations.length} (critical:${counts.critical} high:${counts.high} med:${counts.medium} low:${counts.low})`);

  if (violations.length > 0) {
    console.log(`\n  Top violations:`);
    const shown = violations.slice(0, 20);
    for (const v of shown) {
      const sev = v.severity === 'critical' ? '!!' : v.severity === 'high' ? '**' : v.severity === 'medium' ? ' *' : '  ';
      console.log(`  ${sev} ${v.file}:${v.line} — ${v.message}`);
    }
    if (violations.length > 20) console.log(`  ... and ${violations.length - 20} more`);
  }
  console.log('');
}

process.exit(counts.critical > 0 ? 2 : counts.high > 0 ? 1 : 0);
