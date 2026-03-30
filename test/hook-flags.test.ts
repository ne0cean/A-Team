import { describe, it, expect } from 'vitest';
import {
  shouldRunHook,
  parseFlags,
  type HookTier,
  type HookDefinition,
} from '../lib/hook-flags.js';

describe('parseFlags', () => {
  it('should parse comma-separated flag string', () => {
    expect(parseFlags('minimal,standard')).toEqual(['minimal', 'standard']);
  });

  it('should handle single flag', () => {
    expect(parseFlags('strict')).toEqual(['strict']);
  });

  it('should handle empty string', () => {
    expect(parseFlags('')).toEqual([]);
  });
});

describe('shouldRunHook', () => {
  it('should run minimal hooks at all tiers', () => {
    const hook: HookDefinition = { id: 'session-start', tiers: ['minimal', 'standard', 'strict'] };
    expect(shouldRunHook(hook, 'minimal')).toBe(true);
    expect(shouldRunHook(hook, 'standard')).toBe(true);
    expect(shouldRunHook(hook, 'strict')).toBe(true);
  });

  it('should skip strict-only hook at minimal tier', () => {
    const hook: HookDefinition = { id: 'typecheck', tiers: ['strict'] };
    expect(shouldRunHook(hook, 'minimal')).toBe(false);
    expect(shouldRunHook(hook, 'standard')).toBe(false);
    expect(shouldRunHook(hook, 'strict')).toBe(true);
  });

  it('should run standard+strict hook at standard tier', () => {
    const hook: HookDefinition = { id: 'format-check', tiers: ['standard', 'strict'] };
    expect(shouldRunHook(hook, 'minimal')).toBe(false);
    expect(shouldRunHook(hook, 'standard')).toBe(true);
    expect(shouldRunHook(hook, 'strict')).toBe(true);
  });

  it('should handle hook with no tiers (always run)', () => {
    const hook: HookDefinition = { id: 'safety', tiers: [] };
    expect(shouldRunHook(hook, 'minimal')).toBe(true);
  });
});
