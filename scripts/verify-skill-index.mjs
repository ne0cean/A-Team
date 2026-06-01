#!/usr/bin/env node
/**
 * verify-skill-index.mjs
 * Paperclip Phase 4 — SKILL-INDEX drift 감지
 *
 * 사용법:
 *   node scripts/verify-skill-index.mjs         # 전체 검증
 *   node scripts/verify-skill-index.mjs --json  # JSON 출력
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const AGENTS_DIR = join(ROOT, '.claude/agents');
const COMMANDS_DIR = join(ROOT, '.claude/commands');
const SKILL_INDEX = join(ROOT, 'governance/skills/SKILL-INDEX.md');

const isJson = process.argv.includes('--json');

// --- Scan files ---

function scanDir(dir, ext = '.md') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(ext) && f !== 'README.md')
    .map(f => f.replace(ext, ''));
}

function readFrontmatter(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fm[key.trim()] = rest.join(':').trim();
  }
  return fm;
}

function readIndex() {
  if (!existsSync(SKILL_INDEX)) return new Set();
  const content = readFileSync(SKILL_INDEX, 'utf8');
  const slugs = new Set();
  // Extract slugs from table rows: | slug | or | /command |
  for (const line of content.split('\n')) {
    const match = line.match(/^\|\s*\/?([a-z][a-z0-9-]*)\s*\|/);
    if (match) slugs.add(match[1]);
  }
  return slugs;
}

// --- Validate ---

const agents = scanDir(AGENTS_DIR);
const commands = scanDir(COMMANDS_DIR);
const indexed = readIndex();

const errors = [];
const warnings = [];

// Check 1: agents in index
for (const slug of agents) {
  if (!indexed.has(slug)) {
    errors.push(`AGENT NOT INDEXED: ${slug}`);
  }
  // Check frontmatter
  const fm = readFrontmatter(join(AGENTS_DIR, slug + '.md'));
  if (!fm.name) warnings.push(`AGENT MISSING name: frontmatter: ${slug}`);
  if (!fm.description) warnings.push(`AGENT MISSING description frontmatter: ${slug}`);
}

// Check 2: commands in index
for (const slug of commands) {
  if (!indexed.has(slug)) {
    errors.push(`COMMAND NOT INDEXED: ${slug}`);
  }
  // Check description
  const fm = readFrontmatter(join(COMMANDS_DIR, slug + '.md'));
  if (!fm.description) warnings.push(`COMMAND MISSING description frontmatter: ${slug}`);
}

// Check 3: indexed but file missing (ghost entries)
for (const slug of indexed) {
  const agentExists = existsSync(join(AGENTS_DIR, slug + '.md'));
  const cmdExists = existsSync(join(COMMANDS_DIR, slug + '.md'));
  if (!agentExists && !cmdExists) {
    warnings.push(`INDEXED BUT FILE MISSING: ${slug}`);
  }
}

// --- Report ---

const result = {
  scanned: { agents: agents.length, commands: commands.length, indexed: indexed.size },
  errors: errors.length,
  warnings: warnings.length,
  error_list: errors,
  warning_list: warnings,
};

if (isJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\n=== SKILL-INDEX Verification ===`);
  console.log(`Agents:   ${agents.length} files`);
  console.log(`Commands: ${commands.length} files`);
  console.log(`Indexed:  ${indexed.size} slugs\n`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed — no drift detected');
  } else {
    if (errors.length > 0) {
      console.log(`❌ ERRORS (${errors.length}):`);
      for (const e of errors) console.log(`   ${e}`);
    }
    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
      for (const w of warnings) console.log(`   ${w}`);
    }
  }

  console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length > 0) process.exit(1);
}
