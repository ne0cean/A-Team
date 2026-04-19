import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'absorb-scan.sh');

let TMP: string;
let MASTER: string;
let PROJECTS: string;

function setupFakeEnv() {
  TMP = mkdtempSync(path.join(tmpdir(), 'absorb-dedup-'));
  MASTER = path.join(TMP, 'a-team');
  PROJECTS = path.join(TMP, 'Projects');

  mkdirSync(path.join(MASTER, 'improvements'), { recursive: true });
  mkdirSync(path.join(MASTER, '.claude', 'commands'), { recursive: true });
  mkdirSync(path.join(MASTER, 'scripts'), { recursive: true });
  mkdirSync(path.join(PROJECTS, 'a-team'), { recursive: true });
  mkdirSync(path.join(PROJECTS, 'fake-proj', '.claude', 'commands'), { recursive: true });

  // Source command in fake-proj
  writeFileSync(
    path.join(PROJECTS, 'fake-proj', '.claude', 'commands', 'foo.md'),
    '---\ndescription: foo\n---\n# foo\nA-Team test',
  );
  // master pending starts empty
  writeFileSync(path.join(MASTER, 'improvements', 'pending.md'), '# A-Team Improvements — Pending\n\n');

  // Copy script
  execSync(`cp "${SCRIPT}" "${path.join(MASTER, 'scripts', 'absorb-scan.sh')}"`);
}

function runScan(): string {
  return execSync(
    `FORCE=1 ATEAM_MASTER="${MASTER}" HOME="${TMP}" bash "${path.join(MASTER, 'scripts', 'absorb-scan.sh')}"`,
    { encoding: 'utf-8' },
  );
}

describe('absorb-scan dedup', () => {
  beforeEach(setupFakeEnv);
  afterEach(() => rmSync(TMP, { recursive: true, force: true }));

  it('first scan registers a NEW pending entry', () => {
    const out = runScan();
    expect(out).toMatch(/Scan:.*projects/);
    const pending = readFileSync(path.join(MASTER, 'improvements', 'pending.md'), 'utf-8');
    expect(pending).toMatch(/IMP-\d{8}-01.*command foo\.md.*from fake-proj/);
    expect(pending).toMatch(/⏳ pending/);
  });

  it('second scan does NOT add duplicate while still pending', () => {
    runScan();
    const after1 = readFileSync(path.join(MASTER, 'improvements', 'pending.md'), 'utf-8');
    const count1 = (after1.match(/IMP-\d{8}-\d+/g) || []).length;

    runScan();
    const after2 = readFileSync(path.join(MASTER, 'improvements', 'pending.md'), 'utf-8');
    const count2 = (after2.match(/IMP-\d{8}-\d+/g) || []).length;

    expect(count2).toBe(count1);
  });

  it('archived (processed.md) entry is not re-added', () => {
    runScan();
    // simulate archive: move pending → processed
    const pending = readFileSync(path.join(MASTER, 'improvements', 'pending.md'), 'utf-8');
    writeFileSync(path.join(MASTER, 'improvements', 'pending.md'), '# A-Team Improvements — Pending\n');
    writeFileSync(
      path.join(MASTER, 'improvements', 'processed.md'),
      '# Processed\n\n' + pending.replace(/⏳ pending/g, '☐ deferred'),
    );

    runScan();
    const after = readFileSync(path.join(MASTER, 'improvements', 'pending.md'), 'utf-8');
    expect(after).not.toMatch(/command foo\.md/);
  });
});
