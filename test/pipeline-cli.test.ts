import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/pipeline/pipeline-run.mjs';
let TMP: string;

function run(argv: string): { code: number; stdout: string } {
  try {
    const stdout = execSync(`npx tsx "${SCRIPT}" ${argv} --root="${TMP}"`, {
      cwd: REPO_ROOT, encoding: 'utf-8', shell: '/bin/bash',
    });
    return { code: 0, stdout };
  } catch (e: any) {
    return { code: e.status ?? -1, stdout: e.stdout?.toString() ?? '' };
  }
}

describe('pipeline-run.mjs e2e (격리 root)', () => {
  beforeAll(() => { TMP = mkdtempSync(path.join(tmpdir(), 'pipe-cli-')); });
  afterAll(() => { rmSync(TMP, { recursive: true, force: true }); });

  it('캠페인이 자율 dry-run으로 9단계 완주 (터치포인트 2회 자동승인)', () => {
    expect(run('new --slug=2026-06-13-cli-test --title="cli smoke test"').code).toBe(0);
    const r = run('run 2026-06-13-cli-test --auto --simulate --yes');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('완주');
    // 산출물 검증
    expect(existsSync(path.join(TMP, '.context/campaigns/2026-06-13-cli-test/DEBRIEF.md'))).toBe(true);
    expect(existsSync(path.join(TMP, 'content/social/2026-06-13-cli-test/post.md'))).toBe(true);
    const log = readFileSync(path.join(TMP, 'content/publish-log.md'), 'utf-8');
    expect(log).toContain('2026-06-13-cli-test');
    // Axis 3: Cortex 지식 캡처
    expect(existsSync(path.join(TMP, '.context/loop/campaign-knowledge.jsonl'))).toBe(true);
    // pipeline_stage 분석 이벤트 축적
    const analytics = readFileSync(path.join(TMP, '.context/analytics.jsonl'), 'utf-8');
    expect(analytics.split('\n').filter(l => l.includes('pipeline_stage')).length).toBeGreaterThan(5);
  });

  it('복리 루프: 2번째 캠페인이 1번째 lesson 자동 주입', () => {
    run('new --slug=2026-06-14-cli-second --title="cli smoke retro"');
    const m = JSON.parse(readFileSync(path.join(TMP, '.context/campaigns/2026-06-14-cli-second/campaign.json'), 'utf-8'));
    expect(m.knowledge.lessons.length).toBeGreaterThan(0);
    expect(m.knowledge.lessons[0].source).toContain('2026-06-13-cli-test');
  });
});
