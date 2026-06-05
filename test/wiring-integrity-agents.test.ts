import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const AGENTS_DIR = join(ROOT, '.claude', 'agents');
const COMMANDS_DIR = join(ROOT, '.claude', 'commands');

function getAgentSlugs(): string[] {
  return readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => f.replace('.md', ''));
}

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

describe('Wiring Integrity: 에이전트 등록', () => {
  const agentSlugs = getAgentSlugs();

  it('should have agents to check', () => {
    expect(agentSlugs.length).toBeGreaterThan(0);
  });

  // subagent_type 참조가 실제 에이전트 파일로 존재하는지
  it('all subagent_type references should resolve to agent files', () => {
    const BUILTIN_TYPES = ['general-purpose', 'statusline-setup', 'explore', 'plan', 'claude-code-guide'];
    const allMds = [
      ...readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md') && f !== 'README.md').map(f => join(AGENTS_DIR, f)),
      ...readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md')).map(f => join(COMMANDS_DIR, f)),
    ];

    const missing: string[] = [];
    const regex = /subagent_type\s*[=:]\s*"?([A-Za-z][\w-]*)"?/gi;

    for (const file of allMds) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(lines[i])) !== null) {
          const slug = match[1].toLowerCase();
          if (BUILTIN_TYPES.includes(slug)) continue;
          if (!existsSync(join(AGENTS_DIR, `${slug}.md`))) {
            const rel = file.replace(ROOT + '/', '');
            missing.push(`${rel}:${i + 1} → subagent_type="${slug}" 에이전트 파일 없음`);
          }
        }
      }
    }
    expect(missing, `미등록 subagent_type ${missing.length}건:\n${missing.join('\n')}`).toEqual([]);
  });

  // agents/ frontmatter name이 파일명과 일치하는지
  it('agent frontmatter name should match filename', () => {
    const mismatches: string[] = [];
    for (const slug of agentSlugs) {
      const content = readFileSync(join(AGENTS_DIR, `${slug}.md`), 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm && fm.name && fm.name !== slug) {
        mismatches.push(`${slug}.md: name="${fm.name}" ≠ filename "${slug}"`);
      }
    }
    expect(mismatches, `이름 불일치 ${mismatches.length}건:\n${mismatches.join('\n')}`).toEqual([]);
  });
});
