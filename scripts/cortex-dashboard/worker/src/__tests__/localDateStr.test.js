/**
 * localDateStr() 단위 테스트
 *
 * 버그 요약:
 *   수정 전: new Date().toISOString().slice(0,10) → UTC 날짜 반환
 *   수정 후: getTimezoneOffset 기반 로컬 날짜 반환
 *
 * UTC+9(KST) 환경에서 오전 9시 전(UTC로는 전날)에 체크한 운동이
 * 재렌더 시 사라지는 버그를 방지한다.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── 구현 (app.js localDateStr 그대로 복사) ──────────────────────────────
function localDateStr() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// ── 버그 재현용 이전 구현 ──────────────────────────────────────────────
function localDateStr_utc_buggy() {
  return new Date().toISOString().slice(0, 10);
}
// ─────────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.useRealTimers();
});

// UTC+9 mock helper: getTimezoneOffset을 -540으로 stub
function withKST(fn) {
  const orig = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = () => -540;
  try {
    return fn();
  } finally {
    Date.prototype.getTimezoneOffset = orig;
  }
}

describe('localDateStr — KST 오전 8:30 (UTC 전날 23:30)', () => {
  // KST 2025-06-12 08:30 = UTC 2025-06-11 23:30
  const UTC_TIMESTAMP = '2025-06-11T23:30:00.000Z';

  it('수정된 버전: 로컬 날짜(당일) 2025-06-12 를 반환한다', () => {
    vi.setSystemTime(new Date(UTC_TIMESTAMP));
    const result = withKST(() => localDateStr());
    expect(result).toBe('2025-06-12');
  });

  it('buggy 버전: UTC 날짜(전날) 2025-06-11 을 반환한다 — 버그 재현', () => {
    vi.setSystemTime(new Date(UTC_TIMESTAMP));
    const result = localDateStr_utc_buggy();
    expect(result).toBe('2025-06-11'); // UTC 기준 전날 → 버그
  });
});

describe('localDateStr — KST 오전 9:30 (UTC 당일 00:30, 자정 이후)', () => {
  // KST 2025-06-12 09:30 = UTC 2025-06-12 00:30
  const UTC_TIMESTAMP = '2025-06-12T00:30:00.000Z';

  it('수정된 버전: 당일 날짜 2025-06-12 를 반환한다', () => {
    vi.setSystemTime(new Date(UTC_TIMESTAMP));
    const result = withKST(() => localDateStr());
    expect(result).toBe('2025-06-12');
  });

  it('buggy 버전: 이 시각은 UTC도 당일이므로 우연히 2025-06-12 반환', () => {
    vi.setSystemTime(new Date(UTC_TIMESTAMP));
    const result = localDateStr_utc_buggy();
    expect(result).toBe('2025-06-12'); // 이 경우 우연히 일치
  });
});

describe('localDateStr — KST 08:59 경계값 (UTC 23:59)', () => {
  // KST 2025-06-12 08:59 = UTC 2025-06-11 23:59
  const UTC_TIMESTAMP = '2025-06-11T23:59:00.000Z';

  it('수정된 버전: 로컬 당일 날짜 2025-06-12 를 반환한다', () => {
    vi.setSystemTime(new Date(UTC_TIMESTAMP));
    const result = withKST(() => localDateStr());
    expect(result).toBe('2025-06-12');
  });

  it('buggy 버전: UTC 기준 전날 2025-06-11 반환 — 버그 재현', () => {
    vi.setSystemTime(new Date(UTC_TIMESTAMP));
    const result = localDateStr_utc_buggy();
    expect(result).toBe('2025-06-11');
  });
});

describe('localDateStr — 반환 형식', () => {
  it('YYYY-MM-DD 10자리 형식 문자열을 반환한다', () => {
    vi.setSystemTime(new Date('2025-06-12T10:00:00.000Z'));
    const result = withKST(() => localDateStr());
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toHaveLength(10);
  });

  it('월말 경계: UTC 6월 30일 14:00 (KST 6월 30일 23:00) → 2025-06-30', () => {
    vi.setSystemTime(new Date('2025-06-30T14:00:00.000Z'));
    const result = withKST(() => localDateStr());
    expect(result).toBe('2025-06-30');
  });

  it('월 경계: KST 2025-07-01 01:00 (UTC 6월 30일 16:00) → 2025-07-01', () => {
    vi.setSystemTime(new Date('2025-06-30T16:00:00.000Z'));
    const result = withKST(() => localDateStr());
    expect(result).toBe('2025-07-01');
  });
});
