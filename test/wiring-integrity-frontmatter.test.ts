import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const AGENTS_DIR = join(ROOT, '.claude', 'agents');
const COMMANDS_DIR = join(ROOT, '.claude', 'commands');

function parseFrontmatter(content: string): Record<string, string> | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('---', 3);
  if (end === -1) return null;
  const block = content.slice(3, end).trim();
  const result: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

function getMdFiles(dir: string, exclude: string[] = ['README.md']): Array<{ name: string; content: string }> {
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && !exclude.includes(f))
    .map(f => ({ name: f, content: readFileSync(join(dir, f), 'utf-8') }));
}

describe('Wiring Integrity: Frontmatter 유효성', () => {
  const agents = getMdFiles(AGENTS_DIR);
  const commands = getMdFiles(COMMANDS_DIR);

  it('all agents should have name and description', () => {
    const invalid: string[] = [];
    for (const agent of agents) {
      const fm = parseFrontmatter(agent.content);
      if (!fm) {
        invalid.push(`${agent.name}: frontmatter 없음`);
      } else {
        if (!fm.name) invalid.push(`${agent.name}: name 필드 없음`);
        if (!fm.description) invalid.push(`${agent.name}: description 필드 없음`);
      }
    }
    expect(invalid, `에이전트 frontmatter 위반 ${invalid.length}건:\n${invalid.join('\n')}`).toEqual([]);
  });

  it('commands with frontmatter should have description', () => {
    const invalid: string[] = [];
    for (const cmd of commands) {
      const fm = parseFrontmatter(cmd.content);
      // frontmatter가 없으면 통과 (강제하지 않음)
      if (fm && !fm.description) {
        invalid.push(`${cmd.name}: frontmatter 있지만 description 없음`);
      }
    }
    expect(invalid, `커맨드 frontmatter 위반 ${invalid.length}건:\n${invalid.join('\n')}`).toEqual([]);
  });
});
