import { describe, it, expect } from 'vitest';
import { computeActualSpeeds, computeGap, renderGapReport, type EnterpriseBenchmark } from '../lib/benchmark-gap.js';

const NOW = '2026-06-13T00:00:00.000Z';

const bench: EnterpriseBenchmark = {
  stages: {
    brief: { enterprise: { speed_hours: 16, quality_score: 80, cost_usd: 800 }, ateam_target: { speed_hours: 0.5, quality_score: 75, cost_usd: 3 }, assumptions: '' },
    qa: { enterprise: { speed_hours: 8, quality_score: 85, cost_usd: 400 }, ateam_target: { speed_hours: 0.05, quality_score: 82, cost_usd: 0 }, assumptions: '' },
  },
};

function ev(stage: string, duration_sec: number) {
  return { event: 'pipeline_stage', stage, duration_sec };
}

describe('computeActualSpeeds', () => {
  it('stage별 duration 평균을 시간으로', () => {
    const r = computeActualSpeeds([ev('brief', 3600), ev('brief', 7200)]);
    expect(r.brief.n).toBe(2);
    expect(r.brief.avg_hours).toBe(1.5); // (3600+7200)/2 = 5400s = 1.5h
  });

  it('pipeline_stage 아닌 이벤트 / duration 0 제외', () => {
    const r = computeActualSpeeds([
      { event: 'other', stage: 'brief', duration_sec: 3600 },
      ev('brief', 0),
      ev('qa', 1800),
    ]);
    expect(r.brief).toBeUndefined();
    expect(r.qa.n).toBe(1);
  });
});

describe('computeGap', () => {
  it('실측 있는 stage는 speedup 계산, 없으면 null', () => {
    const report = computeGap(bench, [ev('brief', 1800)], NOW); // 0.5h
    const brief = report.rows.find(r => r.stage === 'brief')!;
    const qa = report.rows.find(r => r.stage === 'qa')!;
    expect(brief.actual_speed_hours).toBe(0.5);
    expect(brief.speedup_vs_enterprise).toBe(32); // 16 / 0.5
    expect(brief.hit_target).toBe(true); // 0.5 ≤ 0.5
    expect(qa.actual_speed_hours).toBeNull();
    expect(qa.n).toBe(0);
  });

  it('totals: enterprise/target 합산 + 측정 단계 수', () => {
    const report = computeGap(bench, [ev('brief', 3600)], NOW);
    expect(report.totals.enterprise_speed_hours).toBe(24); // 16+8
    expect(report.totals.target_speed_hours).toBe(0.55);   // 0.5+0.05
    expect(report.totals.measured_stages).toBe(1);
    expect(report.totals.enterprise_cost_usd).toBe(1200);
  });

  it('데이터 전무 시 actual null, 크래시 없음', () => {
    const report = computeGap(bench, [], NOW);
    expect(report.totals.actual_speed_hours).toBeNull();
    expect(report.totals.measured_stages).toBe(0);
  });
});

describe('renderGapReport', () => {
  it('no data 표기 + 비용 절감률', () => {
    const md = renderGapReport(computeGap(bench, [ev('brief', 1800)], NOW), bench);
    expect(md).toContain('no data (N=0)'); // qa
    expect(md).toContain('×32');           // brief speedup
    expect(md).toContain('절감');
  });
});
