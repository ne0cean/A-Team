#!/usr/bin/env node
/**
 * research.mjs — Cortex Research Gateway CLI 진입점
 *
 * 반드시 `npx tsx`로 호출 (lib/*.ts import). `node` 직접 실행 시 ERR_MODULE_NOT_FOUND.
 *
 * Phase 0 (현재): L1만 — Exa 검색 → 인용 결과 출력.
 * Phase 1 (예정): L3 recall → L2 personalize → L1 Exa → L2 synthesize → L3 deposit.
 *
 * Usage:
 *   npx tsx scripts/research/research.mjs --q="질의" [--n=8] [--type=auto|neural|keyword|fast] [--json]
 *
 * Exit codes: 0 정상 / 1 Exa/네트워크 에러 / 2 인자·키 에러
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';
import { spawnSync } from 'child_process';

try { register('tsx/esm', import.meta.url); } catch { /* tsx already active */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// --- flag 파서 (--key=value 만 지원; 공백 분리 미지원) ---
const flags = {};
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    flags[k] = v ?? true;
  }
}

const query = typeof flags.q === 'string' ? flags.q.trim() : '';
if (!query) {
  console.error('Usage: research.mjs --q="질의" [--n=8] [--type=auto] [--json]');
  process.exit(2);
}

// --- Analytics (비치명적) ---
try {
  spawnSync('node', [path.join(REPO_ROOT, 'scripts', 'log-event.mjs'), 'command_start', 'name=research'],
    { stdio: 'ignore' });
} catch { /* analytics 실패는 무시 */ }

// --- EXA_API_KEY 로드: process.env → .env 파일 순 ---
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

const apiKey = loadEnvKey('EXA_API_KEY');
if (!apiKey) {
  console.error('ERROR: EXA_API_KEY 미설정.');
  console.error('  → https://exa.ai 무료 가입 후 발급, 프로젝트 루트 .env에 EXA_API_KEY=... 추가');
  console.error('  → .env는 .gitignore에 등록되어 커밋되지 않습니다.');
  process.exit(2);
}

const { exaSearch, ExaError } =
  await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'exa.ts')).href);

const cfg = { apiKey };
const opts = {
  numResults: flags.n ? parseInt(flags.n, 10) : 8,
  type: typeof flags.type === 'string' ? flags.type : 'auto',
  includeText: true,
};

try {
  const hits = await exaSearch(cfg, query, opts);
  if (flags.json) {
    console.log(JSON.stringify({ query, hits }, null, 2));
  } else {
    console.log(`\n🔎 "${query}" — ${hits.length}개 결과 (Exa ${opts.type})\n`);
    hits.forEach((h, i) => {
      const date = h.publishedDate ? ` · ${h.publishedDate.slice(0, 10)}` : '';
      const author = h.author ? ` · ${h.author}` : '';
      console.log(`[${i + 1}] ${h.title}${date}${author}`);
      console.log(`    ${h.url}`);
      if (h.text) console.log(`    ${h.text.slice(0, 180).replace(/\s+/g, ' ').trim()}…`);
      console.log('');
    });
    console.log('(Phase 0: L1 검색만. 개인화·축적은 Phase 1)');
  }
  process.exit(0);
} catch (e) {
  if (e instanceof ExaError) {
    console.error(`Exa 에러 (HTTP ${e.status}): ${e.message}`);
    process.exit(e.status === 401 || e.status === 0 ? 2 : 1);
  }
  console.error('실패:', e?.message ?? e);
  process.exit(1);
}
