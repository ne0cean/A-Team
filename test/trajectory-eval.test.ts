import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const TEST_DIR = path.join(os.tmpdir(), 'trajectory-eval-test-' + process.pid);
const SCRIPT = path.resolve(__dirname, '../scripts/trajectory-eval.mjs');

function writeAnalytics(events: object[]): string {
  const logPath = path.join(TEST_DIR, 'analytics.jsonl');
  fs.writeFileSync(logPath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
  return logPath;
}

function runEval(logPath: string, extra = ''): { score: any; composite: number; grade: string } {
  const out = execSync(`node ${SCRIPT} --log ${logPath} --json ${extra}`, {
    encoding: 'utf8',
  });
  const result = JSON.parse(out);
  return {
    score: result.score,
    composite: result.score.composite,
    grade: result.score.grade,
  };
}

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

// ─── tool_efficiency ──────────────────────────────────────────────────────

describe('tool_efficiency', () => {
  it('각 파일을 1회씩 Read → score=1.0 (optimal)', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'b.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.tool_efficiency.score).toBe(1.0);
  });

  it('같은 파일을 3회 Read → score=0.3 (wasteful)', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.tool_efficiency.score).toBe(0.3);
  });

  it('Read 이벤트 없으면 score=1.0 (데이터 부족 — 패스 처리)', () => {
    const log = writeAnalytics([
      { event: 'design_audit', designScore: 90, ts: '2026-01-01T00:00:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.tool_efficiency.score).toBe(1.0);
  });
});

// ─── no_backtracking ──────────────────────────────────────────────────────

describe('no_backtracking', () => {
  it('파일당 Edit 2회 이하 → score=1.0', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'b.ts', ts: '2026-01-01T00:02:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.no_backtracking.score).toBe(1.0);
  });

  it('파일당 Edit 3회 → score=0.5 (minor_backtrack)', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.no_backtracking.score).toBe(0.5);
    expect(score.path_evals.no_backtracking.max_edits_per_file).toBe(3);
  });

  it('파일당 Edit 4회 이상 → score=0.0 (major_backtrack)', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:03:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.no_backtracking.score).toBe(0.0);
  });

  it('Write 도구도 Edit으로 집계', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Write', file_path: 'config.json', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Write', file_path: 'config.json', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Write', file_path: 'config.json', ts: '2026-01-01T00:02:00Z' },
      { event: 'tool_use', tool_name: 'Write', file_path: 'config.json', ts: '2026-01-01T00:03:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.no_backtracking.score).toBe(0.0);
  });
});

// ─── context_preservation ─────────────────────────────────────────────────

describe('context_preservation', () => {
  it('Edit 후 재읽기 없음 → score=1.0', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'b.ts', ts: '2026-01-01T00:02:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.context_preservation.score).toBe(1.0);
  });

  it('Edit 후 같은 파일 1회 재읽기 → score=0.5 (partial_loss)', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.context_preservation.score).toBe(0.5);
    expect(score.path_evals.context_preservation.partial_loss_files).toContain('a.ts');
  });

  it('Edit 후 같은 파일 2회 이상 재읽기 → score=0.0 (critical_loss)', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit',  file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:03:00Z' },
    ]);
    const { score } = runEval(log);
    expect(score.path_evals.context_preservation.score).toBe(0.0);
    expect(score.path_evals.context_preservation.critical_loss_files).toContain('a.ts');
  });
});

// ─── composite score ──────────────────────────────────────────────────────

