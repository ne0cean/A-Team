#!/usr/bin/env node
/**
 * onenote-fetch-html.mjs
 * Graph API에서 페이지 HTML 원본을 다운로드하고 이미지를 attachments/에 저장.
 * .onenote.html 파일을 소스 .md 옆에 저장하면, migrate-onenote-html.mjs가 우선 사용함.
 *
 * Usage:
 *   node scripts/onenote-fetch-html.mjs --page "cortex/4/.../Vision Board.md"
 *   node scripts/onenote-fetch-html.mjs --section "2_6 hexagonal pillars_Rocks_Helm/Zeroing"
 *   node scripts/onenote-fetch-html.mjs --all   (모든 .md onenote_id 대상)
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { readdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dirname, '..', 'cortex');
const ARCHIVE_BASE = join(CORTEX, '4/interstellar-onenote');
const ATTACHMENTS = join(CORTEX, 'attachments');
const TOKEN_FILE = join(CORTEX, '.onenote-token.json');
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me/onenote';

// ── Args ──────────────────────────────────────────────────────────────────────
const PAGE_ARG = (() => { const i = process.argv.indexOf('--page'); return i >= 0 ? process.argv[i+1] : null; })();
const SECTION_ARG = (() => { const i = process.argv.indexOf('--section'); return i >= 0 ? process.argv[i+1] : null; })();
const ALL = process.argv.includes('--all');
const DRY_RUN = process.argv.includes('--dry-run');

if (!PAGE_ARG && !SECTION_ARG && !ALL) {
  console.error('Usage: --page <md> | --section <section-path> | --all [--dry-run]');
  process.exit(1);
}

// ── Token ─────────────────────────────────────────────────────────────────────
async function getToken() {
  try {
    const data = JSON.parse(await readFile(TOKEN_FILE, 'utf8'));
    const age = Date.now()/1000 - (data.obtained_at || 0);
    if (age > data.expires_in - 60) {
      console.error('토큰 만료. python3 scripts/onenote-auth.py 실행 후 재시도.');
      process.exit(1);
    }
    return data.access_token;
  } catch {
    console.error('토큰 없음. python3 scripts/onenote-auth.py 먼저 실행.');
    process.exit(1);
  }
}

// ── Graph API ─────────────────────────────────────────────────────────────────
async function graphGet(url, token, binary = false) {
  const { default: https } = await import('https');
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return resolve(graphGet(res.headers.location, token, binary));
      }
      if (res.statusCode === 429) {
        const retry = parseInt(res.headers['retry-after'] || '10') * 1000;
        console.log(`  Rate limit, waiting ${retry/1000}s...`);
        setTimeout(() => resolve(graphGet(url, token, binary)), retry);
        return;
      }
      if (res.statusCode !== 200) {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,200)}`)));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(binary ? buf : buf.toString('utf8'));
      });
    });
    req.on('error', reject);
  });
}

// ── MD5 filename (same as migrate-onenote-html.mjs) ───────────────────────────
function graphUrlToFilename(url) {
  const m = url.match(/\/resources\/([^/]+)\//);
  if (!m) return null;
  const resourceId = m[1];
  const prefix = resourceId.split('!')[0];
  return createHash('md5').update(prefix).digest('hex').slice(0, 10) + '.png';
}

// ── Download image ─────────────────────────────────────────────────────────────
async function downloadImage(url, token) {
  const filename = graphUrlToFilename(url);
  if (!filename) return null;
  const destPath = join(ATTACHMENTS, filename);
  try { await access(destPath); return filename; } catch {} // already exists

  try {
    const buf = await graphGet(url, token, true);
    if (!DRY_RUN) await writeFile(destPath, buf);
    return filename;
  } catch (e) {
    console.warn(`  이미지 다운로드 실패: ${filename} — ${e.message}`);
    return filename; // return filename anyway so path is correct
  }
}

// ── Parse frontmatter ─────────────────────────────────────────────────────────
function parseOnenoteId(content) {
  const m = content.match(/onenote_id:\s*"([^"]+)"/);
  return m ? m[1] : null;
}
function parseTitle(content) {
  const m = content.match(/title:\s*"([^"]+)"/);
  return m ? m[1] : null;
}
function parseDate(content) {
  const m = content.match(/(?:modified|created):\s*"([^"]+)"/);
  if (!m) return '';
  try {
    return new Date(m[1]).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  } catch { return m[1]; }
}

// ── Process single .md file ───────────────────────────────────────────────────
async function processMdFile(mdPath, token) {
  const content = await readFile(mdPath, 'utf8');
  const onenoteId = parseOnenoteId(content);
  if (!onenoteId) {
    console.log(`  skip (no onenote_id): ${basename(mdPath)}`);
    return;
  }

  const title = parseTitle(content) || basename(mdPath, '.md');
  const date = parseDate(content);
  const htmlPath = mdPath.replace(/\.md$/, '.onenote.html');

  // Skip if already downloaded
  try { await access(htmlPath); console.log(`  skip (exists): ${basename(htmlPath)}`); return; } catch {}

  console.log(`  fetching: ${title}`);

  // Fetch Graph API HTML
  let rawHtml;
  try {
    rawHtml = await graphGet(`${GRAPH_BASE}/pages/${onenoteId}/content`, token);
  } catch (e) {
    console.warn(`  fetch failed: ${e.message}`);
    return;
  }

  // Find and download all images
  const imgUrls = [...rawHtml.matchAll(/src="(https:\/\/graph\.microsoft\.com[^"]+\/\$value)"/g)]
    .map(m => m[1]);

  console.log(`    images: ${imgUrls.length}`);
  const urlToFile = {};
  for (const url of imgUrls) {
    const filename = await downloadImage(url, token);
    if (filename) urlToFile[url] = filename;
  }

  // Replace image URLs with local paths (relative from source dir to cortex/attachments)
  // .onenote.html is saved alongside .md in archive dir
  // The final migration output is in cortex/2/zeroing/ etc. (depth varies)
  // We store placeholder and let migrate-onenote-html.mjs resolve final paths
  let processedHtml = rawHtml;
  for (const [url, filename] of Object.entries(urlToFile)) {
    processedHtml = processedHtml.replaceAll(url, `__ATTACHMENT__${filename}`);
  }

  if (!DRY_RUN) await writeFile(htmlPath, processedHtml, 'utf8');
  console.log(`    saved: ${basename(htmlPath)} (${processedHtml.length} bytes)`);
}

// ── Collect .md files ─────────────────────────────────────────────────────────
async function collectMdFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...await collectMdFiles(p));
    else if (e.name.endsWith('.md')) files.push(p);
  }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const token = await getToken();
await mkdir(ATTACHMENTS, { recursive: true });

let mdFiles = [];

if (PAGE_ARG) {
  const absPath = PAGE_ARG.startsWith('/') ? PAGE_ARG : join(process.cwd(), PAGE_ARG);
  mdFiles = [absPath];
} else if (SECTION_ARG) {
  const sectionDir = join(ARCHIVE_BASE, SECTION_ARG);
  mdFiles = await collectMdFiles(sectionDir);
} else if (ALL) {
  mdFiles = await collectMdFiles(ARCHIVE_BASE);
}

console.log(`\n처리 대상: ${mdFiles.length}개 파일${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

let done = 0, skipped = 0;
for (const mdPath of mdFiles) {
  try {
    await processMdFile(mdPath, token);
    done++;
  } catch (e) {
    console.warn(`  ERROR: ${mdPath} — ${e.message}`);
    skipped++;
  }
}
console.log(`\n완료: ${done}개, 스킵: ${skipped}개`);
