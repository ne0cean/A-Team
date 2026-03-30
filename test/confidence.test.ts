import { describe, it, expect } from 'vitest';
import {
  classifyFinding,
  filterFindings,
  calibrate,
  type Finding,
  type DisplayRule,
} from '../lib/confidence.js';

describe('classifyFinding', () => {
  it('should classify 9-10 as "show"', () => {
    expect(classifyFinding(9)).toBe('show');
    expect(classifyFinding(10)).toBe('show');
  });

  it('should classify 7-8 as "show"', () => {
    expect(classifyFinding(7)).toBe('show');
    expect(classifyFinding(8)).toBe('show');
  });

  it('should classify 5-6 as "caveat"', () => {
    expect(classifyFinding(5)).toBe('caveat');
    expect(classifyFinding(6)).toBe('caveat');
  });

  it('should classify 3-4 as "suppress"', () => {
    expect(classifyFinding(3)).toBe('suppress');
    expect(classifyFinding(4)).toBe('suppress');
  });

  it('should classify 1-2 as "suppress" (unless P0)', () => {
    expect(classifyFinding(1)).toBe('suppress');
    expect(classifyFinding(2)).toBe('suppress');
  });

  it('should clamp out-of-range values', () => {
    expect(classifyFinding(0)).toBe('suppress');
    expect(classifyFinding(11)).toBe('show');
  });
});

describe('filterFindings', () => {
  const findings: Finding[] = [
    { severity: 'P1', confidence: 9, file: 'auth.ts', line: 42, description: 'SQL injection' },
    { severity: 'P2', confidence: 5, file: 'api.ts', line: 18, description: 'Possible N+1' },
    { severity: 'P3', confidence: 3, file: 'utils.ts', line: 5, description: 'Unused import' },
    { severity: 'P0', confidence: 2, file: 'db.ts', line: 100, description: 'Data loss risk' },
  ];

  it('should keep high-confidence findings as-is', () => {
    const result = filterFindings(findings);
    const p1 = result.find(f => f.severity === 'P1')!;
    expect(p1.displayRule).toBe('show');
    expect(p1.caveatText).toBeUndefined();
  });

  it('should add caveat to medium-confidence findings', () => {
    const result = filterFindings(findings);
    const p2 = result.find(f => f.severity === 'P2')!;
    expect(p2.displayRule).toBe('caveat');
    expect(p2.caveatText).toBeDefined();
  });

  it('should suppress low-confidence non-P0 findings', () => {
    const result = filterFindings(findings);
    const p3 = result.find(f => f.severity === 'P3')!;
    expect(p3.displayRule).toBe('suppress');
  });

  it('should still show P0 findings even with low confidence', () => {
    const result = filterFindings(findings);
    const p0 = result.find(f => f.severity === 'P0')!;
    expect(p0.displayRule).toBe('show');
  });
});

describe('calibrate', () => {
  it('should increase confidence when user confirms low-confidence finding', () => {
    const result = calibrate({
      key: 'n-plus-one',
      originalConfidence: 5,
      userConfirmed: true,
    });
    expect(result.adjustedConfidence).toBeGreaterThan(5);
    expect(result.learningType).toBe('calibration');
  });

  it('should decrease confidence when user rejects high-confidence finding', () => {
    const result = calibrate({
      key: 'false-positive',
      originalConfidence: 8,
      userConfirmed: false,
    });
    expect(result.adjustedConfidence).toBeLessThan(8);
    expect(result.learningType).toBe('calibration');
  });

  it('should not exceed 10 or go below 1', () => {
    const up = calibrate({ key: 'a', originalConfidence: 10, userConfirmed: true });
    expect(up.adjustedConfidence).toBe(10);

    const down = calibrate({ key: 'b', originalConfidence: 1, userConfirmed: false });
    expect(down.adjustedConfidence).toBe(1);
  });
});
