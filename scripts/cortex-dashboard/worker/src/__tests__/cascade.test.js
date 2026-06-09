import { describe, it, expect } from 'vitest';
import { cascadeFrameDone, cascadeFrameDelete } from '../cascade.js';

describe('cascadeFrameDone', () => {
  it('marks same _frame item done in subsequent days', () => {
    const data = {
      days: {
        '9':  { outcome: [{ text: 'X', done: true,  _frame: true }] },
        '10': { outcome: [{ text: 'X', done: false, _frame: true }] },
        '11': { outcome: [{ text: 'X', done: false, _frame: true }] },
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', true);
    expect(data.days['10'].outcome[0].done).toBe(true);
    expect(data.days['11'].outcome[0].done).toBe(true);
  });

  it('does not affect manual (non-_frame) items with same text', () => {
    const data = {
      days: {
        '9':  { outcome: [{ text: 'X', done: true, _frame: true }] },
        '10': { outcome: [{ text: 'X', done: false }] },
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', true);
    expect(data.days['10'].outcome[0].done).toBe(false);
  });

  it('cascades undone (false) state too', () => {
    const data = {
      days: {
        '9':  { outcome: [{ text: 'X', done: false, _frame: true }] },
        '10': { outcome: [{ text: 'X', done: true,  _frame: true }] },
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', false);
    expect(data.days['10'].outcome[0].done).toBe(false);
  });

  it('does not touch days before fromDay', () => {
    const data = {
      days: {
        '8':  { outcome: [{ text: 'X', done: false, _frame: true }] },
        '9':  { outcome: [{ text: 'X', done: true,  _frame: true }] },
        '10': { outcome: [{ text: 'X', done: false, _frame: true }] },
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', true);
    expect(data.days['8'].outcome[0].done).toBe(false);
    expect(data.days['10'].outcome[0].done).toBe(true);
  });

  it('stops at daysInMonth boundary', () => {
    const data = {
      days: {
        '30': { outcome: [{ text: 'X', done: false, _frame: true }] },
      }
    };
    cascadeFrameDone(data, 30, 30, 'outcome', 'X', true);
    expect(data.days['30'].outcome[0].done).toBe(false);
  });

  it('skips days with no data', () => {
    const data = { days: { '9': {} } };
    expect(() => cascadeFrameDone(data, 30, 9, 'outcome', 'X', true, '')).not.toThrow();
  });

  it('restores missing _frame item in subsequent days when unchecking (done=false)', () => {
    const data = {
      days: {
        '9':  { outcome: [{ text: 'X', done: false, _frame: true, url: 'http://x' }] },
        '10': { outcome: [] }, // inject-frames가 prevDoneTodos로 제거한 상태
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', false, 'http://x');
    expect(data.days['10'].outcome).toHaveLength(1);
    expect(data.days['10'].outcome[0]).toMatchObject({ text: 'X', done: false, _frame: true, url: 'http://x' });
  });

  it('does not restore if item is in _dismissed', () => {
    const data = {
      days: {
        '9':  { outcome: [{ text: 'X', done: false, _frame: true }] },
        '10': { outcome: [], _dismissed: ['X'] },
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', false, '');
    expect(data.days['10'].outcome).toHaveLength(0);
  });

  it('does not inject missing item when checking (done=true)', () => {
    const data = {
      days: {
        '9':  { outcome: [{ text: 'X', done: true, _frame: true }] },
        '10': { outcome: [] },
      }
    };
    cascadeFrameDone(data, 30, 9, 'outcome', 'X', true, '');
    expect(data.days['10'].outcome).toHaveLength(0);
  });
});

describe('cascadeFrameDelete', () => {
  it('removes _frame item and adds to _dismissed in subsequent days', () => {
    const data = {
      days: {
        '9':  { outcome: [] },
        '10': { outcome: [{ text: 'X', done: false, _frame: true }] },
        '11': { outcome: [{ text: 'X', done: false, _frame: true }] },
      }
    };
    cascadeFrameDelete(data, 30, 9, 'outcome', 'X');
    expect(data.days['10'].outcome).toHaveLength(0);
    expect(data.days['10']._dismissed).toContain('X');
    expect(data.days['11'].outcome).toHaveLength(0);
    expect(data.days['11']._dismissed).toContain('X');
  });

  it('adds to _dismissed even if item not yet injected in that day', () => {
    const data = { days: { '9': {}, '10': {} } };
    cascadeFrameDelete(data, 30, 9, 'outcome', 'X');
    expect(data.days['10']._dismissed).toContain('X');
  });

  it('does not duplicate _dismissed entries', () => {
    const data = {
      days: {
        '9':  {},
        '10': { _dismissed: ['X'] },
      }
    };
    cascadeFrameDelete(data, 30, 9, 'outcome', 'X');
    expect(data.days['10']._dismissed.filter(x => x === 'X')).toHaveLength(1);
  });

  it('does not touch days before fromDay', () => {
    const data = {
      days: {
        '8':  { outcome: [{ text: 'X', done: false, _frame: true }] },
        '9':  {},
        '10': { outcome: [{ text: 'X', done: false, _frame: true }] },
      }
    };
    cascadeFrameDelete(data, 30, 9, 'outcome', 'X');
    expect(data.days['8'].outcome).toHaveLength(1);
    expect(data.days['10'].outcome).toHaveLength(0);
  });

  it('initializes days[dk] if not present to store _dismissed', () => {
    const data = { days: { '9': {} } };
    cascadeFrameDelete(data, 11, 9, 'outcome', 'X');
    expect(data.days['10']?._dismissed).toContain('X');
    expect(data.days['11']?._dismissed).toContain('X');
  });
});
