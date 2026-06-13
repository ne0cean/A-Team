/**
 * Loop Closer — 자율 지속학습 루프 (deterministic 절반)
 *
 * 매일/캠페인완료 시 자율 실행(Claude 불필요). friction-log·analytics·capability-map을
 * 읽어 학습 신호를 영속 산출물로 환류한다. 판단이 필요한 부분(패턴 승격, coverage 적용)은
 * knowledge-gardener 에이전트 큐로 넘긴다.
 *
 * 순수 로직 + LoopIO 주입 (테스트 격리 + coverage). lib/gap-sensor.ts 재사용.
 *
 * 등급: GREEN(자동 append/머신소유 write) = 여기서 수행 / YELLOW(판단) = gardener 큐.
 */

import { parseFrictionLog, frictionsByCapability, type FrictionEntry } from './gap-sensor.js';

// friction-log 실데이터에 resolved/resolution 필드 존재 (gap-sensor 타입엔 없음)
type Friction = FrictionEntry & { resolved?: string };

export interface LoopState {
  last_run: string | null;
  last_gardener: string | null;
  escalated: Record<string, { last_escalated: string; friction_count: number }>;
}

export interface Escalation {
  capability_path: string;
  count: number;
  latest_ts: string;
  contexts: string[];
}

export interface CoverageProposal {
  path: string;
  current: number;
  proposed: number | null;
  reason: 'usage-up' | 'friction-down' | 'stale-review';
  evidence: { usage_60d: number; frictions_30d: number };
}

export interface LoopReport {
  ts: string;
  trigger: 'daily' | 'campaign' | 'manual';
  escalations: Escalation[];
  proposals: CoverageProposal[];
  preflight_archived: string | null;
  gardener_needed: boolean;
}

export function emptyState(): LoopState {
  return { last_run: null, last_gardener: null, escalated: {} };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS;
}

/**
 * 같은 capability_path에 임계치 이상 마찰 누적 + 최근 윈도우 내 → 에스컬레이션.
 * resolved 제외, pending.md 마커 dedup, state dedup(신규 friction 발생 시만 재점화).
 */
export function findEscalations(
  frictionContent: string,
  state: LoopState,
  pendingMd: string,
  opts: { threshold?: number; windowDays?: number; now: string },
): Escalation[] {
  const threshold = opts.threshold ?? 3;
  const windowDays = opts.windowDays ?? 30;
  const all = parseFrictionLog(frictionContent) as Friction[];
  const active = all.filter(f => !f.resolved);

  // capability_path별 그룹
  const byPath: Record<string, Friction[]> = {};
  for (const f of active) {
    (byPath[f.capability_path] ??= []).push(f);
  }

  const out: Escalation[] = [];
  for (const [path, entries] of Object.entries(byPath)) {
    if (entries.length < threshold) continue;
    const latest = entries.map(e => e.ts).sort().at(-1)!;
    if (daysBetween(latest, opts.now) > windowDays) continue;       // 죽은 갭 재점화 금지
    if (pendingMd.includes(`<!-- LOOP:${path}`)) continue;           // pending.md dedup
    const prev = state.escalated[path];
    if (prev && prev.last_escalated >= latest) continue;            // 신규 friction 없으면 skip
    out.push({
      capability_path: path,
      count: entries.length,
      latest_ts: latest,
      contexts: entries.slice(-3).map(e => e.context),
    });
  }
  return out;
}

/** improvements/pending.md에 append할 P1 블록 (전체 재작성 금지). */
export function renderEscalationBlock(escalations: Escalation[], now: string): string {
  if (escalations.length === 0) return '';
  const date = now.slice(0, 10);
  const lines = [`\n## Auto-Escalation — ${date} (loop-closer)`, ''];
  for (const e of escalations) {
    lines.push(`- [ ] **P1: ${e.capability_path} friction ${e.count}회 누적** <!-- LOOP:${e.capability_path}:${date} -->`);
    lines.push(`  - 최근: ${e.contexts.join(' / ')}`);
  }
  return lines.join('\n') + '\n';
}

