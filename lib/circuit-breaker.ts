/**
 * Circuit Breaker — Error recovery pattern for PDCA/agent workflows
 *
 * 3 states: closed (normal) → open (blocked) → half_open (trial)
 * Per-feature isolation. In-memory only (resets on session start).
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitInfo {
  state: CircuitState;
  feature: string;
  failureCount: number;
  lastError: string | null;
}

export interface ProceedResult {
  allowed: boolean;
  state: CircuitState;
  reason: string;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
}

interface InternalCircuit {
  state: CircuitState;
  feature: string;
  failureCount: number;
  failureThreshold: number;
  cooldownMs: number;
  lastError: string | null;
  openedAt: number;
}

export class CircuitBreaker {
  private circuits = new Map<string, InternalCircuit>();
  private defaultThreshold: number;
  private defaultCooldown: number;

  constructor(opts?: CircuitBreakerOptions) {
    this.defaultThreshold = opts?.failureThreshold ?? 3;
    this.defaultCooldown = opts?.cooldownMs ?? 30_000;
  }

  private getOrCreate(feature: string): InternalCircuit {
    if (!this.circuits.has(feature)) {
      this.circuits.set(feature, {
        state: 'closed',
        feature,
        failureCount: 0,
        failureThreshold: this.defaultThreshold,
        cooldownMs: this.defaultCooldown,
        lastError: null,
        openedAt: 0,
      });
    }
    const c = this.circuits.get(feature)!;

    // Auto-transition open → half_open after cooldown
    if (c.state === 'open' && c.openedAt > 0) {
      if (Date.now() - c.openedAt >= c.cooldownMs) {
        c.state = 'half_open';
      }
    }
    return c;
  }

  getState(feature: string): CircuitInfo {
    const c = this.getOrCreate(feature);
    return { state: c.state, feature: c.feature, failureCount: c.failureCount, lastError: c.lastError };
  }

  recordFailure(feature: string, error: string): void {
    const c = this.getOrCreate(feature);
    c.failureCount++;
    c.lastError = error;

    if (c.state === 'half_open') {
      c.state = 'open';
      c.openedAt = Date.now();
    } else if (c.failureCount >= c.failureThreshold) {
      c.state = 'open';
      c.openedAt = Date.now();
    }
  }

  recordSuccess(feature: string): void {
    const c = this.getOrCreate(feature);
    c.state = 'closed';
    c.failureCount = 0;
    c.lastError = null;
    c.openedAt = 0;
  }

  canProceed(feature: string): ProceedResult {
    const c = this.getOrCreate(feature);
    if (c.state === 'closed') return { allowed: true, state: 'closed', reason: 'Normal operation' };
    if (c.state === 'half_open') return { allowed: true, state: 'half_open', reason: 'Trial attempt allowed' };
    const remaining = Math.max(0, c.cooldownMs - (Date.now() - c.openedAt));
    return { allowed: false, state: 'open', reason: `Blocked. ${Math.ceil(remaining / 1000)}s cooldown. Last: ${c.lastError}` };
  }

  reset(feature: string): void {
    this.circuits.delete(feature);
  }
}

// ─── Advisor Tool Breaker 설정 (단일 진실 공급원: lib/advisor-breaker-config.json) ────
// daemon-utils.mjs의 SimpleCircuitBreaker도 같은 JSON을 import한다.
// 값 변경 시 advisor-breaker-config.json만 업데이트.
import ADVISOR_BREAKER_JSON from './advisor-breaker-config.json';

export const ADVISOR_TOOL_BREAKER_CONFIG = {
  name: ADVISOR_BREAKER_JSON.name,
  failureThreshold: ADVISOR_BREAKER_JSON.failureThreshold,
  windowMs: ADVISOR_BREAKER_JSON.windowMs,
  cooldownMs: ADVISOR_BREAKER_JSON.cooldownMs,
  halfOpenProbes: ADVISOR_BREAKER_JSON.halfOpenProbes,
  countThreshold: ADVISOR_BREAKER_JSON.countThreshold,
  windowCount: ADVISOR_BREAKER_JSON.windowCount,
} as const;
