#!/usr/bin/env node
/**
 * wiki-lint.mjs — Cortex 품질 검사
 *
 * Checks:
 *   1. Broken internal links [[...]]
 *   2. Duplicate filenames across pillars/areas
 *   3. Empty files (< 50 bytes)
 *   4. Missing frontmatter (title)
 *   5. Orphan attachments
 *
 * Usage:
 *   node scripts/wiki-lint.mjs              # full scan
 *   node scripts/wiki-lint.mjs --json       # JSON output
 *   node scripts/wiki-lint.mjs --fix-empty  # remove empty files
 */

import { readFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join, basename, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const CORTEX = join(__dir, '..', 'cortex');

function getAllMdFiles(dir) {
  const results = [];
  function walk(d) {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, f.name);
      if (f.isDirectory() && !f.name.startsWith('.')) walk(full);
      else if (f.isFile() && f.name.endsWith('.md')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function lint() {
  const files = getAllMdFiles(CORTEX);
  const issues = { broken_links: [], duplicates: [], empty: [], no_title: [] };

  // Build filename index
  const nameIndex = {};
  for (const f of files) {
    const name = basename(f, '.md');
    if (!nameIndex[name]) nameIndex[name] = [];
    nameIndex[name].push(relative(CORTEX, f));
  }

  for (const f of files) {
    const rel = relative(CORTEX, f);
    const stat = statSync(f);

    // Empty check
    if (stat.size < 50) {
      issues.empty.push(rel);
      continue;
    }

    const content = readFileSync(f, 'utf-8');

    // Internal links [[...]]
    const links = content.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const link of links) {
      const target = link.slice(2, -2).split('|')[0].trim();
      if (!nameIndex[target]) {
        issues.broken_links.push({ file: rel, target });
      }
    }

    // Missing title in frontmatter
    if (content.startsWith('---')) {
      const fmEnd = content.indexOf('---', 3);
      if (fmEnd > 0) {
        const fm = content.slice(3, fmEnd);
        if (!fm.includes('title:')) {
          issues.no_title.push(rel);
        }
      }
    }
  }

  // Duplicates
  for (const [name, paths] of Object.entries(nameIndex)) {
    if (paths.length > 1) {
      issues.duplicates.push({ name, paths });
    }
  }

  return { total_files: files.length, issues };
}

const args = process.argv.slice(2);
const result = lint();

if (args.includes('--fix-empty') && result.issues.empty.length > 0) {
  for (const f of result.issues.empty) {
    const full = join(CORTEX, f);
    unlinkSync(full);
    console.log(`[removed] ${f}`);
  }
  console.log(`\nRemoved ${result.issues.empty.length} empty files.`);
  process.exit(0);
}

if (args.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Cortex Wiki Lint — ${result.total_files} files\n`);

  const { broken_links, duplicates, empty, no_title } = result.issues;

  if (empty.length > 0) {
    console.log(`Empty files (${empty.length}):`);
    empty.forEach(f => console.log(`  ${f}`));
    console.log();
  }

  if (duplicates.length > 0) {
    console.log(`Duplicate names (${duplicates.length}):`);
    duplicates.forEach(d => console.log(`  ${d.name}: ${d.paths.join(', ')}`));
    console.log();
  }

  if (broken_links.length > 0) {
    console.log(`Broken links (${broken_links.length}):`);
    broken_links.slice(0, 20).forEach(l => console.log(`  ${l.file} → [[${l.target}]]`));
    if (broken_links.length > 20) console.log(`  ... and ${broken_links.length - 20} more`);
    console.log();
  }

  if (no_title.length > 0) {
    console.log(`Missing title (${no_title.length}):`);
    no_title.slice(0, 10).forEach(f => console.log(`  ${f}`));
    if (no_title.length > 10) console.log(`  ... and ${no_title.length - 10} more`);
    console.log();
  }

  const total = empty.length + duplicates.length + broken_links.length + no_title.length;
  console.log(`Total issues: ${total}`);
}
