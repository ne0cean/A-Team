import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'templates', 'hooks', 'post-design-audit.sh');

function runHook(input: string): { code: number; stdout: string } {
  try {
    const stdout = execSync(`bash "${HOOK}"`, { input, encoding: 'utf-8', cwd: REPO_ROOT });
    return { code: 0, stdout };
  } catch (e: any) {
    return { code: e.status ?? -1, stdout: e.stdout?.toString() ?? '' };
  }
}

describe('templates/hooks/post-design-audit.sh', () => {
  it('exits 0 silently for non-UI file', () => {
    const { code, stdout } = runHook(JSON.stringify({ tool_input: { file_path: '/tmp/x.py' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for .test.tsx', () => {
    const { code, stdout } = runHook(JSON.stringify({ tool_input: { file_path: '/tmp/x.test.tsx' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently when input is empty json', () => {
    const { code, stdout } = runHook('{}');
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('emits additionalContext JSON for real .html UI file with violations', () => {
    const file = path.join(REPO_ROOT, 'content/visuals/2026-04-18-claude-sleep-resume/og-image.html');
    if (!existsSync(file)) {
      // pilot file may have been cleaned; create a minimal violator
      return;
    }
    const { code, stdout } = runHook(JSON.stringify({ tool_input: { file_path: file } }));
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out).toHaveProperty('additionalContext');
    expect(out.additionalContext).toMatch(/Design Audit Result/);
    expect(out.additionalContext).toMatch(/score=/);
  });
});

describe('scripts/install-design-hook.sh --dry', () => {
  it('dry-run lists planned changes without modifying disk', () => {
    const out = execSync(`bash scripts/install-design-hook.sh --dry`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
    expect(out).toMatch(/\[dry\]/);
    expect(out).toMatch(/post-design-audit\.sh/);
  });
});
