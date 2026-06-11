#!/usr/bin/env node
/**
 * audit-onenote-pages.mjs
 * Graph API 전체 페이지 vs 로컬 .md 파일 1:1 비교.
 * 내보내기 단계에서 누락된 페이지를 섹션별로 보고.
 *
 * Usage:
 *   node scripts/audit-onenote-pages.mjs
 *   node scripts/audit-onenote-pages.mjs --section "Dashbaord"
 *   node scripts/audit-onenote-pages.mjs --json > gap.json
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dirname, '..', 'cortex');
const ARCHIVE_BASE = join(CORTEX, '4/interstellar-onenote');
const TOKEN_FILE = join(CORTEX, '.onenote-token.json');
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me/onenote';
const INTERSTELLAR_ID = '0-733661839CC53BA5!7896';

const SECTION_FILTER = (() => {
  const i = process.argv.indexOf('--section');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const JSON_MODE = process.argv.includes('--json');

// ── Token ────────────────────────────────────────────────────────────────────
function getToken() {
  const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  const age = Date.now() / 1000 - (data.obtained_at || 0);
  if (age > data.expires_in - 60) {
    console.error('토큰 만료. python3 scripts/onenote-auth.py 실행 후 재시도.');
    process.exit(1);
  }
  return data.access_token;
}

// ── Graph API (nextLink 기반 완전 pagination) ──────────────────────────────
function graphGet(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
      if (res.statusCode === 429) {
        const retry = parseInt(res.headers['retry-after'] || '10') * 1000;
        setTimeout(() => resolve(graphGet(url, token)), retry);
        return;
      }
      if (res.statusCode >= 400) {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`)));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
    });
    req.on('error', reject);
  });
}

async function getAllPages(sectionId, token) {
  const pages = [];
  let url = `${GRAPH_BASE}/sections/${sectionId}/pages?$select=id,title,parentSection&$top=100`;
  while (url) {
    const data = await graphGet(url, token);
    pages.push(...(data.value || []));
    url = data['@odata.nextLink'] || null;
  }
  return pages;
}

// ── Load local .md onenote_ids ────────────────────────────────────────────────
function walkMd(dir) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) results.push(...walkMd(full));
    else if (e.isFile() && e.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function extractOnenoteId(content) {
  const m = content.match(/onenote_id:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function loadLocalIds() {
  const mdFiles = walkMd(ARCHIVE_BASE);
  const idToPath = {};
  for (const f of mdFiles) {
    try {
      const content = readFileSync(f, 'utf8');
      const id = extractOnenoteId(content);
      if (id) idToPath[id] = f;
    } catch {}
  }
  return idToPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const token = getToken();
if (!JSON_MODE) console.log('[audit] 토큰 확인됨. Graph API 조회 시작...\n');

// Get InterStellar sections
const sectionsData = await graphGet(
  `${GRAPH_BASE}/notebooks/${INTERSTELLAR_ID}/sections?$select=id,displayName&$top=100`,
  token
);
const sections = sectionsData.value || [];
if (!JSON_MODE) console.log(`[audit] InterStellar 섹션 수: ${sections.length}`);

// Also check section groups
const sgData = await graphGet(
  `${GRAPH_BASE}/notebooks/${INTERSTELLAR_ID}/sectionGroups?$select=id,displayName`,
  token
);
const sectionGroups = sgData.value || [];
if (sectionGroups.length > 0 && !JSON_MODE) {
  console.log(`[audit] 섹션 그룹 수: ${sectionGroups.length}`);
  for (const sg of sectionGroups) {
    const sgSections = await graphGet(
      `${GRAPH_BASE}/sectionGroups/${sg.id}/sections?$select=id,displayName`,
      token
    );
    for (const s of sgSections.value || []) {
      s._group = sg.displayName;
      sections.push(s);
    }
  }
  if (!JSON_MODE) console.log(`[audit] 전체 섹션 (그룹 포함): ${sections.length}`);
}

// Load local IDs
const localIds = loadLocalIds();
if (!JSON_MODE) console.log(`[audit] 로컬 .md onenote_id 수: ${Object.keys(localIds).length}`);
if (!JSON_MODE) console.log('');

// Audit per section
const gapReport = [];
let totalApi = 0, totalMd = 0, totalGap = 0;

const sectionsToAudit = SECTION_FILTER
  ? sections.filter(s => s.displayName.toLowerCase().includes(SECTION_FILTER.toLowerCase()))
  : sections;

for (const section of sectionsToAudit) {
  const sectionName = section._group
    ? `${section._group}/${section.displayName}`
    : section.displayName;

  if (!JSON_MODE) process.stdout.write(`  [${sectionName}] 조회 중...`);

  let pages;
  try {
    pages = await getAllPages(section.id, token);
  } catch (e) {
    if (!JSON_MODE) console.log(` ERROR: ${e.message}`);
    continue;
  }

  // Find pages not in local .md
  const missing = [];
  for (const p of pages) {
    if (!localIds[p.id]) {
      missing.push({ id: p.id, title: p.title || '(no title)' });
    }
  }

  const localCount = pages.filter(p => localIds[p.id]).length;

  totalApi += pages.length;
  totalMd += localCount;
  totalGap += missing.length;

  gapReport.push({
    section: sectionName,
    sectionId: section.id,
    api: pages.length,
    local: localCount,
    gap: missing.length,
    missing,
  });

  if (!JSON_MODE) {
    if (missing.length > 0) {
      console.log(` API=${pages.length}, local=${localCount}, GAP=${missing.length} ❌`);
      for (const m of missing) {
        console.log(`    - "${m.title}" (${m.id})`);
      }
    } else {
      console.log(` API=${pages.length}, local=${localCount} ✅`);
    }
  }
}

if (JSON_MODE) {
  console.log(JSON.stringify({ totalApi, totalMd, totalGap, sections: gapReport }, null, 2));
} else {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`총 Graph API 페이지: ${totalApi}`);
  console.log(`총 로컬 .md 매칭:    ${totalMd}`);
  console.log(`총 갭 (미내보내기):  ${totalGap}`);
  console.log('═══════════════════════════════════════════');

  if (totalGap > 0) {
    console.log('\n갭 섹션 요약:');
    for (const r of gapReport.filter(r => r.gap > 0)) {
      console.log(`  [${r.section}] GAP=${r.gap} (API=${r.api}, local=${r.local})`);
    }
  }
}
