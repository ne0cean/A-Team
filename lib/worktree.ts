/**
 * WorktreeManager — Git worktree isolation with change harvesting
 *
 * Creates git worktrees for isolated agent execution,
 * harvests changes as patches, and provides deduplication.
 */

import { spawnSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// --- Types ---

export interface WorktreeInfo {
  path: string;
  testName: string;
  originalSha: string;
  createdAt: number;
}

export interface HarvestResult {
  testName: string;
  worktreePath: string;
  diffStat: string;
  patchPath: string;
  changedFiles: string[];
  isDuplicate: boolean;
}

// --- Utility ---

function git(args: string[], cwd: string, tolerateFailure = false): string {
  const result = spawnSync('git', args, { cwd, stdio: 'pipe', timeout: 30_000 });
  const stdout = result.stdout?.toString().trim() ?? '';
  const stderr = result.stderr?.toString().trim() ?? '';
  if (result.status !== 0 && !tolerateFailure) {
    throw new Error(`git ${args.join(' ')} failed (exit ${result.status}): ${stderr || stdout}`);
  }
  return stdout;
}

// --- Dedup ---

interface DedupIndex {
  hashes: Record<string, string>; // hash → runId
}

function getDedupPath(harvestDir: string): string {
  return path.join(harvestDir, 'dedup.json');
}

function loadDedupIndex(harvestDir: string): DedupIndex {
  const p = getDedupPath(harvestDir);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return { hashes: {} };
  }
}

function saveDedupIndex(harvestDir: string, index: DedupIndex): void {
  fs.mkdirSync(harvestDir, { recursive: true });
  const tmp = getDedupPath(harvestDir) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2));
  fs.renameSync(tmp, getDedupPath(harvestDir));
}

// --- WorktreeManager ---

export class WorktreeManager {
  private repoRoot: string;
  private runId: string;
  private active = new Map<string, WorktreeInfo>();
  private harvestResults: HarvestResult[] = [];
  private harvestDir: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
    this.runId = crypto.randomUUID();
    this.harvestDir = path.join(os.tmpdir(), 'a-team-harvests', this.runId);
  }

  create(testName: string): string {
    const originalSha = git(['rev-parse', 'HEAD'], this.repoRoot);
    const worktreeBase = path.join(this.repoRoot, '.worktrees', this.runId);
    fs.mkdirSync(worktreeBase, { recursive: true });

    const worktreePath = path.join(worktreeBase, testName);
    git(['worktree', 'add', '--detach', worktreePath, 'HEAD'], this.repoRoot);

    const info: WorktreeInfo = {
      path: worktreePath,
      testName,
      originalSha,
      createdAt: Date.now(),
    };
    this.active.set(testName, info);

    return worktreePath;
  }

  harvest(testName: string): HarvestResult | null {
    const info = this.active.get(testName);
    if (!info) return null;

    if (!fs.existsSync(info.path)) return null;

    // Stage everything
    git(['-C', info.path, 'add', '-A'], info.path, true);

    // Get patch
    const patch = git(['-C', info.path, 'diff', info.originalSha, '--cached'], info.path, true);
    if (!patch) return null;

    const diffStat = git(['-C', info.path, 'diff', info.originalSha, '--cached', '--stat'], info.path, true);
    const nameOnly = git(['-C', info.path, 'diff', info.originalSha, '--cached', '--name-only'], info.path, true);
    const changedFiles = nameOnly.split('\n').filter(Boolean);

    // Dedup
    const hash = crypto.createHash('sha256').update(patch).digest('hex');
    const dedupIndex = loadDedupIndex(this.harvestDir);
    const isDuplicate = hash in dedupIndex.hashes;

    let patchPath = '';
    if (!isDuplicate) {
      fs.mkdirSync(this.harvestDir, { recursive: true });
      patchPath = path.join(this.harvestDir, `${testName}.patch`);
      fs.writeFileSync(patchPath, patch);

      dedupIndex.hashes[hash] = this.runId;
      saveDedupIndex(this.harvestDir, dedupIndex);
    }

    const result: HarvestResult = {
      testName,
      worktreePath: info.path,
      diffStat,
      patchPath,
      changedFiles,
      isDuplicate,
    };

    this.harvestResults.push(result);
    return result;
  }

  cleanup(testName: string): void {
    const info = this.active.get(testName);
    if (!info) return;

    try {
      git(['worktree', 'remove', '--force', info.path], this.repoRoot, true);
    } catch {
      try {
        fs.rmSync(info.path, { recursive: true, force: true });
        git(['worktree', 'prune'], this.repoRoot, true);
      } catch { /* non-fatal */ }
    }

    this.active.delete(testName);
  }

  cleanupAll(): void {
    for (const testName of [...this.active.keys()]) {
      this.cleanup(testName);
    }

    // Clean up empty run directory
    const runDir = path.join(this.repoRoot, '.worktrees', this.runId);
    try {
      const entries = fs.readdirSync(runDir);
      if (entries.length === 0) fs.rmdirSync(runDir);
    } catch { /* non-fatal */ }
  }

  getRunId(): string {
    return this.runId;
  }

  getInfo(testName: string): WorktreeInfo | undefined {
    return this.active.get(testName);
  }

  getHarvestResults(): HarvestResult[] {
    return this.harvestResults;
  }
}
