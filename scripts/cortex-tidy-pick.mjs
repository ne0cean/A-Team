#!/usr/bin/env node
/**
 * cortex-tidy-pick — /vibe 브리핑에 삽입할 tidy 후보 5개 선택
 * catalog.jsonl에서 unreviewed + 짧은 파일 우선 선택
 *
 * Usage: node scripts/cortex-tidy-pick.mjs
 * 출력: 브리핑용 텍스트 (stdout)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const CATALOG = join(CORTEX, 'catalog.jsonl');

if (!existsSync(CATALOG)) {
  console.log('cortex_tidy: catalog.jsonl 없음 — node scripts/cortex-catalog.mjs 먼저 실행');
  process.exit(0);
}

const catalog = readFileSync(CATALOG, 'utf-8').trim().split('\n')
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

const unreviewed = catalog.filter(e => !e.reviewed);
if (!unreviewed.length) {
  console.log('cortex_tidy: 전부 리뷰 완료! 🎉');
  process.exit(0);
}

// Sort: delete/archive recommendations first, then by line count (short first)
const prioritized = unreviewed.sort((a, b) => {
  const order = { delete: 0, archive: 1, merge: 2, keep: 3 };
  const ao = order[a.recommend] ?? 3;
  const bo = order[b.recommend] ?? 3;
  if (ao !== bo) return ao - bo;
  return a.lines - b.lines;
});

const picks = prioritized.slice(0, 5);
const reviewed = catalog.filter(e => e.reviewed).length;
const total = catalog.length;

const icons = { delete: '🗑', archive: '📦', merge: '🔗', keep: '✅' };

console.log(`📋 Cortex 정리 (${reviewed}/${total} 완료, 오늘 5개):`);
picks.forEach((p, i) => {
  const icon = icons[p.recommend] || '❓';
  // Read actual file content (skip frontmatter)
  let bodyPreview = '';
  try {
    const full = readFileSync(join(CORTEX, p.path), 'utf-8');
    const lines = full.split('\n');
    // Skip frontmatter (--- ... ---)
    let start = 0;
    if (lines[0]?.trim() === '---') {
      start = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
      start = start >= 0 ? start + 1 : 0;
    }
    const body = lines.slice(start).filter(l => l.trim()).join(' ').trim();
    bodyPreview = body ? body.slice(0, 80) : '(본문 없음)';
  } catch { bodyPreview = '(읽기 실패)'; }
  console.log(`  [${i + 1}] ${p.path} (${p.lines}줄) → ${icon}`);
  console.log(`      ${bodyPreview}`);
});
console.log(`  처리: 1d 2a 3y 4y 5d (d삭제 a보관 y유지 s스킵)`);
