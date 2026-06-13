#!/usr/bin/env node
/**
 * research.mjs — Cortex Research Gateway CLI 진입점 (전체 루프)
 *
 * 반드시 `npx tsx`로 호출 (lib/*.ts import). `node` 직접 실행 시 ERR_MODULE_NOT_FOUND.
 *
 * 흐름: L3 recall → L2 personalize → L1 web(Exa) → L2 synthesize → L3 deposit
 *  - L3 메모리는 로컬 JSONL(.context/research/memory.jsonl). D1/Vectorize는 Phase 2(IO 교체).
 *  - 복리: 이번 deposit이 다음 검색의 recall 입력이 된다.
 *
 * Usage:
 *   npx tsx scripts/research/research.mjs --q="질의" [--n=8] [--synth=groq|raw] [--json]
 *   npx tsx scripts/research/research.mjs --q="질의" --dry-run [--root=/tmp/x]   # Exa 없이 전체 루프
 *
 * Exit: 0 정상 / 1 web/네트워크 에러 / 2 인자·키 에러
 */

import { existsSync, readFileSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';
import { spawnSync } from 'child_process';

try { register('tsx/esm', import.meta.url); } catch { /* tsx already active */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// --- flag 파서 (--key=value 만; 공백 분리 미지원) ---
const flags = {};
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) { const [k, v] = arg.slice(2).split('='); flags[k] = v ?? true; }
}
const query = typeof flags.q === 'string' ? flags.q.trim() : '';
const dryRun = !!flags['dry-run'];
const root = typeof flags.root === 'string' ? path.resolve(flags.root) : REPO_ROOT;
const synthMode = typeof flags.synth === 'string' ? flags.synth : (dryRun ? 'raw' : 'groq');

if (!query) {
  console.error('Usage: research.mjs --q="질의" [--n=8] [--synth=groq|raw] [--json] [--dry-run] [--root=DIR]');
  process.exit(2);
}

// --- Analytics (실 모드만; 테스트/드라이런 오염 방지) ---
if (!dryRun && root === REPO_ROOT) {
  try {
    spawnSync('node', [path.join(REPO_ROOT, 'scripts', 'log-event.mjs'), 'research_query', `q=${query.slice(0, 60)}`],
      { stdio: 'ignore' });
  } catch { /* 무시 */ }
}

// --- lib import ---
const { runResearch } = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'research-gateway.ts')).href);
const { createGatewayIO } = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'research-io.ts')).href);

// --- 경로 ---
const researchDir = path.join(root, '.context', 'research');
const memoryPath = path.join(researchDir, 'memory.jsonl');
const profilePath = path.join(researchDir, 'profile.md');

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

// --- L1 web 어댑터 ---
let exaSearchFn = null;
async function webSearch(q) {
  if (dryRun) {
    return [{ id: 'dry1', url: 'https://example.com/dry', title: `[dry] ${q}`, text: 'dry-run canned result', author: null, publishedDate: null, score: 1 }];
  }
  if (!exaSearchFn) {
    const apiKey = loadEnvKey('EXA_API_KEY');
    if (!apiKey) {
      console.error('ERROR: EXA_API_KEY 미설정 → https://exa.ai 무료 발급 후 .env에 EXA_API_KEY=... (또는 --dry-run)');
      process.exit(2);
    }
    const exa = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'exa.ts')).href);
    exaSearchFn = (qq) => exa.exaSearch({ apiKey }, qq, { numResults: flags.n ? parseInt(flags.n, 10) : 8, type: 'auto', includeText: true });
  }
  return exaSearchFn(q);
}

