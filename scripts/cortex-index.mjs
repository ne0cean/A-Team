#!/usr/bin/env node
/**
 * cortex 전체 md를 MeiliSearch에 인덱싱
 * Usage: node scripts/cortex-index.mjs [--rebuild]
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const MEILI = 'http://127.0.0.1:7700';
const INDEX = 'cortex';
const SKIP_DIRS = new Set(['.obsidian', '.git', 'data', 'inbox/attachments']);

function walk(dir, base = CORTEX) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = relative(base, full);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(rel) || e.name.startsWith('.')) continue;
      results.push(...walk(full, base));
    } else if (e.isFile() && extname(e.name) === '.md') {
      try {
        const content = readFileSync(full, 'utf-8');
        const stat = statSync(full);
        const lines = content.split('\n');
        const title = lines[0]?.replace(/^#\s*/, '').replace(/^title:\s*"?([^"]*)"?.*/, '$1').trim() || e.name.replace('.md', '');
        // Extract pillar from path
        const pillarMatch = rel.match(/^hexagonal pillars_rocks_helm\/(\d-[^/]+)/);
        const pillar = pillarMatch ? pillarMatch[1] : (rel.startsWith('projects') ? 'projects' : 'other');

        results.push({
          id: rel.replace(/[^a-zA-Z0-9가-힣]/g, '_'),
          path: rel,
          filename: e.name.replace('.md', ''),
          title,
          pillar,
          content: content.slice(0, 5000), // first 5000 chars for search
          modified: stat.mtime.toISOString().slice(0, 10),
          lines: lines.length,
        });
      } catch {}
    }
  }
  return results;
}

async function indexAll() {
  const docs = walk(CORTEX);
  console.log(`[index] ${docs.length} documents found`);

  // Create/configure index
  const rebuild = process.argv.includes('--rebuild');
  if (rebuild) {
    await fetch(`${MEILI}/indexes/${INDEX}`, { method: 'DELETE' });
    await new Promise(r => setTimeout(r, 500));
  }

  await fetch(`${MEILI}/indexes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: INDEX, primaryKey: 'id' }),
  });

  // Configure searchable/filterable attributes
  await fetch(`${MEILI}/indexes/${INDEX}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchableAttributes: ['content', 'title', 'filename', 'path'],
      filterableAttributes: ['pillar', 'modified'],
      sortableAttributes: ['modified', 'lines'],
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 } },
    }),
  });

  // Batch upload (1000 per batch)
  for (let i = 0; i < docs.length; i += 1000) {
    const batch = docs.slice(i, i + 1000);
    const res = await fetch(`${MEILI}/indexes/${INDEX}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const result = await res.json();
    console.log(`[index] Batch ${i / 1000 + 1}: ${batch.length} docs → taskUid ${result.taskUid}`);
  }

  // Wait for indexing
  await new Promise(r => setTimeout(r, 2000));
  const stats = await (await fetch(`${MEILI}/indexes/${INDEX}/stats`)).json();
  console.log(`[index] Done. ${stats.numberOfDocuments} documents indexed.`);
}

indexAll().catch(e => console.error(e));
