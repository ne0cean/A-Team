#!/usr/bin/env node
/**
 * onenote-fetch-missing.mjs
 * audit-onenote-pages.mjs 갭 보고서 기반으로 누락 페이지를 Graph API에서 fetch하여
 * cortex/4/interstellar-onenote/{group}/{section}/ 아래에 .md + .onenote.html 생성.
 *
 * Usage:
 *   node scripts/onenote-fetch-missing.mjs --from-audit /tmp/onenote-audit-full.json
 *   node scripts/onenote-fetch-missing.mjs --page-id "0-xxx!1-xxx!7913" --section "1_Projects/Dashbaord"
 *   node scripts/onenote-fetch-missing.mjs --from-audit /tmp/onenote-audit-full.json --dry-run
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dirname, '..', 'cortex');
const ARCHIVE_BASE = join(CORTEX, '4/interstellar-onenote');
const ATTACHMENTS = join(CORTEX, 'attachments');
const TOKEN_FILE = join(CORTEX, '.onenote-token.json');
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me/onenote';

const PAGE_ID_ARG = (() => { const i = process.argv.indexOf('--page-id'); return i >= 0 ? process.argv[i+1] : null; })();
const SECTION_ARG = (() => { const i = process.argv.indexOf('--section'); return i >= 0 ? process.argv[i+1] : null; })();
const AUDIT_FILE = (() => { const i = process.argv.indexOf('--from-audit'); return i >= 0 ? process.argv[i+1] : null; })();
const DRY_RUN = process.argv.includes('--dry-run');
const NO_IMAGES = process.argv.includes('--no-images');

if (!PAGE_ID_ARG && !AUDIT_FILE) {
  console.error('Usage: --page-id <id> --section <group/section> | --from-audit <audit.json> [--dry-run]');
  process.exit(1);
}

// ── Token ─────────────────────────────────────────────────────────────────────
function getToken() {
  const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  const age = Date.now()/1000 - (data.obtained_at || 0);
  if (age > data.expires_in - 60) {
    console.error('토큰 만료. python3 scripts/onenote-auth.py 실행 후 재시도.');
    process.exit(1);
  }
  return data.access_token;
}

// ── Graph API ─────────────────────────────────────────────────────────────────
function graphGet(url, token, binary = false) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return resolve(graphGet(res.headers.location, token, binary));
      }
      if (res.statusCode === 429) {
        const retry = parseInt(res.headers['retry-after'] || '10') * 1000;
        console.log(`  Rate limit, waiting ${retry/1000}s...`);
        return setTimeout(() => resolve(graphGet(url, token, binary)), retry);
      }
      if (res.statusCode === 401) {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          const err = new Error(`HTTP 401: 토큰 만료 — python3 scripts/onenote-auth.py 실행 후 재시도`);
          err.tokenExpired = true;
          reject(err);
        });
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

// Fetch page metadata (title, created, modified, level, order)
async function getPageMeta(pageId, token) {
  const url = `${GRAPH_BASE}/pages/${pageId}?$select=id,title,createdDateTime,lastModifiedDateTime,level,order`;
  const data = JSON.parse(await graphGet(url, token));
  return data;
}

// ── Image handling ────────────────────────────────────────────────────────────
function graphUrlToFilename(url) {
  const m = url.match(/\/resources\/([^/]+)\//);
  if (!m) return null;
  const resourceId = m[1];
  const prefix = resourceId.split('!')[0];
  return createHash('md5').update(prefix).digest('hex').slice(0, 10) + '.png';
}

async function downloadImage(url, token) {
  const filename = graphUrlToFilename(url);
  if (!filename) return null;
  const destPath = join(ATTACHMENTS, filename);
  if (existsSync(destPath)) return filename;
  try {
    const buf = await graphGet(url, token, true);
    if (!DRY_RUN) {
      mkdirSync(ATTACHMENTS, { recursive: true });
      writeFileSync(destPath, buf);
    }
    return filename;
  } catch (e) {
    console.warn(`  이미지 다운로드 실패: ${filename} — ${e.message}`);
    return filename;
  }
}

// ── Safe filename ─────────────────────────────────────────────────────────────
function safeFilename(title) {
  return title
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

// ── Resolve dest dir (flattens 3_Archive/N/SectionName → 3_Archive/SectionName) ──
function resolveDestDir(sectionPath) {
  const parts = sectionPath.split('/');
  // 3-part path like "3_Archive/Work/24_성장전략" → "3_Archive/24_성장전략"
  if (parts.length >= 3) return `${parts[0]}/${parts[parts.length - 1]}`;
  return sectionPath;
}

// ── Fetch a single missing page ───────────────────────────────────────────────
async function fetchPage(pageId, sectionPath, token) {
  const flatPath = resolveDestDir(sectionPath);
  const destDir = join(ARCHIVE_BASE, flatPath);

  // Get metadata
  let meta;
  try {
    meta = await getPageMeta(pageId, token);
  } catch (e) {
    if (e.tokenExpired) throw e; // propagate to main loop → abort
    console.error(`  메타데이터 fetch 실패 [${pageId}]: ${e.message}`);
    return false;
  }

  const title = meta.title || 'Untitled';
  const safe = safeFilename(title);
  const mdPath = join(destDir, `${safe}.md`);
  const htmlPath = join(destDir, `${safe}.onenote.html`);

  if (existsSync(mdPath)) {
    console.log(`  skip (exists): ${safe}.md`);
    return false;
  }

  // Extract section_group and section for frontmatter
  // sectionPath may be "1_Projects/Dashbaord", "3_Archive/6/6. Accumulation", etc.
  const parts = sectionPath.split('/');
  const section = parts[parts.length - 1] || '';
  const group = parts.length >= 3 ? `${parts[0]}/${parts[1]}` : parts[0] || '';

  console.log(`  fetching: "${title}" (${pageId})`);

  // Fetch HTML content
  let rawHtml;
  try {
    rawHtml = await graphGet(`${GRAPH_BASE}/pages/${pageId}/content`, token);
  } catch (e) {
    if (e.tokenExpired) throw e;
    console.warn(`  HTML fetch 실패: ${e.message}`);
    return false;
  }

  // Download images (skip if --no-images)
  const imgUrls = NO_IMAGES ? [] : [...rawHtml.matchAll(/src="(https:\/\/graph\.microsoft\.com[^"]+\/\$value)"/g)]
    .map(m => m[1]);

  if (imgUrls.length > 0) console.log(`    images: ${imgUrls.length}`);
  const urlToFile = {};
  for (const url of imgUrls) {
    const filename = await downloadImage(url, token);
    if (filename) urlToFile[url] = filename;
  }

  let processedHtml = rawHtml;
  for (const [url, filename] of Object.entries(urlToFile)) {
    processedHtml = processedHtml.replaceAll(url, `__ATTACHMENT__${filename}`);
  }

  // Build .md frontmatter
  const created = meta.createdDateTime || new Date().toISOString();
  const modified = meta.lastModifiedDateTime || created;
  const level = meta.level ?? 0;
  const order = meta.order ?? '';

  const mdContent = `---
title: "${title.replace(/"/g, '\\"')}"
notebook: "InterStellar"
section_group: "${group}"
section: "${section}"
onenote_id: "${pageId}"
level: ${level}
order: "${order}"
created: "${created}"
modified: "${modified}"
---

<!-- OneNote 원본에서 복원됨 (onenote-fetch-missing.mjs) -->
`;

  if (!DRY_RUN) {
    mkdirSync(destDir, { recursive: true });
    writeFileSync(mdPath, mdContent, 'utf8');
    writeFileSync(htmlPath, processedHtml, 'utf8');
    console.log(`    saved: ${safe}.md + .onenote.html`);
  } else {
    console.log(`    [dry-run] would create: ${safe}.md + .onenote.html`);
  }
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const token = getToken();
console.log('[fetch-missing] 토큰 확인됨.\n');

let tasks = []; // [{pageId, sectionPath, title}]

if (PAGE_ID_ARG && SECTION_ARG) {
  tasks.push({ pageId: PAGE_ID_ARG, sectionPath: SECTION_ARG, title: '(unknown)' });
} else if (AUDIT_FILE) {
  const audit = JSON.parse(readFileSync(AUDIT_FILE, 'utf8'));
  for (const s of audit.sections || []) {
    if (s.gap === 0) continue;
    // sectionPath: s.section is like "1_Projects/Dashbaord" or "Dashbaord" etc.
    const sectionPath = s.section;
    for (const p of s.missing || []) {
      tasks.push({ pageId: p.id, sectionPath, title: p.title });
    }
  }
}

console.log(`처리 대상: ${tasks.length}개 누락 페이지${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

let done = 0, skipped = 0, failed = 0;
for (const t of tasks) {
  // Fast pre-check using audit title — avoids API call for already-fetched pages
  if (t.title && t.title !== '(unknown)') {
    const flatPath = resolveDestDir(t.sectionPath);
    const destDir = join(ARCHIVE_BASE, flatPath);
    const safe = safeFilename(t.title);
    const mdPath = join(destDir, `${safe}.md`);
    if (existsSync(mdPath)) {
      skipped++;
      continue;
    }
  }

  console.log(`[${t.sectionPath}] "${t.title}"`);
  try {
    const created = await fetchPage(t.pageId, t.sectionPath, token);
    if (created) done++;
    else skipped++;
  } catch (e) {
    if (e.tokenExpired) {
      console.error(`\n토큰 만료로 중단. 완료: ${done}개 생성, ${skipped}개 스킵, ${failed}개 실패`);
      console.error('python3 scripts/onenote-auth.py 실행 후 재시도');
      process.exit(1);
    }
    console.error(`  ERROR: ${e.message}`);
    failed++;
  }
}

console.log(`\n완료: ${done}개 생성, ${skipped}개 스킵, ${failed}개 실패`);
