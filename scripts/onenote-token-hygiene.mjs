#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const LEGACY_SECRET_FILES = [
  'cortex/.onenote-token.json',
  'cortex/.onenote-msal-cache.json',
];

const TOKEN_PATTERNS = [
  {
    name: 'literal token assignment',
    re: /\b(?:access_token|refresh_token|client_secret)\b\s*[:=]\s*["'][A-Za-z0-9._~+/=-]{20,}["']/i,
  },
  {
    name: 'literal bearer token',
    re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
  },
  {
    name: 'jwt-like literal',
    re: /["']eyJ[A-Za-z0-9._~+/=-]{20,}["']/,
  },
];

function parseRoot(argv) {
  const index = argv.indexOf('--root');
  if (index >= 0) {
    return path.resolve(argv[index + 1] ?? '.');
  }
  return process.cwd();
}

function onenoteScripts(root) {
  const scriptsDir = path.join(root, 'scripts');
  if (!existsSync(scriptsDir)) return [];
  return readdirSync(scriptsDir)
    .filter((name) => /^onenote-.*\.py$/.test(name))
    .map((name) => path.join(scriptsDir, name));
}

function scan(root) {
  const violations = [];

  for (const rel of LEGACY_SECRET_FILES) {
    const file = path.join(root, rel);
    if (existsSync(file)) {
      violations.push({
        type: 'legacy-local-secret-file',
        file: rel,
        message: 'Move this secret to ONENOTE_ACCESS_TOKEN or ONENOTE_TOKEN_FILE outside the repo.',
      });
    }
  }

  for (const file of onenoteScripts(root)) {
    const rel = path.relative(root, file);
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of TOKEN_PATTERNS) {
        if (pattern.re.test(line)) {
          violations.push({
            type: 'hardcoded-token',
            file: rel,
            line: index + 1,
            message: pattern.name,
          });
        }
      }
    });
  }

  return violations;
}

const root = parseRoot(process.argv.slice(2));
const violations = scan(root);

if (violations.length > 0) {
  console.error('OneNote token hygiene failed:');
  for (const violation of violations) {
    const location = violation.line ? `${violation.file}:${violation.line}` : violation.file;
    console.error(`- ${location} (${violation.type}): ${violation.message}`);
  }
  process.exit(1);
}

console.log('OneNote token hygiene passed.');
