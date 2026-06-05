#!/usr/bin/env node
/**
 * reorganize-cortex.mjs — OneNote 원본 구조를 PARA + 6기둥 통합 구조로 재편
 *
 * Target: cortex/{para}/{pillar}/{files}
 *   - areas/{pillar}/     — 지속 관심사 (종료 없음)
 *   - projects/{pillar}/  — 프로젝트 (종료 있음)
 *   - archives/{pillar}/  — 비활성
 *
 * Usage:
 *   node scripts/reorganize-cortex.mjs --dry-run
 *   node scripts/reorganize-cortex.mjs --apply
 */

import { readdir, readFile, rename, mkdir, stat } from 'fs/promises';
import { join } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');

const PILLARS = ['character', 'interstellar', 'life-x-lab', 'mo-chuisle', 'snowball', 'string'];

// ── Mapping: OneNote section → { para, pillar, subfolder? } ──

const SECTION_MAP = {
  // InterStellar/2_6 hexagonal pillars → areas
  '1. Character': { para: 'areas', pillar: 'character' },

  // InterStellar/1_Projects → projects (with pillar assignment)
  'MK1': { para: 'projects', pillar: 'interstellar', sub: 'mk1' },
  'Dashbaord': { para: 'projects', pillar: 'interstellar', sub: 'dashboard' },
  'Side hutle': { para: 'projects', pillar: 'snowball', sub: 'side-hustle' },
  'A TEAM': { para: 'projects', pillar: 'interstellar', sub: 'a-team' },
  'MKT_FB': { para: 'projects', pillar: 'interstellar', sub: 'mkt-fb' },
  '1_': { para: 'projects', pillar: 'interstellar', sub: 'misc' },
  'Writing': { para: 'areas', pillar: 'character', sub: 'writing' },
  '2. SLL': { para: 'areas', pillar: 'string' },
  '3. HFK': { para: 'areas', pillar: 'mo-chuisle' },
  '5. Sport': { para: 'areas', pillar: 'life-x-lab' },

  // Archive → archives
  "'16_정책팀": { para: 'archives', pillar: 'interstellar', sub: '16-정책팀' },
  "'17_CVM": { para: 'archives', pillar: 'interstellar', sub: '17-cvm' },
  "'18_CVM": { para: 'archives', pillar: 'interstellar', sub: '18-cvm' },
  "'19_PPG": { para: 'archives', pillar: 'interstellar', sub: '19-ppg' },
  "'12년 Jump-up": { para: 'archives', pillar: 'interstellar', sub: '12-jump-up' },

  // 2018 SK그룹 신입연수
  'Operation': { para: 'archives', pillar: 'interstellar', sub: '18-신입연수' },
  'Note': { para: 'archives', pillar: 'interstellar', sub: '18-신입연수' },
};

// ── Existing pillars/ → areas/ mapping ──
const PILLAR_TO_AREA = {
  'character': { para: 'areas', pillar: 'character' },
  'interstellar': { para: 'areas', pillar: 'interstellar' },
  'life-x-lab': { para: 'areas', pillar: 'life-x-lab' },
  'mo-chuisle': { para: 'areas', pillar: 'mo-chuisle' },
  'snowball': { para: 'areas', pillar: 'snowball' },
  'string': { para: 'areas', pillar: 'string' },
};

// ── Existing areas/ → new areas/{pillar} mapping ──
const OLD_AREA_MAP = {
  'dev': 'interstellar',
  'marketing': 'interstellar',
  'strategy': 'interstellar',
  'life': 'life-x-lab',
  'wellness': 'life-x-lab',
  'writing': 'character',
};

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

async function getFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let files = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        files = files.concat(await getFiles(full));
      } else if (e.name.endsWith('.md')) {
        files.push(full);
      }
    }
    return files;
  } catch { return []; }
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');

  const moves = [];

  // ── 1. OneNote imported files (InterStellar/, Archive/, 2018 SK그룹 신입연수/) ──
  const onenoteRoots = ['InterStellar', 'Archive', '2018 SK그룹 신입연수'];
  for (const root of onenoteRoots) {
    const rootPath = join(CORTEX, root);
    const files = await getFiles(rootPath);
    for (const filePath of files) {
      let content = '';
      try { content = await readFile(filePath, 'utf-8'); } catch { continue; }
      const meta = extractMeta(content);
      const section = meta.section;
      const mapping = section ? SECTION_MAP[section] : null;

      let dest;
      if (mapping) {
        const parts = [mapping.para, mapping.pillar];
        if (mapping.sub) parts.push(mapping.sub);
        dest = parts.join('/');
      } else {
        dest = `archives/interstellar/_unmapped`;
      }
      moves.push({ from: filePath, dest, file: filePath.split('/').pop() });
    }
  }

  // ── 2. Existing pillars/ → areas/{pillar} ──
  for (const pillar of PILLARS) {
    const pillarPath = join(CORTEX, 'pillars', pillar);
    const files = await getFiles(pillarPath);
    for (const filePath of files) {
      moves.push({
        from: filePath,
        dest: `areas/${pillar}`,
        file: filePath.split('/').pop(),
      });
    }
  }

  // ── 3. Existing areas/{old} → areas/{pillar} ──
  for (const [oldArea, pillar] of Object.entries(OLD_AREA_MAP)) {
    const areaPath = join(CORTEX, 'areas', oldArea);
    const files = await getFiles(areaPath);
    for (const filePath of files) {
      moves.push({
        from: filePath,
        dest: `areas/${pillar}/${oldArea}`,
        file: filePath.split('/').pop(),
      });
    }
  }

  // ── Stats ──
  const byDest = {};
  for (const m of moves) {
    byDest[m.dest] = (byDest[m.dest] || 0) + 1;
  }

  console.log(`Total files to move: ${moves.length}\n`);
  console.log('=== Target Structure ===');
  for (const [dest, count] of Object.entries(byDest).sort()) {
    console.log(`  cortex/${dest}/ (${count})`);
  }

  if (!apply && !dryRun) {
    console.log('\nUse --dry-run or --apply');
    return;
  }

  if (dryRun) {
    console.log('\n=== Sample Moves (first 30) ===');
    for (const m of moves.slice(0, 30)) {
      const rel = m.from.replace(CORTEX + '/', '');
      console.log(`  ${rel} → ${m.dest}/`);
    }
    console.log(`  ... (${moves.length} total)`);
    return;
  }

  if (apply) {
    let moved = 0, failed = 0;
    for (const m of moves) {
      const destDir = join(CORTEX, m.dest);
      await mkdir(destDir, { recursive: true });
      const destPath = join(destDir, m.file);
      try {
        await rename(m.from, destPath);
        moved++;
      } catch (e) {
        if (e.code === 'ENOENT') continue; // already moved
        console.error(`  FAIL: ${m.file} — ${e.message}`);
        failed++;
      }
    }
    console.log(`\nMoved: ${moved}, Failed: ${failed}`);
  }
}

run().catch(console.error);
