#!/usr/bin/env node
/**
 * benchmark-gap.mjs — enterprise replacement 정량화 CLI
 *
 * 사용: npx tsx scripts/benchmark-gap.mjs [--json] [--save] [--root=.]
 *
 * pipeline_stage 이벤트(analytics.jsonl)에서 stage별 실측 → enterprise 기준선 대비 갭.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';

try { register('tsx/esm', import.meta.url); } catch { /* tsx already loaded */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = {};
for (const a of args) { if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? true; } }
const ROOT = flags.root ? path.resolve(flags.root) : REPO_ROOT;

const lib = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'benchmark-gap.ts')).href);

const benchPath = path.join(REPO_ROOT, 'lib', 'enterprise-benchmark.json');
const bench = JSON.parse(readFileSync(benchPath, 'utf-8'));

const analyticsPath = path.join(ROOT, '.context', 'analytics.jsonl');
const events = existsSync(analyticsPath)
  ? readFileSync(analyticsPath, 'utf-8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  : [];

const now = new Date().toISOString();
const report = lib.computeGap(bench, events, now);

if (flags.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(lib.renderGapReport(report, bench));
}

if (flags.save) {
  const out = path.join(ROOT, '.context', 'benchmarks', `${now.slice(0, 10)}-pipeline-gap.json`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.error(`✓ saved: ${out}`);
}
