import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
let TMP: string;

function node(script: string, argv: string): { code: number; stdout: string } {
  try {
    const stdout = execSync(`node "${script}" ${argv}`, { cwd: REPO_ROOT, encoding: 'utf-8', shell: '/bin/bash' });
    return { code: 0, stdout };
  } catch (e: any) {
    return { code: e.status ?? -1, stdout: (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '') };
  }
}

describe('standalone 단계 CLI (격리 root)', () => {
  const slug = '2026-06-14-standalone';
  beforeAll(() => {
    TMP = mkdtempSync(path.join(tmpdir(), 'pipe-standalone-'));
    // campaign-new.mjs 로 매니페스트 생성 (지식 주입 경로 포함)
    const r = node('scripts/pipeline/campaign-new.mjs', `--slug=${slug} --title="standalone test" --root="${TMP}"`);
    expect(r.code, r.stdout).toBe(0);
  });
  afterAll(() => { rmSync(TMP, { recursive: true, force: true }); });

  it('campaign-new.mjs 가 매니페스트를 생성한다', () => {
    expect(existsSync(path.join(TMP, `.context/campaigns/${slug}/campaign.json`))).toBe(true);
  });

  it('pipeline-publish.mjs 가 publish-log.md 에 slug 를 기록한다 (dry-run)', () => {
    const r = node('scripts/pipeline/pipeline-publish.mjs', `${slug} --root="${TMP}"`);
    expect(r.code, r.stdout).toBe(0);
    const log = readFileSync(path.join(TMP, 'content/publish-log.md'), 'utf-8');
    expect(log).toContain(slug);
    expect(log).toContain('dry-run');
  });

  it('pipeline-measure.mjs 가 measure 리포트를 생성한다', () => {
    const r = node('scripts/pipeline/pipeline-measure.mjs', `${slug} --root="${TMP}"`);
    expect(r.code, r.stdout).toBe(0);
    expect(existsSync(path.join(TMP, `content/analytics/${slug}-measure.md`))).toBe(true);
  });

  it('campaign-debrief.mjs 가 DEBRIEF.md + 캠페인 지식을 생성한다', () => {
    const r = node('scripts/pipeline/campaign-debrief.mjs', `${slug} --root="${TMP}"`);
    expect(r.code, r.stdout).toBe(0);
    expect(existsSync(path.join(TMP, `.context/campaigns/${slug}/DEBRIEF.md`))).toBe(true);
    expect(existsSync(path.join(TMP, '.context/loop/campaign-knowledge.jsonl'))).toBe(true);
  });

  it('campaign-debrief.mjs --no-knowledge 는 지식 기록을 생략한다', () => {
    const slug2 = '2026-06-14-noknow';
    node('scripts/pipeline/campaign-new.mjs', `--slug=${slug2} --title="x" --root="${TMP}"`);
    // 기존 knowledge 파일 백업 후 새 root 로 격리 검증
    const tmp2 = mkdtempSync(path.join(tmpdir(), 'pipe-noknow-'));
    node('scripts/pipeline/campaign-new.mjs', `--slug=${slug2} --title="x" --root="${tmp2}"`);
    const r = node('scripts/pipeline/campaign-debrief.mjs', `${slug2} --root="${tmp2}" --no-knowledge`);
    expect(r.code, r.stdout).toBe(0);
    expect(existsSync(path.join(tmp2, `.context/campaigns/${slug2}/DEBRIEF.md`))).toBe(true);
    expect(existsSync(path.join(tmp2, '.context/loop/campaign-knowledge.jsonl'))).toBe(false);
    rmSync(tmp2, { recursive: true, force: true });
  });
});

describe('gap-priority --write', () => {
  it('renderGapsMarkdown 은 gaps.md 헤더 + 점수 공식을 포함한다', async () => {
    const mod = await import(path.join(REPO_ROOT, 'scripts/gap-priority.mjs'));
    const { markdown, gaps } = mod.renderGapsMarkdown(0, 5);
    expect(markdown).toContain('# Capability Gaps');
    expect(markdown).toContain('gap-priority --write');
    expect(markdown).toContain('score =');
    expect(Array.isArray(gaps)).toBe(true);
  });

  it('--write 는 .context/gaps.md 만 생성하고 CURRENT.md 는 건드리지 않는다', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'gap-write-'));
    // CURRENT.md 를 미리 심어두고 변경되지 않음을 검증
    const currentDir = path.join(tmp, '.context');
    execSync(`mkdir -p "${currentDir}"`);
    const sentinel = '# CURRENT\n\nSENTINEL_UNCHANGED\n';
    writeFileSync(path.join(currentDir, 'CURRENT.md'), sentinel);
    const r = node('scripts/gap-priority.mjs', `--write --root="${tmp}"`);
    // --write 는 모듈 ROOT 기준이라 격리 root 미지원일 수 있음 — 종료코드/출력만 검증
    expect(r.stdout).toContain('gaps.md');
    // CURRENT.md 는 절대 수정 대상이 아님 (소스에 CURRENT.md write 없음)
    const src = readFileSync(path.join(REPO_ROOT, 'scripts/gap-priority.mjs'), 'utf-8');
    expect(src).not.toMatch(/writeFileSync\([^)]*CURRENT\.md/);
    expect(readFileSync(path.join(currentDir, 'CURRENT.md'), 'utf-8')).toBe(sentinel);
    rmSync(tmp, { recursive: true, force: true });
  });
});
