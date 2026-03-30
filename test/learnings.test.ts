import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  logLearning,
  searchLearnings,
  formatLearning,
  type Learning,
  type LearningType,
  type LearningEntry,
} from '../lib/learnings.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-learnings-test-' + process.pid);
const TEST_SLUG = 'test-project';

function getLearningsPath(slug: string): string {
  return path.join(TEST_DIR, slug, 'learnings.jsonl');
}

beforeEach(() => {
  fs.mkdirSync(path.join(TEST_DIR, TEST_SLUG), { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('logLearning', () => {
  it('should create JSONL file and append a learning entry', () => {
    const learning: Learning = {
      skill: 'review',
      type: 'pattern',
      key: 'null-check-before-access',
      insight: 'Always null-check API response before accessing nested fields',
      confidence: 8,
      source: 'observed',
      files: ['src/api/client.ts'],
    };

    logLearning(learning, { baseDir: TEST_DIR, slug: TEST_SLUG });

    const filePath = getLearningsPath(TEST_SLUG);
    expect(fs.existsSync(filePath)).toBe(true);

    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.skill).toBe('review');
    expect(parsed.type).toBe('pattern');
    expect(parsed.key).toBe('null-check-before-access');
    expect(parsed.confidence).toBe(8);
    expect(parsed.ts).toBeDefined();
  });

  it('should append multiple entries to same file', () => {
    logLearning({
      skill: 'ship', type: 'pitfall', key: 'no-force-push',
      insight: 'Never force push to shared branches',
      confidence: 10, source: 'user-stated', files: [],
    }, { baseDir: TEST_DIR, slug: TEST_SLUG });

    logLearning({
      skill: 'cso', type: 'architecture', key: 'auth-middleware',
      insight: 'Auth middleware must validate JWT expiry',
      confidence: 9, source: 'observed', files: ['src/middleware/auth.ts'],
    }, { baseDir: TEST_DIR, slug: TEST_SLUG });

    const lines = fs.readFileSync(getLearningsPath(TEST_SLUG), 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('should include git metadata (branch, commit) when available', () => {
    logLearning({
      skill: 'review', type: 'preference', key: 'terse-output',
      insight: 'User prefers terse output without trailing summaries',
      confidence: 10, source: 'user-stated', files: [],
      branch: 'main', commit: 'abc1234',
    }, { baseDir: TEST_DIR, slug: TEST_SLUG });

    const parsed = JSON.parse(
      fs.readFileSync(getLearningsPath(TEST_SLUG), 'utf-8').trim()
    );
    expect(parsed.branch).toBe('main');
    expect(parsed.commit).toBe('abc1234');
  });
});

describe('searchLearnings', () => {
  function seedLearnings() {
    const entries: Learning[] = [
      { skill: 'review', type: 'pattern', key: 'null-check', insight: 'Always null-check API responses', confidence: 8, source: 'observed', files: ['src/api.ts'] },
      { skill: 'review', type: 'pitfall', key: 'n-plus-one', insight: 'Watch for N+1 queries in ORM loops', confidence: 7, source: 'observed', files: ['src/db.ts'] },
      { skill: 'ship', type: 'preference', key: 'terse-output', insight: 'User wants terse output', confidence: 10, source: 'user-stated', files: [] },
      { skill: 'cso', type: 'architecture', key: 'auth-jwt', insight: 'JWT must check expiry', confidence: 9, source: 'observed', files: ['src/auth.ts'] },
      { skill: 'review', type: 'pattern', key: 'null-check', insight: 'Updated: null-check with optional chaining', confidence: 9, source: 'observed', files: ['src/api.ts'] },
    ];
    for (const e of entries) {
      logLearning(e, { baseDir: TEST_DIR, slug: TEST_SLUG });
    }
  }

  it('should return all learnings with latest-winner dedup', () => {
    seedLearnings();
    const results = searchLearnings({ baseDir: TEST_DIR, slug: TEST_SLUG });

    // null-check has 2 entries but dedup should keep only the latest
    const nullChecks = results.filter(r => r.key === 'null-check');
    expect(nullChecks).toHaveLength(1);
    expect(nullChecks[0].insight).toContain('optional chaining');

    // Total unique keys: null-check, n-plus-one, terse-output, auth-jwt = 4
    expect(results).toHaveLength(4);
  });

  it('should filter by skill', () => {
    seedLearnings();
    const results = searchLearnings({
      baseDir: TEST_DIR, slug: TEST_SLUG, skill: 'review',
    });

    expect(results.every(r => r.skill === 'review')).toBe(true);
  });

  it('should filter by type', () => {
    seedLearnings();
    const results = searchLearnings({
      baseDir: TEST_DIR, slug: TEST_SLUG, type: 'pitfall',
    });

    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('n-plus-one');
  });

  it('should respect limit parameter', () => {
    seedLearnings();
    const results = searchLearnings({
      baseDir: TEST_DIR, slug: TEST_SLUG, limit: 2,
    });

    expect(results).toHaveLength(2);
  });

  it('should search across projects when crossProject is true', () => {
    // Seed project A
    seedLearnings();

    // Seed project B
    const slug2 = 'other-project';
    fs.mkdirSync(path.join(TEST_DIR, slug2), { recursive: true });
    logLearning({
      skill: 'qa', type: 'tool', key: 'playwright-wait',
      insight: 'Use waitForSelector instead of sleep in Playwright',
      confidence: 8, source: 'observed', files: ['test/e2e.ts'],
    }, { baseDir: TEST_DIR, slug: slug2 });

    const results = searchLearnings({
      baseDir: TEST_DIR, slug: TEST_SLUG, crossProject: true,
    });

    const hasOtherProject = results.some(r => r.key === 'playwright-wait');
    expect(hasOtherProject).toBe(true);
  });

  it('should return empty array when no learnings exist', () => {
    const results = searchLearnings({
      baseDir: TEST_DIR, slug: 'nonexistent',
    });
    expect(results).toEqual([]);
  });
});

describe('formatLearning', () => {
  it('should format a learning entry as [skill] (confidence N/10) key — insight', () => {
    const entry: LearningEntry = {
      skill: 'review',
      type: 'pattern',
      key: 'null-check-before-access',
      insight: 'Always null-check API response before accessing nested fields',
      confidence: 8,
      source: 'observed',
      files: ['src/api/client.ts'],
      ts: '2026-03-30T12:00:00.000Z',
    };

    const result = formatLearning(entry);
    expect(result).toBe(
      '[review] (confidence 8/10) null-check-before-access — Always null-check API response before accessing nested fields'
    );
  });

  it('should format with different confidence levels', () => {
    const entry: LearningEntry = {
      skill: 'ship',
      type: 'pitfall',
      key: 'no-force-push',
      insight: 'Never force push to shared branches',
      confidence: 10,
      source: 'user-stated',
      files: [],
      ts: '2026-03-30T12:00:00.000Z',
    };

    const result = formatLearning(entry);
    expect(result).toBe('[ship] (confidence 10/10) no-force-push — Never force push to shared branches');
  });

  it('should format with low confidence', () => {
    const entry: LearningEntry = {
      skill: 'qa',
      type: 'tool',
      key: 'playwright-debugging',
      insight: 'Use inspector mode for Playwright debugging',
      confidence: 3,
      source: 'inferred',
      files: ['test/e2e.ts'],
      ts: '2026-03-30T12:00:00.000Z',
    };

    const result = formatLearning(entry);
    expect(result).toBe('[qa] (confidence 3/10) playwright-debugging — Use inspector mode for Playwright debugging');
  });

  it('should handle entries with special characters in insight', () => {
    const entry: LearningEntry = {
      skill: 'cso',
      type: 'architecture',
      key: 'auth-validation',
      insight: 'Validate JWT expiry & refresh token rotation',
      confidence: 9,
      source: 'observed',
      files: ['src/middleware/auth.ts'],
      ts: '2026-03-30T12:00:00.000Z',
    };

    const result = formatLearning(entry);
    expect(result).toContain('auth-validation');
    expect(result).toContain('& refresh token rotation');
    expect(result).toBe('[cso] (confidence 9/10) auth-validation — Validate JWT expiry & refresh token rotation');
  });
});
