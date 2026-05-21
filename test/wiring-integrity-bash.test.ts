import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dirname, '..');
const SCRIPTS_DIR = join(ROOT, 'scripts');
const AGENTS_DIR = join(ROOT, '.claude', 'agents');
const COMMANDS_DIR = join(ROOT, '.claude', 'commands');

// $VAR 직후 한글(AC00-D7A3)이 붙는 패턴
const VAR_KOREAN = /\$[A-Za-z_][A-Za-z0-9_]*[\uAC00-\uD7A3]/g;

interface Violation { file: string; line: number; match: string }

function findShellScripts(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__pycache__') {
      results.push(...findShellScripts(full));
    } else if (entry.isFile() && entry.name.endsWith('.sh')) {
      results.push(full);
    }
  }
  return results;
}

function extractBashBlocks(content: string): Array<{ startLine: number; code: string }> {
  const blocks: Array<{ startLine: number; code: string }> = [];
  const lines = content.split('\n');
  let inBlock = false;
  let blockStart = 0;
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^```(?:bash|sh|shell)\s*$/.test(lines[i].trim())) {
      inBlock = true;
      blockStart = i + 1;
      blockLines = [];
    } else if (inBlock && lines[i].trim() === '```') {
      blocks.push({ startLine: blockStart, code: blockLines.join('\n') });
      inBlock = false;
    } else if (inBlock) {
      blockLines.push(lines[i]);
    }
  }
  return blocks;
}

function scanForVarKorean(filePath: string, content: string, lineOffset = 0): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    VAR_KOREAN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VAR_KOREAN.exec(lines[i])) !== null) {
      violations.push({
        file: filePath.replace(ROOT + '/', ''),
        line: i + 1 + lineOffset,
        match: match[0],
      });
    }
  }
  return violations;
}

describe('Wiring Integrity: Bash 안전', () => {
  it('no $VAR한글 in shell scripts', () => {
    const scripts = findShellScripts(SCRIPTS_DIR);
    const violations = scripts.flatMap(f =>
      scanForVarKorean(f, readFileSync(f, 'utf-8'))
    );
    expect(
      violations,
      `$VAR한글 위반 ${violations.length}건:\n${violations.map(v => `${v.file}:${v.line} → ${v.match}`).join('\n')}`
    ).toEqual([]);
  });

  it('no $VAR한글 in command/agent bash blocks', () => {
    const mdDirs = [AGENTS_DIR, COMMANDS_DIR];
    const violations: Violation[] = [];

    for (const dir of mdDirs) {
      if (!existsSync(dir)) continue;
      const files = readdirSync(dir).filter(f => f.endsWith('.md')).map(f => join(dir, f));
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const blocks = extractBashBlocks(content);
        for (const block of blocks) {
          violations.push(...scanForVarKorean(file, block.code, block.startLine));
        }
      }
    }
    expect(
      violations,
      `$VAR한글 위반 ${violations.length}건:\n${violations.map(v => `${v.file}:${v.line} → ${v.match}`).join('\n')}`
    ).toEqual([]);
  });
});
