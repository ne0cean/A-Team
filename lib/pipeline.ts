/**
 * Campaign Pipeline — E2E 마케팅 사이클 오케스트레이션 코어
 *
 * brief → (승인1) → plan → produce → qa → (승인2) → publish → measure → feedback
 * 인간 터치포인트는 정확히 2개 (touchpoint: true 단계). validateManifest가 기계 검증.
 *
 * 순수 로직만 — fs/glob 접근은 GateContext 주입 (테스트 격리 + coverage).
 * 상태 머신은 lib/state-machine.ts StateMachine 재사용, 전이 테이블만 정의.
 *
 * CLI: scripts/pipeline/pipeline-run.mjs
 */

import { StateMachine } from './state-machine.js';
import type { Transition, SendResult } from './state-machine.js';

// --- Types ---

export type StageStatus =
  | 'pending'
  | 'running'
  | 'awaiting_agent'
  | 'awaiting_approval'
  | 'done'
  | 'blocked';

export type StageExecutor = 'claude' | 'script' | 'human_approval';

export type GateType = 'outputs_exist' | 'design_score' | 'markers_filled' | 'publish_logged';

export interface GateDef {
  type: GateType;
  min?: number;          // design_score: 최소 점수
  pattern?: string;      // markers_filled: 잔존 시 fail 처리할 정규식
  log_path?: string;     // publish_logged: 로그 파일 경로 (기본 content/publish-log.md)
}

export interface GateResult {
  type: GateType;
  passed: boolean;
  detail: string;
}

export interface StageDef {
  name: string;
  status: StageStatus;
  executor: StageExecutor;
  command: string | null;     // claude 단계: WORKORDER에 들어갈 커맨드
  script: string[] | null;    // script 단계: spawn argv
  outputs: string[];          // 산출물 경로 (glob 허용)
  gates: GateDef[];
  touchpoint: boolean;        // 인간 승인 단계 (캠페인당 정확히 2개)
  approval: { approved_at: string; by: string } | null;
  gate_results: GateResult[];
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  attempts: number;
  max_attempts: number;
  capability_path: string | null;  // friction-log 매핑용
}

export interface HistoryEntry {
  ts: string;
  stage: string;
  from: string;
  to: string;
  event: string;
}

export interface KnowledgeLesson {
  source: string;
  text: string;
}

export interface CampaignManifest {
  $schema: 'campaign-manifest-v1';
  slug: string;
  title: string;
  created_at: string;
  mode: 'dry-run' | 'live';
  current_stage: string;       // 캐시 — computeCurrentStage()와 일치해야 함
  knowledge: { lessons: KnowledgeLesson[]; benchmark_ref?: string };
  stages: StageDef[];
  history: HistoryEntry[];
}

// --- Stage-level FSM transition table ---

export const PIPELINE_TRANSITIONS: Transition[] = [
  { from: 'pending', event: 'START', to: 'running', guard: 'prevStageDone', actions: ['recordStart'] },
  { from: 'pending', event: 'REQUEST_APPROVAL', to: 'awaiting_approval', guard: 'prevStageDone', actions: ['recordStart'] },
  { from: 'awaiting_approval', event: 'APPROVE', to: 'done', guard: null, actions: ['recordApproval', 'recordEnd'] },
  { from: 'awaiting_approval', event: 'REJECT', to: 'blocked', guard: null, actions: ['recordEnd'] },
  { from: 'running', event: 'HANDOFF', to: 'awaiting_agent', guard: null, actions: [] },
  { from: 'awaiting_agent', event: 'AGENT_DONE', to: 'running', guard: null, actions: [] },
  { from: 'running', event: 'GATES_PASS', to: 'done', guard: 'allGatesPass', actions: ['recordEnd'] },
  { from: 'running', event: 'GATES_FAIL', to: 'blocked', guard: null, actions: ['recordEnd'] },
  { from: 'blocked', event: 'RETRY', to: 'pending', guard: 'underMaxAttempts', actions: ['recordRetry'] },
  { from: '*', event: 'RESET', to: 'pending', guard: null, actions: ['clearStage'] },
];

const VALID_STATUSES: StageStatus[] = [
  'pending', 'running', 'awaiting_agent', 'awaiting_approval', 'done', 'blocked',
];
const VALID_EXECUTORS: StageExecutor[] = ['claude', 'script', 'human_approval'];
const SLUG_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$/;

// --- Default 9-stage template ---

