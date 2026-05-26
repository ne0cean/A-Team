#!/usr/bin/env node
/**
 * cortex-tidy-apply — 사용자 응답 파싱 + 실행
 *
 * Usage: node scripts/cortex-tidy-apply.mjs "1d 2a 3y 4y 5d"
 * catalog.jsonl에서 현재 tidy 후보 5개를 재선택하고 액션 적용
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const CATALOG = join(CORTEX, 'catalog.jsonl');
const LEGACY = join(CORTEX, 'archive/legacy');

const input = process.argv[2];
if (!input) {
  console.log('Usage: cortex-tidy-apply.mjs "1d 2a 3y 4y 5s"');
  process.exit(1);
}

if (!existsSync(LEGACY)) mkdirSync(LEGACY, { recursive: true });

const catalog = readFileSync(CATALOG, 'utf-8').trim().split('\n')
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

// Re-select same picks as tidy-pick
const unreviewed = catalog.filter(e => !e.reviewed);
const prioritized = unreviewed.sort((a, b) => {
  const order = { delete: 0, archive: 1, merge: 2, keep: 3 };
  return (order[a.recommend] ?? 3) - (order[b.recommend] ?? 3) || a.lines - b.lines;
});
const picks = prioritized.slice(0, 5);

// Parse input: "1d 2a 3y 4y 5s"
const actions = input.trim().split(/\s+/).map(token => {
  const match = token.match(/^(\d)([days])/i);
  if (!match) return null;
  return { index: parseInt(match[1]) - 1, action: match[2].toLowerCase() };
}).filter(Boolean);

const results = [];
const now = new Date().toISOString().slice(0, 10);

for (const { index, action } of actions) {
  if (index < 0 || index >= picks.length) continue;
  const entry = picks[index];
  const fullPath = join(CORTEX, entry.path);

  switch (action) {
    case 'd': // delete
      if (existsSync(fullPath)) unlinkSync(fullPath);
      entry.reviewed = now;
      entry.action = 'delete';
      results.push(`🗑 삭제: ${entry.path}`);
      break;

    case 'a': // archive
      const archivePath = join(LEGACY, entry.path.split('/').pop());
      if (existsSync(fullPath)) renameSync(fullPath, archivePath);
      entry.reviewed = now;
      entry.action = 'archive';
      results.push(`📦 보관: ${entry.path}`);
      break;

    case 'y': // keep
      entry.reviewed = now;
      entry.action = 'keep';
      results.push(`✅ 유지: ${entry.path}`);
      break;

    case 's': // skip
      results.push(`⏭ 스킵: ${entry.path}`);
      break;
  }
}

// Update catalog
const catalogMap = new Map(catalog.map(e => [e.path, e]));
picks.forEach(p => catalogMap.set(p.path, p));
const updated = [...catalogMap.values()];
writeFileSync(CATALOG, updated.map(e => JSON.stringify(e)).join('\n') + '\n');

results.forEach(r => console.log(r));
const reviewedCount = updated.filter(e => e.reviewed).length;
console.log(`\n진행: ${reviewedCount}/${updated.length} (${(reviewedCount/updated.length*100).toFixed(1)}%)`);