// --- L2 synthesize 어댑터 ---
function synthesizeRaw(grounding, q, hits) {
  const top = hits.slice(0, 5).map((h, i) => `[${i + 1}] ${h.title}\n${(h.text || '').slice(0, 240).replace(/\s+/g, ' ').trim()}\n${h.url}`).join('\n\n');
  return `## ${q}\n\n${top}\n\n(raw 합성 — LLM 미사용. --synth=groq 또는 /research 스킬로 개인화 합성)`;
}
async function synthesize(grounding, q, hits) {
  if (synthMode === 'raw') return synthesizeRaw(grounding, q, hits);
  // groq: `llm` 바이너리 사용 (Groq 70B, 무료). 실패 시 raw fallback.
  const prompt = `${grounding}\n\n# 질의\n${q}\n\n# 웹 검색 결과\n${hits.map((h, i) => `[${i + 1}] ${h.title} (${h.url})\n${(h.text || '').slice(0, 1500)}`).join('\n\n')}\n\n# 지시\n위 grounding(사용자 맥락)에 따라 인용 번호를 달아 개인화된 답을 합성하라.`;
  try {
    const r = spawnSync('llm', [prompt], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 60000 });
    const out = (r.stdout || '').trim();
    if (r.status === 0 && out) return out;
  } catch { /* fallback */ }
  return synthesizeRaw(grounding, q, hits);
}

// --- Vectorize 어댑터 (CF 토큰 + 인덱스 + 실모드일 때만; 없으면 로컬 전용) ---
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '4cf76f439654a776856c585d60f3fc18';
const cfToken = loadEnvKey('CLOUDFLARE_API_TOKEN');
const vectorizeIndex = loadEnvKey('VECTORIZE_INDEX');
let vectorize;
if (!dryRun && cfToken && vectorizeIndex) {
  const vlib = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'vectorize.ts')).href);
  const vcfg = { accountId: CF_ACCOUNT_ID, apiToken: cfToken, indexName: vectorizeIndex };
  vectorize = {
    embed: (texts) => vlib.embedText(vcfg, texts),
    query: (vec, topK) => vlib.queryVectors(vcfg, vec, topK),
    upsert: (items) => vlib.upsertVectors(vcfg, items),
    minScore: process.env.VECTORIZE_MIN_SCORE ? parseFloat(process.env.VECTORIZE_MIN_SCORE) : 0.5,
  };
}

// --- IO 구성 (로컬 JSONL + Vectorize 이중 저장; storage는 createGatewayIO, web/synth는 직접) ---
const storageIO = createGatewayIO({
  readMemory: () => (existsSync(memoryPath) ? readFileSync(memoryPath, 'utf-8') : ''),
  appendMemory: (line) => { mkdirSync(researchDir, { recursive: true }); appendFileSync(memoryPath, line); },
  loadProfile: () => (existsSync(profilePath)
    ? readFileSync(profilePath, 'utf-8').split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    : []),
  cortexSearch: async (q, k) => {
    if (dryRun) return [];
    try {
      const res = await fetch(`https://cortex.feat-breeze.workers.dev/api/cortex/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      const data = await res.json();
      const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      return rows.slice(0, k).map(r => ({ title: String(r.title || r.name || r.path || ''), snippet: String(r.body || r.snippet || '').slice(0, 200), path: r.path }));
    } catch { return []; }
  },
  now: () => new Date().toISOString(),
  vectorize,
});
const io = { ...storageIO, webSearch, synthesize };

try {
  const r = await runResearch(io, query, { recallK: flags.n ? parseInt(flags.n, 10) : 5 });
  if (flags.json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`\n${r.answer}\n`);
    console.log(`— 출처 ${r.sources.length} · 개인화 맥락: 과거리서치 ${r.contextUsed.priorFindings} · Cortex노트 ${r.contextUsed.cortexDocs} · 프로필 ${r.contextUsed.profile}`);
    if (r.reformulated !== query) console.log(`— 재구성 질의: ${r.reformulated}`);
    console.log(`— 적립: ${r.deposited ? '✓ memory.jsonl' : '—'}`);
  }
  process.exit(0);
} catch (e) {
  console.error('실패:', e?.message ?? e);
  process.exit(1);
}