function stage(partial: Partial<StageDef> & { name: string; executor: StageExecutor }): StageDef {
  return {
    status: 'pending',
    command: null,
    script: null,
    outputs: [],
    gates: [],
    touchpoint: false,
    approval: null,
    gate_results: [],
    started_at: null,
    ended_at: null,
    duration_sec: null,
    attempts: 0,
    max_attempts: 3,
    capability_path: null,
    ...partial,
  };
}

/** 캠페인 기본 9단계 (터치포인트 2개 포함). 경로는 slug 기준으로 생성. */
export function defaultStages(slug: string): StageDef[] {
  return [
    stage({
      name: 'brief', executor: 'claude', command: '/intel brief',
      outputs: [`.context/campaigns/${slug}/BRIEF.md`],
      gates: [{ type: 'outputs_exist' }],
      capability_path: 'intelligence.competitor-analysis',
    }),
    stage({
      name: 'brief_approval', executor: 'human_approval', touchpoint: true,
    }),
    stage({
      name: 'plan', executor: 'claude', command: '/marketing (채널 플랜)',
      outputs: [`.context/campaigns/${slug}/PLAN.md`],
      gates: [{ type: 'outputs_exist' }],
      capability_path: 'marketing.brand-strategy',
    }),
    stage({
      name: 'produce', executor: 'claude',
      command: '/marketing-generate + /marketing-social',
      outputs: [`content/social/${slug}/*.md`],
      gates: [
        { type: 'outputs_exist' },
        { type: 'markers_filled', pattern: '\\[HUMAN INSERT\\]' },
      ],
      capability_path: 'marketing.content-creation',
    }),
    stage({
      name: 'qa', executor: 'script',
      script: ['node', 'scripts/pipeline/pipeline-qa.mjs'],
      outputs: [`.context/campaigns/${slug}/qa-result.json`],
      gates: [{ type: 'outputs_exist' }, { type: 'design_score', min: 70 }],
      capability_path: 'design.audit',
    }),
    stage({
      name: 'publish_approval', executor: 'human_approval', touchpoint: true,
    }),
    stage({
      name: 'publish', executor: 'script',
      script: ['node', 'scripts/pipeline/pipeline-publish.mjs'],
      outputs: [],
      gates: [{ type: 'publish_logged' }],
      capability_path: 'marketing.publishing',
    }),
    stage({
      name: 'measure', executor: 'script',
      script: ['node', 'scripts/pipeline/pipeline-measure.mjs'],
      outputs: [`content/analytics/${slug}-measure.md`],
      gates: [{ type: 'outputs_exist' }],
      capability_path: 'marketing.performance-marketing',
    }),
    stage({
      name: 'feedback', executor: 'script',
      script: ['node', 'scripts/pipeline/campaign-debrief.mjs'],
      outputs: [`.context/campaigns/${slug}/DEBRIEF.md`],
      gates: [{ type: 'outputs_exist' }],
      capability_path: null,
    }),
  ];
}

/** 신규 캠페인 매니페스트 생성 (지식 주입은 campaign-new.mjs가 채움). */
export function createManifest(opts: {
  slug: string;
  title: string;
  created_at: string;
  mode?: 'dry-run' | 'live';
}): CampaignManifest {
  return {
    $schema: 'campaign-manifest-v1',
    slug: opts.slug,
    title: opts.title,
    created_at: opts.created_at,
    mode: opts.mode ?? 'dry-run',
    current_stage: 'brief',
    knowledge: { lessons: [] },
    stages: defaultStages(opts.slug),
    history: [],
  };
}

// --- Validation ---

export function computeCurrentStage(m: CampaignManifest): string {
  const next = m.stages.find(s => s.status !== 'done');
  return next ? next.name : 'complete';
}

export function validateManifest(m: CampaignManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (m.$schema !== 'campaign-manifest-v1') errors.push(`$schema must be 'campaign-manifest-v1', got '${m.$schema}'`);
  if (!SLUG_RE.test(m.slug ?? '')) errors.push(`slug must match YYYY-MM-DD-kebab-case, got '${m.slug}'`);
  if (m.mode !== 'dry-run' && m.mode !== 'live') errors.push(`mode must be 'dry-run'|'live', got '${m.mode}'`);
  if (!Array.isArray(m.stages) || m.stages.length === 0) {
    errors.push('stages must be a non-empty array');
    return { valid: false, errors };
  }

  const names = new Set<string>();
  let touchpoints = 0;
  for (const s of m.stages) {
    if (names.has(s.name)) errors.push(`duplicate stage name '${s.name}'`);
    names.add(s.name);
    if (!VALID_STATUSES.includes(s.status)) errors.push(`stage '${s.name}': invalid status '${s.status}'`);
    if (!VALID_EXECUTORS.includes(s.executor)) errors.push(`stage '${s.name}': invalid executor '${s.executor}'`);
    if (s.touchpoint) {
      touchpoints++;
      if (s.executor !== 'human_approval') errors.push(`stage '${s.name}': touchpoint must have executor 'human_approval'`);
    }
    if (s.executor === 'human_approval' && !s.touchpoint) {
      errors.push(`stage '${s.name}': human_approval executor must be a touchpoint`);
    }
    if (s.executor === 'script' && s.status !== 'done' && (!s.script || s.script.length === 0)) {
      errors.push(`stage '${s.name}': script executor requires script argv`);
    }
  }
  if (touchpoints !== 2) errors.push(`exactly 2 touchpoints required (방향 설정 + 발행 승인), got ${touchpoints}`);

  const expected = computeCurrentStage(m);
  if (m.current_stage !== expected) {
    errors.push(`current_stage cache mismatch: '${m.current_stage}' (expected '${expected}')`);
  }

  return { valid: errors.length === 0, errors };
}

