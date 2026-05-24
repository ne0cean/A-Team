#!/usr/bin/env node
/**
 * classify-staging.mjs — staging 파일을 6기둥 + areas/archives로 자동 분류
 *
 * Usage:
 *   node scripts/classify-staging.mjs --dry-run     # 분류 결과만 출력
 *   node scripts/classify-staging.mjs --apply        # 실제 이동
 *   node scripts/classify-staging.mjs --stats        # 통계만
 */

import { readdir, readFile, rename, mkdir } from 'fs/promises';
import { join, basename } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const STAGING = join(CORTEX, 'staging');

// 6 Hexagonal Pillars + areas + archives
const RULES = [
  // snowball — 투자, 재테크, 부동산, 금융
  {
    dest: 'pillars/snowball',
    keywords: [
      '투자', '주식', '코인', 'ETF', '리밸런싱', '배당', '환율', '선물', '옵션',
      'ICO', '스켈핑', '매매', '트레이딩', '차트', 'chart', '해외거래소', '비트코인',
      'bitcoin', 'crypto', '부동산', '전세', '월세', '아파트', '매수', '매도',
      '포트폴리오', 'portfolio', '자산', 'valuation', 'equity', '재무제표',
      'enterprise value', '해자', '복리', '펀드', '증권', 'stock', 'swing',
    ],
  },
  // character — 자기개발, 영어, 글쓰기, 독서, 영화, 교양
  {
    dest: 'pillars/character',
    keywords: [
      'IELTS', '영어', 'english', 'reading', 'writing', 'vocab', '독서', '책',
      '취향', '교양', '글쓰기', '에세이', '영화', 'movie', 'film', '다큐', '소설',
      '시', '음악', '예술', 'art', '미술', '전시', '공부', '학습', '자기개발',
      'self', '성장', '습관', '루틴', 'routine', 'ritual', '명상', '일기',
      'journal', '회고', 'summer', 'MAGIC', 'input', '퍼블리',
    ],
  },
  // interstellar — 업무, 커리어, 통신, CRM, 마케팅, 기술
  {
    dest: 'pillars/interstellar',
    keywords: [
      'CRM', '정책회의', '해지상담', '통합offering', 'VAS', '요금제', '판매',
      '마케팅', '캠페인', 'campaign', '동의율', '청약', '사은품', '고객',
      'customer', '세일즈', 'sales', '실적', 'KPI', 'OKR', '인터뷰',
      '업무', '보고', '회의', 'meeting', '프로젝트', 'project', '개발',
      'coding', 'code', '코드', '프로그래밍', 'API', 'deploy', '배포',
      'git', 'docker', '서버', 'server', '데이터', 'data', 'SQL',
      '컨퍼런스', 'conference', '발표', '프레젠테이션', 'PPT', 'ppt',
      '이력서', '자소서', '경력', 'career', 'resume', 'cv',
      '통신', 'telecom', 'SKT', 'KT', 'LGU', 'T월드', '다이렉트',
      '법무', '약관', '동의', '청구', '수당', 'issue', '검토',
      'Speed', '011', '2G', 'Mig', 'Apple', 'QBR',
      '오퍼링', 'offering', 'PDR', 'TDR', '타겟',
      'single source', 'multi-use', 'deep change', 'jump-up',
      '채널', '컨텐츠', 'SNS', '클럽하우스',
      '프롬프트', 'prompt', 'GPT', 'AI', 'LLM',
    ],
  },
  // life-x-lab — 건강, 요리, 라이프스타일, 여행, 운동
  {
    dest: 'pillars/life-x-lab',
    keywords: [
      '건강', '운동', '식사', '요리', '레시피', 'recipe', '음식', 'food',
      '다이어트', '체중', '피부', '수면', 'sleep', '병원', '의사',
      '영양', '비타민', '단백질', '칼로리', '식품', '한과',
      '여행', 'travel', '캠핑', '호텔', '하나투어',
      '집', '인테리어', '정리', '청소', '살림',
      '패션', '옷', 'suit', '뷰티', '피부톤', '잡티',
      '카페', '맛집', '점심', '식당',
      '풍경', '사진', 'photo',
      '최강의 식사', '코칭',
    ],
  },
  // mo-chuisle — 가족, 육아
  {
    dest: 'pillars/mo-chuisle',
    keywords: [
      '가족', '아이', '아기', '육아', '아빠', '엄마', '부모', '자녀',
      '임신', '출산', '유치원', '학교', '교육', '돌봄',
    ],
  },
  // string — 인간관계, 네트워크
  {
    dest: 'pillars/string',
    keywords: [
      '인간관계', '관계', '인맥', 'network', 'contact', '소통',
      '대화', '감정', '공감', '리더십', 'leadership', '팀',
      '눈빛', '표정', '몸짓', '감동', '사람',
      'key person', 'senior', 'group', 'net',
    ],
  },
];

