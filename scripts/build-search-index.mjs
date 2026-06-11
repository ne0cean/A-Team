#!/usr/bin/env node
/**
 * build-search-index.mjs
 * cortex/areas, cortex/projects, cortex/archive HTML 파일을 파싱하여
 * D1 cortex_search 테이블에 bulk insert.
 *
 * Usage:
 *   node scripts/build-search-index.mjs [--dry-run]
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname, basename } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const DRY_RUN = process.argv.includes('--dry-run');
const SEARCH_DIRS = ['areas', 'projects', 'archive'];
const CF_ACCOUNT_ID = '4cf76f439654a776856c585d60f3fc18';
const DB_ID = '9da16918-a422-4b75-b542-9a30eabd2c64';

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html, fallback) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    || html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    || html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  return m ? m[1].trim().slice(0, 200) : fallback;
}

function walk(dir) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) results.push(...walk(full));
    else if (e.isFile() && extname(e.name) === '.html') results.push(full);
  }
  return results;
}

// Collect files
const docs = [];
for (const dir of SEARCH_DIRS) {
  const fullDir = join(CORTEX, dir);
  const files = walk(fullDir);
  for (const f of files) {
    const rel = relative(CORTEX, f);
    const raw = readFileSync(f, 'utf-8');
    const title = extractTitle(raw, basename(f, '.html'));
    const body = stripHtml(raw).slice(0, 800); // 800 chars for search
    const stat = statSync(f);
    docs.push({
      path: rel,
      title,
      body,
      pillar: dir,
      modified: stat.mtime.toISOString().slice(0, 10),
    });
  }
}

console.log(`[build-search-index] ${docs.length}개 파일 수집`);

if (DRY_RUN) {
  console.log('[dry-run] 첫 3개:');
  docs.slice(0, 3).forEach(d => console.log(`  ${d.path} | ${d.title}`));
  process.exit(0);
}

// Get CF API token from wrangler config
async function getCfToken() {
  const { execSync } = await import('child_process');
  const out = execSync('npx wrangler auth token 2>/dev/null || cat ~/.wrangler/config/default.toml 2>/dev/null | grep oauth_token | head -1 | cut -d\'"\' -f2', { encoding: 'utf-8' }).trim();
  if (out && out.length > 10) return out;
  // Try from environment
  return process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || null;
}

async function d1Query(token, sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result;
}

const { execSync } = await import('child_process');
let CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CF_TOKEN) {
  try {
    CF_TOKEN = execSync('npx wrangler auth token 2>/dev/null', { encoding: 'utf-8' }).trim().split('\n').pop().trim();
  } catch {}
}
if (!CF_TOKEN || CF_TOKEN.length < 10) {
  console.error('CF 토큰을 찾을 수 없습니다.');
  process.exit(1);
}
console.log('[auth] CF 토큰 확인됨');

// Batch insert via CF D1 REST API (parameterized — no SQL injection issues)
// D1 REST API supports single statement with params, so insert 1 row at a time in parallel batches
const CONCURRENCY = 20;
let total = 0, failed = 0;

for (let i = 0; i < docs.length; i += CONCURRENCY) {
  const batch = docs.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(batch.map(d =>
    d1Query(CF_TOKEN,
      'INSERT OR REPLACE INTO cortex_search (path,title,body,pillar,modified) VALUES (?,?,?,?,?)',
      [d.path, d.title, d.body, d.pillar, d.modified]
    )
  ));
  results.forEach((r, j) => {
    if (r.status === 'fulfilled') total++;
    else { failed++; if (failed <= 3) console.error(`  실패 [${batch[j].path}]:`, String(r.reason).slice(0, 100)); }
  });
  if ((i + CONCURRENCY) % 200 === 0 || i + CONCURRENCY >= docs.length) {
    console.log(`  진행: ${Math.min(i + CONCURRENCY, docs.length)}/${docs.length} (성공 ${total}, 실패 ${failed})`);
  }
}

console.log(`\n✅ 완료: ${total}/${docs.length}개 D1 삽입 (실패 ${failed})`);
