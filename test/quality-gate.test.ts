import { describe, it, expect } from 'vitest';
import {
  detectDebugCode,
  checkFileQuality,
  type QualityIssue,
} from '../lib/quality-gate.js';

describe('detectDebugCode', () => {
  it('should detect console.log statements', () => {
    const code = 'function f() {\n  console.log("debug");\n  return 1;\n}';
    const issues = detectDebugCode(code, 'app.ts');
    expect(issues.some(i => i.type === 'console')).toBe(true);
  });

  it('should detect debugger statements', () => {
    const code = 'function f() {\n  debugger;\n  return 1;\n}';
    const issues = detectDebugCode(code, 'app.ts');
    expect(issues.some(i => i.type === 'debugger')).toBe(true);
  });

  it('should detect TODO/FIXME comments', () => {
    const code = '// TODO: fix this\nconst x = 1; // FIXME: broken';
    const issues = detectDebugCode(code, 'app.ts');
    expect(issues.filter(i => i.type === 'todo')).toHaveLength(2);
  });

  it('should not flag console.error or console.warn', () => {
    const code = 'console.error("real error");\nconsole.warn("warning");';
    const issues = detectDebugCode(code, 'app.ts');
    expect(issues.filter(i => i.type === 'console')).toHaveLength(0);
  });

  it('should return empty for clean code', () => {
    const code = 'export function add(a: number, b: number) { return a + b; }';
    expect(detectDebugCode(code, 'util.ts')).toEqual([]);
  });
});

describe('checkFileQuality', () => {
  it('should detect large files (>500 lines)', () => {
    const code = Array(501).fill('const x = 1;').join('\n');
    const issues = checkFileQuality(code, 'big.ts');
    expect(issues.some(i => i.type === 'large-file')).toBe(true);
  });

  it('should detect long lines (>200 chars)', () => {
    const code = 'const x = ' + 'a'.repeat(200) + ';';
    const issues = checkFileQuality(code, 'wide.ts');
    expect(issues.some(i => i.type === 'long-line')).toBe(true);
  });
});
