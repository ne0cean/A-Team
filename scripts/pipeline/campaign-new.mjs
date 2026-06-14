#!/usr/bin/env node
/**
 * campaign-new.mjs — 신규 캠페인 매니페스트 생성 (standalone).
 *
 * 사용:
 *   node scripts/pipeline/campaign-new.mjs --slug 2026-06-14-x --title "..." [--root=.] [--mode=dry-run]
 *
 * pipeline-run.mjs `new` 와 동일한 로직(지식 주입 포함)을 standalone 진입점으로 제공.
 * 단일 진실 공급원 유지를 위해 pipeline-run.mjs new 를 spawn한다.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, 'pipeline-run.mjs');

const args = process.argv.slice(2);
const flags = {};
for (const a of args) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? true; }
}
if (!flags.slug) { console.error('ERROR: --slug 필요'); process.exit(2); }

const passthrough = ['new'];
for (const k of ['slug', 'title', 'mode', 'root']) {
  if (flags[k] !== undefined) passthrough.push(`--${k}=${flags[k]}`);
}

// pipeline-run.mjs 는 lib/pipeline.ts(.js→.ts 해석)를 import 하므로 tsx 로더 필요.
const r = spawnSync('npx', ['tsx', RUNNER, ...passthrough], { stdio: 'inherit' });
process.exit(r.status == null ? 1 : r.status);
