import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  runAdversarialChecks,
  calculateBiasDelta,
  type AdversarialCheck,
  type AdversarialResult,
  type Confidence,
} from '../lib/adversarial.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-adversarial-test-' + process.pid);

beforeEach(() => {
  fs.mkdirSync(path.join(TEST_DIR, '.claude', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'governance', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, '.context'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('runAdversarialChecks', () => {
  it('should detect missing CLAUDE.md (no entry point)', () => {
    const result = runAdversarialChecks(TEST_DIR);
    const entryCheck = result.checks.find(c => c.id === 'entry-point');
    expect(entryCheck).toBeDefined();
    expect(entryCheck!.result).toBe('FAIL');
  });

  it('should PASS when CLAUDE.md exists with required sections', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'CLAUDE.md'), [
      '# Project',
      '## 빌드 명령',
      '```bash',
      'npm run build',
      '```',
      '## 프로젝트 구조',
      'src/ — source',
    ].join('\n'));

    const result = runAdversarialChecks(TEST_DIR);
    const entryCheck = result.checks.find(c => c.id === 'entry-point');
    expect(entryCheck!.result).toBe('PASS');
  });

  it('should detect empty/temp files (garbage)', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'lib', 'temp.tmp'), '');
    fs.writeFileSync(path.join(TEST_DIR, 'lib', 'backup.bak'), 'old');

    const result = runAdversarialChecks(TEST_DIR);
    const garbageCheck = result.checks.find(c => c.id === 'no-garbage');
    expect(garbageCheck!.result).toBe('FAIL');
  });

  it('should detect stale context (CURRENT.md older than 30 days)', () => {
    const oldDate = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
    fs.writeFileSync(
      path.join(TEST_DIR, '.context', 'CURRENT.md'),
      `# CURRENT\n## Last Completions (${oldDate})\n- old task`,
    );

    const result = runAdversarialChecks(TEST_DIR);
    const staleCheck = result.checks.find(c => c.id === 'context-freshness');
    expect(staleCheck!.result).toBe('FAIL');
  });

  it('should assign confidence levels to each check', () => {
    const result = runAdversarialChecks(TEST_DIR);
    for (const check of result.checks) {
      expect(['high', 'medium', 'low']).toContain(check.confidence);
    }
  });
});

describe('calculateBiasDelta', () => {
  it('should return 0 when all passes are high confidence', () => {
    const checks: AdversarialCheck[] = [
      { id: 'a', description: 'test', result: 'PASS', confidence: 'high' },
      { id: 'b', description: 'test', result: 'PASS', confidence: 'high' },
    ];
    const delta = calculateBiasDelta(checks);
    expect(delta.biasDelta).toBe(0);
    expect(delta.verdict).toBe('ok');
  });

  it('should flag high bias when many low-confidence passes', () => {
    const checks: AdversarialCheck[] = [
      { id: 'a', description: 'test', result: 'PASS', confidence: 'low' },
      { id: 'b', description: 'test', result: 'PASS', confidence: 'low' },
      { id: 'c', description: 'test', result: 'PASS', confidence: 'low' },
      { id: 'd', description: 'test', result: 'PASS', confidence: 'low' },
      { id: 'e', description: 'test', result: 'PASS', confidence: 'low' },
      { id: 'f', description: 'test', result: 'PASS', confidence: 'high' },
    ];
    const delta = calculateBiasDelta(checks);
    expect(delta.biasDelta).toBeGreaterThanOrEqual(5);
    expect(delta.verdict).toBe('warn');
  });

  it('should not count FAIL items in bias', () => {
    const checks: AdversarialCheck[] = [
      { id: 'a', description: 'test', result: 'FAIL', confidence: 'high' },
      { id: 'b', description: 'test', result: 'PASS', confidence: 'high' },
    ];
    const delta = calculateBiasDelta(checks);
    expect(delta.score).toBe('1/2');
  });
});
