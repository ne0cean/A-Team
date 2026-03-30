import { describe, it, expect } from 'vitest';
import {
  tracePaths,
  buildDiagram,
  assessCoverage,
  checkGate,
  type CodePath,
  type CoverageResult,
  type GateResult,
} from '../lib/coverage-audit.js';

describe('tracePaths', () => {
  it('should extract code paths from a simple function diff', () => {
    const diff = [
'+function processPayment(amount: number, currency: string) {',
'+  if (amount <= 0) throw new Error("Invalid amount");',
'+  if (!VALID_CURRENCIES.includes(currency)) throw new Error("Invalid currency");',
'+  try {',
'+    return gateway.charge(amount, currency);',
'+  } catch (err) {',
'+    logger.error("Payment failed", err);',
'+    throw err;',
'+  }',
'+}',
    ].join('\n');
    const paths = tracePaths(diff, 'billing.ts');

    // Should find: guard (amount <= 0 throw), guard (invalid currency throw), catch, throw
    expect(paths.length).toBeGreaterThanOrEqual(3);
    expect(paths.some(p => p.type === 'guard' || p.type === 'error')).toBe(true);
  });

  it('should detect conditional branches (if/else, switch, ternary)', () => {
    const diff = [
'+const status = isActive ? "active" : "inactive";',
'+if (user.role === "admin") {',
'+  grantAccess();',
'+} else if (user.role === "editor") {',
'+  grantPartialAccess();',
'+} else {',
'+  denyAccess();',
'+}',
'+switch (action) {',
'+  case "create": return handleCreate();',
'+  case "delete": return handleDelete();',
'+  default: throw new Error("Unknown action");',
'+}',
    ].join('\n');
    const paths = tracePaths(diff, 'auth.ts');

    // ternary(2) + if/else-if/else(3) + switch(3) = 8+ paths
    expect(paths.length).toBeGreaterThanOrEqual(6);
  });

  it('should detect early returns and guard clauses', () => {
    const diff = [
'+function getUser(id: string) {',
'+  if (!id) return null;',
'+  if (cache.has(id)) return cache.get(id);',
'+  return db.findUser(id);',
'+}',
    ].join('\n');
    const paths = tracePaths(diff, 'user.ts');
    expect(paths.some(p => p.type === 'guard')).toBe(true);
  });
});

describe('buildDiagram', () => {
  it('should generate ASCII coverage diagram', () => {
    const paths: CodePath[] = [
      { file: 'billing.ts', func: 'processPayment', description: 'Happy path', type: 'branch', tested: true, testFile: 'billing.test.ts', quality: 3 },
      { file: 'billing.ts', func: 'processPayment', description: 'Invalid amount', type: 'branch', tested: true, testFile: 'billing.test.ts', quality: 2 },
      { file: 'billing.ts', func: 'processPayment', description: 'Network timeout', type: 'error', tested: false },
    ];

    const diagram = buildDiagram(paths);

    expect(diagram).toContain('billing.ts');
    expect(diagram).toContain('processPayment');
    expect(diagram).toContain('TESTED');
    expect(diagram).toContain('GAP');
    expect(diagram).toContain('COVERAGE:');
  });
});

describe('assessCoverage', () => {
  it('should calculate coverage percentage', () => {
    const paths: CodePath[] = [
      { file: 'a.ts', func: 'f', description: 'p1', type: 'branch', tested: true, quality: 3 },
      { file: 'a.ts', func: 'f', description: 'p2', type: 'branch', tested: true, quality: 2 },
      { file: 'a.ts', func: 'f', description: 'p3', type: 'error', tested: false },
      { file: 'a.ts', func: 'f', description: 'p4', type: 'guard', tested: false },
    ];

    const result = assessCoverage(paths);
    expect(result.totalPaths).toBe(4);
    expect(result.testedPaths).toBe(2);
    expect(result.percentage).toBe(50);
    expect(result.gaps).toHaveLength(2);
  });

  it('should classify test recommendation (unit/e2e/eval)', () => {
    const paths: CodePath[] = [
      { file: 'a.ts', func: 'f', description: 'pure function edge', type: 'branch', tested: false },
      { file: 'a.ts', func: 'f', description: 'multi-component user flow', type: 'flow', tested: false, needsE2E: true },
      { file: 'a.ts', func: 'f', description: 'prompt template change', type: 'branch', tested: false, needsEval: true },
    ];

    const result = assessCoverage(paths);
    expect(result.gaps.some(g => g.recommendation === 'unit')).toBe(true);
    expect(result.gaps.some(g => g.recommendation === 'e2e')).toBe(true);
    expect(result.gaps.some(g => g.recommendation === 'eval')).toBe(true);
  });
});

describe('checkGate', () => {
  it('should PASS when above target', () => {
    const result = checkGate(85, { minimum: 60, target: 80 });
    expect(result.status).toBe('pass');
  });

  it('should WARN when between minimum and target', () => {
    const result = checkGate(70, { minimum: 60, target: 80 });
    expect(result.status).toBe('warn');
  });

  it('should FAIL when below minimum', () => {
    const result = checkGate(40, { minimum: 60, target: 80 });
    expect(result.status).toBe('fail');
  });

  it('should use default thresholds when not specified', () => {
    const pass = checkGate(85);
    expect(pass.status).toBe('pass');

    const fail = checkGate(50);
    expect(fail.status).toBe('fail');
  });
});
