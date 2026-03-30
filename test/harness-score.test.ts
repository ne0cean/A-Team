import { describe, it, expect } from 'vitest';
import {
  calculateDimensions,
  calculateTotal,
  getGrade,
  type PrincipleScores,
  type Dimensions,
} from '../lib/harness-score.js';

describe('calculateDimensions', () => {
  it('should calculate 4 dimensions from 12 principle scores', () => {
    const scores: PrincipleScores = {
      P1: 8, P2: 7, P3: 9, P4: 8, P5: 6, P6: 7,
      P7: 5, P8: 6, P9: 8, P10: 9, P11: 7, P12: 8,
    };
    const dims = calculateDimensions(scores);

    // A = (P1+P2+P5+P12)/4 = (8+7+6+8)/4 = 7.25
    expect(dims.A).toBeCloseTo(7.25, 1);
    // B = (P3+P4+P10)/3 = (9+8+9)/3 = 8.67
    expect(dims.B).toBeCloseTo(8.67, 1);
    // C = (P6+P9+P11)/3 = (7+8+7)/3 = 7.33
    expect(dims.C).toBeCloseTo(7.33, 1);
    // D = (P7+P8)/2 = (5+6)/2 = 5.5
    expect(dims.D).toBeCloseTo(5.5, 1);
  });
});

describe('calculateTotal', () => {
  it('should apply weighted formula (A*0.3 + B*0.3 + C*0.2 + D*0.2) * 10', () => {
    const dims: Dimensions = { A: 7.25, B: 8.67, C: 7.33, D: 5.5 };
    const total = calculateTotal(dims);
    // (7.25*0.3 + 8.67*0.3 + 7.33*0.2 + 5.5*0.2) * 10 = (2.175+2.601+1.466+1.1)*10 = 73.42
    expect(total).toBeCloseTo(73.4, 0);
  });

  it('should return 100 for all 10s', () => {
    const dims: Dimensions = { A: 10, B: 10, C: 10, D: 10 };
    expect(calculateTotal(dims)).toBe(100);
  });

  it('should return 0 for all 0s', () => {
    const dims: Dimensions = { A: 0, B: 0, C: 0, D: 0 };
    expect(calculateTotal(dims)).toBe(0);
  });
});

describe('getGrade', () => {
  it('should return L5 for 80+', () => { expect(getGrade(85)).toBe('L5'); });
  it('should return L4 for 60-79', () => { expect(getGrade(72)).toBe('L4'); });
  it('should return L3 for 40-59', () => { expect(getGrade(55)).toBe('L3'); });
  it('should return L2 for 20-39', () => { expect(getGrade(30)).toBe('L2'); });
  it('should return L1 for 0-19', () => { expect(getGrade(10)).toBe('L1'); });
});
