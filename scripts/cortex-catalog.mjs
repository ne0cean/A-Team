#!/usr/bin/env node
/**
 * cortex/catalog.jsonl 생성 — 전체 파일 인덱스
 * 각 파일의 경로, 줄 수, 첫 3줄, 크기, 수정일 기록
 *
 * Usage: node scripts/cortex-catalog.mjs [--refresh]
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const CATALOG = join(CORTEX, 'catalog.jsonl');
const SKIP_DIRS = new Set(['.obsidian', '.git', 'archive', 'Archive', 'data', 'inbox/attachments']);
const SKIP_EXTS = new Set(['.json', '.jsonl', '.bak', '.bak1', '.bak2', '.bak3', '.png', '.jpg', '.ogg', '.pdf']);

function walk(dir, base = CORTEX) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = relative(base, full);

    if (e.isDirectory()) {
      if (SKIP_DIRS.has(rel) || e.name.startsWith('.')) continue;
      results.push(...walk(full, base));
    } else if (e.isFile() && extname(e.name) === '.md') {
      try {
        const stat = statSync(full);
        const content = readFileSync(full, 'utf-8');
        const lines = content.split('\n');
        const preview = lines.slice(0, 3).join(' ').replace(/^---\s*/, '').trim().slice(0, 120);
        const lineCount = lines.length;

        // Auto-recommend action
        let recommend = 'keep';
        if (lineCount <= 3) recommend = 'delete';
        else if (/^untitled/i.test(e.name)) recommend = 'delete';
        else if (/^Sample/i.test(e.name)) recommend = 'delete';
        else if (/^Dash board/i.test(e.name)) recommend = 'archive';
        else if (/^Source[_.]|^자료원/i.test(e.name)) recommend = 'merge';

        results.push({
          path: rel,
          lines: lineCount,
          bytes: stat.size,
          modified: stat.mtime.toISOString().slice(0, 10),
          preview,
          recommend,
          reviewed: false,
        });
      } catch { /* skip unreadable */ }
    }
  }
  return results;
}

// Load existing catalog to preserve reviewed status
const existing = new Map();
if (existsSync(CATALOG) && !process.argv.includes('--refresh')) {
  readFileSync(CATALOG, 'utf-8').trim().split('\n').filter(Boolean).forEach(line => {
    try {
      const entry = JSON.parse(line);
      if (entry.reviewed) existing.set(entry.path, entry);
    } catch {}
  });
}

const entries = walk(CORTEX);

// Merge: preserve reviewed status from existing
const output = entries.map(e => {
  const prev = existing.get(e.path);
  if (prev && prev.reviewed) {
    return { ...e, reviewed: prev.reviewed, action: prev.action };
  }
  return e;
});

// Write
const content = output.map(e => JSON.stringify(e)).join('\n') + '\n';
writeFileSync(CATALOG, content);

// Stats
const total = output.length;
const reviewed = output.filter(e => e.reviewed).length;
const delRec = output.filter(e => e.recommend === 'delete').length;
const archRec = output.filter(e => e.recommend === 'archive').length;

console.log(`[catalog] ${total} files indexed`);
console.log(`[catalog] ${reviewed} reviewed, ${total - reviewed} pending`);
console.log(`[catalog] Auto-recommend: ${delRec} delete, ${archRec} archive`);
console.log(`[catalog] Saved: ${CATALOG}`);
