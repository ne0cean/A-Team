#!/usr/bin/env node
/**
 * wiki-ingest.mjs — Cortex 새 노트 자동 분류
 *
 * Usage:
 *   node scripts/wiki-ingest.mjs <file.md>           # 단일 파일 분류 제안
 *   node scripts/wiki-ingest.mjs --scan               # inbox/ 전체 스캔
 *   node scripts/wiki-ingest.mjs --move <file> <dest>  # 실제 이동
 */

import { readFileSync, readdirSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dir, '..', 'cortex');
const INBOX = join(CORTEX, 'inbox');

const PILLAR_KEYWORDS = {
  'pillars/character': ['운동', '건강', '웰니스', 'zone2', '명상', '습관', '영어', '스픽', 'ielts', '독서', '학습', 'python', 'figma', '자기계발', 'training', 'diet', '비염', '마사지'],
  'pillars/mo-chuisle': ['가족', '결혼', '육아', '부모', '아버지', '엄마', '아이', '연우', '생일', '기념일', '가훈', '교회', '요리'],
  'pillars/string': ['네트워크', '인간관계', '모임', '선물', '멘토', '친구', '조의', '소개팅', '트레바리'],
  'pillars/interstellar': ['사업', '마케팅', '리더십', '전략', 'biz', 'startup', 'coding', '커넥톰', 'ai', 'tech', 'branding', 'naming', '기획'],
  'pillars/life-x-lab': ['여행', '맛집', '카페', '영화', '음악', '취미', '골프', '야구', '공연', '전시', '와인', '위스키', '캠핑', '숙소'],
  'pillars/snowball': ['투자', '부동산', '주식', 'etf', '세금', '절세', '대출', '보험', '연금', '재무', '환율', '청약', '임장'],
};

const AREA_KEYWORDS = {
  'areas/dev': ['코드', '개발', 'git', 'deploy', 'docker', 'server', 'api', 'typescript'],
  'areas/marketing': ['sns', '콘텐츠', '블로그', 'seo', 'postiz', '인스타'],
  'areas/strategy': ['okr', 'kpi', '분기', '사업계획', 'flywheel'],
};

function classifyFile(filepath) {
  const content = readFileSync(filepath, 'utf-8').toLowerCase();
  const filename = basename(filepath).toLowerCase();
  const combined = filename + ' ' + content.slice(0, 2000);

  const scores = {};
  for (const [dest, keywords] of Object.entries({ ...PILLAR_KEYWORDS, ...AREA_KEYWORDS })) {
    scores[dest] = keywords.filter(kw => combined.includes(kw)).length;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return { dest: null, confidence: 0, matches: [] };

  return {
    dest: sorted[0][0],
    confidence: sorted[0][1],
    matches: Object.entries(PILLAR_KEYWORDS).concat(Object.entries(AREA_KEYWORDS))
      .find(([k]) => k === sorted[0][0])?.[1]
      .filter(kw => combined.includes(kw)) || [],
    alternatives: sorted.slice(1, 3).filter(([, s]) => s > 0),
  };
}

function scanInbox() {
  if (!existsSync(INBOX)) {
    mkdirSync(INBOX, { recursive: true });
    console.log(`Created ${INBOX}`);
    return;
  }

  const files = readdirSync(INBOX).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('inbox/ is empty.');
    return;
  }

  console.log(`Scanning ${files.length} files in inbox/\n`);
  for (const f of files) {
    const result = classifyFile(join(INBOX, f));
    if (result.dest) {
      console.log(`  ${f}`);
      console.log(`    → ${result.dest} (score: ${result.confidence}, matches: ${result.matches.join(', ')})`);
      if (result.alternatives.length > 0) {
        console.log(`    alt: ${result.alternatives.map(([d, s]) => `${d}(${s})`).join(', ')}`);
      }
    } else {
      console.log(`  ${f} → UNCLASSIFIED`);
    }
  }
}

function moveFile(src, dest) {
  const destDir = join(CORTEX, dest);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  const target = join(destDir, basename(src));
  if (existsSync(target)) {
    console.error(`Target exists: ${target}`);
    process.exit(1);
  }
  renameSync(src, target);
  console.log(`Moved: ${basename(src)} → ${dest}/`);
}

// CLI
const args = process.argv.slice(2);
if (args[0] === '--scan') {
  scanInbox();
} else if (args[0] === '--move' && args[1] && args[2]) {
  moveFile(args[1], args[2]);
} else if (args[0] && existsSync(args[0])) {
  const result = classifyFile(args[0]);
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('Usage: wiki-ingest.mjs <file.md> | --scan | --move <file> <dest>');
}