// Fallback: areas
const AREA_RULES = [
  { dest: 'areas/dev', keywords: ['개발', 'dev', 'code', '코드', 'API', 'docker', 'git'] },
  { dest: 'areas/marketing', keywords: ['마케팅', 'SNS', '콘텐츠', '블로그'] },
  { dest: 'areas/life', keywords: ['건강', '운동', '요리', '여행'] },
  { dest: 'areas/writing', keywords: ['글쓰기', '에세이', '글감'] },
];

async function classify() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statsOnly = args.includes('--stats');
  const apply = args.includes('--apply');

  const files = await readdir(STAGING);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  console.log(`Staging: ${mdFiles.length} files\n`);

  const results = { classified: 0, unclassified: 0, duplicate: 0, byDest: {} };
  const moves = [];

  for (const file of mdFiles) {
    const filePath = join(STAGING, file);
    let content = '';
    try {
      content = await readFile(filePath, 'utf-8');
    } catch { continue; }

    const nameLC = file.toLowerCase();
    const contentLC = content.toLowerCase().slice(0, 2000); // first 2KB for speed
    const combined = nameLC + ' ' + contentLC;

    let matched = null;
    let bestScore = 0;

    for (const rule of RULES) {
      let score = 0;
      for (const kw of rule.keywords) {
        const kwLC = kw.toLowerCase();
        // filename match = 3 points, content match = 1 point
        if (nameLC.includes(kwLC)) score += 3;
        if (contentLC.includes(kwLC)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        matched = rule.dest;
      }
    }

    // Minimum threshold
    if (bestScore < 2) {
      // Try area rules
      for (const rule of AREA_RULES) {
        for (const kw of rule.keywords) {
          if (combined.includes(kw.toLowerCase())) {
            matched = rule.dest;
            bestScore = 2;
            break;
          }
        }
        if (bestScore >= 2) break;
      }
    }

    if (bestScore < 2) {
      matched = 'archives/legacy';
      results.unclassified++;
    } else {
      results.classified++;
    }

    results.byDest[matched] = (results.byDest[matched] || 0) + 1;
    moves.push({ file, dest: matched, score: bestScore });
  }

  // Stats
  console.log('=== Classification Results ===');
  const sorted = Object.entries(results.byDest).sort((a, b) => b[1] - a[1]);
  for (const [dest, count] of sorted) {
    console.log(`  ${dest}: ${count}`);
  }
  console.log(`\nClassified: ${results.classified}, Unclassified→archives: ${results.unclassified}`);

  if (statsOnly) return;

  // Show moves
  if (dryRun) {
    console.log('\n=== Moves (dry-run) ===');
    for (const m of moves) {
      console.log(`  [${m.score}] ${m.file} → ${m.dest}`);
    }
    return;
  }

  // Apply moves
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
    return;
  }

  console.log('\nUse --dry-run to preview or --apply to execute.');
}

classify().catch(console.error);
