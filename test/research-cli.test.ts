import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO, 'scripts', 'research', 'research.mjs');

function run(args: string[], opts: { expectFail?: boolean } = {}): { out: string; code: number } {
  try {
    const out = execFileSync('npx', ['tsx', CLI, ...args], { encoding: 'utf-8', cwd: REPO });
    return { out, code: 0 };
  } catch (e: any) {
    if (!opts.expectFail) throw e;
    return { out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1 };
  }
}

describe('research CLI — 인자/키 가드', () => {
  it('--q 없으면 exit 2', () => {
    const r = run([], { expectFail: true });
    expect(r.code).toBe(2);
    expect(r.out).toContain('Usage');
  });
});

describe('★ research CLI — 복리 루프 실증 (dry-run, 키 불필요)', () => {
  it('연속 2회 검색: 2차가 1차 적립을 회상해 개인화에 활용 + memory.jsonl 축적', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'research-cli-'));
    try {
      // 1차: 맥락 없음
      const r1 = run(['--q=Cloudflare D1 FTS5 검색 최적화', '--dry-run', `--root=${root}`, '--json']);
      const j1 = JSON.parse(r1.out);
      expect(j1.contextUsed.priorFindings).toBe(0);
      expect(j1.deposited).not.toBeNull();

      // 2차: 1차와 연관 → 복리 작동
      const r2 = run(['--q=D1 검색 인덱스 어떻게 만드나', '--dry-run', `--root=${root}`, '--json']);
      const j2 = JSON.parse(r2.out);
      expect(j2.contextUsed.priorFindings).toBeGreaterThanOrEqual(1);    // ← 복리
      // 1차에서 추출된 엔티티가 2차 재구성 질의에 주입됨
      expect(j2.reformulated).not.toBe('D1 검색 인덱스 어떻게 만드나');
      expect(j2.reformulated.toLowerCase()).toContain('cloudflare');

      // 로컬 메모리에 2건 적립
      const memPath = path.join(root, '.context', 'research', 'memory.jsonl');
      expect(existsSync(memPath)).toBe(true);
      expect(readFileSync(memPath, 'utf-8').trim().split('\n')).toHaveLength(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('무관한 2차 검색은 1차를 끌어오지 않음', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'research-cli-'));
    try {
      run(['--q=Cloudflare D1 검색', '--dry-run', `--root=${root}`, '--json']);
      const r2 = run(['--q=스쿼트 운동 자세 교정 방법', '--dry-run', `--root=${root}`, '--json']);
      expect(JSON.parse(r2.out).contextUsed.priorFindings).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
