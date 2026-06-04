#!/usr/bin/env node
// impact.mjs — "파일 X가 변경되면 영향받는 파일 목록" 출력
// Source: nx affected + dependency-cruiser 패턴 참고 (2026-06-04 리서치)
// 의존성 없음 — Node.js 표준 라이브러리만 사용

import { readFileSync, readdirSync } from 'fs';
import { resolve, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const TARGET = process.argv[2];

if (!TARGET) {
  console.error('Usage: node scripts/impact.mjs <file-path>');
  console.error('Example: node scripts/impact.mjs scripts/prompt-cache.mjs');
  process.exit(1);
}

const EXTS = ['.mjs', '.ts', '.js'];

function getAllFiles(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', '.wrangler', 'dist', 'build'].includes(entry.name)) continue;
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) results.push(...getAllFiles(full));
      else if (EXTS.includes(extname(entry.name))) results.push(full);
    }
  } catch { /* 권한 없는 폴더 무시 */ }
  return results;
}

function getImports(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return [...content.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(m => m[1]);
  } catch { return []; }
}

// 역방향 의존성 맵 구축 (파일 → 이 파일을 import하는 파일들)
const files = getAllFiles(ROOT);
const reverseMap = new Map();

for (const file of files) {
  for (const imp of getImports(file)) {
    const base = resolve(file, '..', imp).replace(/\.[^.]+$/, '');
    if (!reverseMap.has(base)) reverseMap.set(base, new Set());
    reverseMap.get(base).add(file);
  }
}

// BFS로 영향받는 파일 전파 (역방향)
const targetAbs = resolve(ROOT, TARGET).replace(/\.[^.]+$/, '');
const visited = new Set([targetAbs]);
const queue = [targetAbs];
const affected = [];

while (queue.length) {
  const current = queue.shift();
  for (const [key, dependents] of reverseMap) {
    if (key === current || key.startsWith(current + '/')) {
      for (const dep of dependents) {
        const depKey = dep.replace(/\.[^.]+$/, '');
        if (!visited.has(depKey)) {
          visited.add(depKey);
          queue.push(depKey);
          affected.push(relative(ROOT, dep));
        }
      }
    }
  }
}

if (affected.length === 0) {
  console.log(`[impact] ${TARGET}: 영향받는 파일 없음`);
} else {
  console.log(`[impact] ${TARGET} 변경 시 영향받는 파일 (${affected.length}개):`);
  affected.forEach(f => console.log(`  → ${f}`));
}
