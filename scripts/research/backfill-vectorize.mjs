#!/usr/bin/env node
/**
 * backfill-vectorize.mjs — 기존 memory.jsonl 적립을 Vectorize에 백필
 *
 * 지금까지 로컬 JSONL에만 있던 검색 적립을 embed→upsert해서 시맨틱 검색 대상으로 만든다.
 * idempotent: id=deposit.hash이므로 재실행해도 중복 안 쌓임(upsert).
 *
 * 환경(.env): CLOUDFLARE_API_TOKEN, VECTORIZE_INDEX, (선택)CF_ACCOUNT_ID
 *
 * Usage:
 *   npx tsx scripts/research/backfill-vectorize.mjs [--dry-run] [--root=DIR]
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';

try { register('tsx/esm', import.meta.url); } catch { /* tsx active */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const flags = {};
for (const a of process.argv.slice(2)) { if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? true; } }
const dryRun = !!flags['dry-run'];
const root = typeof flags.root === 'string' ? path.resolve(flags.root) : REPO_ROOT;

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  return null;
}

const memoryPath = path.join(root, '.context', 'research', 'memory.jsonl');
if (!existsSync(memoryPath)) { console.error(`memory.jsonl 없음: ${memoryPath}`); process.exit(0); }

const { parseMemoryJsonl } = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'research-memory.ts')).href);
const { embedText, upsertVectors, depositToVectorMetadata } =
  await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'vectorize.ts')).href);

const deposits = parseMemoryJsonl(readFileSync(memoryPath, 'utf-8'));
// hash 기준 dedup(같은 검색 중복 줄 제거)
const byHash = new Map();
for (const d of deposits) byHash.set(d.hash, d);
const unique = [...byHash.values()];
console.log(`[backfill] ${deposits.length}줄 → 고유 ${unique.length}건`);

if (unique.length === 0) process.exit(0);

if (dryRun) {
  console.log('[dry-run] 백필 대상:');
  unique.slice(0, 5).forEach(d => console.log(`  ${d.hash} | ${d.query.slice(0, 50)}`));
  process.exit(0);
}

const accountId = process.env.CF_ACCOUNT_ID || '4cf76f439654a776856c585d60f3fc18';
const apiToken = loadEnvKey('CLOUDFLARE_API_TOKEN');
const indexName = loadEnvKey('VECTORIZE_INDEX');
if (!apiToken || !indexName) {
  console.error('CLOUDFLARE_API_TOKEN / VECTORIZE_INDEX 미설정 — .env 확인');
  process.exit(2);
}
const vcfg = { accountId, apiToken, indexName };

// embed는 배치(텍스트 여러개), upsert도 배치
const BATCH = 20;
let done = 0;
for (let i = 0; i < unique.length; i += BATCH) {
  const chunk = unique.slice(i, i + BATCH);
  const texts = chunk.map(d => `${d.query}\n${d.summary}`);
  let vectors;
  try {
    vectors = await embedText(vcfg, texts);
  } catch (e) { console.error(`[backfill] embed 실패 @${i}:`, e?.message?.slice(0, 120)); continue; }
  if (vectors.length !== chunk.length) {
    console.error(`[backfill] embed 개수 불일치 ${vectors.length}/${chunk.length} @${i} — 스킵`);
    continue;
  }
  const items = chunk.map((d, j) => ({ id: d.hash, values: vectors[j], metadata: depositToVectorMetadata(d) }));
  try {
    await upsertVectors(vcfg, items);
    done += items.length;
    console.log(`  진행 ${done}/${unique.length}`);
  } catch (e) { console.error(`[backfill] upsert 실패 @${i}:`, e?.message?.slice(0, 120)); }
}

console.log(`\n✅ 백필 완료: ${done}/${unique.length}건 (Vectorize는 비동기 — 수초 후 검색 가능)`);
