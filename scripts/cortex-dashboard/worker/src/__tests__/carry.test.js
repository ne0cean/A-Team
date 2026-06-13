import { describe, it, expect } from 'vitest';
import { computeCarry, normText } from '../carry.js';

const item = (text, extra = {}) => ({ text, url: '', done: false, ...extra });

describe('computeCarry — carry-over of undone todo items', () => {
  it('1. normal carry: prev undone non-frame item appears as _carried and persists', () => {
    const r = computeCarry({
      dayItems: [],
      prevDayItems: [item('밀린 메일')],
      templateItems: [],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: true,
    });
    expect(r.changed).toBe(true);
    const carried = r.nextDayItems.find(i => normText(i.text) === '밀린 메일');
    expect(carried).toBeTruthy();
    expect(carried._carried).toBe(true);
    expect(carried.done).toBe(false);
    expect(r.itemsToRender.some(i => normText(i.text) === '밀린 메일')).toBe(true);
  });

  it('2. prev item done is NOT carried', () => {
    const r = computeCarry({
      dayItems: [],
      prevDayItems: [item('완료된 일', { done: true })],
      shouldCarry: true,
    });
    expect(r.changed).toBe(false);
    expect(r.nextDayItems.length).toBe(0);
  });

  it('3. prev _frame (routine) item is NOT carried', () => {
    const r = computeCarry({
      dayItems: [],
      prevDayItems: [item('Transcription', { _frame: true })],
      shouldCarry: true,
    });
    expect(r.changed).toBe(false);
    expect(r.nextDayItems.length).toBe(0);
  });

  it('4. stale removal: _carried item whose source is now done in prev day is removed', () => {
    const r = computeCarry({
      dayItems: [item('밀린 메일', { _carried: true })],
      prevDayItems: [item('밀린 메일', { done: true })], // now done → no longer a valid carry source
      shouldCarry: true,
    });
    expect(r.changed).toBe(true);
    expect(r.nextDayItems.some(i => normText(i.text) === '밀린 메일')).toBe(false);
  });

  it('5. orphan removal: _carried item with no matching prev-day source is removed', () => {
    const r = computeCarry({
      dayItems: [item('유령 항목', { _carried: true })],
      prevDayItems: [item('다른 일')],
      shouldCarry: true,
    });
    expect(r.changed).toBe(true);
    expect(r.nextDayItems.some(i => normText(i.text) === '유령 항목')).toBe(false);
    // the legit prev undone DOES carry
    expect(r.nextDayItems.some(i => normText(i.text) === '다른 일' && i._carried)).toBe(true);
  });

  it('6. reject suppression: rejected text is neither carried nor re-injected', () => {
    const r = computeCarry({
      dayItems: [],
      prevDayItems: [item('삭제한 일')],
      rejects: ['삭제한 일'],
      shouldCarry: true,
    });
    expect(r.changed).toBe(false);
    expect(r.nextDayItems.length).toBe(0);
  });

  it('7. dedup: normText-equal duplicates collapse; empty-text dropped', () => {
    const r = computeCarry({
      dayItems: [
        item('할 일'),
        item('할 일'),  // &nbsp; variant → normText-equal
        item('   '),         // whitespace-only → dropped
      ],
      prevDayItems: null,
      shouldCarry: false,
    });
    expect(r.changed).toBe(true);
    const texts = r.nextDayItems.map(i => normText(i.text));
    expect(texts.filter(t => t === '할 일').length).toBe(1);
    expect(texts.some(t => t === '')).toBe(false);
  });

  it('8. day-1 / no prev day: no carry, render = stored only, unchanged', () => {
    const r = computeCarry({
      dayItems: [item('수동 항목')],
      prevDayItems: null,           // d=1 → caller passes null (no cross-month carry)
      shouldCarry: true,            // even if today, null prev short-circuits
    });
    expect(r.changed).toBe(false);
    expect(r.nextDayItems).toEqual([item('수동 항목')]);
    expect(r.itemsToRender.some(i => normText(i.text) === '수동 항목')).toBe(true);
  });

  it('9. shouldCarry=false (past day): no injection / no stale removal', () => {
    const r = computeCarry({
      dayItems: [item('기존 carried', { _carried: true })],
      prevDayItems: [item('새 항목')],   // would carry if shouldCarry
      shouldCarry: false,
    });
    expect(r.changed).toBe(false);
    expect(r.nextDayItems.some(i => normText(i.text) === '새 항목')).toBe(false);
    expect(r.nextDayItems.some(i => normText(i.text) === '기존 carried')).toBe(true);
  });

  it('10. idempotency: feeding nextDayItems back yields changed:false and identical render', () => {
    const args = {
      prevDayItems: [item('A'), item('B')],
      templateItems: [],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: true,
    };
    const first = computeCarry({ ...args, dayItems: [] });
    expect(first.changed).toBe(true);
    const second = computeCarry({ ...args, dayItems: first.nextDayItems });
    expect(second.changed).toBe(false);
    expect(second.nextDayItems).toEqual(first.nextDayItems);
    expect(second.itemsToRender).toEqual(first.itemsToRender);
  });

  it('11. template merge order: manual-only → carried-not-in-template → template', () => {
    const r = computeCarry({
      dayItems: [item('수동만'), item('carried만', { _carried: true })],
      prevDayItems: [item('carried만')], // keeps the carried valid (undone source)
      templateItems: ['템플릿1', '템플릿2'],
      prevTemplateItems: [],
      shouldCarry: true,
    });
    const texts = r.itemsToRender.map(i => normText(i.text));
    expect(texts).toEqual(['수동만', 'carried만', '템플릿1', '템플릿2']);
    // template items are marked _frame in render output
    expect(r.itemsToRender.filter(i => i._frame).map(i => normText(i.text))).toEqual(['템플릿1', '템플릿2']);
  });

  it('12. done-state preserved when stored item matches a template text', () => {
    const r = computeCarry({
      dayItems: [item('템플릿1', { done: true })], // user checked a template-backed item
      prevDayItems: null,
      templateItems: ['템플릿1', '템플릿2'],
      shouldCarry: false,
    });
    const t1 = r.itemsToRender.find(i => normText(i.text) === '템플릿1');
    expect(t1.done).toBe(true);
    const t2 = r.itemsToRender.find(i => normText(i.text) === '템플릿2');
    expect(t2.done).toBe(false);
  });
});
