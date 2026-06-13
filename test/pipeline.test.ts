import { describe, it, expect } from 'vitest';
import {
  createManifest,
  defaultStages,
  validateManifest,
  computeCurrentStage,
  nextActionable,
  evaluateGates,
  applyTransition,
  buildWorkOrder,
  type CampaignManifest,
  type GateContext,
} from '../lib/pipeline.js';

const NOW = '2026-06-13T00:00:00.000Z';
const LATER = '2026-06-13T00:01:00.000Z';

function fresh(): CampaignManifest {
  return createManifest({ slug: '2026-06-13-test-x', title: 'Test', created_at: NOW });
}

// fs 없는 게이트 컨텍스트 mock
function mockCtx(files: Record<string, string>): GateContext {
  return {
    expand: (pattern: string) => {
      // 단순 prefix/glob: '*'는 디렉토리 내 매칭으로 흉내
      if (pattern.includes('*')) {
        const base = pattern.split('*')[0];
        return Object.keys(files).filter(f => f.startsWith(base));
      }
      return files[pattern] !== undefined ? [pattern] : [];
    },
    readFile: (p: string) => (files[p] !== undefined ? files[p] : null),
  };
}

describe('createManifest / defaultStages', () => {
  it('9단계 + 터치포인트 정확히 2개', () => {
    const m = fresh();
    expect(m.stages.length).toBe(9);
    expect(m.stages.filter(s => s.touchpoint).length).toBe(2);
    expect(m.current_stage).toBe('brief');
  });

  it('터치포인트는 human_approval executor', () => {
    const tps = fresh().stages.filter(s => s.touchpoint);
    expect(tps.every(s => s.executor === 'human_approval')).toBe(true);
    expect(tps.map(s => s.name)).toEqual(['brief_approval', 'publish_approval']);
  });
});

describe('validateManifest', () => {
  it('정상 매니페스트 통과', () => {
    expect(validateManifest(fresh()).valid).toBe(true);
  });

  it('터치포인트 3개면 거부', () => {
    const m = fresh();
    m.stages[2].touchpoint = true;
    m.stages[2].executor = 'human_approval';
    const r = validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => /2 touchpoints/.test(e))).toBe(true);
  });

  it('slug 형식 위반 거부', () => {
    const m = fresh();
    m.slug = 'BadSlug';
    expect(validateManifest(m).valid).toBe(false);
  });

  it('current_stage 캐시 불일치 거부', () => {
    const m = fresh();
    m.current_stage = 'publish';
    expect(validateManifest(m).valid).toBe(false);
  });

  it('잘못된 status enum 거부', () => {
    const m = fresh();
    (m.stages[0] as any).status = 'weird';
    expect(validateManifest(m).valid).toBe(false);
  });
});

describe('computeCurrentStage', () => {
  it('전부 done이면 complete', () => {
    const m = fresh();
    m.stages.forEach(s => (s.status = 'done'));
    expect(computeCurrentStage(m)).toBe('complete');
  });
  it('첫 non-done 단계 반환', () => {
    const m = fresh();
    m.stages[0].status = 'done';
    expect(computeCurrentStage(m)).toBe('brief_approval');
  });
});

describe('nextActionable', () => {
  it('빈 캠페인 → brief는 claude executor라 write_work_order', () => {
    expect(nextActionable(fresh()).kind).toBe('write_work_order');
  });

  it('brief done → 승인 단계는 request_approval', () => {
    const m = fresh();
    m.stages[0].status = 'done';
    const a = nextActionable(m);
    expect(a.kind).toBe('request_approval');
  });

  it('qa 단계는 script executor라 run_script', () => {
    const m = fresh();
    for (const name of ['brief', 'brief_approval', 'plan', 'produce']) {
      m.stages.find(s => s.name === name)!.status = 'done';
    }
    expect(nextActionable(m).kind).toBe('run_script');
  });

  it('blocked 단계 감지', () => {
    const m = fresh();
    m.stages[0].status = 'blocked';
    expect(nextActionable(m).kind).toBe('blocked');
  });

  it('전부 done → complete', () => {
    const m = fresh();
    m.stages.forEach(s => (s.status = 'done'));
    expect(nextActionable(m).kind).toBe('complete');
  });
});

describe('evaluateGates', () => {
  const slug = '2026-06-13-test-x';

  it('outputs_exist: 산출물 있으면 통과', () => {
    const stage = defaultStages(slug).find(s => s.name === 'brief')!;
    const ctx = mockCtx({ [`.context/campaigns/${slug}/BRIEF.md`]: '# brief' });
    expect(evaluateGates(stage, ctx, slug)[0].passed).toBe(true);
  });

  it('outputs_exist: 산출물 없으면 실패', () => {
    const stage = defaultStages(slug).find(s => s.name === 'brief')!;
    expect(evaluateGates(stage, mockCtx({}), slug)[0].passed).toBe(false);
  });

  it('markers_filled: [HUMAN INSERT] 잔존 시 실패', () => {
    const stage = defaultStages(slug).find(s => s.name === 'produce')!;
    const path = `content/social/${slug}/post.md`;
    const ctx = mockCtx({ [path]: 'hello [HUMAN INSERT] world' });
    const markerGate = evaluateGates(stage, ctx, slug).find(r => r.type === 'markers_filled')!;
    expect(markerGate.passed).toBe(false);
  });

  it('markers_filled: 마커 없으면 통과', () => {
    const stage = defaultStages(slug).find(s => s.name === 'produce')!;
    const path = `content/social/${slug}/post.md`;
    const ctx = mockCtx({ [path]: 'fully written copy' });
    const markerGate = evaluateGates(stage, ctx, slug).find(r => r.type === 'markers_filled')!;
    expect(markerGate.passed).toBe(true);
  });

  it('design_score: 70 경계값 (69 실패, 70 통과)', () => {
    const stage = defaultStages(slug).find(s => s.name === 'qa')!;
    const path = `.context/campaigns/${slug}/qa-result.json`;
    const fail = mockCtx({ [path]: JSON.stringify({ all_passed: true, files: [{ score: 69 }] }) });
    const pass = mockCtx({ [path]: JSON.stringify({ all_passed: true, files: [{ score: 70 }] }) });
    const g = (ctx: GateContext) => evaluateGates(stage, ctx, slug).find(r => r.type === 'design_score')!;
    expect(g(fail).passed).toBe(false);
    expect(g(pass).passed).toBe(true);
  });

  it('publish_logged: slug 포함 시 통과', () => {
    const stage = defaultStages(slug).find(s => s.name === 'publish')!;
    const ctx = mockCtx({ 'content/publish-log.md': `## entry — ${slug} (dry-run)` });
    expect(evaluateGates(stage, ctx, slug)[0].passed).toBe(true);
  });
});

