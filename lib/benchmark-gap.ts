/**
 * Benchmark Gap — "enterprise replacement" 정량화 (순수 로직)
 *
 * pipeline_stage 분석 이벤트(파이프라인이 자동 축적)에서 stage별 실측치를 계산하고
 * lib/enterprise-benchmark.json 기준선과 비교해 갭(배율)을 산출한다.
 *
 * 데이터 없는 stage는 "no data (N=0)" — 추측 금지.
 */

export interface StageBenchmark {
  enterprise: { speed_hours: number; quality_score: number; cost_usd: number };
  ateam_target: { speed_hours: number; quality_score: number; cost_usd: number };
  assumptions: string;
}

export interface EnterpriseBenchmark {
  stages: Record<string, StageBenchmark>;
}

export interface StageEvent {
  event?: string;
  stage?: string;
  transitionEvent?: string;
  duration_sec?: number;
  designScore?: number;
}

export interface GapRow {
  stage: string;
  n: number;                       // 표본 수 (done 전이 수)
  actual_speed_hours: number | null;
  target_speed_hours: number;
  enterprise_speed_hours: number;
  speedup_vs_enterprise: number | null;  // enterprise_hours / actual_hours
  hit_target: boolean | null;      // actual ≤ target?
}

export interface GapReport {
  ts: string;
  rows: GapRow[];
  totals: {
    enterprise_speed_hours: number;
    target_speed_hours: number;
    actual_speed_hours: number | null;
    enterprise_cost_usd: number;
    target_cost_usd: number;
    measured_stages: number;
  };
}

/**
 * stage별 done 전이의 duration 평균(초→시간) 계산.
 * pipeline_stage 이벤트 중 to=done(또는 transitionEvent=GATES_PASS) 만 집계.
 */
export function computeActualSpeeds(events: StageEvent[]): Record<string, { n: number; avg_hours: number }> {
  const byStage: Record<string, number[]> = {};
  for (const e of events) {
    if (e.event !== 'pipeline_stage') continue;
    if (typeof e.duration_sec !== 'number' || e.duration_sec <= 0) continue;
    (byStage[e.stage ?? '?'] ??= []).push(e.duration_sec);
  }
  const out: Record<string, { n: number; avg_hours: number }> = {};
  for (const [stage, durs] of Object.entries(byStage)) {
    const avgSec = durs.reduce((a, b) => a + b, 0) / durs.length;
    out[stage] = { n: durs.length, avg_hours: avgSec / 3600 };
  }
  return out;
}

export function computeGap(bench: EnterpriseBenchmark, events: StageEvent[], now: string): GapReport {
  const actual = computeActualSpeeds(events);
  const rows: GapRow[] = [];
  let entSum = 0, tgtSum = 0, actSum = 0, actCount = 0;
  let entCost = 0, tgtCost = 0, measured = 0;

  for (const [stage, b] of Object.entries(bench.stages)) {
    const a = actual[stage];
    const actualHours = a ? a.avg_hours : null;
    entSum += b.enterprise.speed_hours;
    tgtSum += b.ateam_target.speed_hours;
    entCost += b.enterprise.cost_usd;
    tgtCost += b.ateam_target.cost_usd;
    if (actualHours !== null) { actSum += actualHours; actCount++; measured++; }
    rows.push({
      stage,
      n: a?.n ?? 0,
      actual_speed_hours: actualHours,
      target_speed_hours: b.ateam_target.speed_hours,
      enterprise_speed_hours: b.enterprise.speed_hours,
      speedup_vs_enterprise: actualHours && actualHours > 0 ? round1(b.enterprise.speed_hours / actualHours) : null,
      hit_target: actualHours !== null ? actualHours <= b.ateam_target.speed_hours : null,
    });
  }

  return {
    ts: now,
    rows,
    totals: {
      enterprise_speed_hours: round2(entSum),
      target_speed_hours: round2(tgtSum),
      actual_speed_hours: actCount > 0 ? round2(actSum) : null,
      enterprise_cost_usd: entCost,
      target_cost_usd: tgtCost,
      measured_stages: measured,
    },
  };
}

export function renderGapReport(report: GapReport, bench: EnterpriseBenchmark): string {
  const lines = [
    `# Enterprise Replacement — Benchmark Gap (${report.ts.slice(0, 10)})`,
    '',
    '> 대기업 조직 vs A-Team. 실측은 pipeline_stage 이벤트(캠페인 실행 시 자동 축적).',
    '',
    '| 단계 | N | 실측(h) | 목표(h) | 대기업(h) | vs대기업 | 목표달성 |',
    '|------|---|---------|---------|-----------|----------|----------|',
  ];
  for (const r of report.rows) {
    const actual = r.actual_speed_hours !== null ? r.actual_speed_hours.toFixed(3) : `no data (N=0)`;
    const speedup = r.speedup_vs_enterprise !== null ? `×${r.speedup_vs_enterprise}` : '—';
    const hit = r.hit_target === null ? '—' : (r.hit_target ? '✓' : '✗');
    lines.push(`| ${r.stage} | ${r.n} | ${actual} | ${r.target_speed_hours} | ${r.enterprise_speed_hours} | ${speedup} | ${hit} |`);
  }
  const t = report.totals;
  lines.push('');
  lines.push(`**전체**: 대기업 ${t.enterprise_speed_hours}h / 목표 ${t.target_speed_hours}h` +
    (t.actual_speed_hours !== null ? ` / 실측 ${t.actual_speed_hours}h (${t.measured_stages}단계 측정됨)` : ' / 실측 데이터 부족'));
  lines.push(`**비용**: 대기업 $${t.enterprise_cost_usd} → A-Team 목표 $${t.target_cost_usd} ` +
    `(절감 ${t.enterprise_cost_usd > 0 ? Math.round((1 - t.target_cost_usd / t.enterprise_cost_usd) * 100) : 0}%)`);
  lines.push('');
  lines.push('> 측정 단계가 적으면(N=0) 캠페인을 더 돌려 데이터를 쌓을 것. 추측치는 기록하지 않음.');
  return lines.join('\n') + '\n';
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
