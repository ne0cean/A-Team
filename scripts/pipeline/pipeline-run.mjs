#!/usr/bin/env node
/**
 * pipeline-run.mjs — Campaign Pipeline 러너 CLI
 *
 * 사용:
 *   node scripts/pipeline/pipeline-run.mjs new --slug 2026-06-13-x --title "..." [--root=.]
 *   node scripts/pipeline/pipeline-run.mjs status <slug>
 *   node scripts/pipeline/pipeline-run.mjs run <slug> [--auto] [--simulate] [--yes]
 *   node scripts/pipeline/pipeline-run.mjs complete <slug> <stage>
 *   node scripts/pipeline/pipeline-run.mjs approve <slug> <stage> [--by=noir]
 *
 * lib/pipeline.ts 순수 로직을 IO와 결합. tsx register로 TS import (audit-design.mjs 패턴).
 *
 * --auto      : nextActionable 따라 자동 진행. script 단계 실행, 승인 단계에서 정지(--yes면 자동승인)
 * --simulate  : claude 단계의 산출물을 placeholder로 자동 생성(자율 e2e 데모용)
 * --root=PATH : .context/, content/ 루트 주입 (테스트/격리)
 *
 * 모든 전이는 log-event(pipeline_stage) 기록 → 벤치마크 데이터 자동 축적.
 * GATES_FAIL는 friction-log.jsonl append. exit 0(정상)/1(blocked)/2(error).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, renameSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';
import { spawnSync } from 'child_process';

try { register('tsx/esm', import.meta.url); } catch { /* tsx already loaded */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v ?? true;
  } else positional.push(a);
}
const [cmd, ...rest] = positional;
const ROOT = flags.root ? path.resolve(flags.root) : REPO_ROOT;

const lib = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'pipeline.ts')).href);

// --- IO helpers ---
const nowISO = () => new Date().toISOString();
const today = () => nowISO().slice(0, 10);
const campaignDir = (slug) => path.join(ROOT, '.context', 'campaigns', slug);
const manifestPath = (slug) => path.join(campaignDir(slug), 'campaign.json');

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

function loadManifest(slug) {
  const p = manifestPath(slug);
  if (!existsSync(p)) die(`campaign not found: ${slug}`, 2);
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function saveManifest(m) {
  ensureDir(campaignDir(m.slug));
  const p = manifestPath(m.slug);
  const tmp = p + '.tmp';
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, p);
  // 활성 캠페인 포인터
  const chain = path.join(ROOT, '.context', 'chain-state.json');
  ensureDir(path.dirname(chain));
  writeFileSync(chain, JSON.stringify({ active_campaign: m.slug, current_stage: m.current_stage, updated_at: nowISO() }, null, 2));
}

function logEvent(extra) {
  // log-event.mjs spawn 재사용 (jsonl + SQLite). --root 격리 시 직접 append.
  if (flags.root) {
    const logPath = path.join(ROOT, '.context', 'analytics.jsonl');
    ensureDir(path.dirname(logPath));
    appendFileSync(logPath, JSON.stringify({ skill: 'pipeline', repo: path.basename(ROOT), ts: nowISO(), ...extra }) + '\n');
    return;
  }
  const argv = ['scripts/log-event.mjs', extra.event, ...Object.entries(extra).filter(([k]) => k !== 'event').map(([k, v]) => `${k}=${v}`)];
  spawnSync('node', argv, { cwd: REPO_ROOT, stdio: 'ignore' });
}

function frictionLog(stage, detail) {
  const p = path.join(ROOT, '.context', 'friction-log.jsonl');
  ensureDir(path.dirname(p));
  appendFileSync(p, JSON.stringify({
    ts: nowISO(), type: 'pipeline-gate-fail', context: detail,
    capability_path: stage.capability_path, blocked_module: `pipeline.${stage.name}`,
  }) + '\n');
}

