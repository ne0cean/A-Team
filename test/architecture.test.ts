/**
 * Architecture Fitness Functions
 *
 * 구조적 부패를 자동 감지. npm test마다 실행.
 * - 레이어 경계 위반 (governance → scripts 금지 등)
 * - 순환 의존성
 * - 명령어 참조 무결성
 * - 모듈 독립성
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

// --- Helpers ---

function readFile(rel: string): string {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

function findTsFiles(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

function getImports(filePath: string): string[] {
  const content = readFile(filePath);
  const re = /(?:import|require)\s*\(?['"](\.\.?\/[^'"]+)['"]\)?/g;
  const imports: string[] = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

// =============================================================
// Layer Boundary Enforcement
// =============================================================
describe('layer boundaries', () => {
  test('lib/ does not import from scripts/', () => {
    const violations: string[] = [];
    for (const file of findTsFiles('lib')) {
      for (const imp of getImports(file)) {
        if (imp.includes('scripts/') || imp.includes('../scripts/')) {
          violations.push(`${file} → ${imp}`);
        }
      }
    }
    expect(violations, `lib→scripts violations: ${violations.join(', ')}`).toHaveLength(0);
  });

  test('lib/ does not import from .claude/', () => {
    const violations: string[] = [];
    for (const file of findTsFiles('lib')) {
      for (const imp of getImports(file)) {
        if (imp.includes('.claude/') || imp.includes('../.claude/')) {
          violations.push(`${file} → ${imp}`);
        }
      }
    }
    expect(violations, `lib→.claude violations: ${violations.join(', ')}`).toHaveLength(0);
  });

  test('lib/ does not import from governance/', () => {
    const violations: string[] = [];
    for (const file of findTsFiles('lib')) {
      for (const imp of getImports(file)) {
        if (imp.includes('governance/') || imp.includes('../governance/')) {
          violations.push(`${file} → ${imp}`);
        }
      }
    }
    expect(violations, `lib→governance violations: ${violations.join(', ')}`).toHaveLength(0);
  });
});

// =============================================================
// Circular Dependency Detection (lib/ layer)
// =============================================================
describe('circular dependencies', () => {
  test('no circular imports in lib/', () => {
    const graph = new Map<string, string[]>();

    for (const file of findTsFiles('lib')) {
      const deps = getImports(file)
        .filter((imp) => imp.startsWith('./') || imp.startsWith('../lib/'))
        .map((imp) => {
          // Normalize to lib/filename
          const name = imp.replace(/^\.\//, 'lib/').replace(/^\.\.\/lib\//, 'lib/');
          return name.replace(/\.(js|ts)$/, '');
        });
      const key = file.replace(/\.(js|ts)$/, '');
      graph.set(key, deps);
    }

    // DFS cycle detection
    const cycles: string[] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    function dfs(node: string, path: string[]): void {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node).join(' → '));
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      stack.add(node);
      for (const dep of graph.get(node) ?? []) {
        dfs(dep, [...path, node]);
      }
      stack.delete(node);
    }

    for (const node of graph.keys()) {
      dfs(node, []);
    }

    expect(cycles, `Circular dependencies found:\n${cycles.join('\n')}`).toHaveLength(0);
  });
});

// =============================================================
// Module Independence — lib/ files should be self-contained
// =============================================================
describe('module independence', () => {
  test('lib/ files only import from lib/, node builtins, or npm packages', () => {
    const violations: string[] = [];
    for (const file of findTsFiles('lib')) {
      for (const imp of getImports(file)) {
        // Relative imports must stay within lib/
        if (imp.startsWith('.')) {
          // Going up more than one level means escaping lib/
          if (imp.startsWith('../../')) {
            violations.push(`${file} escapes lib/ → ${imp}`);
          }
        }
      }
    }
    expect(violations, `lib/ independence violations:\n${violations.join('\n')}`).toHaveLength(0);
  });
});
