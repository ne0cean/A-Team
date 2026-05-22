/**
 * Property-Based Tests — TDD가 놓치는 엣지 케이스 자동 발견
 *
 * 패턴:
 *   roundtrip  — encode(decode(x)) === x
 *   invariant  — 구조적 속성이 모든 입력에서 유지
 *   idempotent — f(f(x)) === f(x)
 *   metamorphic — 정답 모를 때 입출력 관계 검증
 */
import { test, fc } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import {
  classifyFinding,
  filterFindings,
  calibrate,
  type Finding,
  type DisplayRule,
} from '../lib/confidence.js';
import {
  calculateDimensions,
  calculateTotal,
  getGrade,
  type PrincipleScores,
} from '../lib/harness-score.js';

// --- Arbitraries ---

const severityArb = fc.constantFrom('P0' as const, 'P1' as const, 'P2' as const, 'P3' as const);

const findingArb: fc.Arbitrary<Finding> = fc.record({
  severity: severityArb,
  confidence: fc.integer({ min: 0, max: 15 }), // intentionally wider than 1-10
  file: fc.string({ minLength: 1 }),
  line: fc.integer({ min: 1, max: 10000 }),
  description: fc.string(),
});

const principleScoreArb = fc.integer({ min: 0, max: 10 });
const principleScoresArb: fc.Arbitrary<PrincipleScores> = fc.record({
  P1: principleScoreArb, P2: principleScoreArb, P3: principleScoreArb,
  P4: principleScoreArb, P5: principleScoreArb, P6: principleScoreArb,
  P7: principleScoreArb, P8: principleScoreArb, P9: principleScoreArb,
  P10: principleScoreArb, P11: principleScoreArb, P12: principleScoreArb,
});

// =============================================================
// confidence.ts — classifyFinding
// =============================================================
describe('classifyFinding — property-based', () => {
  test.prop([fc.integer({ min: 1, max: 10 })])(
    'invariant: output is always a valid DisplayRule',
    (confidence) => {
      const result = classifyFinding(confidence);
      expect(['show', 'caveat', 'suppress']).toContain(result);
    },
  );

  test.prop([fc.integer({ min: 7, max: 100 })])(
    'invariant: confidence >= 7 always shows',
    (confidence) => {
      expect(classifyFinding(confidence)).toBe('show');
    },
  );

  test.prop([fc.integer({ min: -100, max: 4 })])(
    'invariant: confidence <= 4 always suppresses',
    (confidence) => {
      expect(classifyFinding(confidence)).toBe('suppress');
    },
  );

  test.prop([fc.integer({ min: 1, max: 10 })])(
    'idempotent: classifying twice gives same result',
    (confidence) => {
      const first = classifyFinding(confidence);
      // classification is a pure function of number → same input = same output
      expect(classifyFinding(confidence)).toBe(first);
    },
  );

  test.prop([fc.integer({ min: 1, max: 9 })])(
    'metamorphic: higher confidence never downgrades display',
    (confidence) => {
      const rank = (r: DisplayRule) => ({ suppress: 0, caveat: 1, show: 2 })[r];
      const current = classifyFinding(confidence);
      const higher = classifyFinding(confidence + 1);
      expect(rank(higher)).toBeGreaterThanOrEqual(rank(current));
    },
  );
});

// =============================================================
// confidence.ts — filterFindings
// =============================================================
describe('filterFindings — property-based', () => {
  test.prop([fc.array(findingArb, { maxLength: 50 })])(
    'invariant: output length equals input length',
    (findings) => {
      const result = filterFindings(findings);
      expect(result).toHaveLength(findings.length);
    },
  );

  test.prop([fc.array(findingArb, { maxLength: 50 })])(
    'invariant: P0 findings always have displayRule "show"',
    (findings) => {
      const result = filterFindings(findings);
      const p0Results = result.filter((f) => f.severity === 'P0');
      for (const f of p0Results) {
        expect(f.displayRule).toBe('show');
      }
    },
  );

  test.prop([fc.array(findingArb, { maxLength: 50 })])(
    'invariant: all classified findings have a valid displayRule',
    (findings) => {
      const result = filterFindings(findings);
      for (const f of result) {
        expect(['show', 'caveat', 'suppress']).toContain(f.displayRule);
      }
    },
  );
});

// =============================================================
// harness-score.ts — calculateDimensions
// =============================================================
describe('calculateDimensions — property-based', () => {
  test.prop([principleScoresArb])(
    'invariant: all dimensions are within [0, 10]',
    (scores) => {
      const dims = calculateDimensions(scores);
      for (const key of ['A', 'B', 'C', 'D'] as const) {
        expect(dims[key]).toBeGreaterThanOrEqual(0);
        expect(dims[key]).toBeLessThanOrEqual(10);
      }
    },
  );

  test.prop([principleScoresArb])(
    'invariant: dimension is average of its principles',
    (scores) => {
      const dims = calculateDimensions(scores);
      expect(dims.A).toBeCloseTo((scores.P1 + scores.P2 + scores.P5 + scores.P12) / 4);
      expect(dims.B).toBeCloseTo((scores.P3 + scores.P4 + scores.P10) / 3);
    },
  );
});

// =============================================================
// harness-score.ts — calculateTotal + getGrade
// =============================================================
describe('calculateTotal + getGrade — property-based', () => {
  test.prop([principleScoresArb])(
    'invariant: total is within [0, 100]',
    (scores) => {
      const total = calculateTotal(calculateDimensions(scores));
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(100);
    },
  );

  test.prop([principleScoresArb])(
    'invariant: grade is always valid',
    (scores) => {
      const grade = getGrade(calculateTotal(calculateDimensions(scores)));
      expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(grade);
    },
  );

  test.prop([principleScoresArb, principleScoresArb])(
    'metamorphic: higher scores never produce lower grades',
    (scoresA, scoresB) => {
      // Make scoresB >= scoresA for every principle
      const higher: PrincipleScores = {} as PrincipleScores;
      for (const key of Object.keys(scoresA) as (keyof PrincipleScores)[]) {
        higher[key] = Math.max(scoresA[key], scoresB[key]);
      }
      const gradeRank = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };
      const gradeA = getGrade(calculateTotal(calculateDimensions(scoresA)));
      const gradeHigher = getGrade(calculateTotal(calculateDimensions(higher)));
      expect(gradeRank[gradeHigher]).toBeGreaterThanOrEqual(gradeRank[gradeA]);
    },
  );
});
