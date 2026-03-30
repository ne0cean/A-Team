import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createInstinct,
  promoteInstinct,
  shouldApply,
  type Instinct,
  type InstinctScope,
} from '../lib/instinct.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-instinct-test-' + process.pid);

beforeEach(() => { fs.mkdirSync(TEST_DIR, { recursive: true }); });
afterEach(() => { fs.rmSync(TEST_DIR, { recursive: true, force: true }); });

describe('createInstinct', () => {
  it('should create an instinct with required fields', () => {
    const inst = createInstinct({
      trigger: 'when writing new functions',
      action: 'Use functional patterns over classes',
      domain: 'code-style',
      confidence: 0.7,
      scope: 'project',
      projectId: 'abc123',
    });

    expect(inst.id).toBeDefined();
    expect(inst.confidence).toBe(0.7);
    expect(inst.scope).toBe('project');
    expect(inst.observations).toBe(1);
  });

  it('should clamp confidence to 0.3-0.9 range', () => {
    const low = createInstinct({ trigger: 't', action: 'a', domain: 'd', confidence: 0.1, scope: 'global' });
    expect(low.confidence).toBe(0.3);

    const high = createInstinct({ trigger: 't', action: 'a', domain: 'd', confidence: 1.0, scope: 'global' });
    expect(high.confidence).toBe(0.9);
  });
});

describe('promoteInstinct', () => {
  it('should promote from project to global when seen in 2+ projects', () => {
    const inst: Instinct = createInstinct({
      trigger: 'validate input', action: 'always check', domain: 'security',
      confidence: 0.7, scope: 'project', projectId: 'proj-1',
    });
    inst.seenInProjects = ['proj-1', 'proj-2'];

    const promoted = promoteInstinct(inst);
    expect(promoted.scope).toBe('global');
    expect(promoted.confidence).toBeGreaterThan(inst.confidence);
  });

  it('should not promote if only seen in 1 project', () => {
    const inst: Instinct = createInstinct({
      trigger: 'specific pattern', action: 'do X', domain: 'code-style',
      confidence: 0.6, scope: 'project', projectId: 'proj-1',
    });
    inst.seenInProjects = ['proj-1'];

    const same = promoteInstinct(inst);
    expect(same.scope).toBe('project');
  });
});

describe('shouldApply', () => {
  it('should apply global instincts to any project', () => {
    const inst = createInstinct({ trigger: 't', action: 'a', domain: 'd', confidence: 0.7, scope: 'global' });
    expect(shouldApply(inst, 'any-project')).toBe(true);
  });

  it('should only apply project instincts to matching project', () => {
    const inst = createInstinct({ trigger: 't', action: 'a', domain: 'd', confidence: 0.7, scope: 'project', projectId: 'proj-1' });
    expect(shouldApply(inst, 'proj-1')).toBe(true);
    expect(shouldApply(inst, 'proj-2')).toBe(false);
  });

  it('should not apply low-confidence instincts (< 0.5)', () => {
    const inst = createInstinct({ trigger: 't', action: 'a', domain: 'd', confidence: 0.4, scope: 'global' });
    expect(shouldApply(inst, 'any')).toBe(false);
  });
});
