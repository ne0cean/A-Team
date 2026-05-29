#!/usr/bin/env node
/**
 * system-health — A-Team 전체 시스템 주간 진단
 * cortex-health + 모델 오케스트레이션 + 통합 누락 + 성능 추적
 *
 * Usage: node scripts/system-health.mjs
 * 출력: .context/briefs/system-health-{date}.md
 * 크론: 매주 월요일 09:30 (cortex-health 30분 후)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = join(process.env.HOME, 'Projects/a-team');
const BRIEFS = join(ROOT, '.context/briefs');
const TODAY = new Date().toISOString().slice(0, 10);

function safe(fn) { try { return fn(); } catch { return null; } }
function loadJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// === 1. 모델 오케스트레이션 ===
const analytics = loadJsonl(join(ROOT, '.context/analytics.jsonl'));
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
const recent = analytics.filter(e => e.ts > twoWeeksAgo || e.timestamp > twoWeeksAgo);

const agentStarts = recent.filter(e => e.event === 'agent_start' || e.name === 'agent_start');
const modelSwitches = recent.filter(e => e.event === 'model_switch');
const sessionEnds = recent.filter(e => e.event === 'session_end');

// Count agent types used
const agentTypes = {};
agentStarts.forEach(e => {
  const type = e.agent_type || e.subagent_type || 'unknown';
  agentTypes[type] = (agentTypes[type] || 0) + 1;
});

// === 2. 통합 누락 검출 ===
const integrationIssues = [];

// Check: all scripts in scripts/ that are in launchd
const launchdDir = join(process.env.HOME, 'Library/LaunchAgents');
const launchdFiles = safe(() => readdirSync(launchdDir).filter(f => f.startsWith('com.ateam.'))) || [];
const launchdStatus = launchdFiles.map(f => {
  const label = f.replace('.plist', '');
  const result = safe(() => execSync(`launchctl list ${label} 2>/dev/null`, { encoding: 'utf-8' }));
  return { label, running: result !== null && !result.includes('Could not find') };
});
const deadDaemons = launchdStatus.filter(d => !d.running);
if (deadDaemons.length) integrationIssues.push(`launchd 비활성: ${deadDaemons.map(d => d.label).join(', ')}`);

// Check: commands in .claude/commands/ that aren't in CLAUDE.md auto-suggest table
const commandsDir = join(ROOT, '.claude/commands');
const commands = safe(() => readdirSync(commandsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))) || [];
const claudeMd = safe(() => readFileSync(join(ROOT, 'CLAUDE.md'), 'utf-8')) || '';
const unmentioned = commands.filter(c => !claudeMd.includes(c) && !claudeMd.includes(`/${c}`));
if (unmentioned.length > 10) integrationIssues.push(`CLAUDE.md에 미언급 커맨드 ${unmentioned.length}개`);

// Check: new scripts (last 2 weeks) without test
const newScripts = safe(() =>
  execSync(`git log --since="2 weeks ago" --diff-filter=A --name-only --pretty="" -- "scripts/*.mjs" "scripts/*.ts"`, { cwd: ROOT, encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean)
) || [];
const testFiles = safe(() => readdirSync(join(ROOT, 'test')).filter(f => f.endsWith('.test.ts'))) || [];
const untestedScripts = newScripts.filter(s => {
  const base = s.split('/').pop().replace(/\.(mjs|ts)$/, '');
  return !testFiles.some(t => t.includes(base));
});
if (untestedScripts.length) integrationIssues.push(`테스트 없는 신규 스크립트: ${untestedScripts.join(', ')}`);

// === 3. 성능/비용 ===
const sessionCosts = recent.filter(e => e.event === 'session_cost');
const totalSessions = sessionEnds.length;

// === 4. 건강 점수 ===
let score = 100;
const issues = [];

if (deadDaemons.length) { score -= 15; issues.push(...deadDaemons.map(d => `🔴 ${d.label} 비활성`)); }
if (modelSwitches.length === 0 && totalSessions > 3) { score -= 10; issues.push('모델 전환 추적 미작동 (이벤트 0건)'); }
if (untestedScripts.length > 3) { score -= 10; issues.push(`테스트 없는 신규 스크립트 ${untestedScripts.length}개`); }
if (integrationIssues.length) { score -= 5 * integrationIssues.length; issues.push(...integrationIssues); }

score = Math.max(0, score);

// === 5. Tier 2 전환 판단 ===
const accessLog = loadJsonl(join(ROOT, 'cortex/access-log.jsonl'));
const tier2Ready = accessLog.length >= 100;

// === Report ===
const report = `# System Health Report — ${TODAY}

## Score: ${score}/100 ${score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'}

## 모델 오케스트레이션 (2주)
- 세션 수: ${totalSessions}
- 에이전트 호출: ${agentStarts.length}건
- 모델 전환 이벤트: ${modelSwitches.length}건 ${modelSwitches.length === 0 ? '⚠️ 미추적' : ''}
${Object.entries(agentTypes).length ? '\n### 에이전트 사용 분포\n' + Object.entries(agentTypes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}회`).join('\n') : ''}

## LaunchD 데몬 상태
${launchdStatus.map(d => `- ${d.label}: ${d.running ? '✅' : '❌'}`).join('\n')}

## 통합 누락
${integrationIssues.length ? integrationIssues.map(i => `- ⚠️ ${i}`).join('\n') : '- 없음 ✅'}

## 신규 스크립트 (2주)
${newScripts.length ? newScripts.map(s => `- ${s} ${untestedScripts.includes(s) ? '⚠️ 테스트 없음' : '✅'}`).join('\n') : '- 없음'}

## Cortex Tier 상태
- 접근 로그: ${accessLog.length}건
- Tier 2 전환: ${tier2Ready ? '🟢 가능 (co-access 분석 활성화 권장)' : `대기 중 (${accessLog.length}/100)`}

## 이슈 요약
${issues.length ? issues.map(i => `- ${i}`).join('\n') : '- 없음 ✅'}

## 권고
${deadDaemons.length ? `- 비활성 데몬 재시작: \`launchctl load ~/Library/LaunchAgents/{plist}\`` : ''}
${modelSwitches.length === 0 ? '- model_switch 이벤트 로깅 추가 필요' : ''}
${untestedScripts.length ? `- 신규 스크립트 테스트 작성: ${untestedScripts.slice(0, 3).join(', ')}` : ''}
${!issues.length ? '- 시스템 양호. 유지.' : ''}
`;

writeFileSync(join(BRIEFS, `system-health-${TODAY}.md`), report);
console.log(`[system-health] Score: ${score}/100`);
issues.forEach(i => console.log(`  ${i}`));