/** CURRENT.md의 Pre-flight Gate 섹션 추출 (debrief가 덮어쓰기 전 아카이브). */
export function extractPreflightGate(currentMd: string): { date: string; content: string } | null {
  const m = currentMd.match(/^## Pre-flight Gate — (\d{4}-\d{2}-\d{2})[^\n]*\n([\s\S]*?)(?=^## |\Z)/m);
  if (!m) return null;
  return { date: m[1], content: m[0].trimEnd() };
}

export function shouldArchive(archiveMd: string, gate: { date: string }): boolean {
  return !archiveMd.includes(`## Pre-flight Gate — ${gate.date}`);
}

/**
 * capability-map coverage 증거기반 제안 (직접 수정 금지 — 머신 소유 제안 파일).
 * usage≥10 & cov<0.8 → +0.05 / friction 30일 2회+ → −0.10 / usage 0 & cov≥0.5 → stale.
 */
export function computeCoverageProposals(
  capMap: { departments: Record<string, { capabilities: Record<string, { coverage: number; modules?: string[] }> }> },
  events60d: Array<{ name?: string; skill?: string }>,
  frictionContent: string,
  opts: { now: string },
): CoverageProposal[] {
  const frictions = parseFrictionLog(frictionContent) as Friction[];
  const fr30 = frictions.filter(f => !f.resolved && daysBetween(f.ts, opts.now) <= 30);
  const frByPath = frictionsByCapability(fr30 as FrictionEntry[]);
  const usageName = (e: { name?: string; skill?: string }) => e.name || e.skill || '';

  const out: CoverageProposal[] = [];
  for (const [dept, d] of Object.entries(capMap.departments)) {
    for (const [cap, c] of Object.entries(d.capabilities)) {
      const path = `${dept}.${cap}`;
      const modules = c.modules ?? [];
      const usage = events60d.filter(e => modules.includes(usageName(e))).length;
      const fr = frByPath[path] ?? 0;
      const ev = { usage_60d: usage, frictions_30d: fr };

      if (usage >= 10 && c.coverage < 0.8) {
        out.push({ path, current: c.coverage, proposed: Math.min(round2(c.coverage + 0.05), 0.8), reason: 'usage-up', evidence: ev });
      } else if (fr >= 2 && c.coverage > 0.2) {
        out.push({ path, current: c.coverage, proposed: round2(c.coverage - 0.1), reason: 'friction-down', evidence: ev });
      } else if (usage === 0 && c.coverage >= 0.5) {
        out.push({ path, current: c.coverage, proposed: null, reason: 'stale-review', evidence: ev });
      }
    }
  }
  return out;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export function renderProposalsMarkdown(proposals: CoverageProposal[], now: string): string {
  const lines = [
    `# Coverage Proposals — ${now.slice(0, 10)} (loop-closer)`,
    '',
    '> 증거기반 제안. knowledge-gardener가 검토 후 capability-map.json에 적용(|Δ|≤0.1). 머신 소유.',
    '',
    '| capability | 현재 | 제안 | 사유 | usage60d | friction30d |',
    '|-----------|------|------|------|----------|-------------|',
  ];
  for (const p of proposals) {
    lines.push(`| ${p.path} | ${p.current} | ${p.proposed ?? 'review'} | ${p.reason} | ${p.evidence.usage_60d} | ${p.evidence.frictions_30d} |`);
  }
  if (proposals.length === 0) lines.push('| (제안 없음) | | | | | |');
  return lines.join('\n') + '\n';
}

/** gardener 호출 필요 판정: 주 1회 상한, 에스컬레이션 있으면 예외. */
export function gardenerNeeded(
  state: LoopState,
  signal: { escalations: number; proposals: number },
  now: string,
): boolean {
  if (signal.escalations === 0 && signal.proposals === 0) return false;
  if (signal.escalations > 0) return true;
  if (!state.last_gardener) return true;
  return daysBetween(state.last_gardener, now) >= 7;
}

// --- 오케스트레이션 (IO 주입) ---

export interface LoopIO {
  readFile(relPath: string): string | null;
  writeFile(relPath: string, content: string): void;
  appendFile(relPath: string, content: string): void;
  exec(cmd: string, args: string[]): { status: number };
  log(event: string, extra: Record<string, unknown>): void;
}

export interface RunOpts {
  trigger: 'daily' | 'campaign' | 'manual';
  now: string;
  dryRun?: boolean;
}

export function runLoopCloser(io: LoopIO, opts: RunOpts): LoopReport {
  const now = opts.now;
  const state: LoopState = JSON.parse(io.readFile('.context/loop/state.json') ?? 'null') ?? emptyState();

  // a) friction 에스컬레이션 → pending.md append
  const frictionContent = io.readFile('.context/friction-log.jsonl') ?? '';
  const pendingMd = io.readFile('improvements/pending.md') ?? '';
  const escalations = findEscalations(frictionContent, state, pendingMd, { now });
  if (escalations.length > 0 && !opts.dryRun) {
    io.appendFile('improvements/pending.md', renderEscalationBlock(escalations, now));
    for (const e of escalations) {
      state.escalated[e.capability_path] = { last_escalated: e.latest_ts, friction_count: e.count };
    }
  }

  // b) gap-priority --write (gaps.md 영속화)
  if (!opts.dryRun) {
    const r = io.exec('node', ['scripts/gap-priority.mjs', '--write']);
    if (r.status !== 0) io.log('loop_closer_warn', { step: 'gap-priority', status: r.status });
  }

  // c) Pre-flight Gate 아카이브
  let archived: string | null = null;
  const currentMd = io.readFile('.context/CURRENT.md') ?? '';
  const gate = extractPreflightGate(currentMd);
  if (gate) {
    const archive = io.readFile('.context/preflight-archive.md') ?? '# Pre-flight Gate Archive\n';
    if (shouldArchive(archive, gate) && !opts.dryRun) {
      io.appendFile('.context/preflight-archive.md', `\n${gate.content}\n`);
      archived = gate.date;
    }
  }

  // d) coverage 제안 (머신 소유 파일 write)
  const capMapRaw = io.readFile('lib/capability-map.json');
  let proposals: CoverageProposal[] = [];
  if (capMapRaw) {
    const events = parseAnalytics60d(io.readFile('.context/analytics.jsonl') ?? '', now);
    proposals = computeCoverageProposals(JSON.parse(capMapRaw), events, frictionContent, { now });
    if (!opts.dryRun) io.writeFile('.context/loop/coverage-proposals.md', renderProposalsMarkdown(proposals, now));
  }

  // e) state + report
  const needGardener = gardenerNeeded(state, { escalations: escalations.length, proposals: proposals.length }, now);
  const report: LoopReport = { ts: now, trigger: opts.trigger, escalations, proposals, preflight_archived: archived, gardener_needed: needGardener };
  if (!opts.dryRun) {
    state.last_run = now;
    io.writeFile('.context/loop/state.json', JSON.stringify(state, null, 2));
    io.writeFile('.context/loop/last-report.json', JSON.stringify(report, null, 2));
    if (needGardener) {
      io.writeFile('.context/loop/gardener-queue.md',
        `# Gardener Queue — ${now.slice(0, 10)}\n\n에스컬레이션 ${escalations.length}건, coverage 제안 ${proposals.length}건 검토 필요.\n입력: .context/loop/last-report.json, coverage-proposals.md\n`);
    }
    io.log('loop_closer_run', { trigger: opts.trigger, escalations: escalations.length, proposals: proposals.length, gardener: needGardener });
  }
  return report;
}

export function parseAnalytics60d(content: string, now: string): Array<{ name?: string; skill?: string }> {
  const cutoff = Date.parse(now) - 60 * DAY_MS;
  const out: Array<{ name?: string; skill?: string }> = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (typeof o.ts === 'string' && Date.parse(o.ts) >= cutoff) out.push(o);
    } catch { /* skip */ }
  }
  return out;
}
