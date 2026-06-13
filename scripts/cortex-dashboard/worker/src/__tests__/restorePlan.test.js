import { describe, it, expect } from 'vitest';
import { extractMonthForRestore, isRestorePayloadSafe } from '../restorePlan.js';

// Shared fixture: a well-formed snapshot
const makeSnapshot = (overrides = {}) => ({
  date: '2026-06-13',
  timestamp: '2026-06-13T09:00:00.000Z',
  data: {
    '2026-06': {
      month: '2026-06',
      days: { '1': { one_thing: 'Ship it' }, '15': { one_thing: 'Review' } },
    },
    '2026-07': {
      month: '2026-07',
      days: { '1': { one_thing: 'Plan Q3' } },
    },
    ...overrides,
  },
});

// ─── extractMonthForRestore ────────────────────────────────────────────────

describe('extractMonthForRestore — happy path', () => {
  it('returns the month object when ym exists and .month matches', () => {
    const snapshot = makeSnapshot();
    const result = extractMonthForRestore(snapshot, '2026-06');
    expect(result).toEqual(snapshot.data['2026-06']);
    expect(result.month).toBe('2026-06');
  });

  it('works for the second month in snapshot', () => {
    const snapshot = makeSnapshot();
    const result = extractMonthForRestore(snapshot, '2026-07');
    expect(result.month).toBe('2026-07');
    expect(result.days['1'].one_thing).toBe('Plan Q3');
  });
});

describe('extractMonthForRestore — ym not in snapshot', () => {
  it('throws or returns {error} when ym key is absent', () => {
    const snapshot = makeSnapshot();
    const run = () => extractMonthForRestore(snapshot, '2025-12');
    // Accept either throw or {error} style — just must not silently succeed
    let caught = false;
    let result;
    try {
      result = run();
    } catch (e) {
      caught = true;
    }
    if (!caught) {
      expect(result).toHaveProperty('error');
    }
  });
});

describe('extractMonthForRestore — .month mismatch (core safety guard)', () => {
  it('rejects when snapshot["2026-07"].month === "2026-06" (corrupted label)', () => {
    // This is the exact scenario: June data was cloned under the July key.
    const snapshot = makeSnapshot({
      '2026-07': {
        month: '2026-06', // <-- wrong month field, the bug we guard against
        days: { '1': { one_thing: 'June carry-over — should NOT be restored as July' } },
      },
    });
    const run = () => extractMonthForRestore(snapshot, '2026-07');
    let caught = false;
    let result;
    try {
      result = run();
    } catch (e) {
      caught = true;
    }
    if (!caught) {
      expect(result).toHaveProperty('error');
    }
    // Either way — must not silently return the corrupted data as valid
    if (!caught) {
      expect(result).not.toEqual(snapshot.data['2026-07']);
    }
  });

  it('rejects when snapshot key and .month differ (generic mismatch)', () => {
    const snapshot = makeSnapshot({
      '2026-08': {
        month: '2026-09', // wrong direction
        days: {},
      },
    });
    const run = () => extractMonthForRestore(snapshot, '2026-08');
    let caught = false;
    let result;
    try {
      result = run();
    } catch (e) {
      caught = true;
    }
    if (!caught) {
      expect(result).toHaveProperty('error');
    }
  });
});

// ─── isRestorePayloadSafe ──────────────────────────────────────────────────

describe('isRestorePayloadSafe', () => {
  it('returns true for valid month data with matching ym and object days', () => {
    const monthData = { month: '2026-06', days: { '1': {} } };
    expect(isRestorePayloadSafe(monthData, '2026-06')).toBe(true);
  });

  it('returns false when .month does not match ym', () => {
    const monthData = { month: '2026-06', days: { '1': {} } };
    expect(isRestorePayloadSafe(monthData, '2026-07')).toBe(false);
  });

  it('returns false when days is missing', () => {
    const monthData = { month: '2026-06' };
    expect(isRestorePayloadSafe(monthData, '2026-06')).toBe(false);
  });

  it('returns false when days is an array instead of object', () => {
    const monthData = { month: '2026-06', days: [] };
    expect(isRestorePayloadSafe(monthData, '2026-06')).toBe(false);
  });

  it('returns false when days is null', () => {
    const monthData = { month: '2026-06', days: null };
    expect(isRestorePayloadSafe(monthData, '2026-06')).toBe(false);
  });
});
