import { describe, it, expect } from 'vitest';
import { isCrossMonthClobber } from '../monthGuard.js';

describe('isCrossMonthClobber — cross-month clobber guard', () => {
  it('BLOCKS when payload month disagrees with target key (the 2026-06 → 2026-07 clone)', () => {
    // Regression: save() persisted June monthData (month="2026-06") under key "2026-07".
    expect(isCrossMonthClobber('2026-06', '2026-07')).toBe(true);
  });

  it('ALLOWS a normal save where month matches key', () => {
    expect(isCrossMonthClobber('2026-07', '2026-07')).toBe(false);
  });

  it('ALLOWS legacy/new payloads with no month field (cannot assert mismatch)', () => {
    expect(isCrossMonthClobber(undefined, '2026-07')).toBe(false);
    expect(isCrossMonthClobber('', '2026-07')).toBe(false);
  });

  it('BLOCKS year-boundary mismatch (Dec → Jan)', () => {
    expect(isCrossMonthClobber('2025-12', '2026-01')).toBe(true);
  });
});
