#!/usr/bin/env node
/**
 * wiki-lint.mjs — Wiki 엔트리 품질 검사 + quality 점수 갱신
 * 사용: node scripts/wiki-lint.mjs [--fix] [--json] [--entry <id>]
 *
 * 채점 기준:
 *   - 필수 필드 존재: 20점
 *   - content 길이 50자+: 20점
 *   - tags 1개+: 15점
 *   - links 1개+: 15점 (복리 지표)
 *   - version 2+: 10점 (갱신됨)
 *   - source 명시: 10점
 *   - title 10자+: 10점
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const WIKI_DIR = join(PROJECT_ROOT, '.wiki', 'entries');
const VALID_CATEGORIES = ['bash','typescript','architecture','workflow','security','debugging','testing','governance','misc'];

function parseEntry(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (val.startsWith('[')) {
      try { fm[key] = JSON.parse(val.replace(/'/g, '"')); } catch { fm[key] = []; }
    } else if (!isNaN(Number(val)) && val !== '') {
      fm[key] = Number(val);
    } else {
      fm[key] = val.replace(/^"|"$/g, '');
    }
  }
  return { fm, body: match[2].trim() };
}

function buildFrontmatter(fm) {
  const tags = JSON.stringify(fm.tags || []);
  const links = JSON.stringify(fm.links || []);
  return [
    '---',
    `id: ${fm.id}`,
    `title: "${fm.title}"`,
    `category: ${fm.category}`,
    `tags: ${tags}`,
    `source: ${fm.source}`,
    `created: ${fm.created}`,
    `updated: ${fm.updated}`,
    `links: ${links}`,
    `quality: ${fm.quality}`,
    `version: ${fm.version}`,
    '---',
    '',
  ].join('\n');
}

function lintEntry(file) {
  const content = readFileSync(file, 'utf-8');
  const parsed = parseEntry(content);
  const issues = [];
  let score = 0;

  if (!parsed) {
    return { file, id: '?', issues: [{ severity: 'error', message: 'frontmatter 파싱 실패' }], score: 0, passed: false };
  }

  const { fm, body } = parsed;

  // 필수 필드 체크 (20점)
  const requiredFields = ['id','title','category','created','updated'];
  const missingFields = requiredFields.filter(f => !fm[f]);
  if (missingFields.length === 0) {
    score += 20;
  } else {
    issues.push({ severity: 'error', message: `필수 필드 누락: ${missingFields.join(', ')}` });
  }

  // category 유효성 (에러만, 점수 없음)
  if (fm.category && !VALID_CATEGORIES.includes(fm.category)) {
    issues.push({ severity: 'error', message: `유효하지 않은 category: ${fm.category}` });
  }

  // content 길이 (20점)
  if (body.length >= 50) {
    score += 20;
  } else {
    issues.push({ severity: 'warning', message: `content 너무 짧음 (${body.length}자, 최소 50자)` });
  }

  // tags (15점)
  if (Array.isArray(fm.tags) && fm.tags.length >= 1) {
    score += 15;
  } else {
    issues.push({ severity: 'warning', message: 'tags 없음 — 검색성 저하' });
  }

  // links (15점, 복리 지표)
  if (Array.isArray(fm.links) && fm.links.length >= 1) {
    score += 15;
  } else {
    issues.push({ severity: 'info', message: 'links 없음 — 복리 성장 기회' });
  }

  // version (10점)
  if (typeof fm.version === 'number' && fm.version >= 2) {
    score += 10;
  } else {
    issues.push({ severity: 'info', message: `version ${fm.version || 1} — 갱신 시 복리 점수 증가` });
  }

  // source (10점)
  if (fm.source && fm.source !== 'manual') {
    score += 10;
  } else if (fm.source === 'manual') {
    score += 5; // partial credit
  } else {
    issues.push({ severity: 'warning', message: 'source 미명시' });
  }

  // title 길이 (10점)
  if (typeof fm.title === 'string' && fm.title.length >= 10) {
    score += 10;
  } else {
    issues.push({ severity: 'warning', message: `title 너무 짧음 (${(fm.title||'').length}자, 최소 10자)` });
  }

  const passed = score >= 60 && issues.filter(i => i.severity === 'error').length === 0;
  return { file, id: fm.id || '?', fm, body, issues, score, passed };
}

// Main
const args = process.argv.slice(2);
const fix = args.includes('--fix');
const json = args.includes('--json');
const entryIdx = args.indexOf('--entry');
const singleEntry = entryIdx >= 0 ? args[entryIdx + 1] : null;

if (!existsSync(WIKI_DIR)) {
  if (json) {
    console.log(JSON.stringify({ entries: 0, passed: 0, failed: 0, results: [] }));
  } else {
    console.log('wiki-lint: .wiki/entries/ 없음 — 항목 없음');
  }
  process.exit(0);
}

const files = singleEntry
  ? [join(WIKI_DIR, `${singleEntry}.md`)].filter(existsSync)
  : readdirSync(WIKI_DIR).filter(f => f.endsWith('.md')).map(f => join(WIKI_DIR, f));

if (files.length === 0) {
  if (json) console.log(JSON.stringify({ entries: 0, passed: 0, failed: 0, results: [] }));
  else console.log('wiki-lint: 항목 없음');
  process.exit(0);
}

const results = files.map(lintEntry);
let anyError = false;

for (const r of results) {
  if (!json) {
    const status = r.passed ? '✓' : '✗';
    console.log(`${status} ${r.id} (score: ${r.score}/100)`);
    for (const issue of r.issues) {
      const prefix = issue.severity === 'error' ? '  ERROR' : issue.severity === 'warning' ? '  WARN' : '  INFO';
      console.log(`${prefix}: ${issue.message}`);
    }
  }

  if (!r.passed) anyError = true;

  // --fix: quality 점수를 frontmatter에 기록
  if (fix && r.fm) {
    const updated = { ...r.fm, quality: r.score };
    const newContent = buildFrontmatter(updated) + r.body + '\n';
    writeFileSync(r.file, newContent, 'utf-8');
    if (!json) console.log(`  -> quality=${r.score} 저장됨`);
  }
}

const passed = results.filter(r => r.passed).length;
const total = results.length;

if (json) {
  console.log(JSON.stringify({ entries: total, passed, failed: total - passed, results }));
} else {
  console.log(`\nwiki-lint: ${passed}/${total} passed`);
  if (!fix && anyError) {
    console.log('  --fix 플래그로 quality 점수를 갱신할 수 있습니다.');
  }
}

process.exit(anyError ? 1 : 0);
