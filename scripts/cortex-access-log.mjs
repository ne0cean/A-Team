#!/usr/bin/env node
/**
 * cortex/access-log.jsonl — 노트 접근 기록
 * /end에서 호출: 세션 중 접근한 cortex 파일 기록
 *
 * Usage: node scripts/cortex-access-log.mjs <file1> <file2> ...
 *   또는: echo '["path1","path2"]' | node scripts/cortex-access-log.mjs --stdin
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const LOG = join(CORTEX, 'access-log.jsonl');

const now = new Date().toISOString();
const session = process.env.CLAUDE_SESSION_ID || `manual-${Date.now()}`;

let paths = process.argv.slice(2).filter(p => p !== '--stdin');

if (process.argv.includes('--stdin')) {
  const input = await new Promise(resolve => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data.trim()));
  });
  try { paths = JSON.parse(input); } catch { paths = input.split('\n').filter(Boolean); }
}

if (!paths.length) {
  console.log('Usage: cortex-access-log.mjs <path1> [path2] ...');
  process.exit(0);
}

const entries = paths.map(p => JSON.stringify({
  ts: now,
  session,
  path: p,
}));

appendFileSync(LOG, entries.join('\n') + '\n');
console.log(`[access-log] ${paths.length} entries logged`);