// --- Next actionable step ---

export type NextAction =
  | { kind: 'complete' }
  | { kind: 'blocked'; stage: StageDef }
  | { kind: 'await_agent'; stage: StageDef }
  | { kind: 'await_approval'; stage: StageDef }
  | { kind: 'request_approval'; stage: StageDef }
  | { kind: 'run_script'; stage: StageDef }
  | { kind: 'write_work_order'; stage: StageDef };

export function nextActionable(m: CampaignManifest): NextAction {
  const s = m.stages.find(st => st.status !== 'done');
  if (!s) return { kind: 'complete' };

  switch (s.status) {
    case 'blocked': return { kind: 'blocked', stage: s };
    case 'awaiting_agent': return { kind: 'await_agent', stage: s };
    case 'awaiting_approval': return { kind: 'await_approval', stage: s };
    case 'pending':
    case 'running':
      if (s.executor === 'human_approval') {
        return s.status === 'pending'
          ? { kind: 'request_approval', stage: s }
          : { kind: 'await_approval', stage: s };
      }
      return s.executor === 'script'
        ? { kind: 'run_script', stage: s }
        : { kind: 'write_work_order', stage: s };
  }
}

// --- Gate evaluation (fs는 ctx 주입) ---

export interface GateContext {
  /** glob/경로 → 존재하는 파일 경로 목록 */
  expand(pattern: string): string[];
  /** 파일 내용 (없으면 null) */
  readFile(path: string): string | null;
}

export function evaluateGates(stageDef: StageDef, ctx: GateContext, slug: string): GateResult[] {
  return stageDef.gates.map(gate => {
    switch (gate.type) {
      case 'outputs_exist': {
        const missing = stageDef.outputs.filter(o => ctx.expand(o).length === 0);
        return {
          type: gate.type,
          passed: missing.length === 0,
          detail: missing.length === 0
            ? `${stageDef.outputs.length} output(s) exist`
            : `missing: ${missing.join(', ')}`,
        };
      }
      case 'markers_filled': {
        const re = new RegExp(gate.pattern ?? '\\[HUMAN INSERT\\]');
        const files = stageDef.outputs.flatMap(o => ctx.expand(o));
        const offenders = files.filter(f => {
          const content = ctx.readFile(f);
          return content !== null && re.test(content);
        });
        return {
          type: gate.type,
          passed: offenders.length === 0,
          detail: offenders.length === 0
            ? 'no unfilled markers'
            : `marker remains in: ${offenders.join(', ')}`,
        };
      }
      case 'design_score': {
        const min = gate.min ?? 70;
        const files = stageDef.outputs.flatMap(o => ctx.expand(o));
        const raw = files.length > 0 ? ctx.readFile(files[0]) : null;
        if (raw === null) {
          return { type: gate.type, passed: false, detail: 'qa result file missing' };
        }
        try {
          const parsed = JSON.parse(raw) as { all_passed?: boolean; files?: Array<{ score?: number }> };
          const scores = (parsed.files ?? []).map(f => f.score ?? 0);
          const minScore = scores.length ? Math.min(...scores) : 0;
          const passed = parsed.all_passed === true && minScore >= min;
          return {
            type: gate.type,
            passed,
            detail: `min score ${minScore} (threshold ${min}), all_passed=${parsed.all_passed === true}`,
          };
        } catch {
          return { type: gate.type, passed: false, detail: 'qa result is not valid JSON' };
        }
      }
      case 'publish_logged': {
        const logPath = gate.log_path ?? 'content/publish-log.md';
        const content = ctx.readFile(logPath);
        const passed = content !== null && content.includes(slug);
        return {
          type: gate.type,
          passed,
          detail: passed ? `slug '${slug}' found in ${logPath}` : `slug '${slug}' not in ${logPath}`,
        };
      }
    }
  });
}

