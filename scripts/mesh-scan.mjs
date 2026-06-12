#!/usr/bin/env node
/**
 * mesh-scan.mjs — Mesh Health Census + Gap Detection
 *
 * 사용법:
 *   node scripts/mesh-scan.mjs            # 전체 감사
 *   node scripts/mesh-scan.mjs --chains   # 체인 상태만
 *   node scripts/mesh-scan.mjs --hooks    # 훅 연결 상태만
 *   node scripts/mesh-scan.mjs --report   # 헬스 리포트 + governance/mesh-health.json 저장
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── 헬퍼 ────────────────────────────────────────────────────────────

const exists = (p) => existsSync(p);
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };


function runCmd(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe','pipe','pipe'], timeout: 5000 }).toString().trim();
  } catch { return ''; }
}

// YAML → JS 객체 (python3 위임)
function loadYaml(filePath) {
  try {
    const out = execSync(
      `python3 -c "import yaml, json, sys; print(json.dumps(yaml.safe_load(open('${filePath}'))))"`,
      { stdio: ['pipe','pipe','pipe'], timeout: 5000 }
    ).toString().trim();
    return JSON.parse(out);
  } catch { return null; }
}

// ── 체인 스캔 ─────────────────────────────────────────────────────

function scanChains() {
  const chainsFile = join(REPO_ROOT, 'governance/skill-chains.yaml');
  const commandsDir = join(REPO_ROOT, '.claude/commands');
  const stateFile = join(REPO_ROOT, '.context/chain-state.json');

  if (!exists(chainsFile)) {
    return { ok: false, error: 'governance/skill-chains.yaml 없음', chains: [] };
  }

  const data = loadYaml(chainsFile);
  if (!data || !data.chains) {
    return { ok: false, error: 'YAML 파싱 실패', chains: [] };
  }

  const chains = data.chains;
  const results = [];

  for (const chain of chains) {
    const cmds = getChainCmds(chain);
    const stepStatus = cmds.map(step => {
      const cmdFile = join(commandsDir, `${step}.md`);
      const ok = exists(cmdFile);
      return { step, ok, path: cmdFile };
    });

    const brokenSteps = stepStatus.filter(s => !s.ok);
    const schemaIssues = validateChainSchema(chain);

    results.push({
      id: chain.id,
      name: chain.name,
      pattern: chain.pattern || 'sequential',
      trigger_after: chain.trigger_after || [],
      steps: stepStatus,
      broken: brokenSteps.length,
      schema_issues: schemaIssues,
      health: cmds.length > 0 ? Math.round(((cmds.length - brokenSteps.length) / cmds.length) * 100) : 0,
    });
  }

  // 현재 활성 체인
  let activeChain = null;
  if (exists(stateFile)) {
    try { activeChain = JSON.parse(read(stateFile)); } catch { /* 무시 */ }
  }

  return { ok: true, chains: results, activeChain };
}

// ── 훅 스캔 ─────────────────────────────────────────────────────

