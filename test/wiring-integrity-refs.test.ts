import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const AGENTS_DIR = join(ROOT, '.claude', 'agents');
const COMMANDS_DIR = join(ROOT, '.claude', 'commands');

const SKIP_PREFIXES = ['~/', 'A-Team/', '.agent/', 'node_modules/', 'http', '$'];
const REF_EXTENSIONS = /\.(?:md|ts|sh|mjs|py|js|yaml|json)$/;
// 템플릿/glob 패턴 — 실제 파일이 아닌 문서용 경로
const TEMPLATE_MARKERS = /[{}\[\]*<>]|YYYY|MM-DD|HH|QN/;

// backtick refs: `governance/rules/foo.md`
// .context/ 제외 — 런타임 생성 출력 경로라 사전 존재 보장 불가
const BACKTICK_REF = /`((?:governance|lib|scripts|reference|docs|templates)\/[^`\s]+)`/g;
const MD_LINK_REF = /\[[^\]]*\]\(((?:governance|lib|scripts|reference|docs|templates)\/[^)]+)\)/g;

interface Ref { source: string; line: number; target: string }

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some(p => path.startsWith(p));
}

function extractRefs(filePath: string): Ref[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const refs: Ref[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const regex of [BACKTICK_REF, MD_LINK_REF]) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const target = match[1] || match[2];
        if (target && REF_EXTENSIONS.test(target) && !shouldSkip(target) && !TEMPLATE_MARKERS.test(target)) {
          refs.push({ source: filePath, line: i + 1, target });
        }
      }
    }
  }
  return refs;
}

function getMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => join(dir, f));
}

describe('Wiring Integrity: 참조 무결성', () => {
  const allFiles = [...getMdFiles(AGENTS_DIR), ...getMdFiles(COMMANDS_DIR)];
  const allRefs = allFiles.flatMap(f => extractRefs(f));

  it('should have refs to analyze', () => {
    expect(allRefs.length).toBeGreaterThan(0);
  });

  it('all referenced files should exist', () => {
    const broken: string[] = [];
    for (const ref of allRefs) {
      const absPath = resolve(ROOT, ref.target);
      if (!existsSync(absPath)) {
        const rel = ref.source.replace(ROOT + '/', '');
        broken.push(`${rel}:${ref.line} → ${ref.target}`);
      }
    }
    expect(broken, `깨진 참조 ${broken.length}건:\n${broken.join('\n')}`).toEqual([]);
  });
});