// --- Transition application (불변 갱신 + history) ---

export interface TransitionOpts {
  now: string;            // ISO timestamp (주입 — Date.now 직접 호출 금지)
  by?: string;            // APPROVE 주체
  gateResults?: GateResult[];  // GATES_PASS/FAIL 시 기록
}

export function applyTransition(
  m: CampaignManifest,
  stageName: string,
  event: string,
  opts: TransitionOpts,
): { manifest: CampaignManifest; result: SendResult } {
  const idx = m.stages.findIndex(s => s.name === stageName);
  if (idx === -1) {
    return {
      manifest: m,
      result: { success: false, from: '?', to: '?', event, actions: [], reason: `unknown stage '${stageName}'` },
    };
  }
  const target = m.stages[idx];

  const machine = new StateMachine(PIPELINE_TRANSITIONS, target.status, {
    guards: {
      prevStageDone: () => m.stages.slice(0, idx).every(s => s.status === 'done'),
      allGatesPass: () => {
        const results = opts.gateResults ?? target.gate_results;
        return results.length === target.gates.length && results.every(r => r.passed);
      },
      underMaxAttempts: () => target.attempts < target.max_attempts,
    },
  });

  const result = machine.send(event);
  if (!result.success) return { manifest: m, result };

  const next: StageDef = { ...target, status: result.to as StageStatus };
  for (const action of result.actions) {
    switch (action) {
      case 'recordStart':
        next.started_at = opts.now;
        break;
      case 'recordEnd': {
        next.ended_at = opts.now;
        if (next.started_at) {
          next.duration_sec = Math.max(0,
            Math.round((Date.parse(opts.now) - Date.parse(next.started_at)) / 1000));
        }
        if (opts.gateResults) next.gate_results = opts.gateResults;
        break;
      }
      case 'recordApproval':
        next.approval = { approved_at: opts.now, by: opts.by ?? 'user' };
        break;
      case 'recordRetry':
        next.attempts = target.attempts + 1;
        next.gate_results = [];
        next.started_at = null;
        next.ended_at = null;
        next.duration_sec = null;
        break;
      case 'clearStage':
        next.gate_results = [];
        next.approval = null;
        next.started_at = null;
        next.ended_at = null;
        next.duration_sec = null;
        break;
    }
  }

  const stages = m.stages.map((s, i) => (i === idx ? next : s));
  const manifest: CampaignManifest = {
    ...m,
    stages,
    history: [
      ...m.history,
      { ts: opts.now, stage: stageName, from: result.from, to: result.to, event },
    ],
  };
  manifest.current_stage = computeCurrentStage(manifest);
  return { manifest, result };
}

// --- Work order (Claude 핸드오프 — /zzz RESUME.md 패턴) ---

export function buildWorkOrder(m: CampaignManifest, stageDef: StageDef): string {
  const lessons = m.knowledge.lessons.length
    ? m.knowledge.lessons.map(l => `- ${l.text} _(${l.source})_`).join('\n')
    : '- (관련 lesson 없음)';
  const outputs = stageDef.outputs.length
    ? stageDef.outputs.map(o => `- \`${o}\``).join('\n')
    : '- (산출물 경로 없음)';
  const gates = stageDef.gates.length
    ? stageDef.gates.map(g => `- ${g.type}${g.min !== undefined ? ` (min ${g.min})` : ''}${g.pattern ? ` (pattern: ${g.pattern})` : ''}`).join('\n')
    : '- (게이트 없음)';

  return `---
campaign: ${m.slug}
stage: ${stageDef.name}
mode: ${m.mode}
status: awaiting_agent
---

# WORKORDER — ${m.title} / ${stageDef.name}

## 지시
${stageDef.command ?? '(커맨드 미지정 — 단계 설명 참조)'}

## 산출물 (전부 생성해야 게이트 통과)
${outputs}

## 게이트
${gates}

## 주입된 지식 (과거 캠페인 lessons)
${lessons}

## 완료 시 실행
\`\`\`bash
node scripts/pipeline/pipeline-run.mjs complete ${stageDef.name} --campaign=${m.slug}
\`\`\`
게이트 실패 시 산출물 보완 후 재실행. blocked가 되면 \`retry ${stageDef.name}\`.
`;
}

// --- Measure adapter interface (외부 API는 스텁) ---

export interface MetricRow {
  platform: string;
  metric: string;
  value: number | string;
}

export interface MeasureAdapter {
  name: string;
  available(): boolean;
  fetch(slug: string): MetricRow[];
}
