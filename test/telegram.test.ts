import { describe, it, expect } from 'vitest';
import { parseUpdates, isAllowed, classifyMessage, formatReply, HELP_TEXT } from '../lib/telegram.js';

describe('parseUpdates', () => {
  it('메시지 추출 + offset 갱신', () => {
    const data = { result: [
      { update_id: 10, message: { chat: { id: 99 }, text: 'hello' } },
      { update_id: 11, message: { chat: { id: 99 }, text: '  world  ' } },
    ] };
    const { messages, nextOffset } = parseUpdates(data, 5);
    expect(messages).toHaveLength(2);
    expect(messages[1].text).toBe('world');     // trim
    expect(messages[0].chatId).toBe(99);
    expect(nextOffset).toBe(12);                 // maxId+1
  });

  it('텍스트 없는 업데이트(사진 등)는 건너뛰되 offset은 전진', () => {
    const data = { result: [{ update_id: 20, message: { chat: { id: 1 } } }] };
    const { messages, nextOffset } = parseUpdates(data, 0);
    expect(messages).toHaveLength(0);
    expect(nextOffset).toBe(21);
  });

  it('빈 result → 메시지 없음, offset 유지', () => {
    const { messages, nextOffset } = parseUpdates({ result: [] }, 7);
    expect(messages).toEqual([]);
    expect(nextOffset).toBe(7);
  });

  it('잘못된 data 형태도 크래시 없음', () => {
    expect(parseUpdates(null, 0).messages).toEqual([]);
    expect(parseUpdates({}, 3).nextOffset).toBe(3);
  });
});

describe('isAllowed', () => {
  it('allowlist 비어있으면 전체 허용', () => {
    expect(isAllowed(123, [])).toBe(true);
  });
  it('allowlist 있으면 포함된 것만', () => {
    expect(isAllowed(123, [123, 456])).toBe(true);
    expect(isAllowed(999, [123])).toBe(false);
  });
});

describe('classifyMessage', () => {
  it('/start, /help → help', () => {
    expect(classifyMessage('/start').kind).toBe('help');
    expect(classifyMessage('/help').kind).toBe('help');
  });
  it('일반 텍스트 → query', () => {
    const r = classifyMessage('Cloudflare 가격');
    expect(r.kind).toBe('query');
    expect(r.query).toBe('Cloudflare 가격');
  });
  it('/search prefix 제거', () => {
    expect(classifyMessage('/search D1 검색').query).toBe('D1 검색');
  });
  it('알 수 없는 명령은 help', () => {
    expect(classifyMessage('/foobar').kind).toBe('help');
  });
});

describe('formatReply', () => {
  it('answer + 출처 + 맥락 포함', () => {
    const msg = formatReply({
      answer: '결론입니다',
      sources: [{ url: 'https://a.com', title: 'A' }, { url: 'https://b.com', title: 'B' }],
      contextUsed: { priorFindings: 2, cortexDocs: 1, profile: 6 },
    });
    expect(msg).toContain('결론입니다');
    expect(msg).toContain('https://a.com');
    expect(msg).toContain('과거 2');
  });

  it('error는 경고 메시지', () => {
    expect(formatReply({ error: 'timeout' })).toContain('검색 실패');
  });

  it('출처 5개로 제한', () => {
    const sources = Array.from({ length: 8 }, (_, i) => ({ url: `https://x${i}`, title: `T${i}` }));
    const msg = formatReply({ answer: 'a', sources });
    expect((msg.match(/https:\/\/x/g) || []).length).toBe(5);
  });

  it('4096자 초과 시 절단', () => {
    const msg = formatReply({ answer: 'x'.repeat(5000) });
    expect(msg.length).toBeLessThanOrEqual(4001);
    expect(msg).toContain('생략');
  });

  it('빈 결과 안전', () => {
    expect(formatReply({})).toBe('(결과 없음)');
  });

  it('HELP_TEXT 존재', () => {
    expect(HELP_TEXT).toContain('Cortex Research');
  });
});
