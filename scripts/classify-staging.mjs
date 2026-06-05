#!/usr/bin/env node
/**
 * classify-staging.mjs — staging 파일을 OneNote 원본 구조로 재현
 *
 * 구조: cortex/{notebook}/{section_group}/{section}/{file}.md
 * 예: cortex/InterStellar/2_6 hexagonal pillars/1. Character/S Kills.md
 *
 * Usage:
 *   node scripts/classify-staging.mjs --dry-run
 *   node scripts/classify-staging.mjs --apply
 *   node scripts/classify-staging.mjs --stats
 */

import { readdir, readFile, rename, mkdir } from 'fs/promises';
import { join } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const STAGING = join(CORTEX, 'staging');

function sanitize(name) {
  // 파일시스템 안전한 디렉토리명으로 변환
  return name
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\//g, '_')
    .trim();
}

function extractMeta(content) {
  const meta = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return meta;
  for (const line of fmMatch[1].split('\n')) {
    const m = line.match(/^(\w[\w_]*?):\s*"(.*)"\s*$/);
    if (m) meta[m[1]] = m[2];
  }
  return meta;
}

async function classify() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statsOnly = args.includes('--stats');
  const apply = args.includes('--apply');

  const files = await readdir(STAGING);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  console.log(`Staging: ${mdFiles.length} files\n`);

  const results = { byPath: {}, noMeta: [] };
  const moves = [];

  for (const file of mdFiles) {
    let content = '';
    try {
      content = await readFile(join(STAGING, file), 'utf-8');
    } catch { continue; }

    const meta = extractMeta(content);
    const notebook = meta.notebook ? sanitize(meta.notebook) : null;
    const sectionGroup = meta.section_group ? sanitize(meta.section_group) : null;
    const section = meta.section ? sanitize(meta.section) : null;

    let destParts = [];

    if (notebook) {
      destParts.push(notebook);
      if (sectionGroup) destParts.push(sectionGroup);
      if (section) destParts.push(section);
    } else if (section) {
      // notebook 없이 section만 있는 경우
      destParts.push('_unsorted', section);
    } else {
      destParts.push('_unsorted');
    }

    const destDir = destParts.join('/');
    results.byPath[destDir] = (results.byPath[destDir] || 0) + 1;
    moves.push({ file, dest: destDir });
  }

  // Stats
  console.log('=== Directory Structure ===');
  for (const [path, count] of Object.entries(results.byPath).sort()) {
    console.log(`  ${path}/ (${count})`);
  }
  console.log(`\nTotal: ${moves.length}`);

  if (statsOnly) return;

  if (dryRun) {
    console.log('\n=== Moves ===');
    for (const m of moves) {
      console.log(`  ${m.file} → ${m.dest}/`);
    }
    return;
  }

  if (apply) {
    let moved = 0;
    for (const m of moves) {
      const destDir = join(CORTEX, m.dest);
      await mkdir(destDir, { recursive: true });
      try {
        await rename(join(STAGING, m.file), join(destDir, m.file));
        moved++;
      } catch (e) {
        console.error(`  FAIL: ${m.file} → ${e.message}`);
      }
    }
    console.log(`Moved: ${moved}/${moves.length}`);
  } else {
    console.log('\nUse --dry-run to preview or --apply to execute.');
  }
}

classify().catch(console.error);
