import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'audit-design.mjs');

let TMP: string;
let GOOD: string;
let BAD: string;
let ANALYTICS: string;

function runCli(file: string, extraArgs: string[] = []): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(
      'npx',
      ['tsx', SCRIPT, file, `--analytics=${ANALYTICS}`, ...extraArgs],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );
    return { code: 0, stdout, stderr: '' };
  } catch (e: any) {
    return { code: e.status ?? -1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}

describe('scripts/audit-design.mjs', () => {
  beforeAll(() => {
    TMP = mkdtempSync(path.join(tmpdir(), 'audit-design-'));
    GOOD = path.join(TMP, 'good.css');
    BAD = path.join(TMP, 'bad.tsx');
    ANALYTICS = path.join(TMP, 'analytics.jsonl');
    writeFileSync(GOOD, '.btn { padding: 16px; font-size: 14px; line-height: 1.5; }');
    writeFileSync(BAD, '<><img src="/x.png" /><button>x</button><div className="grid grid-cols-3 rounded-2xl shadow-lg">x</div></>');
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('exits 0 with all_passed=true on clean CSS at default gate', () => {
    const { code, stdout } = runCli(GOOD);
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out.all_passed).toBe(true);
    expect(out.files[0].score).toBeGreaterThanOrEqual(60);
  });

  it('exits 1 with a11y violations on bad TSX at ship gate', () => {
    const { code, stdout } = runCli(BAD, ['--gate=ship']);
    expect(code).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.all_passed).toBe(false);
    expect(out.files[0].summary.a11y).toBeGreaterThan(0);
  });

  it('writes one analytics line per audit (logDesignAudit closure)', () => {
    runCli(GOOD);
    runCli(BAD);
    expect(existsSync(ANALYTICS)).toBe(true);
    const lines = readFileSync(ANALYTICS, 'utf-8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.skill).toBe('design-auditor');
    expect(last.event).toBe('design_audit');
    expect(typeof last.designScore).toBe('number');
  });

  it('exits 2 on missing file', () => {
    const { code } = runCli(path.join(TMP, 'nonexistent.css'));
    expect(code).toBe(2);
  });

  it('respects --tone=editorial-technical for caption-class relaxation', () => {
    const file = path.join(TMP, 'editorial.css');
    writeFileSync(file, '.meta { font-size: 12px; }');
    const { code, stdout } = runCli(file, ['--tone=editorial-technical', '--gate=ship']);
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out.files[0].violations.some((v: any) => v.rule === 'RD-04')).toBe(false);
  });
});