describe('applyTransition', () => {
  it('pending → START → running, prevStageDone guard 통과(첫 단계)', () => {
    const { manifest, result } = applyTransition(fresh(), 'brief', 'START', { now: NOW });
    expect(result.success).toBe(true);
    expect(manifest.stages[0].status).toBe('running');
    expect(manifest.stages[0].started_at).toBe(NOW);
    expect(manifest.history.length).toBe(1);
  });

  it('prevStageDone guard: 앞 단계 미완료면 plan START 거부', () => {
    const { result } = applyTransition(fresh(), 'plan', 'START', { now: NOW });
    expect(result.success).toBe(false);
  });

  it('GATES_PASS: 게이트 전부 통과 시 done + duration 기록', () => {
    let m = fresh();
    m = applyTransition(m, 'brief', 'START', { now: NOW }).manifest;
    const gateResults = [{ type: 'outputs_exist' as const, passed: true, detail: 'ok' }];
    const { manifest, result } = applyTransition(m, 'brief', 'GATES_PASS', { now: LATER, gateResults });
    expect(result.success).toBe(true);
    expect(manifest.stages[0].status).toBe('done');
    expect(manifest.stages[0].duration_sec).toBe(60);
    expect(manifest.current_stage).toBe('brief_approval');
  });

  it('GATES_PASS guard 실패: 게이트 미통과면 전이 거부', () => {
    let m = fresh();
    m = applyTransition(m, 'brief', 'START', { now: NOW }).manifest;
    const gateResults = [{ type: 'outputs_exist' as const, passed: false, detail: 'missing' }];
    const { result } = applyTransition(m, 'brief', 'GATES_PASS', { now: LATER, gateResults });
    expect(result.success).toBe(false);
  });

  it('GATES_FAIL → blocked, RETRY → pending (attempts 증가)', () => {
    let m = fresh();
    m = applyTransition(m, 'brief', 'START', { now: NOW }).manifest;
    m = applyTransition(m, 'brief', 'GATES_FAIL', { now: LATER }).manifest;
    expect(m.stages[0].status).toBe('blocked');
    const r = applyTransition(m, 'brief', 'RETRY', { now: LATER });
    expect(r.result.success).toBe(true);
    expect(r.manifest.stages[0].status).toBe('pending');
    expect(r.manifest.stages[0].attempts).toBe(1);
  });

  it('max_attempts 초과 시 RETRY 거부', () => {
    let m = fresh();
    m.stages[0].status = 'blocked';
    m.stages[0].attempts = 3;
    const { result } = applyTransition(m, 'brief', 'RETRY', { now: NOW });
    expect(result.success).toBe(false);
  });

  it('승인 단계: REQUEST_APPROVAL → awaiting_approval → APPROVE → done', () => {
    let m = fresh();
    m.stages[0].status = 'done';
    m.current_stage = 'brief_approval';
    m = applyTransition(m, 'brief_approval', 'REQUEST_APPROVAL', { now: NOW }).manifest;
    expect(m.stages[1].status).toBe('awaiting_approval');
    const r = applyTransition(m, 'brief_approval', 'APPROVE', { now: LATER, by: 'noir' });
    expect(r.manifest.stages[1].status).toBe('done');
    expect(r.manifest.stages[1].approval?.by).toBe('noir');
  });

  it('HANDOFF → awaiting_agent → AGENT_DONE → running 왕복', () => {
    let m = fresh();
    m = applyTransition(m, 'brief', 'START', { now: NOW }).manifest;
    m = applyTransition(m, 'brief', 'HANDOFF', { now: NOW }).manifest;
    expect(m.stages[0].status).toBe('awaiting_agent');
    m = applyTransition(m, 'brief', 'AGENT_DONE', { now: NOW }).manifest;
    expect(m.stages[0].status).toBe('running');
  });
});

describe('buildWorkOrder', () => {
  it('frontmatter + complete 명령 포함', () => {
    const m = fresh();
    const wo = buildWorkOrder(m, m.stages[0]);
    expect(wo).toContain('campaign: 2026-06-13-test-x');
    expect(wo).toContain('status: awaiting_agent');
    expect(wo).toContain('pipeline-run.mjs complete brief');
  });

  it('주입된 지식 lessons 렌더', () => {
    const m = fresh();
    m.knowledge.lessons = [{ source: 'campaigns/x/DEBRIEF.md', text: '과거 교훈' }];
    expect(buildWorkOrder(m, m.stages[0])).toContain('과거 교훈');
  });
});
