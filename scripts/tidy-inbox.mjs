#!/usr/bin/env node
/**
 * Auto-classify cortex/inbox/ files using LLM (Groq free) or rule-based fallback.
 * Runs as cron — no human intervention needed.
 *
 * Flow:
 * 1. Scan cortex/inbox/*.md
 * 2. Classify each file → PARA category + 6-pillar
 * 3. Move to target folder
 * 4. Log action to cortex/inbox/.tidy-log.jsonl
 */

import { readdirSync, readFileSync, writeFileSync, renameSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const CORTEX = join(import.meta.dirname, '../cortex');
const INBOX = join(CORTEX, 'inbox');
const LOG = join(INBOX, '.tidy-log.jsonl');

// Classification targets
const TARGETS = {
  // 6 hexagonal pillars
  'character':    join(CORTEX, 'hexagonal pillars_rocks_helm/1-character'),
  'mo-chuisle':   join(CORTEX, 'hexagonal pillars_rocks_helm/2-mo-chuisle'),
  'string':       join(CORTEX, 'hexagonal pillars_rocks_helm/3-string'),
  'interstellar': join(CORTEX, 'hexagonal pillars_rocks_helm/4-interstellar'),
  'life-xlab':    join(CORTEX, 'hexagonal pillars_rocks_helm/5-life-xlab'),
  'snowball':     join(CORTEX, 'hexagonal pillars_rocks_helm/6-snowball'),
  'zeroing':      join(CORTEX, 'hexagonal pillars_rocks_helm/zeroing'),
  // PARA
  'projects':     join(CORTEX, 'projects'),
  'resources':    join(CORTEX, 'resources'),
  'articles':     join(CORTEX, 'resources/articles'),
  'books':        join(CORTEX, 'resources/books'),
  'courses':      join(CORTEX, 'resources/courses'),
  'videos':       join(CORTEX, 'resources/videos'),
  'archive':      join(CORTEX, 'Archive'),
};

// Rule-based classification keywords
const RULES = [
  { keywords: ['운동', 'exercise', 'gym', 'health', '건강', '다이어트', 'diet', '피부', '병원', '의원', '시술', '검진', '약'], target: 'character' },
  { keywords: ['가족', 'family', '엄마', '아빠', '아이', '육아', '부모', '결혼', '수림', '가람'], target: 'mo-chuisle' },
  { keywords: ['네트워크', '인맥', '모임', '소사이어티', '동호회', '커뮤니티', '친구'], target: 'string' },
  { keywords: ['커리어', 'career', '이직', '회사', 'AX', 'SCM', 'CFA', '사업', 'startup', 'SaaS', '창업', '부업', 'side hustle', '코딩', 'claude', 'AI'], target: 'interstellar' },
  { keywords: ['여행', 'travel', '맛집', 'food', '경험', '취미', '서핑', '골프', '와인', '미술', '전시', '공연', '축제', '제주'], target: 'life-xlab' },
  { keywords: ['투자', 'invest', '주식', 'stock', '부동산', '연금', 'ETF', '코인', '저축', '재테크', '자산', '급여'], target: 'snowball' },
  { keywords: ['명상', '묵상', 'vision', '목표', 'goal', '회고', 'journal', '감사', '습관'], target: 'zeroing' },
  { keywords: ['책', 'book', '독서', 'reading', '필사'], target: 'books' },
  { keywords: ['강의', 'course', '교육', '학습', 'python', 'figma'], target: 'courses' },
  { keywords: ['영상', 'video', 'youtube', '유튜브'], target: 'videos' },
  { keywords: ['기사', 'article', '블로그', 'blog', '뉴스', 'news'], target: 'articles' },
];

async function classify(content, tags) {
  const lower = (content + ' ' + (tags || []).join(' ')).toLowerCase();

  // Check frontmatter tags first
  if (tags?.length) {
    for (const rule of RULES) {
      for (const kw of rule.keywords) {
        if (tags.some(t => t.toLowerCase().includes(kw))) return rule.target;
      }
    }
  }

  // Keyword matching
  for (const rule of RULES) {
    const matches = rule.keywords.filter(kw => lower.includes(kw.toLowerCase()));
    if (matches.length >= 1) return rule.target;
  }

  // Try LLM (groq free via HTTP, no shell)
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      const body = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Classify this note into ONE category. Reply with ONLY the category key.\nCategories: character(health/body), mo-chuisle(family), string(network/social), interstellar(career/work/tech), life-xlab(experience/hobby/travel/food), snowball(finance/invest), zeroing(reflection/goals), books, courses, videos, articles\nNote: ${content.slice(0, 500)}` }],
        max_tokens: 20, temperature: 0
      });
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body, signal: AbortSignal.timeout(10000)
      });
      const data = await res.json();
      const result = data.choices?.[0]?.message?.content?.trim().toLowerCase();
      if (result && TARGETS[result]) return result;
    }
  } catch {}

  return null; // can't classify
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { tags: [], title: '' };
  const fm = match[1];
  const tags = fm.match(/tags:\s*\[(.*?)\]/)?.[1]?.split(',').map(t => t.trim()) || [];
  const title = fm.match(/title:\s*"?([^"\n]+)"?/)?.[1] || '';
  return { tags, title };
}

function log(entry) {
  appendFileSync(LOG, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
}

// Main
const files = readdirSync(INBOX).filter(f => f.endsWith('.md'));
if (files.length === 0) {
  console.log('[tidy-inbox] inbox empty');
  process.exit(0);
}

console.log(`[tidy-inbox] ${files.length} files to process`);

let moved = 0, skipped = 0, deleted = 0;

for (const file of files) {
  const path = join(INBOX, file);
  const content = readFileSync(path, 'utf-8');
  const { tags, title } = parseFrontmatter(content);
  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim();

  // Skip empty test messages
  if (body.length < 5 && /^test$/i.test(body)) {
    console.log(`  [delete] ${file} (test message)`);
    renameSync(path, join(INBOX, '.trash-' + file));
    log({ action: 'delete', file, reason: 'test message' });
    deleted++;
    continue;
  }

  const target = await classify(content, tags);

  if (!target) {
    console.log(`  [skip] ${file} (can't classify)`);
    log({ action: 'skip', file, reason: 'unclassifiable' });
    skipped++;
    continue;
  }

  const destDir = TARGETS[target];
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  const destPath = join(destDir, file);
  if (existsSync(destPath)) {
    console.log(`  [skip] ${file} (already exists at ${target})`);
    skipped++;
    continue;
  }

  // Update frontmatter with classification
  let updated = content;
  if (updated.includes('para: inbox')) {
    updated = updated.replace('para: inbox', `para: areas\npillar: ${target}`);
  }

  writeFileSync(destPath, updated);
  renameSync(path, join(INBOX, '.done-' + file));

  console.log(`  [move] ${file} → ${target}/`);
  log({ action: 'move', file, target, title: title || body.slice(0, 50) });
  moved++;
}

console.log(`[tidy-inbox] done: ${moved} moved, ${deleted} deleted, ${skipped} skipped`);
