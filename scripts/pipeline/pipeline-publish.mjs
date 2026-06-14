#!/usr/bin/env node
/**
 * pipeline-publish.mjs — publish 단계 산출물 생성 (standalone, dry-run).
 *
 * 사용:
 *   node scripts/pipeline/pipeline-publish.mjs <slug> [--root=.]
 *
 * content/publish-log.md 에 캠페인 엔트리를 append (publish_logged 게이트 충족).
 * dry-run 전용 — Postiz MCP 연결은 live 모드에서 별도 구현.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest, runPublish } from './stage-handlers.mjs';

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
if (!slug) { console.error('ERROR: 사용: pipeline-publish.mjs <slug> [--root=.]'); process.exit(2); }
const ROOT = flags.root ? path.resolve(flags.root) : REPO_ROOT;

const m = loadManifest(ROOT, slug);
if (!m) { console.error(`ERROR: campaign not found: ${slug}`); process.exit(2); }

const log = runPublish(ROOT, m, new Date().toISOString());
console.log(`✓ publish (dry-run): ${path.relative(ROOT, log)} 에 ${slug} 기록`);
