#!/usr/bin/env node
/**
 * classify-staging.mjs — staging 파일을 OneNote 메타데이터 기반으로 분류
 *
 * Usage:
 *   node scripts/classify-staging.mjs --dry-run     # 분류 결과만 출력
 *   node scripts/classify-staging.mjs --apply        # 실제 이동
 *   node scripts/classify-staging.mjs --stats        # 통계만
 */

import { readdir, readFile, rename, mkdir } from 'fs/promises';
import { join } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const STAGING = join(CORTEX, 'staging');

// Priority 1: OneNote section → pillar mapping
const SECTION_MAP = {
  '1. Character': 'pillars/character',
  'Writing': 'pillars/character',
  '2. SLL': 'pillars/string',
  '3. HFK': 'pillars/mo-chuisle',
  '5. Sport': 'pillars/life-x-lab',
  // Work sections → interstellar
  'MK1': 'pillars/interstellar',
  'Dashbaord': 'pillars/interstellar',
  "'16_정책팀": 'pillars/interstellar',
  "'17_CVM": 'pillars/interstellar',
  "'18_CVM": 'pillars/interstellar',
  "'19_PPG": 'pillars/interstellar',
  'Operation': 'pillars/interstellar',
  'MKT_FB': 'pillars/interstellar',
  "'12년 Jump-up": 'pillars/interstellar',
  'Side hutle': 'pillars/interstellar',
  'A TEAM': 'pillars/interstellar',
  'Note': 'pillars/interstellar',
  '1_': 'pillars/interstellar',
};

// Priority 2: notebook-based fallback
const NOTEBOOK_MAP = {
  '2018 SK그룹 신입연수': 'pillars/interstellar',
  'Archive': 'archives/legacy',
};

// Priority 3: keyword-based fallback (for files without useful metadata)
const KEYWORD_RULES = [
  {
    dest: 'pillars/snowball',
    keywords: ['투자', '주식', '코인', 'ETF', '환율', '선물', '옵션', 'ICO', '매매',
      '트레이딩', '비트코인', 'crypto', '부동산', '전세', '아파트', '포트폴리오',
      'valuation', 'equity', '재무제표', 'enterprise value', '증권', 'stock', 'IPO',
      'investment', '리밸런싱', '배당', '해자', '펀드', '스켈핑'],
  },
  {
    dest: 'pillars/life-x-lab',
    keywords: ['건강', '운동', '식사', '요리', '레시피', '음식', '다이어트', '피부',
      '영양', '여행', 'travel', '캠핑', '패션', 'suit', '선크림', '카페', '맛집',
      '최강의 식사', '한과', '섬유유연제', '풍경', '건진', '3초 운동'],
  },
  {
    dest: 'pillars/character',
    keywords: ['IELTS', '영어', 'english', 'reading', '독서', '책', '취향', '교양',
      '글쓰기', '에세이', '영화', 'movie', '자기개발', '습관', '명상', '일기',
      'speaking', 'elements of style'],
  },
  {
    dest: 'pillars/string',
    keywords: ['인간관계', '인맥', 'network', 'contact', '소통', '공감', '리더십',
      '눈빛', '표정', '감동'],
  },
  {
    dest: 'pillars/mo-chuisle',
    keywords: ['가족', '아이', '육아', '아빠', '엄마', '부모'],
  },
  {
    dest: 'pillars/interstellar',
    keywords: ['CRM', '마케팅', '캠페인', '고객', '세일즈', '업무', '개발', 'coding',
      '코드', 'API', '서버', '데이터', 'SQL', '컨퍼런스', '이력서', '경력',
      '통신', '약관', '청구', '프롬프트', 'GPT', '사업', '창업', 'branding',
      '기업문화', 'UX', 'UI', 'dashboard'],
  },
];

function extractMeta(content) {
  const meta = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return meta;
  for (const line of fmMatch[1].split('\n')) {
    const m = line.match(/^(\w[\w_]*?):\s*"?([^"]*)"?\s*$/);
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

  const results = { byDest: {}, byMethod: { section: 0, notebook: 0, keyword: 0, fallback: 0 } };
  const moves = [];

  for (const file of mdFiles) {
    let content = '';
    try {
      content = await readFile(join(STAGING, file), 'utf-8');
    } catch { continue; }

    const meta = extractMeta(content);
    let dest = null;
    let method = 'fallback';

    // Priority 1: section metadata
    if (meta.section && SECTION_MAP[meta.section]) {
      dest = SECTION_MAP[meta.section];
      method = 'section';
    }

    // Priority 2: notebook fallback
    if (!dest && meta.notebook && NOTEBOOK_MAP[meta.notebook]) {
      dest = NOTEBOOK_MAP[meta.notebook];
      method = 'notebook';
    }

    // Priority 3: keyword matching
    if (!dest) {
      const nameLC = file.toLowerCase();
      const contentLC = content.toLowerCase().slice(0, 2000);
      let bestScore = 0;

      for (const rule of KEYWORD_RULES) {
        let score = 0;
        for (const kw of rule.keywords) {
          const kwLC = kw.toLowerCase();
          if (nameLC.includes(kwLC)) score += 3;
          if (contentLC.includes(kwLC)) score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          dest = rule.dest;
        }
      }
      if (bestScore >= 2) {
        method = 'keyword';
      } else {
        dest = 'archives/legacy';
        method = 'fallback';
      }
    }

    // Post-correction: override interstellar → snowball for finance content
    if (dest === 'pillars/interstellar') {
      const nameLC = file.toLowerCase();
      const contentLC = content.toLowerCase().slice(0, 2000);
      const financeKW = ['투자', '주식', '코인', 'etf', '환율', '선물', '옵션', 'ico',
        '매매', '트레이딩', '비트코인', 'crypto', '부동산', '전세', '아파트',
        'valuation', 'equity', '재무제표', '증권', 'stock', 'ipo', 'investment',
        '리밸런싱', '배당', '해자', '스켈핑', 'nft', 'defi', '스테이킹'];
      let finScore = 0;
      for (const kw of financeKW) {
        if (nameLC.includes(kw)) finScore += 3;
        if (contentLC.includes(kw)) finScore += 1;
      }
      if (finScore >= 3) {
        dest = 'pillars/snowball';
        method = 'keyword-override';
      }
    }

    results.byDest[dest] = (results.byDest[dest] || 0) + 1;
    results.byMethod[method] = (results.byMethod[method] || 0) + 1;
    moves.push({ file, dest, method });
  }

  // Stats
  console.log('=== By Destination ===');
  for (const [dest, count] of Object.entries(results.byDest).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dest}: ${count}`);
  }
  console.log(`\n=== By Method ===`);
  for (const [method, count] of Object.entries(results.byMethod)) {
    console.log(`  ${method}: ${count}`);
  }

  if (statsOnly) return;

  if (dryRun) {
    console.log('\n=== Moves ===');
    for (const m of moves) {
      console.log(`  [${m.method}] ${m.file} → ${m.dest}`);
    }
    return;
  }

  if (apply) {
    let moved = 0;
    for (const m of moves) {
      const destDir = join(CORTEX, m.dest);
      await mkdir(destDir, { recursive: true });
      const destPath = join(destDir, m.file);
      try {
        await rename(join(STAGING, m.file), destPath);
        moved++;
      } catch (e) {
        console.error(`  FAIL: ${m.file} → ${e.message}`);
      }
    }
    console.log(`\nMoved: ${moved}/${moves.length}`);
  } else {
    console.log('\nUse --dry-run to preview or --apply to execute.');
  }
}

classify().catch(console.error);
