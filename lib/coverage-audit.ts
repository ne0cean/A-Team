/**
 * Coverage Audit — Codepath tracing + ASCII coverage diagram
 *
 * Analyzes git diff to extract code paths (branches, errors, guards, flows),
 * builds ASCII coverage diagrams, and enforces coverage gates.
 */

// --- Types ---

export type PathType = 'branch' | 'error' | 'guard' | 'flow';
export type TestRecommendation = 'unit' | 'e2e' | 'eval';
export type GateStatus = 'pass' | 'warn' | 'fail';

export interface CodePath {
  file: string;
  func: string;
  description: string;
  type: PathType;
  tested?: boolean;
  testFile?: string;
  quality?: number; // 1-3 stars
  needsE2E?: boolean;
  needsEval?: boolean;
}

export interface CoverageGap {
  path: CodePath;
  recommendation: TestRecommendation;
}

export interface CoverageResult {
  totalPaths: number;
  testedPaths: number;
  percentage: number;
  gaps: CoverageGap[];
  qualityBreakdown: { stars3: number; stars2: number; stars1: number };
}

export interface GateThresholds {
  minimum: number;
  target: number;
}

export interface GateResult {
  status: GateStatus;
  percentage: number;
  message: string;
}

// --- Path Tracing ---

const BRANCH_PATTERNS = [
  /^\+\s*if\s*\(/,           // if (
  /^\+\s*\}\s*else\s*(if\s*\()?/, // } else / } else if (
  /^\+.*\?\s*.*\s*:\s*/,     // ternary
  /^\+\s*case\s+/,           // switch case
  /^\+\s*default\s*:/,       // switch default
];

const ERROR_PATTERNS = [
  /^\+\s*catch\s*\(/,        // catch (
  /^\+\s*\.catch\s*\(/,      // .catch(
  /^\+.*throw\s+new\s+/,     // throw new Error
  /^\+.*throw\s+/,           // throw
];

const GUARD_PATTERNS = [
  /^\+\s*if\s*\(.*\)\s*return\b/, // if (...) return
  /^\+\s*if\s*\(!.*\)\s*return\b/, // if (!...) return
  /^\+\s*if\s*\(!.*\)\s*throw\b/,  // if (!...) throw
];

function extractFunctionName(lines: string[], index: number): string {
  // Walk backwards to find function declaration
  for (let i = index; i >= Math.max(0, index - 10); i--) {
    const line = lines[i];
    const fnMatch = line.match(/(?:function|async function)\s+(\w+)/);
    if (fnMatch) return fnMatch[1];
    const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
    if (arrowMatch && line.includes('=>')) return arrowMatch[1];
    const methodMatch = line.match(/^\+?\s*(?:async\s+)?(\w+)\s*\(/);
    if (methodMatch && !['if', 'else', 'for', 'while', 'switch', 'catch', 'return'].includes(methodMatch[1])) {
      return methodMatch[1];
    }
  }
  return 'unknown';
}

export function tracePaths(diff: string, file: string): CodePath[] {
  const lines = diff.split('\n');
  const paths: CodePath[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('+')) continue;

    const func = extractFunctionName(lines, i);

    // Check guards first (more specific than branches)
    if (GUARD_PATTERNS.some(p => p.test(line))) {
      paths.push({
        file, func,
        description: line.replace(/^\+\s*/, '').trim(),
        type: 'guard',
      });
      continue;
    }

    // Check error patterns
    if (ERROR_PATTERNS.some(p => p.test(line))) {
      paths.push({
        file, func,
        description: line.replace(/^\+\s*/, '').trim(),
        type: 'error',
      });
      continue;
    }

    // Check branch patterns
    if (BRANCH_PATTERNS.some(p => p.test(line))) {
      paths.push({
        file, func,
        description: line.replace(/^\+\s*/, '').trim(),
        type: 'branch',
      });
    }
  }

  return paths;
}

// --- Diagram ---

export function buildDiagram(paths: CodePath[]): string {
  const lines: string[] = [];
  lines.push('CODE PATH COVERAGE');
  lines.push('===========================');

  // Group by file → func
  const byFile = new Map<string, Map<string, CodePath[]>>();
  for (const p of paths) {
    if (!byFile.has(p.file)) byFile.set(p.file, new Map());
    const funcMap = byFile.get(p.file)!;
    if (!funcMap.has(p.func)) funcMap.set(p.func, []);
    funcMap.get(p.func)!.push(p);
  }

  for (const [file, funcMap] of byFile) {
    lines.push(`[+] ${file}`);

    for (const [func, funcPaths] of funcMap) {
      lines.push(`    │`);
      lines.push(`    ├── ${func}()`);

      for (const p of funcPaths) {
        const stars = p.quality === 3 ? '★★★' : p.quality === 2 ? '★★ ' : p.quality === 1 ? '★  ' : '';
        if (p.tested) {
          lines.push(`    │   ├── [${stars} TESTED] ${p.description} — ${p.testFile || ''}`);
        } else {
          const tag = p.needsE2E ? ' [→E2E]' : p.needsEval ? ' [→EVAL]' : '';
          lines.push(`    │   ├── [GAP]${tag}         ${p.description} — NO TEST`);
        }
      }
    }
    lines.push('');
  }

  // Summary
  const tested = paths.filter(p => p.tested).length;
  const total = paths.length;
  const pct = total > 0 ? Math.round((tested / total) * 100) : 0;
  const gaps = paths.filter(p => !p.tested).length;
  const e2e = paths.filter(p => p.needsE2E).length;
  const eval_ = paths.filter(p => p.needsEval).length;

  lines.push('─────────────────────────────────');
  lines.push(`COVERAGE: ${tested}/${total} paths tested (${pct}%)`);
  if (gaps > 0) {
    lines.push(`GAPS: ${gaps} paths need tests${e2e > 0 ? ` (${e2e} need E2E)` : ''}${eval_ > 0 ? ` (${eval_} need eval)` : ''}`);
  }
  lines.push('─────────────────────────────────');

  return lines.join('\n');
}

// --- Assessment ---

export function assessCoverage(paths: CodePath[]): CoverageResult {
  const tested = paths.filter(p => p.tested);
  const untested = paths.filter(p => !p.tested);

  const gaps: CoverageGap[] = untested.map(p => ({
    path: p,
    recommendation: p.needsEval ? 'eval' : p.needsE2E ? 'e2e' : 'unit',
  }));

  return {
    totalPaths: paths.length,
    testedPaths: tested.length,
    percentage: paths.length > 0 ? Math.round((tested.length / paths.length) * 100) : 0,
    gaps,
    qualityBreakdown: {
      stars3: tested.filter(p => p.quality === 3).length,
      stars2: tested.filter(p => p.quality === 2).length,
      stars1: tested.filter(p => p.quality === 1).length,
    },
  };
}

// --- Gate ---

const DEFAULT_THRESHOLDS: GateThresholds = { minimum: 60, target: 80 };

export function checkGate(
  percentage: number,
  thresholds?: Partial<GateThresholds>,
): GateResult {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  if (percentage >= t.target) {
    return { status: 'pass', percentage, message: `Coverage gate: PASS (${percentage}%)` };
  }
  if (percentage >= t.minimum) {
    return { status: 'warn', percentage, message: `Coverage gate: WARN (${percentage}%) — below target ${t.target}%` };
  }
  return { status: 'fail', percentage, message: `Coverage gate: FAIL (${percentage}%) — below minimum ${t.minimum}%` };
}
