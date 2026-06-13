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

  // --- Edge-case additions ---

  it('13. separator in templateItems renders as _frame:true and does not interfere with carry/dedup', () => {
    const r = computeCarry({
      dayItems: [item('수동항목')],
      prevDayItems: [item('이월항목')],
      templateItems: [{ type: 'separator', text: '──' }, '루틴A'],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: true,
    });
    // separator는 itemsToRender에 _frame:true로 나온다
    const sep = r.itemsToRender.find(i => i.type === 'separator');
    expect(sep).toBeTruthy();
    expect(sep._frame).toBe(true);
    // carried 항목은 정상 이월
    expect(r.itemsToRender.some(i => normText(i.text) === '이월항목')).toBe(true);
    // separator는 nextDayItems(stored)에 포함되지 않는다
    expect(r.nextDayItems.some(i => i.type === 'separator')).toBe(false);
  });

  it('14. url merge: stored item url takes precedence over template base url (s.url || base.url rule)', () => {
    const r = computeCarry({
      dayItems: [item('링크항목', { url: 'https://stored.example.com' })],
      prevDayItems: null,
      templateItems: [{ text: '링크항목', url: 'https://template.example.com' }],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: false,
    });
    const found = r.itemsToRender.find(i => normText(i.text) === '링크항목');
    expect(found).toBeTruthy();
    // stored url이 template url보다 우선
    expect(found.url).toBe('https://stored.example.com');
  });

  it('14b. url merge: template url is used when stored item has no url', () => {
    const r = computeCarry({
      dayItems: [item('링크항목', { url: '' })],
      prevDayItems: null,
      templateItems: [{ text: '링크항목', url: 'https://template.example.com' }],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: false,
    });
    const found = r.itemsToRender.find(i => normText(i.text) === '링크항목');
    expect(found).toBeTruthy();
    // stored url이 없으면 template url 사용
    expect(found.url).toBe('https://template.example.com');
  });

  it('15. multi-day carry chain: A→B nextDayItems fed as C prevDayItems re-carries without duplication', () => {
    const baseArgs = {
      templateItems: [],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: true,
    };
    // A일 → B일 carry
    const dayB = computeCarry({
      ...baseArgs,
      dayItems: [],
      prevDayItems: [item('멀티이월')],
    });
    expect(dayB.nextDayItems.some(i => normText(i.text) === '멀티이월' && i._carried)).toBe(true);

    // B일 nextDayItems → C일의 prevDayItems로 (B일 미완료 _carried 포함)
    const dayC = computeCarry({
      ...baseArgs,
      dayItems: [],
      prevDayItems: dayB.nextDayItems,
    });
    // C일에도 carry 되어야 한다
    expect(dayC.nextDayItems.some(i => normText(i.text) === '멀티이월' && i._carried)).toBe(true);
    // 중복 없이 1개만
    expect(dayC.nextDayItems.filter(i => normText(i.text) === '멀티이월').length).toBe(1);
  });

  it('16. prevTemplateItems blocks inject: prev undone routine item is NOT carried (it was a frame in prev day)', () => {
    // "어제" 템플릿에 속했던 항목 → prevTemplateItems에 있으면 이월 안 됨
    const r = computeCarry({
      dayItems: [],
      prevDayItems: [item('어제루틴')],   // undone but was a routine in prev day
      templateItems: [],
      prevTemplateItems: ['어제루틴'],    // ← 이걸로 차단
      rejects: [],
      shouldCarry: true,
    });
    expect(r.changed).toBe(false);
    expect(r.nextDayItems.some(i => normText(i.text) === '어제루틴')).toBe(false);
  });

  it('17. rejects blocks carried item + empty rejects has no side effect', () => {
    // rejects가 carry를 막는다
    const withReject = computeCarry({
      dayItems: [],
      prevDayItems: [item('거부항목'), item('일반항목')],
      templateItems: [],
      prevTemplateItems: [],
      rejects: ['거부항목'],
      shouldCarry: true,
    });
    expect(withReject.nextDayItems.some(i => normText(i.text) === '거부항목')).toBe(false);
    expect(withReject.nextDayItems.some(i => normText(i.text) === '일반항목')).toBe(true);

    // 빈 rejects는 부작용 없음
    const noReject = computeCarry({
      dayItems: [],
      prevDayItems: [item('일반항목')],
      templateItems: [],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: true,
    });
    expect(noReject.nextDayItems.some(i => normText(i.text) === '일반항목')).toBe(true);
  });

  it('18. normText boundary: &nbsp; / multi-space / trim variants treated as same item (no dup)', () => {
    const r = computeCarry({
      dayItems: [
        item('할 일'),           // normal
        item('할 일'),      // &nbsp; (raw char)
        item('  할   일  '),     // multi-space + trim
      ],
      prevDayItems: null,
      templateItems: [],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: false,
    });
    // 셋 다 normText → '할 일' → dedup 후 1개만 남아야 한다
    expect(r.nextDayItems.filter(i => normText(i.text) === '할 일').length).toBe(1);
    expect(r.changed).toBe(true); // dedup이 발생했으므로 changed

    // normText가 prev와 today를 같은 항목으로 인식해 inject 차단
    const r2 = computeCarry({
      dayItems: [item('할 일')],
      prevDayItems: [item('할 일')],  // &nbsp; variant
      templateItems: [],
      prevTemplateItems: [],
      rejects: [],
      shouldCarry: true,
    });
    // already present today (normText-equal) → inject 안 됨
    expect(r2.nextDayItems.filter(i => normText(i.text) === '할 일').length).toBe(1);
  });
});