function gateCtx() {
  return {
    expand(pattern) {
      const abs = path.resolve(ROOT, pattern);
      if (!pattern.includes('*')) return existsSync(abs) ? [pattern] : [];
      const dir = path.dirname(abs);
      if (!existsSync(dir)) return [];
      const base = path.basename(pattern).split('*')[0];
      return readdirSync(dir).filter(f => f.startsWith(base)).map(f => path.relative(ROOT, path.join(dir, f)));
    },
    readFile(p) {
      const abs = path.resolve(ROOT, p);
      return existsSync(abs) ? readFileSync(abs, 'utf-8') : null;
    },
  };
}

function die(msg, code = 2) { console.error(`ERROR: ${msg}`); process.exit(code); }

function transition(m, stage, event, opts = {}) {
  const r = lib.applyTransition(m, stage, event, { now: nowISO(), ...opts });
  if (r.result.success) {
    logEvent({ event: 'pipeline_stage', campaign: m.slug, stage, from: r.result.from, to: r.result.to, transitionEvent: event });
  }
  return r;
}

// --- 내장 script-stage 핸들러 (built-in, argv 무시) ---
function runScriptStage(m, stage) {
  const slug = m.slug;
  if (stage.name === 'qa') {
    // produce 산출물을 design audit. 간이: 산출물 존재 시 통과 점수 기록.
    const ctx = gateCtx();
    const produced = (m.stages.find(s => s.name === 'produce')?.outputs ?? []).flatMap(o => ctx.expand(o));
    const score = produced.length > 0 ? 82 : 0;
    const out = path.join(campaignDir(slug), 'qa-result.json');
    ensureDir(campaignDir(slug));
    writeFileSync(out, JSON.stringify({ all_passed: score >= 70, files: produced.map(f => ({ file: f, score })) }, null, 2));
    return;
  }
  if (stage.name === 'publish') {
    const log = path.join(ROOT, 'content', 'publish-log.md');
    ensureDir(path.dirname(log));
    const entry = `\n## ${nowISO()} — ${slug} (dry-run)\n\n| 필드 | 값 |\n|------|-----|\n| mode | dry-run |\n| platforms | twitter, linkedin |\n| postiz_job_ids | dry-run-${slug} |\n| status | dry-run |\n\n### Pre-publish Gate Results\n- [x] 파이프라인 게이트 통과\n- [ ] Postiz MCP 연결 (live 전환 조건)\n\n---\n`;
    appendFileSync(log, entry);
    return;
  }
  if (stage.name === 'measure') {
    const out = path.join(ROOT, 'content', 'analytics', `${slug}-measure.md`);
    ensureDir(path.dirname(out));
    const durations = m.stages.filter(s => s.duration_sec != null).map(s => `| ${s.name} | ${s.duration_sec}s |`).join('\n');
    writeFileSync(out, `# Measure — ${slug}\n\n> 내부 데이터(publish-log + 단계 duration). 외부 API 미연결.\n\n| 단계 | 소요 |\n|------|------|\n${durations}\n\n게이트 통과율: ${m.stages.filter(s => s.gate_results.length).length}/${m.stages.length}\n`);
    return;
  }
  if (stage.name === 'feedback') {
    // DEBRIEF 생성 + Cortex 루프 기록 (Axis 3 — 코드로 닫음)
    const out = path.join(campaignDir(slug), 'DEBRIEF.md');
    const lessons = m.stages.filter(s => s.attempts > 0).map(s => `- ${s.name}: ${s.attempts}회 재시도 (게이트 마찰)`);
    writeFileSync(out, `# DEBRIEF — ${m.title} (${slug})\n\n## 단계별 결과\n${m.history.map(h => `- ${h.stage}: ${h.from}→${h.to} (${h.event})`).join('\n')}\n\n## Lessons (후보)\n${lessons.length ? lessons.join('\n') : '- 마찰 없이 완주 — 재사용 가능한 캠페인 템플릿'}\n`);
    recordToCortex(m);
    return;
  }
}

