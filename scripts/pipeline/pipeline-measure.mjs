#!/usr/bin/env node
/**
 * pipeline-measure.mjs — measure 단계 산출물 생성 (standalone).
 *
 * 사용:
 *   node scripts/pipeline/pipeline-measure.mjs <slug> [--root=.]
 *
 * content/analytics/<slug>-measure.md 생성. 내부 데이터(publish-log + 단계 duration)만 사용.
 * 외부 플랫폼 API는 미연결 (MeasureAdapter 인터페이스로 추후 확장).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest, runMeasure } from './stage-handlers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (const a of args) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? true; }
  else positional.push(a);
}
const slug = positional[0];
if (!slug) { console.error('ERROR: 사용: pipeline-measure.mjs <slug> [--root=.]'); process.exit(2); }
const ROOT = flags.root ? path.resolve(flags.root) : REPO_ROOT;

const m = loadManifest(ROOT, slug);
if (!m) { console.error(`ERROR: campaign not found: ${slug}`); process.exit(2); }

const out = runMeasure(ROOT, m);
console.log(`✓ measure: ${path.relative(ROOT, out)} 생성`);
