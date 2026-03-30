import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import {
  WorktreeManager,
  type WorktreeInfo,
  type HarvestResult,
} from '../lib/worktree.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-worktree-test-' + process.pid);
let repoRoot: string;

function git(args: string[], cwd: string): string {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8', timeout: 10_000 });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

beforeEach(() => {
  // Create a temp git repo
  repoRoot = path.join(TEST_DIR, 'repo');
  fs.mkdirSync(repoRoot, { recursive: true });
  git(['init'], repoRoot);
  git(['config', 'user.email', 'test@test.com'], repoRoot);
  git(['config', 'user.name', 'Test'], repoRoot);
  fs.writeFileSync(path.join(repoRoot, 'README.md'), '# Test');
  git(['add', '.'], repoRoot);
  git(['commit', '-m', 'init'], repoRoot);
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('WorktreeManager', () => {
  it('should create an isolated worktree', () => {
    const mgr = new WorktreeManager(repoRoot);
    const wtPath = mgr.create('test-agent');

    expect(fs.existsSync(wtPath)).toBe(true);
    expect(fs.existsSync(path.join(wtPath, 'README.md'))).toBe(true);
  });

  it('should track worktree info', () => {
    const mgr = new WorktreeManager(repoRoot);
    mgr.create('test-agent');

    const info = mgr.getInfo('test-agent');
    expect(info).toBeDefined();
    expect(info!.testName).toBe('test-agent');
    expect(info!.originalSha).toBeDefined();
  });

  it('should harvest changes as patches', () => {
    const mgr = new WorktreeManager(repoRoot);
    const wtPath = mgr.create('coder');

    // Make a change in worktree
    fs.writeFileSync(path.join(wtPath, 'new-file.ts'), 'export const x = 1;');

    const result = mgr.harvest('coder');
    expect(result).not.toBeNull();
    expect(result!.changedFiles).toContain('new-file.ts');
    expect(result!.patchPath).toBeTruthy();
    expect(result!.isDuplicate).toBe(false);
  });

  it('should return null when no changes to harvest', () => {
    const mgr = new WorktreeManager(repoRoot);
    mgr.create('reader');

    const result = mgr.harvest('reader');
    expect(result).toBeNull();
  });

  it('should detect duplicate patches', () => {
    const mgr = new WorktreeManager(repoRoot);

    // First harvest
    const wt1 = mgr.create('agent-1');
    fs.writeFileSync(path.join(wt1, 'same.ts'), 'export const y = 2;');
    const result1 = mgr.harvest('agent-1');
    expect(result1!.isDuplicate).toBe(false);

    mgr.cleanup('agent-1');

    // Second harvest with identical change
    const wt2 = mgr.create('agent-2');
    fs.writeFileSync(path.join(wt2, 'same.ts'), 'export const y = 2;');
    const result2 = mgr.harvest('agent-2');
    expect(result2!.isDuplicate).toBe(true);
  });

  it('should cleanup worktree', () => {
    const mgr = new WorktreeManager(repoRoot);
    const wtPath = mgr.create('temp');

    mgr.cleanup('temp');

    expect(mgr.getInfo('temp')).toBeUndefined();
    // Directory should be removed
    expect(fs.existsSync(wtPath)).toBe(false);
  });

  it('should cleanupAll on destroy', () => {
    const mgr = new WorktreeManager(repoRoot);
    mgr.create('a1');
    mgr.create('a2');

    mgr.cleanupAll();

    expect(mgr.getInfo('a1')).toBeUndefined();
    expect(mgr.getInfo('a2')).toBeUndefined();
  });
});
