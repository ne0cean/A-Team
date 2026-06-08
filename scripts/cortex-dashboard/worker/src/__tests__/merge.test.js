import { describe, it, expect } from 'vitest';
import { mergeMonthData } from '../merge.js';

// Helper: deep clone to avoid test cross-contamination
const clone = obj => JSON.parse(JSON.stringify(obj));

describe('mergeMonthData — scalar fields', () => {
  it('restores scalar field when incoming key is undefined', () => {
    const existing = { days: { '8': { one_thing: 'Write report' } } };
    const incoming = { days: { '8': {} } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].one_thing).toBe('Write report');
  });

  it('does NOT restore scalar field when incoming has empty string (intentional delete)', () => {
    const existing = { days: { '8': { notes: 'old notes' } } };
    const incoming = { days: { '8': { notes: '' } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].notes).toBe('');
  });

  it('does NOT overwrite existing incoming scalar value', () => {
    const existing = { days: { '8': { day_type: 'weekday' } } };
    const incoming = { days: { '8': { day_type: 'flow' } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].day_type).toBe('flow');
  });
});

describe('mergeMonthData — array field restoration', () => {
  it('restores array when incoming is empty but server has items', () => {
    const serverItems = [{ text: 'Morning run', done: true, url: '' }];
    const existing = { days: { '8': { ritual: serverItems } } };
    const incoming = { days: { '8': { ritual: [] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].ritual).toEqual(serverItems);
  });

  it('restores array when incoming key is absent', () => {
    const serverItems = [{ text: 'Deploy PR', done: false }];
    const existing = { days: { '3': { work: serverItems } } };
    const incoming = { days: { '3': {} } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['3'].work).toEqual(serverItems);
  });

  it('does NOT restore when server array is empty', () => {
    const existing = { days: { '8': { input: [] } } };
    const incoming = { days: { '8': { input: [{ text: 'New item', done: false }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].input.length).toBe(1);
  });
});

describe('mergeMonthData — done=true preservation', () => {
  it('preserves done=true when stale client sends done=false', () => {
    const existing = { days: { '8': { work: [{ text: 'Deploy', done: true, url: '' }] } } };
    const incoming = { days: { '8': { work: [{ text: 'Deploy', done: false, url: '' }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].work[0].done).toBe(true);
  });

  it('does not change done=false when server also has done=false', () => {
    const existing = { days: { '8': { outcome: [{ text: 'Task', done: false }] } } };
    const incoming = { days: { '8': { outcome: [{ text: 'Task', done: false }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].outcome[0].done).toBe(false);
  });

  it('does not overwrite done=true with done=true (no change)', () => {
    const existing = { days: { '8': { ritual: [{ text: 'Meditate', done: true }] } } };
    const incoming = { days: { '8': { ritual: [{ text: 'Meditate', done: true }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].ritual[0].done).toBe(true);
  });

  it('preserves other item properties when restoring done=true', () => {
    const existing = { days: { '8': { work: [{ text: 'Deploy', done: true, url: 'https://example.com' }] } } };
    const incoming = { days: { '8': { work: [{ text: 'Deploy', done: false, url: 'https://example.com' }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].work[0]).toMatchObject({ text: 'Deploy', done: true, url: 'https://example.com' });
  });
});

describe('mergeMonthData — dynamic field detection (no whitelist)', () => {
  it('handles an entirely new array field not in any hardcoded list', () => {
    const serverItems = [{ text: 'New category item', done: true }];
    const existing = { days: { '5': { new_category: serverItems } } };
    const incoming = { days: { '5': { new_category: [] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['5'].new_category).toEqual(serverItems);
  });

  it('handles done=true preservation for unknown array field', () => {
    const existing = { days: { '5': { future_cat: [{ text: 'Future item', done: true }] } } };
    const incoming = { days: { '5': { future_cat: [{ text: 'Future item', done: false }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['5'].future_cat[0].done).toBe(true);
  });
});

describe('mergeMonthData — internal fields (_prefix) are not merged', () => {
  it('does not merge _dismissed array', () => {
    const existing = { days: { '3': { _dismissed: ['item1', 'item2'], ritual: [] } } };
    const incoming = { days: { '3': { _dismissed: [], ritual: [] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['3']._dismissed).toEqual([]);
  });

  it('does not merge _frame internal markers', () => {
    const existing = { days: { '3': { _frame_something: ['x'] } } };
    const incoming = { days: { '3': { _frame_something: [] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['3']._frame_something).toEqual([]);
  });
});

describe('mergeMonthData — edge cases', () => {
  it('keeps new items added on client side', () => {
    const existing = { days: { '8': { ritual: [{ text: 'Old item', done: false }] } } };
    const incoming = { days: { '8': { ritual: [{ text: 'Old item', done: false }, { text: 'New item', done: false }] } } };
    mergeMonthData(existing, incoming);
    expect(incoming.days['8'].ritual.length).toBe(2);
    expect(incoming.days['8'].ritual[1].text).toBe('New item');
  });

  it('skips days missing from incoming without error', () => {
    const existing = { days: { '8': { ritual: [{ text: 'Item', done: true }] } } };
    const incoming = { days: { '9': {} } };
    expect(() => mergeMonthData(existing, incoming)).not.toThrow();
    expect(incoming.days['8']).toBeUndefined();
  });

  it('handles empty existing days gracefully', () => {
    const existing = { days: {} };
    const incoming = { days: { '5': { ritual: [{ text: 'Item', done: false }] } } };
    expect(() => mergeMonthData(existing, incoming)).not.toThrow();
    expect(incoming.days['5'].ritual[0].text).toBe('Item');
  });

  it('returns the mutated incoming object', () => {
    const existing = { days: {} };
    const incoming = { days: {} };
    const result = mergeMonthData(existing, incoming);
    expect(result).toBe(incoming);
  });
});
