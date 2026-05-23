#!/usr/bin/env node
/**
 * wiki-ingest.mjs — Wiki 복리 시스템 인제스트
 * 사용: node scripts/wiki-ingest.mjs --title "제목" --category bash --content "내용" [--tags tag1,tag2] [--source session] [--links id1,id2]
 *
 * 기존 항목 업데이트: node scripts/wiki-ingest.mjs --id existing-id --content "새 내용"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const WIKI_DIR = join(PROJECT_ROOT, '.wiki', 'entries');

mkdirSync(WIKI_DIR, { recursive: true });

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1] || '';
      i++;
    }
  }
  return args;
}

function toKebab(str) {
  return str.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}

function today() {
  return new Date().toISOString().split('T')[0];
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

function loadEntry(id) {
  const file = join(WIKI_DIR, `${id}.md`);
  if (!existsSync(file)) return null;
  const content = readFileSync(file, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (val.startsWith('[')) fm[key] = JSON.parse(val.replace(/'/g, '"'));
    else if (!isNaN(Number(val)) && val !== '') fm[key] = Number(val);
    else fm[key] = val.replace(/^"|"$/g, '');
  }
  return { fm, body: match[2].trim() };
}

const args = parseArgs(process.argv.slice(2));

if (!args.title && !args.id) {
  console.error('Usage: wiki-ingest.mjs --title "제목" --category bash --content "내용"');
  console.error('       wiki-ingest.mjs --id existing-id [--content "추가 내용"] [--links id1,id2]');
  process.exit(1);
}

const id = args.id || toKebab(args.title || '');
const existing = loadEntry(id);
const now = today();

let fm, body;

if (existing) {
  // Update existing entry
  fm = { ...existing.fm };
  fm.updated = now;
  fm.version = (fm.version || 0) + 1;
  fm.quality = 0; // reset, wiki-lint will re-score

  body = existing.body;
  if (args.content) {
    body = body + `\n\n<!-- Updated ${now} -->\n` + args.content;
  }
  if (args.links) {
    const newLinks = args.links.split(',').map(l => l.trim()).filter(Boolean);
    fm.links = [...new Set([...(fm.links || []), ...newLinks])];
  }
  if (args.tags) {
    const newTags = args.tags.split(',').map(t => t.trim()).filter(Boolean);
    fm.tags = [...new Set([...(fm.tags || []), ...newTags])];
  }
  console.log(`wiki-ingest: updated ${id} (v${fm.version})`);
} else {
  // New entry
  if (!args.content) {
    console.error('--content is required for new entries');
    process.exit(1);
  }
  const VALID_CATEGORIES = ['bash','typescript','architecture','workflow','security','debugging','testing','governance','misc'];
  const category = VALID_CATEGORIES.includes(args.category) ? args.category : 'misc';
  fm = {
    id,
    title: args.title || id,
    category,
    tags: args.tags ? args.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    source: args.source || 'manual',
    created: now,
    updated: now,
    links: args.links ? args.links.split(',').map(l => l.trim()).filter(Boolean) : [],
    quality: 0,
    version: 1,
  };
  body = args.content;
  console.log(`wiki-ingest: created ${id}`);
}

const content = buildFrontmatter(fm) + body + '\n';
const file = join(WIKI_DIR, `${id}.md`);
writeFileSync(file, content, 'utf-8');
console.log(`  -> ${file}`);
