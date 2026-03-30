import { describe, it, expect } from 'vitest';
import {
  StateMachine,
  type Transition,
  type MachineState,
} from '../lib/state-machine.js';

const TRANSITIONS: Transition[] = [
  { from: 'idle', event: 'START', to: 'plan', guard: null, actions: ['initFeature'] },
  { from: 'plan', event: 'PLAN_DONE', to: 'design', guard: 'hasDeliverable', actions: ['recordTimestamp'] },
  { from: 'design', event: 'DESIGN_DONE', to: 'do', guard: 'hasDeliverable', actions: ['recordTimestamp'] },
  { from: 'do', event: 'DO_COMPLETE', to: 'check', guard: null, actions: ['recordTimestamp'] },
  { from: 'check', event: 'MATCH_PASS', to: 'report', guard: null, actions: [] },
  { from: 'check', event: 'ITERATE', to: 'do', guard: 'canIterate', actions: ['incrementIteration'] },
  { from: 'report', event: 'REPORT_DONE', to: 'archived', guard: null, actions: [] },
  { from: '*', event: 'ERROR', to: 'error', guard: null, actions: ['logError'] },
  { from: '*', event: 'RESET', to: 'idle', guard: null, actions: ['clearState'] },
];

describe('StateMachine', () => {
  it('should start in idle state', () => {
    const sm = new StateMachine(TRANSITIONS, 'idle');
    expect(sm.current).toBe('idle');
  });

  it('should transition on valid event', () => {
    const sm = new StateMachine(TRANSITIONS, 'idle');
    const result = sm.send('START');
    expect(result.success).toBe(true);
    expect(sm.current).toBe('plan');
    expect(result.actions).toContain('initFeature');
  });

  it('should reject invalid event for current state', () => {
    const sm = new StateMachine(TRANSITIONS, 'idle');
    const result = sm.send('PLAN_DONE');
    expect(result.success).toBe(false);
    expect(sm.current).toBe('idle');
  });

  it('should follow full PDCA cycle', () => {
    const sm = new StateMachine(TRANSITIONS, 'idle', {
      guards: { hasDeliverable: () => true, canIterate: () => false },
    });

    sm.send('START');
    expect(sm.current).toBe('plan');
    sm.send('PLAN_DONE');
    expect(sm.current).toBe('design');
    sm.send('DESIGN_DONE');
    expect(sm.current).toBe('do');
    sm.send('DO_COMPLETE');
    expect(sm.current).toBe('check');
    sm.send('MATCH_PASS');
    expect(sm.current).toBe('report');
    sm.send('REPORT_DONE');
    expect(sm.current).toBe('archived');
  });

  it('should support check→do iteration loop', () => {
    const sm = new StateMachine(TRANSITIONS, 'check', {
      guards: { canIterate: () => true, hasDeliverable: () => true },
    });

    sm.send('ITERATE');
    expect(sm.current).toBe('do');
    expect(sm.history).toContain('check');
  });

  it('should block transition when guard fails', () => {
    const sm = new StateMachine(TRANSITIONS, 'plan', {
      guards: { hasDeliverable: () => false },
    });

    const result = sm.send('PLAN_DONE');
    expect(result.success).toBe(false);
    expect(sm.current).toBe('plan');
    expect(result.reason).toContain('guard');
  });

  it('should handle wildcard transitions (from: *)', () => {
    const sm = new StateMachine(TRANSITIONS, 'design');
    const result = sm.send('ERROR');
    expect(result.success).toBe(true);
    expect(sm.current).toBe('error');
  });

  it('should track transition history', () => {
    const sm = new StateMachine(TRANSITIONS, 'idle');
    sm.send('START');
    sm.send('ERROR');
    expect(sm.history).toEqual(['idle', 'plan']);
  });

  it('should reset to idle from any state', () => {
    const sm = new StateMachine(TRANSITIONS, 'error');
    sm.send('RESET');
    expect(sm.current).toBe('idle');
  });
});
