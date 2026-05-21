import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { auditSpec } from '../scripts/ppt/benchmark-audit.mjs';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ppt', 'benchmark-audit.mjs');

describe('ppt benchmark audit', () => {
  it('penalizes generic titles, placeholders, and bloated big numbers', () => {
    const report = auditSpec({
      slides: [
        { layout: 'cover', headline: 'AI SaaS 시장 진출 전략' },
        { layout: 'section_break', headline: '기회 & 문제' },
        { layout: 'big_number', headline: 'AI SaaS 시장 진출 전략 — 시장 기회', number: 'TAM 4.2B, SAM 820M, MRR 50K, CAC 120, LTV 2400' },
        { layout: 'stats_grid', headline: 'AI SaaS 시장 진출 전략 — 핵심 지표', stats: [{ value: '[DATA]' }] },
        { layout: 'quote', quote: '성공은 데이터 기반 의사결정에서 시작된다.' },
        { layout: 'closing', headline: '질문 및 토론' }
      ]
    });

    expect(report.score).toBeLessThan(70);
    expect(report.findings.some(finding => finding.rule === 'weak_action_titles')).toBe(true);
    expect(report.findings.some(finding => finding.rule === 'unresolved_placeholders')).toBe(true);
    expect(report.findings.some(finding => finding.rule === 'bloated_big_number')).toBe(true);
  });

  it('passes a consulting-style evidence-led spec', () => {
    const report = auditSpec({
      slides: [
        { layout: 'cover', headline: 'Market entry strategy' },
        { layout: 'bar_chart', headline: 'Focused enterprise segments increase first-year ARR by 42%', source: 'Source: internal analysis', data: [1, 2] },
        { layout: 'matrix', headline: 'Prioritizing regulated workflows reduces CAC payback risk', source: 'Source: customer interviews' },
        { layout: 'waterfall', headline: 'Three pricing levers improve gross margin to target range', source: 'Source: finance model' },
        { layout: 'timeline', headline: 'Sequenced launch enables sales learning before scale-up', source: 'Source: implementation plan' },
        { layout: 'comparison', headline: 'Separating platform and service revenue improves investor clarity', source: 'Source: benchmark analysis' },
        { layout: 'closing', headline: 'Decision required' }
      ]
    });

    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.findings).toEqual([]);
  });

  it('returns non-zero CLI exit under threshold', () => {
    const spec = path.join(REPO_ROOT, 'content', 'ppt', '2026-05-16-AI-SaaS-시장-진출-전략', 'spec.json');
    try {
      execFileSync('node', [SCRIPT, spec, '--json', '--threshold', '70'], {
        cwd: REPO_ROOT,
        encoding: 'utf8'
      });
      throw new Error('expected benchmark audit to fail');
    } catch (error: any) {
      expect(error.status).toBe(1);
      const report = JSON.parse(error.stdout.toString());
      expect(report.findings.some((finding: any) => finding.rule === 'unresolved_placeholders')).toBe(true);
    }
  });

  it('server build_spec produces a benchmark-passable consulting narrative', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'ppt-benchmark-server-'));
    const specPath = path.join(tmp, 'spec.json');
    const code = `
import json, sys
sys.path.insert(0, 'scripts/ppt')
import server
spec = server.build_spec({
  'topic': 'AI SaaS 시장 진출 전략',
  'ptype': '설득형',
  'audience': '투자자',
  'data': 'TAM 4.2B, SAM 820M, 목표 점유율 3%, MRR 0에서 50K 12개월, CAC 120, LTV 2400, Churn 3.2%',
  'slides': 10,
  'theme': 'consulting_mckinsey'
})
print(json.dumps(spec, ensure_ascii=False))
`;
    try {
      const specJson = execFileSync('python3', ['-c', code], {
        cwd: REPO_ROOT,
        encoding: 'utf8'
      });
      writeFileSync(specPath, specJson);
      const stdout = execFileSync('node', [SCRIPT, specPath, '--json', '--threshold', '70'], {
        cwd: REPO_ROOT,
        encoding: 'utf8'
      });
      const report = JSON.parse(stdout);
      expect(report.score).toBeGreaterThanOrEqual(70);
      expect(report.summary.placeholderSlides).toBe(0);
      expect(report.summary.evidenceRatio).toBeGreaterThanOrEqual(0.45);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