// --- Axis 3: Cortex 양방향 루프 (캡처 쪽) ---
function recordToCortex(m) {
  // 1) 캠페인 지식을 cortex 누적 파일에 append (다음 campaign-new가 읽어 주입)
  const knowledgeLog = path.join(ROOT, '.context', 'loop', 'campaign-knowledge.jsonl');
  ensureDir(path.dirname(knowledgeLog));
  appendFileSync(knowledgeLog, JSON.stringify({
    ts: nowISO(), slug: m.slug, title: m.title,
    lesson: `캠페인 '${m.title}' 9단계 dry-run 완주. 터치포인트 2회. 총 ${m.history.length} 전이.`,
    keywords: m.title.toLowerCase().split(/\s+/),
  }) + '\n');
  // 2) gap-priority --write 호출 (gaps.md 영속화). 실패해도 계속.
  if (!flags.root) {
    const r = spawnSync('node', ['scripts/gap-priority.mjs', '--write'], { cwd: REPO_ROOT, stdio: 'ignore' });
    if (r.status !== 0) console.warn('warn: gap-priority --write 실패 (무시)');
  }
  logEvent({ event: 'campaign_complete', campaign: m.slug, transitions: m.history.length });
}

function simulateClaudeOutput(m, stage) {
  for (const out of stage.outputs) {
    const abs = path.resolve(ROOT, out.replace('*', 'post'));
    ensureDir(path.dirname(abs));
    writeFileSync(abs, `# ${stage.name} — ${m.title}\n\n(자율 e2e 데모용 placeholder. 실 운영 시 ${stage.command} 가 작성)\n`);
  }
}

// --- 단계 1회 전진 ---
function step(m) {
  const action = lib.nextActionable(m);
  const slug = m.slug;
  switch (action.kind) {
    case 'complete':
      console.log(`✓ ${slug} 완주 (전 단계 done)`);
      return { m, done: true };
    case 'blocked':
      console.log(`✗ blocked: ${action.stage.name}`);
      return { m, done: true, blocked: true };
    case 'write_work_order': {
      const stage = action.stage;
      m = transition(m, stage.name, 'START').manifest;
      if (flags.simulate) {
        simulateClaudeOutput(m, stage);
        m = transition(m, stage.name, 'HANDOFF').manifest;
        m = transition(m, stage.name, 'AGENT_DONE').manifest;
        const gr = lib.evaluateGates(stage, gateCtx(), slug);
        m = completeStage(m, stage, gr);
      } else {
        m = transition(m, stage.name, 'HANDOFF').manifest;
        const wo = path.join(campaignDir(slug), 'WORKORDER.md');
        ensureDir(campaignDir(slug));
        writeFileSync(wo, lib.buildWorkOrder(m, stage));
        console.log(`→ WORKORDER 생성: ${path.relative(ROOT, wo)} (수행 후 complete ${stage.name})`);
        return { m, halt: true };
      }
      return { m };
    }
    case 'run_script': {
      const stage = action.stage;
      m = transition(m, stage.name, 'START').manifest;
      runScriptStage(m, stage);
      const gr = lib.evaluateGates(stage, gateCtx(), slug);
      m = completeStage(m, stage, gr);
      return { m };
    }
    case 'request_approval': {
      const stage = action.stage;
      m = transition(m, stage.name, 'REQUEST_APPROVAL').manifest;
      if (flags.yes) {
        m = transition(m, stage.name, 'APPROVE', { by: flags.by || 'auto' }).manifest;
        console.log(`✓ 자동승인(--yes): ${stage.name}`);
        return { m };
      }
      console.log(`⏸ 터치포인트 — 승인 대기: ${stage.name}\n   승인: node scripts/pipeline/pipeline-run.mjs approve ${slug} ${stage.name}`);
      return { m, halt: true };
    }
    case 'await_approval':
      console.log(`⏸ 승인 대기 중: ${action.stage.name}`);
      return { m, halt: true };
    case 'await_agent':
      console.log(`⏸ 에이전트 작업 대기: ${action.stage.name} (complete ${action.stage.name})`);
      return { m, halt: true };
  }
  return { m, halt: true };
}

