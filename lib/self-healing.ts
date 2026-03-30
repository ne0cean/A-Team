/**
 * Self-Healing Engine — Automated error recovery pipeline
 *
 * Flow: Error → Create Session → Fix → Verify → PR-ready or Escalate
 * Max 5 iterations. Tracks fix attempts and verification results.
 */

export interface HealError {
  message: string;
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stackTrace?: string;
}

export interface FixAttempt {
  description: string;
  filesModified: string[];
  timestamp?: string;
}

export interface Verification {
  passed: boolean;
  evidence: string;
  timestamp?: string;
}

export type HealStatus = 'created' | 'fixing' | 'pr-ready' | 'escalated' | 'failed';

export interface HealSession {
  id: string;
  status: HealStatus;
  error: HealError;
  feature: string | null;
  environment: string;
  iterations: number;
  maxIterations: number;
  fixes: FixAttempt[];
  verifications: Verification[];
  createdAt: string;
  updatedAt: string;
}

const MAX_ITERATIONS = 5;

export function createHealSession(
  error: HealError,
  opts?: { feature?: string; environment?: string },
): HealSession {
  return {
    id: `HEAL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'created',
    error,
    feature: opts?.feature ?? null,
    environment: opts?.environment ?? 'unknown',
    iterations: 0,
    maxIterations: MAX_ITERATIONS,
    fixes: [],
    verifications: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function recordFix(session: HealSession, fix: FixAttempt): HealSession {
  return {
    ...session,
    status: 'fixing',
    iterations: session.iterations + 1,
    fixes: [...session.fixes, { ...fix, timestamp: fix.timestamp ?? new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  };
}

export function recordVerification(session: HealSession, verification: Verification): HealSession {
  const v = { ...verification, timestamp: verification.timestamp ?? new Date().toISOString() };
  const updated = {
    ...session,
    verifications: [...session.verifications, v],
    updatedAt: new Date().toISOString(),
  };

  if (v.passed) {
    updated.status = 'pr-ready';
  } else if (updated.iterations >= updated.maxIterations) {
    updated.status = 'escalated';
  }
  // else stays 'fixing' for next attempt

  return updated;
}

export function shouldEscalate(session: HealSession): boolean {
  if (session.status === 'pr-ready') return false;
  return session.iterations >= session.maxIterations;
}
