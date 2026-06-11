#!/usr/bin/env node
/**
 * verify-migration.mjs
 * SECTION_MAP 기반 마이그레이션 완료 검증.
 * source .onenote.html 수 vs output .html 수를 비교.
 * 80% 미만이면 exit 1.
 *
 * Usage:
 *   node scripts/verify-migration.mjs
 *   node scripts/verify-migration.mjs --threshold 0.9
 */

import { readdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dirname, '../cortex');
const ARCHIVE_BASE = join(CORTEX, '4/interstellar-onenote');

const THRESHOLD_ARG = (() => {
  const i = process.argv.indexOf('--threshold');
  return i >= 0 ? parseFloat(process.argv[i + 1]) : 0.8;
})();

// Must match migrate-onenote-html.mjs SECTION_MAP
const SECTION_MAP = [
  { src: '2_6 hexagonal pillars_Rocks_Helm/1. Character',    dst: 'areas/1-character' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/2. Mo chuisle',   dst: 'areas/2-mo-chuisle' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/3. String',       dst: 'areas/3-string' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/4. Interstellar', dst: 'areas/4-interstellar' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/5. Life Xlab',    dst: 'areas/5-life-xlab' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/6. Snowball',     dst: 'areas/6-snowball' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/Futures options', dst: 'areas/futures-options' },
  { src: '2_6 hexagonal pillars_Rocks_Helm/Zeroing',         dst: 'areas/zeroing' },
  { src: '1_Projects/1_',          dst: 'projects/1_' },
  { src: '1_Projects/2. SLL',      dst: 'projects/2-sll' },
  { src: '1_Projects/3. HFK',      dst: 'projects/3-hfk' },
  { src: '1_Projects/5. Sport',    dst: 'projects/5-sport' },
  { src: '1_Projects/A TEAM',      dst: 'projects/a-team' },
  { src: '1_Projects/Dashbaord',   dst: 'projects/dashboard' },
  { src: '1_Projects/MK1',         dst: 'projects/mk1' },
  { src: '1_Projects/MKT_FB',      dst: 'projects/mkt-fb' },
  { src: '1_Projects/Side hutle',  dst: 'projects/side-hustle' },
  { src: '1_Projects/Writing',     dst: 'projects/writing' },
  { src: '1_Projects/Dashbaord/1. Character',    dst: 'projects/dashboard/1-character' },
  { src: '1_Projects/Dashbaord/3. String',       dst: 'projects/dashboard/3-string' },
  { src: '1_Projects/Dashbaord/4. Interstellar', dst: 'projects/dashboard/4-interstellar' },
  { src: '1_Projects/Dashbaord/5. Life Xlab',    dst: 'projects/dashboard/5-life-xlab' },
  { src: '1_Projects/Dashbaord/6. Snowball',     dst: 'projects/dashboard/6-snowball' },
  { src: '1_Projects/Dashbaord/2. Block chain',  dst: 'projects/dashboard/2-blockchain' },
  { src: '3_Archive/1. Character',        dst: 'archive/1-character' },
  { src: '3_Archive/2. Cyrano Scenario',  dst: 'archive/2-cyrano-scenario' },
  { src: '3_Archive/2. Mo chuisle',       dst: 'archive/2-mo-chuisle' },
  { src: '3_Archive/24_성장전략',          dst: 'archive/24-growth-strategy' },
  { src: '3_Archive/25_AI전략팀',          dst: 'archive/25-ai-strategy' },
  { src: '3_Archive/26_SD',               dst: 'archive/26-sd' },
  { src: '3_Archive/3. Solidarity',       dst: 'archive/3-solidarity' },
  { src: '3_Archive/4. Interstellar',     dst: 'archive/4-interstellar' },
  { src: '3_Archive/5. Life Xlab',        dst: 'archive/5-life-xlab' },
  { src: '3_Archive/6. Accumulation',     dst: 'archive/6-accumulation' },
  { src: '3_Archive/Career',              dst: 'archive/career' },
  { src: '3_Archive/Skill',               dst: 'archive/skill' },
];

async function countFiles(dir, ext) {
  try {
    const files = await readdir(dir);
    return files.filter(f => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

async function main() {
  console.log('🔍 마이그레이션 검증 시작 (threshold:', THRESHOLD_ARG * 100 + '%)\n');

  let hasError = false;
  let totalSrc = 0, totalDst = 0;

  for (const { src, dst } of SECTION_MAP) {
    const srcCount = await countFiles(join(ARCHIVE_BASE, src), '.onenote.html');
    const dstCount = await countFiles(join(CORTEX, dst), '.html');
    totalSrc += srcCount;
    totalDst += dstCount;

    if (srcCount === 0) continue; // src 없으면 스킵

    const ratio = srcCount > 0 ? dstCount / srcCount : 1;
    const status = ratio >= THRESHOLD_ARG ? '✅' : '❌';
    const ratioStr = `${dstCount}/${srcCount} (${Math.round(ratio * 100)}%)`;

    if (ratio < THRESHOLD_ARG) {
      console.error(`${status} GAP: ${src.padEnd(50)} ${ratioStr}`);
      hasError = true;
    } else {
      console.log(`${status} ${src.padEnd(50)} ${ratioStr}`);
    }
  }

  // 소스에 있지만 SECTION_MAP에 없는 최상위 섹션 감지
  console.log('\n🔎 SECTION_MAP 커버리지 체크...');
  const mappedSrcs = new Set(SECTION_MAP.map(s => s.src.split('/')[0]));
  try {
    const topDirs = (await readdir(ARCHIVE_BASE, { withFileTypes: true }))
      .filter(e => e.isDirectory())
      .map(e => e.name);
    for (const dir of topDirs) {
      if (!mappedSrcs.has(dir)) {
        const count = await countFiles(join(ARCHIVE_BASE, dir), '.onenote.html');
        if (count > 0) {
          console.error(`⚠️  미포함 섹션: ${dir} (${count}개 .onenote.html 있음)`);
          hasError = true;
        }
      }
    }
  } catch (e) {
    console.warn('  커버리지 체크 실패:', e.message);
  }

  console.log(`\n${'─'.repeat(60)}`);
  const totalRatio = totalSrc > 0 ? Math.round(totalDst / totalSrc * 100) : 0;
  console.log(`총계: src=${totalSrc} dst=${totalDst} (${totalRatio}%)`);

  if (hasError) {
    console.error('\n❌ FAIL — 미마이그레이션 섹션 또는 갭 발견');
    process.exit(1);
  } else {
    console.log('\n✅ PASS — 모든 섹션 완료 기준 충족');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
