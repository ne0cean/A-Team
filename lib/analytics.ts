/**
 * Analytics — Skill usage tracking
 *
 * JSONL-based local analytics for skill invocations and safety hook fires.
 * No remote reporting — everything stays local.
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

export interface AnalyticsEvent {
  skill: string;
  ts: string;
  repo: string;
  event?: string;     // 'hook_fire' | 'session_cost' | 'design_audit'
  pattern?: string;   // matched pattern for hook fires
  // Session cost fields (populated when event='session_cost')
  totalCostUsd?: number;
  callCount?: number;
  preCheckSkipRate?: number;
  advisorCallAvg?: number;
  cacheHitRate?: number;
  // Design audit fields (populated when event='design_audit')
  designScore?: number;            // 0-100
  designViolations?: number;        // total violation count
  designA11yViolations?: number;    // a11y-only count
  designAiSlopViolations?: number;  // ai_slop-only count
  designTone?: string;              // declared tone (brutalist | luxury | ...)
  designGateContext?: string;       // 'ship' | 'craft' | 'default'
  designPassed?: boolean;           // meetsThreshold()
}

// --- Logging ---

export function logEvent(
  partial: Omit<AnalyticsEvent, 'ts'> & { ts?: string },
  filePath: string,
): void {
  const event: AnalyticsEvent = {
    ...partial,
    ts: partial.ts ?? new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(event) + '\n');
}

// --- Parsing ---

export function parseJSONL(content: string): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj === 'object' && obj !== null && typeof obj.ts === 'string') {
        events.push(obj as AnalyticsEvent);
      }
    } catch {
      // skip malformed
    }
  }
  return events;
}

// --- Filtering ---

export function filterByPeriod(events: AnalyticsEvent[], period: string): AnalyticsEvent[] {
  if (period === 'all') return events;

  const match = period.match(/^(\d+)d$/);
  if (!match) return events;

  const days = parseInt(match[1], 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return events.filter(e => {
    const d = new Date(e.ts);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
}

// --- Reporting ---

export function formatReport(events: AnalyticsEvent[], period = 'all'): string {
  const skillEvents = events.filter(e => e.event !== 'hook_fire' && e.event !== 'session_cost' && e.event !== 'design_audit');
  const hookEvents = events.filter(e => e.event === 'hook_fire');
  const costEvents = events.filter(e => e.event === 'session_cost');
  const designEvents = events.filter(e => e.event === 'design_audit');

  const lines: string[] = [];
  lines.push('A-Team skill usage analytics');
  lines.push('\u2550'.repeat(39));
  lines.push('');

  const periodLabel = period === 'all' ? 'all time' : `last ${period.replace('d', ' days')}`;
  lines.push(`Period: ${periodLabel}`);

  // Top Skills
  const skillCounts = new Map<string, number>();
  for (const e of skillEvents) {
    skillCounts.set(e.skill, (skillCounts.get(e.skill) || 0) + 1);
  }

  if (skillCounts.size > 0) {
    lines.push('');
    lines.push('Top Skills');

    const sorted = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted) {
      const label = `/${name}`;
      const suffix = `${count} invocation${count === 1 ? '' : 's'}`;
      const dotLen = Math.max(2, 25 - label.length - suffix.length);
      const dots = ' ' + '.'.repeat(dotLen) + ' ';
      lines.push(`  ${label}${dots}${suffix}`);
    }
  }

  // By Repo
  const repoSkills = new Map<string, Map<string, number>>();
  for (const e of skillEvents) {
    if (!repoSkills.has(e.repo)) repoSkills.set(e.repo, new Map());
    const m = repoSkills.get(e.repo)!;
    m.set(e.skill, (m.get(e.skill) || 0) + 1);
  }

  if (repoSkills.size > 0) {
    lines.push('');
    lines.push('By Repo');

    const sortedRepos = [...repoSkills.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [repo, skills] of sortedRepos) {
      const parts = [...skills.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, c]) => `${s}(${c})`);
      lines.push(`  ${repo}: ${parts.join(' ')}`);
    }
  }

  // Safety Hook Events
  const hookCounts = new Map<string, number>();
  for (const e of hookEvents) {
    if (e.pattern) {
      hookCounts.set(e.pattern, (hookCounts.get(e.pattern) || 0) + 1);
    }
  }

  if (hookCounts.size > 0) {
    lines.push('');
    lines.push('Safety Hook Events');

    const sortedHooks = [...hookCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [pattern, count] of sortedHooks) {
      const suffix = `${count} fire${count === 1 ? '' : 's'}`;
      const dotLen = Math.max(2, 25 - pattern.length - suffix.length);
      const dots = ' ' + '.'.repeat(dotLen) + ' ';
      lines.push(`  ${pattern}${dots}${suffix}`);
    }
  }

  // Session Cost Summary (most recent session_cost event)
  if (costEvents.length > 0) {
    const latest = costEvents.sort((a, b) => b.ts.localeCompare(a.ts))[0];
    lines.push('');
    lines.push('Session Cost');
    if (latest.totalCostUsd !== undefined) lines.push(`  Total cost: $${latest.totalCostUsd.toFixed(4)}`);
    if (latest.callCount !== undefined) lines.push(`  Calls: ${latest.callCount}`);
    if (latest.preCheckSkipRate !== undefined) lines.push(`  Pre-check skip rate: ${(latest.preCheckSkipRate * 100).toFixed(1)}%`);
    if (latest.advisorCallAvg !== undefined) lines.push(`  Advisor calls/session: ${latest.advisorCallAvg.toFixed(2)}`);
    if (latest.cacheHitRate !== undefined) lines.push(`  Cache hit rate: ${(latest.cacheHitRate * 100).toFixed(1)}%`);
  }

  // Design Audit Summary (recent 5 average + latest)
  if (designEvents.length > 0) {
    const recent = designEvents.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 5);
    const scores = recent.map(e => e.designScore ?? 0).filter(s => s > 0);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const latest = recent[0];
    lines.push('');
    lines.push('Design Audit');
    lines.push(`  Recent 5 avg score: ${avg.toFixed(1)}/100`);
    if (latest.designScore !== undefined) lines.push(`  Latest: ${latest.designScore}/100 (${latest.designViolations ?? 0} violations, ${latest.designA11yViolations ?? 0} a11y)`);
    if (latest.designTone) lines.push(`  Tone: ${latest.designTone}`);
  }

  // Total
  const totalSkills = skillEvents.length;
  const totalHooks = hookEvents.length;
  lines.push('');
  lines.push(`Total: ${totalSkills} skill invocation${totalSkills === 1 ? '' : 's'}, ${totalHooks} hook fire${totalHooks === 1 ? '' : 's'}`);

  return lines.join('\n');
}

// --- Design Audit Helper ---

import type { DetectResult } from './design-smell-detector.js';

/**
 * 디자인 감사 결과를 analytics에 기록.
 * design-auditor 서브에이전트가 매 실행 후 호출.
 */
export function logDesignAudit(
  result: DetectResult,
  ctx: { repo: string; tone?: string; gateContext?: 'ship' | 'craft' | 'default'; passed: boolean },
  filePath: string,
): void {
  logEvent({
    skill: 'design-auditor',
    repo: ctx.repo,
    event: 'design_audit',
    designScore: result.score,
    designViolations: result.violations.length,
    designA11yViolations: result.summary.a11y,
    designAiSlopViolations: result.summary.ai_slop,
    designTone: ctx.tone,
    designGateContext: ctx.gateContext,
    designPassed: ctx.passed,
  }, filePath);
}
