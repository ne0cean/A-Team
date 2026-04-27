import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PRE_HOOK = path.join(REPO_ROOT, 'templates', 'hooks', 'pre-ui-capture.sh');
const POST_HOOK = path.join(REPO_ROOT, 'templates', 'hooks', 'post-ui-verify.sh');

function runHook(hook: string, input: string, env: Record<string, string> = {}): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(`bash "${hook}"`, {
      input,
      encoding: 'utf-8',
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      // dev server probe must fail silently — never let real localhost:3000 affect tests
      timeout: 5000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e: any) {
    return { code: e.status ?? -1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}

describe('templates/hooks/pre-ui-capture.sh', () => {
  it('exits 0 silently when file_path missing', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: {} }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for non-UI extension (.py)', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/foo.py' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for non-UI extension (.md)', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/notes.md' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for .test.tsx', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/Comp.test.tsx' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for .stories.tsx', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/Comp.stories.tsx' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for .d.ts', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/types.d.ts' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for node_modules path', () => {
    const { code, stdout } = runHook(PRE_HOOK, JSON.stringify({ tool_input: { file_path: '/proj/node_modules/foo/x.tsx' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently when UI_INSPECT_ENABLED=false even for valid .tsx', () => {
    const { code, stdout } = runHook(
      PRE_HOOK,
      JSON.stringify({ tool_input: { file_path: '/proj/src/Comp.tsx' } }),
      { UI_INSPECT_ENABLED: 'false' }
    );
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for valid .tsx when dev server unreachable', () => {
    // Use unreachable URL — curl --max-time 2 will fail fast → exit 0
    const { code, stdout } = runHook(
      PRE_HOOK,
      JSON.stringify({ tool_input: { file_path: '/proj/src/Comp.tsx' } }),
      { UI_INSPECT_URL: 'http://localhost:1' }  // closed port
    );
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('handles malformed JSON input gracefully', () => {
    const { code, stdout } = runHook(PRE_HOOK, 'not-json{{{');
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });
});

describe('templates/hooks/post-ui-verify.sh', () => {
  it('exits 0 silently when file_path missing', () => {
    const { code, stdout } = runHook(POST_HOOK, JSON.stringify({ tool_input: {} }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for non-UI extension', () => {
    const { code, stdout } = runHook(POST_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/foo.go' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for .test.tsx', () => {
    const { code, stdout } = runHook(POST_HOOK, JSON.stringify({ tool_input: { file_path: '/tmp/x.test.tsx' } }));
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently for valid .tsx when dev server unreachable', () => {
    const { code, stdout } = runHook(
      POST_HOOK,
      JSON.stringify({ tool_input: { file_path: '/proj/src/Comp.tsx' } }),
      { UI_INSPECT_URL: 'http://localhost:1' }
    );
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('exits 0 silently when UI_INSPECT_ENABLED=false', () => {
    const { code, stdout } = runHook(
      POST_HOOK,
      JSON.stringify({ tool_input: { file_path: '/proj/src/Comp.tsx' } }),
      { UI_INSPECT_ENABLED: 'false' }
    );
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('UI extensions all recognized: .tsx .jsx .css .scss .styled.ts .styled.tsx', () => {
    // All must pass dev-server unreachable path silently — no extension rejection
    for (const ext of ['.tsx', '.jsx', '.css', '.scss', '.styled.ts', '.styled.tsx']) {
      const { code, stdout } = runHook(
        POST_HOOK,
        JSON.stringify({ tool_input: { file_path: `/proj/Comp${ext}` } }),
        { UI_INSPECT_URL: 'http://localhost:1' }
      );
      expect(code, `ext=${ext}`).toBe(0);
      expect(stdout.trim(), `ext=${ext}`).toBe('');
    }
  });
});
