import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
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