function scanHooks() {
  const settingsFile = join(process.env.HOME, '.claude/settings.json');
  const gaps = [];
  const hooksStatus = [];

  // settings.json 파싱
  let settings = {};
  if (exists(settingsFile)) {
    try { settings = JSON.parse(read(settingsFile)); } catch { /* 무시 */ }
  }

  const hooks = settings.hooks || {};

  // 모든 훅 스크립트 수집
  const allHookScripts = [];
  let chainSuggesterRegistered = false;

  for (const [event, eventHooks] of Object.entries(hooks)) {
    for (const hookGroup of (Array.isArray(eventHooks) ? eventHooks : [])) {
      for (const hook of (hookGroup.hooks || [])) {
        if (!hook.command) continue;
        const cmd = hook.command;

        // chain-suggester 등록 여부 (명령어 문자열 전체에서 확인)
        if (cmd.includes('chain-suggester')) chainSuggesterRegistered = true;

        // 커맨드에서 스크립트 경로 추출 (따옴표 제거)
        const parts = cmd.replace(/"/g, '').replace(/'/g, '').split(/\s+/);
        const scriptPath = parts.find(p => p.includes('/') && (p.endsWith('.sh') || p.endsWith('.js') || p.endsWith('.py') || p.endsWith('.mjs')));
        if (scriptPath) {
          const ok = exists(scriptPath);
          allHookScripts.push({ event, command: cmd, scriptPath, ok });
          if (!ok) {
            gaps.push({ id: `hook-missing-${scriptPath.split('/').pop()}`, type: 'missing_hook_script', target: scriptPath, severity: 'P1', auto_patchable: false });
          }
        }
      }
    }
  }
  if (!chainSuggesterRegistered) {
    gaps.push({ id: 'chain-suggester-unregistered', type: 'missing_hook', target: 'chain-suggester Stop 훅 미등록', severity: 'P0', auto_patchable: true });
  }

  hooksStatus.push({
    name: 'chain-suggester',
    registered: chainSuggesterRegistered,
    file_exists: exists(join(REPO_ROOT, 'scripts/hooks/chain-suggester.sh')),
  });

  return { hooks: allHookScripts, hookStatuses: hooksStatus, gaps };
}

// ── launchd 스캔 ─────────────────────────────────────────────────

function scanLaunchd() {
  const launchAgentsDir = join(process.env.HOME, 'Library/LaunchAgents');
  const gaps = [];
  const daemons = [];

  if (!exists(launchAgentsDir)) return { daemons: [], gaps };

  // com.ateam.* plist 파일들
  const plists = readdirSync(launchAgentsDir).filter(f => f.startsWith('com.ateam.') && f.endsWith('.plist'));

  // launchctl list 결과
  const launchctlOut = runCmd('launchctl list 2>/dev/null');

  for (const plist of plists) {
    const label = plist.replace('.plist', '');
    const plistPath = join(launchAgentsDir, plist);
    const plistContent = read(plistPath);

    // launchctl list 형식: PID\texitCode\tlabel
    // PID가 숫자면 실행 중, '-' 이면 중지
    const escapedLabel = label.replace(/\./g, '\\.');
    const lineMatch = launchctlOut.match(new RegExp(`(\\d+|-)\\s+(\\d+)\\s+${escapedLabel}`));
    const pid = lineMatch ? lineMatch[1] : null;
    const exitCode = lineMatch ? parseInt(lineMatch[2]) : null;
    const running = pid !== null;
    const isRunning = pid && pid !== '-';
    // 실행 중(PID 있음)이거나 종료 후 exit 0/78(on-demand 정상)이면 OK
    const ok = running && (isRunning || exitCode === 0 || exitCode === 78);

    // node PATH 문제 감지
    const hasNodePathIssue = plistContent.includes('<string>node</string>') && !plistContent.includes('.nvm') && !plistContent.includes('/usr/local/bin/node');

    const displayStatus = isRunning ? `PID ${pid}` : (exitCode !== null ? `exit ${exitCode}` : 'not listed');
    daemons.push({ label, plistPath, running, pid, exitCode, ok, hasNodePathIssue, displayStatus });

    if (hasNodePathIssue) {
      gaps.push({ id: `launchd-path-${label}`, type: 'broken_launchd', target: label, reason: 'node PATH 미지정', severity: 'P0', auto_patchable: true });
    } else if (!ok && running && !isRunning && exitCode !== 0) {
      gaps.push({ id: `launchd-fail-${label}`, type: 'broken_launchd', target: label, reason: `exit code ${exitCode}`, severity: 'P1', auto_patchable: false });
    }
  }

  // mesh-monthly 없으면 갭
  const hasMeshMonthly = plists.some(p => p.includes('mesh-monthly'));
  if (!hasMeshMonthly) {
    gaps.push({ id: 'mesh-monthly-missing', type: 'missing_launchd', target: 'com.ateam.mesh-monthly', severity: 'P1', auto_patchable: true });
  }

  return { daemons, gaps };
}

// ── autoresearch 스캔 ─────────────────────────────────────────────

function scanAutoresearch() {
  const shadowDir = join(REPO_ROOT, '.autoresearch/_shadow');
  const gaps = [];
  const logs = [];

  if (!exists(shadowDir)) return { logs: [], gaps: [{ id: 'shadow-dir-missing', type: 'missing_dir', target: '.autoresearch/_shadow/', severity: 'P2', auto_patchable: false }] };

  const tracked = ['office-hours', 'blueprint', 'plan-eng'];
  for (const cmd of tracked) {
    const logFile = join(shadowDir, cmd, 'log.jsonl');
    const hasLog = exists(logFile);
    let lastEntry = null;
    if (hasLog) {
      const lines = read(logFile).trim().split('\n').filter(Boolean);
      try { lastEntry = JSON.parse(lines[lines.length - 1]); } catch { /* 무시 */ }
    }
    const daysSince = lastEntry ? Math.floor((Date.now() - new Date(lastEntry.ts).getTime()) / 86400000) : null;
    logs.push({ cmd, hasLog, lastEntry: lastEntry?.ts || null, daysSince });
  }

  const noLogs = logs.filter(l => !l.hasLog || l.daysSince === null || l.daysSince > 30);
  if (noLogs.length > 0) {
    gaps.push({ id: 'autoresearch-shadow-stale', type: 'unwired_hook', target: 'autoresearch shadow logging', reason: `${noLogs.length}개 커맨드 로그 없음 또는 30일 이상 경과`, severity: 'P1', auto_patchable: false });
  }

  return { logs, gaps };
}

// ── 헬스 스코어 계산 ────────────────────────────────────────────

function calcHealthScore(chainResult, hookResult, launchdResult) {
  const totalChainSteps = chainResult.chains.reduce((s, c) => s + c.steps.length, 0);
  const okChainSteps = chainResult.chains.reduce((s, c) => s + c.steps.filter(st => st.ok).length, 0);
  const chainCoverage = totalChainSteps > 0 ? okChainSteps / totalChainSteps : 1;

  const totalHooks = hookResult.hooks.length;
  const okHooks = hookResult.hooks.filter(h => h.ok).length;
  const hookCoverage = totalHooks > 0 ? okHooks / totalHooks : 1;

  const totalDaemons = launchdResult.daemons.length;
  const okDaemons = launchdResult.daemons.filter(d => d.ok).length;
  const launchdHealth = totalDaemons > 0 ? okDaemons / totalDaemons : 1;

  const score = Math.round((chainCoverage * 0.5 + hookCoverage * 0.3 + launchdHealth * 0.2) * 100);
  return { score, chainCoverage: Math.round(chainCoverage * 100), hookCoverage: Math.round(hookCoverage * 100), launchdHealth: Math.round(launchdHealth * 100) };
}

// ── 출력 ──────────────────────────────────────────────────────────

function printReport(chainResult, hookResult, launchdResult, autoresearchResult, health) {
  const allGaps = [
    ...chainResult.chains.flatMap(c => c.steps.filter(s => !s.ok).map(s => ({ id: `chain-step-${s.step}`, type: 'missing_command', target: s.step, severity: 'P1', auto_patchable: false }))),
    ...hookResult.gaps,
    ...launchdResult.gaps,
    ...autoresearchResult.gaps,
  ];

  console.log('\n━━━ Mesh Health ━━━');
  console.log(`헬스 스코어: ${health.score}/100`);
  console.log(`  체인 커버리지: ${health.chainCoverage}%`);
  console.log(`  훅 커버리지:   ${health.hookCoverage}%`);
  console.log(`  launchd:       ${health.launchdHealth}%`);

  if (chainResult.activeChain) {
    console.log(`\n현재 활성 체인: ${chainResult.activeChain.active_chain} (Step ${chainResult.activeChain.current_step})`);
  }

  // 체인 상태
  console.log('\n── 체인 ──');
  for (const chain of chainResult.chains) {
    const icon = chain.broken === 0 ? '✅' : '⚠️';
    const broken = chain.broken > 0 ? ` (${chain.broken}개 스텝 없음)` : '';
    console.log(`  ${icon} ${chain.name}${broken}`);
    if (chain.broken > 0) {
      chain.steps.filter(s => !s.ok).forEach(s => console.log(`      ❌ /${s.step} (.claude/commands/${s.step}.md 없음)`));
    }
  }

  // launchd 상태
  console.log('\n── launchd ──');
  for (const d of launchdResult.daemons) {
    const icon = d.ok ? '✅' : (d.hasNodePathIssue ? '🔧' : '❌');
    const note = d.hasNodePathIssue ? ' [node PATH 오류]' : (!d.ok ? ` [${d.displayStatus}]` : ` [${d.displayStatus}]`);
    console.log(`  ${icon} ${d.label}${note}`);
  }

  // 갭 요약
  const p0 = allGaps.filter(g => g.severity === 'P0');
  const p1 = allGaps.filter(g => g.severity === 'P1');
  const autoPatchable = allGaps.filter(g => g.auto_patchable);

  console.log(`\n── 갭 (${allGaps.length}개) ──`);
  if (p0.length) {
    console.log(`  🔴 P0 (${p0.length}개):`);
    p0.forEach(g => console.log(`    • ${g.target}: ${g.reason || g.type}`));
  }
  if (p1.length) {
    console.log(`  🟡 P1 (${p1.length}개):`);
    p1.forEach(g => console.log(`    • ${g.target}: ${g.reason || g.type}`));
  }

  if (autoPatchable.length) {
    console.log(`\n자동 패치 가능: ${autoPatchable.length}개 → node scripts/mesh-patch.mjs --dry-run`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━\n');

  return allGaps;
}

// ── v2: 체인 스텝 정규화 (string 또는 object 모두 처리) ─────────────

function getChainSteps(chain) {
  const steps = chain.steps || [];
  return steps.map(s => typeof s === 'string' ? { cmd: s } : s).filter(Boolean);
}

function getChainCmds(chain) {
  // parallel_steps 또는 steps에서 cmd 목록 추출
  if (chain.parallel_steps) return chain.parallel_steps;
  return getChainSteps(chain).map(s => s.cmd || s.chain).filter(Boolean);
}

// ── v2: 체인 스키마 검증 ──────────────────────────────────────────

function validateChainSchema(chain) {
  const issues = [];
  const validPatterns = ['sequential', 'parallel', 'loop', 'hierarchical'];

  if (chain.pattern && !validPatterns.includes(chain.pattern)) {
    issues.push(`unknown pattern: ${chain.pattern}`);
  }

  if (chain.pattern === 'loop') {
    if (!chain.exit_condition && !chain.max_loops) {
      issues.push('loop 패턴: exit_condition 또는 max_loops 필요');
    }
  }

  if (chain.pattern === 'parallel') {
    if (!chain.parallel_steps && (!chain.steps || !chain.steps.length)) {
      issues.push('parallel 패턴: parallel_steps 또는 steps 필요');
    }
  }

  // steps의 각 object 스텝 검증
  const steps = getChainSteps(chain);
  for (const step of steps) {
    if (!step.cmd && !step.chain) {
      issues.push(`스텝에 cmd 또는 chain 없음: ${JSON.stringify(step)}`);
    }
    if (step.condition && typeof step.condition !== 'string') {
      issues.push(`condition은 문자열이어야 함: ${JSON.stringify(step.condition)}`);
    }
  }

  return issues;
}

// ── v2: mesh-trace.jsonl 분석 ──────────────────────────────────────

function analyzeTrace() {
  const traceFile = join(REPO_ROOT, '.context/mesh-trace.jsonl');
  if (!exists(traceFile)) {
    return { available: false };
  }

  const lines = read(traceFile).trim().split('\n').filter(Boolean);
  if (!lines.length) return { available: true, entries: 0 };

  const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  // 체인별 통계
  const byChain = {};
  for (const e of entries) {
    const chain = e.chain || 'unknown';
    if (!byChain[chain]) byChain[chain] = { total: 0, done: 0, on_fail: 0, conditions: {} };
    byChain[chain].total++;
    if (e.done) byChain[chain].done++;
    if (e.on_fail) byChain[chain].on_fail++;
    if (e.condition) {
      const cond = e.condition;
      if (!byChain[chain].conditions[cond]) byChain[chain].conditions[cond] = { pass: 0, fail: 0, skip: 0 };
      if (e.condition_result === true) byChain[chain].conditions[cond].pass++;
      else if (e.condition_result === false) byChain[chain].conditions[cond].fail++;
      else byChain[chain].conditions[cond].skip++;
    }
  }

  // 가장 자주 실패하는 조건
  const failingConditions = [];
  for (const [chainId, stats] of Object.entries(byChain)) {
    for (const [cond, counts] of Object.entries(stats.conditions)) {
      if (counts.fail > 0) {
        failingConditions.push({ chain: chainId, condition: cond, fail: counts.fail, pass: counts.pass });
      }
    }
  }
  failingConditions.sort((a, b) => b.fail - a.fail);

  return { available: true, entries: entries.length, byChain, failingConditions, last_entry: entries[entries.length - 1]?.ts };
}

// ── 메인 ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const modeChains = args.includes('--chains');
const modeHooks = args.includes('--hooks');
const modeReport = args.includes('--report') || args.length === 0;
const modeTrace = args.includes('--trace');

const chainResult = scanChains();
const hookResult = scanHooks();
const launchdResult = scanLaunchd();
const autoresearchResult = scanAutoresearch();
const health = calcHealthScore(chainResult, hookResult, launchdResult);

if (modeTrace) {
  const trace = analyzeTrace();
  if (!trace.available) {
    console.log('[Mesh] mesh-trace.jsonl 없음 — 체인 실행 후 생성됩니다');
  } else if (!trace.entries) {
    console.log('[Mesh] mesh-trace.jsonl 비어 있음');
  } else {
    console.log(`\n━━━ Mesh Trace 분석 (${trace.entries}개 기록) ━━━`);
    console.log(`마지막 기록: ${trace.last_entry}`);
    console.log('\n── 체인별 실행 통계 ──');
    for (const [chainId, stats] of Object.entries(trace.byChain)) {
      const completeRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
      console.log(`  ${chainId}: ${stats.total}회 실행, 완주 ${stats.done}회 (${completeRate}%), on_fail ${stats.on_fail}회`);
    }
    if (trace.failingConditions.length > 0) {
      console.log('\n── 자주 실패하는 조건 Top 3 ──');
      trace.failingConditions.slice(0, 3).forEach((fc, i) => {
        console.log(`  ${i+1}. [${fc.chain}] "${fc.condition}" — 실패 ${fc.fail}회, 통과 ${fc.pass}회`);
      });
      console.log('\n→ 위 조건들을 기준으로 체인 설계 개선 권장');
    }
    console.log('━━━━━━━━━━━━━━━━━━━\n');
  }
}

if (modeChains) {
  console.log('\n── Skill Chains (v2) ──');
  for (const chain of chainResult.chains) {
    const stepsStr = chain.steps.map(s => `${s.ok ? '' : '❌'}/${s.step}`).join(' → ');
    const patternBadge = chain.pattern !== 'sequential' ? ` [${chain.pattern}]` : '';
    const schemaBadge = chain.schema_issues.length > 0 ? ` ⚠️schema` : '';
    console.log(`${chain.broken === 0 ? '✅' : '⚠️'} [${chain.id}]${patternBadge}${schemaBadge} ${chain.name}`);
    console.log(`   트리거: ${chain.trigger_after.join(', ')}`);
    console.log(`   ${stepsStr}`);
    if (chain.schema_issues.length > 0) {
      chain.schema_issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
  }
  if (chainResult.activeChain) {
    console.log(`\n현재 활성: ${JSON.stringify(chainResult.activeChain, null, 2)}`);
  }
}

if (modeHooks) {
  console.log('\n── Hook Scripts ──');
  for (const h of hookResult.hooks) {
    console.log(`  ${h.ok ? '✅' : '❌'} [${h.event}] ${h.scriptPath}`);
  }
  console.log('\n── Hook Status ──');
  for (const hs of hookResult.hookStatuses) {
    console.log(`  ${hs.registered ? '✅' : '❌'} ${hs.name} (registered: ${hs.registered}, file: ${hs.file_exists})`);
  }
}

if (modeReport) {
  const allGaps = printReport(chainResult, hookResult, launchdResult, autoresearchResult, health);

  // governance/mesh-health.json 저장
  const healthJson = {
    scan_date: new Date().toISOString().split('T')[0],
    health_score: health.score,
    chain_coverage: health.chainCoverage,
    hook_coverage: health.hookCoverage,
    launchd_health: health.launchdHealth,
    total_chains: chainResult.chains.length,
    broken_chains: chainResult.chains.filter(c => c.broken > 0).length,
    total_daemons: launchdResult.daemons.length,
    ok_daemons: launchdResult.daemons.filter(d => d.ok).length,
    gaps: allGaps,
    auto_patchable_count: allGaps.filter(g => g.auto_patchable).length,
    manual_required_count: allGaps.filter(g => !g.auto_patchable).length,
  };

  const jsonPath = join(REPO_ROOT, 'governance/mesh-health.json');
  writeFileSync(jsonPath, JSON.stringify(healthJson, null, 2));
  console.log(`→ governance/mesh-health.json 저장 완료`);
}
