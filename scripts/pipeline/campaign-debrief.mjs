#!/usr/bin/env node
/**
 * campaign-debrief.mjs — feedback 단계: DEBRIEF.md 생성 + 캠페인 지식 캡처 (standalone).
 *
 * 사용:
 *   node scripts/pipeline/campaign-debrief.mjs <slug> [--root=.] [--no-knowledge]
 *
 * .context/campaigns/<slug>/DEBRIEF.md 생성. 기본으로 campaign-knowledge.jsonl 에
 * 완주 지식을 append (다음 campaign-new 가 키워드 매칭으로 주입 → 복리 루프).
 * --no-knowledge: DEBRIEF만 생성하고 지식 기록 생략.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest, runFeedback, recordCampaignKnowledge } from './stage-handlers.mjs';

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
if (!slug) { console.error('ERROR: 사용: campaign-debrief.mjs <slug> [--root=.] [--no-knowledge]'); process.exit(2); }
const ROOT = flags.root ? path.resolve(flags.root) : REPO_ROOT;

const m = loadManifest(ROOT, slug);
if (!m) { console.error(`ERROR: campaign not found: ${slug}`); process.exit(2); }

const now = new Date().toISOString();
const onRecord = flags['no-knowledge'] ? null : (mm) => recordCampaignKnowledge(ROOT, mm, now);
const out = runFeedback(ROOT, m, now, onRecord);
console.log(`✓ debrief: ${path.relative(ROOT, out)} 생성${flags['no-knowledge'] ? '' : ' + 지식 캡처'}`);