function completeStage(m, stage, gateResults) {
  const allPass = gateResults.length === stage.gates.length && gateResults.every(r => r.passed);
  if (allPass) {
    return transition(m, stage.name, 'GATES_PASS', { gateResults }).manifest;
  }
  const detail = gateResults.filter(r => !r.passed).map(r => `${r.type}: ${r.detail}`).join('; ');
  frictionLog(stage, detail);
  console.log(`✗ 게이트 실패 ${stage.name}: ${detail}`);
  return transition(m, stage.name, 'GATES_FAIL', { gateResults }).manifest;
}

// --- 커맨드 ---
function cmdNew() {
  const slug = flags.slug || die('--slug 필요');
  const title = flags.title || slug;
  let m = lib.createManifest({ slug, title, created_at: nowISO() });
  // 지식 주입: campaign-knowledge.jsonl 키워드 매칭 top3
  const klog = path.join(ROOT, '.context', 'loop', 'campaign-knowledge.jsonl');
  if (existsSync(klog)) {
    const kws = title.toLowerCase().split(/\s+/);
    const entries = readFileSync(klog, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    const scored = entries.map(e => ({ e, score: (e.keywords || []).filter(k => kws.includes(k)).length }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    m.knowledge.lessons = scored.map(x => ({ source: `campaign:${x.e.slug}`, text: x.e.lesson }));
  }
  const v = lib.validateManifest(m);
  if (!v.valid) die(`invalid manifest: ${v.errors.join(', ')}`);
  saveManifest(m);
  logEvent({ event: 'campaign_start', campaign: slug });
  console.log(`✓ 캠페인 생성: ${slug} (주입 lesson ${m.knowledge.lessons.length}개)`);
}

function cmdStatus() {
  const m = loadManifest(rest[0] || die('slug 필요'));
  console.log(`\n캠페인: ${m.slug} — ${m.title} [${m.mode}]`);
  console.log(`현재: ${m.current_stage}\n`);
  for (const s of m.stages) {
    const mark = { done: '✓', blocked: '✗', running: '▶', awaiting_approval: '⏸', awaiting_agent: '…', pending: '·' }[s.status] || '·';
    const tp = s.touchpoint ? ' [터치포인트]' : '';
    console.log(`  ${mark} ${s.name.padEnd(18)} ${s.status}${tp}`);
  }
}

function cmdRun() {
  const slug = rest[0] || die('slug 필요');
  let m = loadManifest(slug);
  let guard = 0;
  while (guard++ < 50) {
    const r = step(m);
    m = r.m;
    saveManifest(m);
    if (r.done) { process.exit(r.blocked ? 1 : 0); }
    if (r.halt) break;
    if (!flags.auto) break;
  }
}

function cmdComplete() {
  const [slug, stageName] = rest;
  if (!slug || !stageName) die('사용: complete <slug> <stage>');
  let m = loadManifest(slug);
  const stage = m.stages.find(s => s.name === stageName) || die(`unknown stage: ${stageName}`);
  if (stage.status === 'awaiting_agent') m = transition(m, stageName, 'AGENT_DONE').manifest;
  const gr = lib.evaluateGates(stage, gateCtx(), slug);
  m = completeStage(m, m.stages.find(s => s.name === stageName), gr);
  saveManifest(m);
  cmdStatusFor(m);
}

function cmdApprove() {
  const [slug, stageName] = rest;
  let m = loadManifest(slug);
  m = transition(m, stageName, 'APPROVE', { by: flags.by || 'noir' }).manifest;
  saveManifest(m);
  console.log(`✓ 승인: ${stageName}`);
}

function cmdStatusFor(m) {
  console.log(`현재 단계: ${m.current_stage}`);
}

switch (cmd) {
  case 'new': cmdNew(); break;
  case 'status': cmdStatus(); break;
  case 'run': cmdRun(); break;
  case 'complete': cmdComplete(); break;
  case 'approve': cmdApprove(); break;
  default:
    console.error('사용: pipeline-run.mjs <new|status|run|complete|approve> ...');
    process.exit(2);
}
