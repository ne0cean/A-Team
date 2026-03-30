import { describe, it, expect } from 'vitest';
import {
  createHealSession,
  shouldEscalate,
  recordFix,
  recordVerification,
  type HealSession,
  type HealError,
} from '../lib/self-healing.js';

describe('createHealSession', () => {
  it('should create session with error context', () => {
    const error: HealError = {
      message: 'TypeError: Cannot read property of undefined',
      file: 'src/api/client.ts',
      line: 42,
      severity: 'high',
    };
    const session = createHealSession(error);

    expect(session.id).toMatch(/^HEAL-/);
    expect(session.status).toBe('created');
    expect(session.error.file).toBe('src/api/client.ts');
    expect(session.iterations).toBe(0);
    expect(session.maxIterations).toBe(5);
  });

  it('should accept optional feature and environment', () => {
    const session = createHealSession(
      { message: 'err', file: 'a.ts', line: 1, severity: 'low' },
      { feature: 'auth', environment: 'staging' },
    );
    expect(session.feature).toBe('auth');
    expect(session.environment).toBe('staging');
  });
});

describe('recordFix', () => {
  it('should add fix attempt and increment iteration', () => {
    const session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });

    const updated = recordFix(session, {
      description: 'Added null check',
      filesModified: ['src/api/client.ts'],
    });

    expect(updated.iterations).toBe(1);
    expect(updated.fixes).toHaveLength(1);
    expect(updated.status).toBe('fixing');
  });

  it('should track multiple fix attempts', () => {
    let session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });
    session = recordFix(session, { description: 'fix 1', filesModified: ['a.ts'] });
    session = recordFix(session, { description: 'fix 2', filesModified: ['b.ts'] });

    expect(session.iterations).toBe(2);
    expect(session.fixes).toHaveLength(2);
  });
});

describe('recordVerification', () => {
  it('should mark as pr-ready on success', () => {
    let session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });
    session = recordFix(session, { description: 'fix', filesModified: ['a.ts'] });
    session = recordVerification(session, { passed: true, evidence: 'tests pass' });

    expect(session.status).toBe('pr-ready');
  });

  it('should stay in fixing on failure with remaining iterations', () => {
    let session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });
    session = recordFix(session, { description: 'fix', filesModified: ['a.ts'] });
    session = recordVerification(session, { passed: false, evidence: 'test still fails' });

    expect(session.status).toBe('fixing');
  });
});

describe('shouldEscalate', () => {
  it('should not escalate below max iterations', () => {
    const session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });
    expect(shouldEscalate(session)).toBe(false);
  });

  it('should escalate at max iterations', () => {
    let session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });
    for (let i = 0; i < 5; i++) {
      session = recordFix(session, { description: `fix ${i}`, filesModified: ['a.ts'] });
      session = recordVerification(session, { passed: false, evidence: 'still failing' });
    }
    expect(shouldEscalate(session)).toBe(true);
  });

  it('should not escalate when fix succeeded', () => {
    let session = createHealSession({ message: 'err', file: 'a.ts', line: 1, severity: 'medium' });
    session = recordFix(session, { description: 'fix', filesModified: ['a.ts'] });
    session = recordVerification(session, { passed: true, evidence: 'tests pass' });
    expect(shouldEscalate(session)).toBe(false);
  });
});
