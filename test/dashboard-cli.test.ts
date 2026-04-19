import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'dashboard.mjs');

function makeFixture(): string {
  const tmp = mkdtempSync(path.join(tmpdir(), 'dashboard-'));
  const file = path.join(tmp, 'analytics.jsonl');
  const now = new Date();
  const lines = [
    { skill: 'design-auditor', ts: now.toISOString(), repo: 'a-team', event: 'design_audit', designScore: 92 },
    { skill: 'design-auditor', ts: now.toISOString(), repo: 'a-team', event: 'design_audit', designScore: 84 },
    { skill: 'marketing-generate', ts: now.toISOString(), repo: 'a-team', event: 'marketing_generate', marketingPlatform: 'twitter' },
  ];
  writeFileSync(file, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  return file;
}

describe('scripts/dashboard.mjs', () => {
  it('renders skill/event/repo aggregates and Module Health table', () => {
    const file = makeFixture();
    const out = execFileSync('npx', ['tsx', SCRIPT, `--file=${file}`], {
      cwd: REPO_ROOT, encoding: 'utf-8',
    });
    expect(out).toMatch(/By Skill/);
    expect(out).toMatch(/design-auditor/);
    expect(out).toMatch(/marketing-generate/);
    expect(out).toMatch(/Module Health/);
    expect(out).toMatch(/✅ active/);
    rmSync(path.dirname(file), { recursive: true, force: true });
  });

  it('outputs structured JSON when --json passed', () => {
    const file = makeFixture();
    const out = execFileSync('npx', ['tsx', SCRIPT, `--file=${file}`, '--json'], {
      cwd: REPO_ROOT, encoding: 'utf-8',
    });
    const parsed = JSON.parse(out);
    expect(parsed.totalEvents).toBe(3);
    expect(parsed.bySkill['design-auditor']).toBe(2);
    expect(parsed.bySkill['marketing-generate']).toBe(1);
    expect(parsed.health.find((h: any) => h.module === 'design-auditor').count).toBe(2);
    rmSync(path.dirname(file), { recursive: true, force: true });
  });

  it('filters by --module', () => {
    const file = makeFixture();
    const out = execFileSync('npx', ['tsx', SCRIPT, `--file=${file}`, '--module=design', '--json'], {
      cwd: REPO_ROOT, encoding: 'utf-8',
    });
    const parsed = JSON.parse(out);
    expect(parsed.totalEvents).toBe(2);
    expect(parsed.bySkill['marketing-generate']).toBeUndefined();
  });
});
