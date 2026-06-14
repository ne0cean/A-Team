import { describe, it, expect } from 'vitest';
import { resolveCurrentWorkout, toggleWorkoutPart } from '../workout.js';

describe('resolveCurrentWorkout — sticky carry-forward', () => {
  it('오늘 키가 있으면 그것을 사용 (carried=false)', () => {
    const log = { '2026-06-13': ['후면', '등'], '2026-06-14': ['가슴'] };
    const r = resolveCurrentWorkout(log, '2026-06-14');
    expect(r.parts).toEqual(['가슴']);
    expect(r.carried).toBe(false);
  });

  it('핵심 회귀: 새 날 오늘 키가 없으면 가장 최근 선택을 이어받는다 (사라지지 않음)', () => {
    const log = { '2026-06-13': ['후면', '등'] };
    const r = resolveCurrentWorkout(log, '2026-06-14');
    expect(r.parts).toEqual(['후면', '등']);
    expect(r.carried).toBe(true);
    expect(r.date).toBe('2026-06-13');
  });

  it('여러 날 건너뛰어도 가장 최근 비어있지 않은 날을 이어받는다', () => {
    const log = { '2026-06-10': ['전면'], '2026-06-13': ['후면', '등'] };
    const r = resolveCurrentWorkout(log, '2026-06-20');
    expect(r.parts).toEqual(['후면', '등']);
    expect(r.date).toBe('2026-06-13');
  });

  it('오늘 명시적으로 비움([])은 carry하지 않고 빈 칸 유지', () => {
    const log = { '2026-06-13': ['후면'], '2026-06-14': [] };
    const r = resolveCurrentWorkout(log, '2026-06-14');
    expect(r.parts).toEqual([]);
    expect(r.carried).toBe(false);
  });

  it('미래 날짜는 무시하고 today 이하만 carry', () => {
    const log = { '2026-06-13': ['후면'], '2026-06-20': ['가슴'] };
    const r = resolveCurrentWorkout(log, '2026-06-14');
    expect(r.parts).toEqual(['후면']);
    expect(r.date).toBe('2026-06-13');
  });

  it('이력 전무 시 빈 선택', () => {
    expect(resolveCurrentWorkout({}, '2026-06-14').parts).toEqual([]);
  });

  it('비-날짜 키(_backup 등)는 무시', () => {
    const log = { _meta: ['x'], '2026-06-13': ['등'] };
    expect(resolveCurrentWorkout(log, '2026-06-14').parts).toEqual(['등']);
  });
});

describe('toggleWorkoutPart — 기존 라디오 동작 보존', () => {
  it('없으면 추가', () => {
    expect(toggleWorkoutPart(['등'], '전면')).toEqual(['등', '전면']);
  });

  it('있으면 제거', () => {
    expect(toggleWorkoutPart(['등', '전면'], '전면')).toEqual(['등']);
  });

  it('같은 파랑 그룹은 상호배타 (전면→측면 시 전면 제거)', () => {
    expect(toggleWorkoutPart(['전면', '등'], '측면')).toEqual(['등', '측면']);
  });

  it('다른 색 그룹은 공존 (등 + 전면)', () => {
    expect(toggleWorkoutPart(['등'], '전면')).toEqual(['등', '전면']);
  });

  it('입력 배열 불변 (순수)', () => {
    const input = ['등'];
    toggleWorkoutPart(input, '전면');
    expect(input).toEqual(['등']);
  });

  it('carry-forward 선택에서 토글: 어제값 이어받아 변경', () => {
    // 새 날, 어제 ["후면","등"] carry → 가슴 토글 → ["후면","가슴"] (등 같은 초록 그룹 교체)
    const { parts } = resolveCurrentWorkout({ '2026-06-13': ['후면', '등'] }, '2026-06-14');
    expect(toggleWorkoutPart(parts, '가슴')).toEqual(['후면', '가슴']);
  });
});
