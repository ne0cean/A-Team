import { describe, it, expect } from 'vitest';
import { resolveOwnerYm, saveBlockReason } from '../monthUtil.js';

describe('resolveOwnerYm — adjacent-month identity for full-month overlap cells', () => {
  it('cur returns the same month', () => {
    expect(resolveOwnerYm(2026, 6, 'cur')).toEqual({ ym: '2026-06', year: 2026, month: 6 });
  });

  it('prev returns the previous month (same year)', () => {
    expect(resolveOwnerYm(2026, 6, 'prev')).toEqual({ ym: '2026-05', year: 2026, month: 5 });
  });

  it('next returns the next month (same year)', () => {
    expect(resolveOwnerYm(2026, 6, 'next')).toEqual({ ym: '2026-07', year: 2026, month: 7 });
  });

  it('prev of January wraps to December of the previous year', () => {
    expect(resolveOwnerYm(2026, 1, 'prev')).toEqual({ ym: '2025-12', year: 2025, month: 12 });
  });

  it('next of December wraps to January of the next year', () => {
    expect(resolveOwnerYm(2026, 12, 'next')).toEqual({ ym: '2027-01', year: 2027, month: 1 });
  });

  it('zero-pads single-digit months', () => {
    expect(resolveOwnerYm(2026, 2, 'prev').ym).toBe('2026-01');
    expect(resolveOwnerYm(2026, 9, 'next').ym).toBe('2026-10');
  });
});

describe('saveBlockReason — pure mirror of save() cross-month guard', () => {
  it('blocks an empty payload', () => {
    expect(saveBlockReason('2026-06', '2026-06', 0, 0)).toBe('empty');
  });

  it('blocks a cross-month clobber (data.month != key)', () => {
    expect(saveBlockReason('2026-06', '2026-07', 3, 10)).toBe('month-mismatch');
  });

  it('allows a consistent non-empty save', () => {
    expect(saveBlockReason('2026-06', '2026-06', 1, 1)).toBeNull();
  });

  it('allows when data.month is absent (cannot assert mismatch)', () => {
    expect(saveBlockReason(undefined, '2026-06', 1, 1)).toBeNull();
    expect(saveBlockReason('', '2026-06', 1, 1)).toBeNull();
  });

  it('adjacent-month save to its own key passes (the editable-adjacent-cell case)', () => {
    // prev cell of June edits May data (month="2026-05") posted under key "2026-05".
    expect(saveBlockReason('2026-05', '2026-05', 2, 4)).toBeNull();
  });
});
