import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  ADVISOR_TOOL_BREAKER_CONFIG,
  type CircuitState,
} from '../lib/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 100 });
  });

  it('should start in closed state', () => {
    expect(cb.getState('feat-1').state).toBe('closed');
  });

  it('should stay closed below failure threshold', () => {
    cb.recordFailure('feat-1', 'err1');
    cb.recordFailure('feat-1', 'err2');
    expect(cb.getState('feat-1').state).toBe('closed');
    expect(cb.canProceed('feat-1').allowed).toBe(true);
  });

  it('should open after reaching failure threshold', () => {
    cb.recordFailure('feat-1', 'e1');
    cb.recordFailure('feat-1', 'e2');
    cb.recordFailure('feat-1', 'e3');
    expect(cb.getState('feat-1').state).toBe('open');
    expect(cb.canProceed('feat-1').allowed).toBe(false);
  });

  it('should transition to half_open after cooldown', async () => {
    cb.recordFailure('f', 'e1');
    cb.recordFailure('f', 'e2');
    cb.recordFailure('f', 'e3');
    expect(cb.getState('f').state).toBe('open');

    await new Promise(r => setTimeout(r, 150));
    expect(cb.getState('f').state).toBe('half_open');
    expect(cb.canProceed('f').allowed).toBe(true);
  });

  it('should close on success after half_open', async () => {
    cb.recordFailure('f', 'e1');
    cb.recordFailure('f', 'e2');
    cb.recordFailure('f', 'e3');

    await new Promise(r => setTimeout(r, 150));
    cb.recordSuccess('f');
    expect(cb.getState('f').state).toBe('closed');
    expect(cb.getState('f').failureCount).toBe(0);
  });

  it('should reopen on failure during half_open', async () => {
    cb.recordFailure('f', 'e1');
    cb.recordFailure('f', 'e2');
    cb.recordFailure('f', 'e3');

    await new Promise(r => setTimeout(r, 150));
    expect(cb.getState('f').state).toBe('half_open');

    cb.recordFailure('f', 'e4');
    expect(cb.getState('f').state).toBe('open');
  });

  it('should reset circuit', () => {
    cb.recordFailure('f', 'e1');
    cb.recordFailure('f', 'e2');
    cb.recordFailure('f', 'e3');
    cb.reset('f');
    expect(cb.getState('f').state).toBe('closed');
    expect(cb.getState('f').failureCount).toBe(0);
  });

  it('should isolate circuits per feature', () => {
    cb.recordFailure('a', 'e1');
    cb.recordFailure('a', 'e2');
    cb.recordFailure('a', 'e3');
    expect(cb.getState('a').state).toBe('open');
    expect(cb.getState('b').state).toBe('closed');
  });
});

describe('ADVISOR_TOOL_BREAKER_CONFIG', () => {
  it('should export advisor-tool config constant with correct name', () => {
    expect(ADVISOR_TOOL_BREAKER_CONFIG.name).toBe('advisor-tool');
  });

  it('should have 20% failure threshold config', () => {
    expect(ADVISOR_TOOL_BREAKER_CONFIG.failureThreshold).toBeCloseTo(0.20, 5);
  });

  it('should have 5-minute window and 10-minute cooldown', () => {
    expect(ADVISOR_TOOL_BREAKER_CONFIG.windowMs).toBe(5 * 60 * 1000);
    expect(ADVISOR_TOOL_BREAKER_CONFIG.cooldownMs).toBe(10 * 60 * 1000);
  });

  it('should have halfOpenProbes = 1', () => {
    expect(ADVISOR_TOOL_BREAKER_CONFIG.halfOpenProbes).toBe(1);
  });

  it('advisor-tool circuit should work with CircuitBreaker using count threshold', () => {
    // countThreshold=1 means 1 failure triggers open in this test (simulates 20% of windowCount=5)
    const cb = new CircuitBreaker({
      failureThreshold: ADVISOR_TOOL_BREAKER_CONFIG.countThreshold,
      cooldownMs: ADVISOR_TOOL_BREAKER_CONFIG.cooldownMs,
    });

    expect(cb.getState('advisor-tool').state).toBe('closed');
    cb.recordFailure('advisor-tool', 'beta API error');
    expect(cb.getState('advisor-tool').state).toBe('open');
    expect(cb.canProceed('advisor-tool').allowed).toBe(false);
  });
});