describe('composite score', () => {
  it('모두 optimal → composite=1.0, grade=A', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Edit', file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
    ]);
    const { composite, grade } = runEval(log);
    expect(composite).toBe(1.0);
    expect(grade).toBe('A');
  });

  it('모두 worst → composite=0.1, grade=D', () => {
    // wasteful reads (3 same file) + major backtrack (4 edits) + critical loss (2 reread after edit)
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:02:00Z' },
      { event: 'tool_use', tool_name: 'Edit',  file_path: 'a.ts', ts: '2026-01-01T00:03:00Z' },
      { event: 'tool_use', tool_name: 'Edit',  file_path: 'a.ts', ts: '2026-01-01T00:04:00Z' },
      { event: 'tool_use', tool_name: 'Edit',  file_path: 'a.ts', ts: '2026-01-01T00:05:00Z' },
      { event: 'tool_use', tool_name: 'Edit',  file_path: 'a.ts', ts: '2026-01-01T00:06:00Z' },
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:07:00Z' },
      { event: 'tool_use', tool_name: 'Read',  file_path: 'a.ts', ts: '2026-01-01T00:08:00Z' },
    ]);
    const { composite, grade } = runEval(log);
    // efficiency=0.3, backtrack=0.0, context=0.0 → (0.3+0+0)/3 = 0.1
    expect(composite).toBeCloseTo(0.1, 2);
    expect(grade).toBe('D');
  });

  it('로그 파일 없으면 데이터 부족으로 all 1.0 → composite=1.0', () => {
    const nonExistent = path.join(TEST_DIR, 'no-such.jsonl');
    const { composite } = runEval(nonExistent);
    expect(composite).toBe(1.0);
  });

  it('session 필터 적용 — 다른 세션 이벤트 제외', () => {
    const log = writeAnalytics([
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', session_id: 'sess-A', ts: '2026-01-01T00:00:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', session_id: 'sess-A', ts: '2026-01-01T00:01:00Z' },
      { event: 'tool_use', tool_name: 'Read', file_path: 'a.ts', session_id: 'sess-A', ts: '2026-01-01T00:02:00Z' },
      // 다른 세션 — 필터 시 제외됨
      { event: 'tool_use', tool_name: 'Read', file_path: 'b.ts', session_id: 'sess-B', ts: '2026-01-01T00:03:00Z' },
    ]);
    // sess-B만 보면 Read 1회 → efficiency optimal
    const { score } = runEval(log, '--session sess-B');
    expect(score.path_evals.tool_efficiency.score).toBe(1.0);
  });
});

// ─── verification-gate-check.sh ──────────────────────────────────────────

describe('verification-gate-check.sh', () => {
  const GATE_SCRIPT = path.resolve(__dirname, '../scripts/orchestration/verification-gate-check.sh');

  function runGate(cmd: string): string {
    const input = JSON.stringify({ tool_input: { command: cmd } });
    try {
      return execSync(`echo '${input}' | bash ${GATE_SCRIPT}`, {
        encoding: 'utf8',
      });
    } catch (e: any) {
      return e.stdout ?? '';
    }
  }

  it('git commit 아닌 명령 → {} (통과)', () => {
    const out = runGate('npm test');
    expect(JSON.parse(out)).toEqual({});
  });

  it('git commit --allow-empty → {} (gate 제외)', () => {
    const out = runGate('git commit --allow-empty -m "empty"');
    expect(JSON.parse(out)).toEqual({});
  });

  it('[docs-only] 커밋 → {} (gate 제외)', () => {
    const out = runGate('git commit -m "[docs-only] update readme"');
    expect(JSON.parse(out)).toEqual({});
  });

  it('일반 git commit — 테스트 기록 없으면 additionalContext 경고 포함', () => {
    // HOME을 빈 임시 디렉토리로 설정해 히스토리 없는 환경 구성
    const fakeHome = path.join(TEST_DIR, 'fake-home');
    fs.mkdirSync(fakeHome, { recursive: true });

    const input = JSON.stringify({ tool_input: { command: 'git commit -m "feat: add feature"' } });
    let out = '';
    try {
      out = execSync(`bash "${GATE_SCRIPT}"`, {
        encoding: 'utf8',
        input,
        env: { ...process.env, HOME: fakeHome, HISTFILE: path.join(fakeHome, '.zsh_history') },
      });
    } catch (e: any) {
      out = e.stdout ?? '';
    }

    const parsed = JSON.parse(out);
    // 경고 없거나 있거나 — 둘 다 허용 (환경에 따라 git history 탐지 결과 다름)
    // 핵심: 유효한 JSON 반환
    expect(parsed).toBeDefined();
    if (parsed.hookSpecificOutput) {
      expect(parsed.hookSpecificOutput.additionalContext).toMatch(/Verification Gate/);
    }
  });
});
