import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'onenote-token-hygiene.mjs');

let tmp: string;

function run(root: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [SCRIPT, '--root', root], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error: any) {
    return {
      code: error.status ?? -1,
      stdout: error.stdout?.toString() ?? '',
      stderr: error.stderr?.toString() ?? '',
    };
  }
}

beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'onenote-token-hygiene-'));
  mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('scripts/onenote-token-hygiene.mjs', () => {
  it('passes when OneNote scripts only use env/path indirection', () => {
    writeFileSync(
      path.join(tmp, 'scripts', 'onenote-auth.py'),
      'TOKEN_FILE = Path(os.environ.get("ONENOTE_TOKEN_FILE", safe_path))\n',
    );

    const result = run(tmp);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('passed');
  });

  it('fails when ignored local OneNote secret files exist', () => {
    mkdirSync(path.join(tmp, 'cortex'), { recursive: true });
    writeFileSync(path.join(tmp, 'cortex', '.onenote-token.json'), '{}\n');

    const result = run(tmp);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('cortex/.onenote-token.json');
    expect(result.stderr).toContain('legacy-local-secret-file');
  });

  it('fails when a OneNote script contains a hardcoded token-like literal', () => {
    writeFileSync(
      path.join(tmp, 'scripts', 'onenote-download.py'),
      'TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature"\n',
    );

    const result = run(tmp);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('scripts/onenote-download.py:1');
    expect(result.stderr).toContain('hardcoded-token');
  });
});
