#!/usr/bin/env node
/**
 * classify-dashboard.mjs — Dashboard 100개를 6기둥 하위폴더로 분류 이동
 */
import { readdir, readFile, rename, mkdir } from 'fs/promises';
import { join } from 'path';

const DASH = join(process.env.HOME, 'Projects/a-team/cortex/InterStellar/1_Projects/Dashbaord');

const OVERRIDES = {
  '살롱': 'string',
  '소명': 'character',
  '인생전략_사전부검_회고 Pre-Mortem Method': 'character',
  '나를 위한 기획, 관계 맺고 커뮤니케이션': 'string',
  'Start-up 로그': 'interstellar',
  '사이드 프로젝트': 'interstellar',
  '1Q2025 Apple QBR': 'interstellar',
  'SKB': 'interstellar',
  '퍼블리': 'character',
  'EBB 후기 올리기': 'life-x-lab',
  'Small Table, Big Moments': 'string',
  'Projects Dash board': 'interstellar',
  'BCG': 'interstellar',
  '3차 미래전략회의 follow-up 회의 (05_29': 'interstellar',
  'Metavers': 'interstellar',
  'Robotics': 'interstellar',
  "iCloud 미온적_ 번들 안해도 잘 팔림, 금액이 이미 저렴": 'interstellar',
  'The SYSTEM': 'character',
  '강의': 'interstellar',
  "정체성은 직장인(마케터 출신 투자자) + 워드나 엑셀, ppt에 글을 쓰고 캡쳐, 감성글은___ 카톡에 쓰고 캡쳐": 'character',
  'Game_1': 'life-x-lab',
  'Real Valley': 'interstellar',
  'Breadth': 'character',
};

const RULES = [
  { pillar: 'snowball', kw: ['투자','주식','코인','etf','환율','선물','옵션','매매','스켈핑','비트코인','crypto','nft','부동산','전세','아파트','청약','대출','임대','임장','재개발','무주택','경제','지수','상승장','snowball','accumulation','futures'] },
  { pillar: 'character', kw: ['독서','글쓰기','에세이','명상','취향','교양','인생전략','소명','기분 리셋','hidden potential','storyline','input','후보 글감','습관','회고','발췌'] },
  { pillar: 'life-x-lab', kw: ['요리','레시피','음식','cake','건강','운동','여행','하나투어','차량','suv','구매','풍경','캠핑','패션','피부','봄으로','game'] },
  { pillar: 'string', kw: ['관계','인맥','소통','살롱','커뮤니케이션','small table','junifer'] },
  { pillar: 'mo-chuisle', kw: ['가족','아이','육아'] },
];

async function run() {
  const files = (await readdir(DASH)).filter(f => f.endsWith('.md'));
  console.log(`Dashboard: ${files.length} files\n`);
  const stats = {};
  let moved = 0;

  for (const file of files) {
    const name = file.replace(/\.md$/, '');
    let pillar = OVERRIDES[name];

    if (!pillar) {
      const content = (await readFile(join(DASH, file), 'utf-8')).toLowerCase().slice(0, 1000);
      const combined = name.toLowerCase() + ' ' + content;
      let best = 0;
      for (const rule of RULES) {
        let score = 0;
        for (const kw of rule.kw) {
          if (combined.includes(kw)) score++;
        }
        if (score > best) { best = score; pillar = rule.pillar; }
      }
      if (!best) pillar = 'interstellar';
    }

    const dest = join(DASH, pillar);
    await mkdir(dest, { recursive: true });
    await rename(join(DASH, file), join(dest, file));
    stats[pillar] = (stats[pillar] || 0) + 1;
    moved++;
  }

  console.log('=== Result ===');
  for (const [p, c] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p}/: ${c}`);
  }
  console.log(`\nMoved: ${moved}`);
}

run().catch(console.error);
