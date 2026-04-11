#!/usr/bin/env node
// research-daemon.mjs
// 자율 리서치 에이전트 데몬
//
// 사용법:
//   node scripts/research-daemon.mjs          # 데몬 시작
//   node scripts/research-daemon.mjs --once frontend  # 단일 사이클 (테스트용)
//   node scripts/research-daemon.mjs stop     # 실행 중인 데몬 종료
//   node scripts/research-daemon.mjs status   # 상태 확인

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, unlinkSync } from 'fs';
import { spawnSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { findClaude as sharedFindClaude, buildClaudeEnv, getPermissionMode, callSdkWithAdvisor, atomicWriteJSON } from './daemon-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const RESEARCH_DIR = `${REPO_ROOT}/.research`;

// ─── 설정 ──────────────────────────────────────────────────────────────────
const CONFIG = {
  idleThresholdMs: 10 * 60 * 1000,   // 10분
  pollIntervalMs: 60 * 1000,          // 60초마다 확인
  cycleCooldownMs: 25 * 60 * 1000,    // 유휴 재감지 간 쿨다운 (연속 사이클에는 미적용)
  maxBudgetUsd: '0.50',               // 사이클당 최대 비용
  budgetWarnRatio: 0.75,              // 75% 소진 시 경고
  cycleTimeoutMs: 15 * 60 * 1000,     // 사이클 최대 15분
  interCycleDelayMs: 2 * 60 * 1000,  // 연속 사이클 간 2분 대기
  maxSessionBudgetUsd: 3.50,          // 세션 전체 최대 비용 (7개 카테고리)
  // Advisor tool 설정 (단기 태스크이므로 ralph보다 적은 값)
  useSdkPath: false,                  // SDK 경로 사용 여부 (true 시 CLI 대신 SDK로 계획 수립)
  advisorEnabled: true,               // advisor tool 활성화 여부
  advisorMaxUses: 2,                  // 계획 수립 단계 advisor 최대 호출 수
  advisorCacheTtl: '5m',             // advisor 캐시 TTL (단기 태스크)
};

const CATEGORIES = [
  'frontend',
  'backend',
  'ux-ui',
  'product',
  'marketing',
  'market',
  'security',
];

// ─── 유틸 ──────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(`${RESEARCH_DIR}/daemon.log`, line);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function ensureDirs() {
  mkdirSync(RESEARCH_DIR, { recursive: true });
  for (const cat of CATEGORIES) {
    mkdirSync(`${RESEARCH_DIR}/notes/${cat}`, { recursive: true });
  }
}

function getLastActivityMs() {
  const f = `${RESEARCH_DIR}/last-activity.txt`;
  if (!existsSync(f)) return Date.now();
  const ts = parseInt(readFileSync(f, 'utf8').trim(), 10);
  if (isNaN(ts)) return Date.now();
  return ts * 1000;
}

function loadState() {
  const f = `${RESEARCH_DIR}/state.json`;
  if (!existsSync(f)) {
    return { categoryIndex: 0, runCount: 0, lastRunAt: 0, activeCycle: null };
  }
  try {
    const s = JSON.parse(readFileSync(f, 'utf8'));
    return { categoryIndex: 0, runCount: 0, lastRunAt: 0, activeCycle: null, ...s };
  } catch {
    return { categoryIndex: 0, runCount: 0, lastRunAt: 0, activeCycle: null };
  }
}

function saveState(state) {
  // #11: non-atomic write → atomicWriteJSON (프로세스 중단 시 파일 손상 방지)
  atomicWriteJSON(`${RESEARCH_DIR}/state.json`, state);
}

function writePid() {
  writeFileSync(`${RESEARCH_DIR}/daemon.pid`, String(process.pid));
}

function removePid() {
  try { unlinkSync(`${RESEARCH_DIR}/daemon.pid`); } catch {}
}

// findClaude → daemon-utils.mjs의 sharedFindClaude로 직접 사용
const findClaude = sharedFindClaude;

// ─── 세션 스냅샷 ─────────────────────────────────────────────────────────────
// 리서치는 코드를 변경하지 않으므로 git tag 불필요
// 사이클 메타데이터만 checkpoints.log에 기록 (감사 로그 용도)
function logCycleStart(category, timestamp) {
  appendFileSync(`${RESEARCH_DIR}/checkpoints.log`, `${new Date().toISOString()} START ${category} ${timestamp}\n`);
}

function logCycleEnd(category, timestamp, costUsd) {
  appendFileSync(`${RESEARCH_DIR}/checkpoints.log`, `${new Date().toISOString()} END   ${category} ${timestamp} $${costUsd.toFixed(4)}\n`);
}

// ─── stream-json 파서 ────────────────────────────────────────────────────────
// claude --output-format stream-json 이벤트를 한 줄씩 파싱
// 세션ID, 비용, 토큰 수 추출
function parseStreamLine(line, tracker) {
  if (!line.trim()) return;
  try {
    const event = JSON.parse(line);

    // 세션 ID 캡처 (첫 등장 시)
    if (event.session_id && !tracker.sessionId) {
      tracker.sessionId = event.session_id;
    }

    // 비용 & 토큰 추적
    if (event.type === 'result') {
      if (typeof event.total_cost_usd === 'number') tracker.costUsd = event.total_cost_usd;
      if (event.usage) {
        tracker.inputTokens = event.usage.input_tokens ?? tracker.inputTokens;
        tracker.outputTokens = event.usage.output_tokens ?? tracker.outputTokens;
      }
    }
    if (event.type === 'assistant' && event.message?.usage) {
      tracker.inputTokens = event.message.usage.input_tokens ?? tracker.inputTokens;
      tracker.outputTokens = event.message.usage.output_tokens ?? tracker.outputTokens;
    }

    // 예산 75% 경고
    const budgetLimit = parseFloat(CONFIG.maxBudgetUsd);
    if (tracker.costUsd > budgetLimit * CONFIG.budgetWarnRatio && !tracker.warnedBudget) {
      tracker.warnedBudget = true;
      log(`[BUDGET] ⚠️  ${Math.round(CONFIG.budgetWarnRatio * 100)}% 소진: $${tracker.costUsd.toFixed(4)}/$${budgetLimit}`);
    }
  } catch {
    // JSON 아닌 줄 — 무시 (claude가 plain text 출력 시 발생 가능)
  }
}

// ─── claude 프로세스 실행 ────────────────────────────────────────────────────
function spawnClaude(claudePath, args, { noteFile, category, timestamp, isResume }) {
  return new Promise((resolve) => {
    const tracker = {
      sessionId: null,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      warnedBudget: false,
    };

    const env = buildClaudeEnv();

    const proc = spawn(claudePath, args, { cwd: REPO_ROOT, env, timeout: CONFIG.cycleTimeoutMs });
    // stdin 즉시 닫기 — 닫지 않으면 claude가 EOF 대기로 hang
    proc.stdin?.end();

    let lineBuffer = '';

    proc.stdout.on('data', (chunk) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop();

      for (const line of lines) {
        parseStreamLine(line, tracker);
      }

      // 세션 ID 캡처되면 즉시 state에 저장
      if (tracker.sessionId) {
        const state = loadState();
        if (state.activeCycle && !state.activeCycle.sessionId) {
          state.activeCycle.sessionId = tracker.sessionId;
          saveState(state);
          log(`[SESSION] ID 캡처: ${tracker.sessionId}`);
        }
      }
    });

    proc.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) log(`[STDERR] ${msg}`);
    });

    proc.on('close', (code) => {
      if (lineBuffer.trim()) parseStreamLine(lineBuffer, tracker);

      log(`[CYCLE] 종료: code=${code} cost=$${tracker.costUsd.toFixed(4)} in=${tracker.inputTokens} out=${tracker.outputTokens}`);

      // 노트 파일이 없으면 스텁 생성 (에이전트가 저장 못 한 경우)
      if (!existsSync(noteFile)) {
        const status = code !== 0 ? `실패 (code=${code})` : '완료 (노트 미저장)';
        writeFileSync(noteFile, `# ${category} 리서치 ${status} — ${timestamp}\n\n세션ID: ${tracker.sessionId || 'unknown'}\n비용: $${tracker.costUsd.toFixed(4)}\n`);
      }

      resolve({ code, sessionId: tracker.sessionId, costUsd: tracker.costUsd });
    });

    proc.on('error', (err) => {
      log(`[ERROR] 프로세스 오류: ${err.message}`);
      resolve({ code: 1, sessionId: tracker.sessionId, costUsd: tracker.costUsd });
    });
  });
}

// ─── 인터럽트된 사이클 재개 ──────────────────────────────────────────────────
async function resumeCycle(activeCycle) {
  const { category, timestamp, noteFile, sessionId } = activeCycle;
  log(`[RESUME] ${category} 재개 — 세션: ${sessionId}`);

  const claudePath = findClaude();
  const resumePrompt = `이전 ${category} 리서치가 중단됐습니다. 지금까지 분석한 내용을 ${noteFile}에 저장하고 마무리해주세요.`;

  const permMode = getPermissionMode();
  log(`[PERM] resume permission-mode: ${permMode}`);

  return spawnClaude(
    claudePath,
    [
      '--print',
      '--resume', sessionId,
      '--permission-mode', permMode,
      '--max-budget-usd', CONFIG.maxBudgetUsd,
      '--verbose',
      '--output-format', 'stream-json',
      resumePrompt,
    ],
    { noteFile, category, timestamp, isResume: true }
  );
}

// ─── 리서치 사이클 ──────────────────────────────────────────────────────────
async function runCycle(category) {
  const state = loadState();

  // 인터럽트된 사이클 재개 우선
  if (state.activeCycle?.category === category && state.activeCycle?.sessionId) {
    const ageMin = Math.floor((Date.now() - (state.activeCycle.startedAt || 0)) / 60000);
    log(`[CYCLE] 인터럽트된 ${category} 발견 (${ageMin}분 전). 재개.`);
    const result = await resumeCycle(state.activeCycle);
    logCycleEnd(category, state.activeCycle.timestamp, result.costUsd);
    state.activeCycle = null;
    saveState(state);
    return { code: result.code, costUsd: result.costUsd };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const noteFile = `${RESEARCH_DIR}/notes/${category}/${timestamp}.md`;

  log(`[CYCLE] 시작: ${category}`);
  logCycleStart(category, timestamp);

  // activeCycle 등록 (session ID는 나중에 채워짐)
  state.activeCycle = { category, timestamp, noteFile, sessionId: null, startedAt: Date.now() };
  saveState(state);

  const { buildPrompt } = await import('./research-prompts.mjs');
  const prompt = buildPrompt(category, timestamp, REPO_ROOT);

  // ─── SDK 경로: advisor tool로 계획 수립 ──────────────────────────────────
  // 계획 수립 단계에만 advisor 적용. 실행(spawnClaude) 단계는 CLI 경로 유지.
  if (CONFIG.useSdkPath && CONFIG.advisorEnabled) {
    log(`[ADVISOR] ${category} 계획 수립 — SDK + advisor tool 사용`);
    const planTask = `## 리서치 계획 수립\n카테고리: ${category}\n타임스탬프: ${timestamp}\n\n${prompt}\n\n계획 수립만 수행하세요. 실제 리서치 실행은 이후 단계에서 진행됩니다.`;

    const sdkResult = await callSdkWithAdvisor({
      task: planTask,
      maxUses: CONFIG.advisorMaxUses,
      cacheTtl: CONFIG.advisorCacheTtl,
      systemPrompt: `당신은 리서치 계획 수립 에이전트입니다. 코드를 변경하지 않습니다.`,
    });

    if (sdkResult.error) {
      log(`[ADVISOR] SDK 실패 (${sdkResult.error.code}): ${sdkResult.error.message} — CLI fallback`);
      // advisorStats 기록 (실패)
      const s = loadState();
      if (!s.advisorStats) s.advisorStats = { calls: 0, failures: 0, totalCostUsd: 0 };
      s.advisorStats.failures = (s.advisorStats.failures || 0) + 1;
      saveState(s);
      // CLI fallback으로 계속 진행
    } else {
      log(`[ADVISOR] 계획 수립 완료 — advisor 호출: ${sdkResult.advisorCalls}회, 입력: ${sdkResult.usage?.inputTokens || 0} 토큰`);
      // advisorStats 기록 (성공) + SDK 경로 비용 누적 (토큰 기반 추산)
      const s = loadState();
      if (!s.advisorStats) s.advisorStats = { calls: 0, failures: 0, totalCostUsd: 0 };
      s.advisorStats.calls = (s.advisorStats.calls || 0) + 1;
      if (sdkResult.usage?.costUsd) {
        s.totalCostUsd = (s.totalCostUsd || 0) + sdkResult.usage.costUsd;
        s.advisorStats.totalCostUsd = (s.advisorStats.totalCostUsd || 0) + sdkResult.usage.costUsd;
      }
      saveState(s);
    }
  }

  // ─── CLI 경로: 기존 spawnClaude (실행 단계 — 항상 실행) ──────────────────
  const claudePath = findClaude();

  const permMode = getPermissionMode();
  log(`[PERM] cycle permission-mode: ${permMode}`);

  const result = await spawnClaude(
    claudePath,
    [
      '--print',
      '--permission-mode', permMode,
      '--max-budget-usd', CONFIG.maxBudgetUsd,
      '--verbose',
      '--output-format', 'stream-json',
      prompt,
    ],
    { noteFile, category, timestamp, isResume: false }
  );

  logCycleEnd(category, timestamp, result.costUsd);
  state.activeCycle = null;
  saveState(state);

  return { code: result.code, costUsd: result.costUsd };
}

// ─── 연속 사이클 실행 ─────────────────────────────────────────────────────────
// 첫 사이클 이후 남은 예산이 있으면 다음 카테고리를 자동으로 이어서 실행
async function runConsecutiveCycles(initialCost) {
  let sessionCost = initialCost;
  const startIndex = loadState().categoryIndex;

  while (true) {
    const remaining = CONFIG.maxSessionBudgetUsd - sessionCost;
    if (remaining <= 0) {
      log(`[SESSION] 세션 예산 소진 ($${sessionCost.toFixed(4)}/$${CONFIG.maxSessionBudgetUsd}). 종료.`);
      break;
    }

    const state = loadState();
    const nextIndex = state.categoryIndex % CATEGORIES.length;

    // 전체 순환 완료 감지 (startIndex로 돌아왔으면 중단)
    if (sessionCost > initialCost && nextIndex === startIndex) {
      log(`[SESSION] 모든 카테고리 순환 완료. 세션 종료.`);
      break;
    }

    const nextCategory = CATEGORIES[nextIndex];
    log(`[SESSION] 남은 예산: $${remaining.toFixed(4)}. ${CONFIG.interCycleDelayMs / 60000}분 후 다음: ${nextCategory}`);
    await sleep(CONFIG.interCycleDelayMs);

    state.runCount++;
    state.lastRunAt = Date.now();
    saveState(state);

    log(`[CYCLE] #${state.runCount} 시작: ${nextCategory}`);
    const result = await runCycle(nextCategory);
    sessionCost += result.costUsd || 0;

    const updated = loadState();
    updated.categoryIndex = (updated.categoryIndex + 1) % CATEGORIES.length;
    saveState(updated);

    log(`[CYCLE] 완료. 세션 누적: $${sessionCost.toFixed(4)} / $${CONFIG.maxSessionBudgetUsd}`);
  }

  log(`[SESSION] 연속 사이클 종료. 총 비용: $${sessionCost.toFixed(4)}. 다음 유휴 시 재개.`);

  // ─── Research → Ralph 파이프라인 ─────────────────────────────────────────
  // 리서치 완료 후 ralph-state.json이 pending 상태이면 Ralph 데몬 자동 시작
  await maybeStartRalph();
}

async function maybeStartRalph() {
  const ralphState = `${RESEARCH_DIR}/ralph-state.json`;
  if (!existsSync(ralphState)) return;

  try {
    const state = JSON.parse(readFileSync(ralphState, 'utf8'));
    if (state.status !== 'pending') return;

    log(`[PIPELINE] Ralph 태스크 감지: "${state.task}"`);
    log(`[PIPELINE] Research → Ralph 자동 전환`);

    // 최근 리서치 노트 자동 연결
    if (!state.researchNotes) {
      const notesDir = `${RESEARCH_DIR}/notes`;
      if (existsSync(notesDir)) {
        const { readdirSync, statSync } = await import('fs');
        let latestNote = null;
        let latestTime = 0;
        for (const cat of CATEGORIES) {
          const catDir = `${notesDir}/${cat}`;
          if (!existsSync(catDir)) continue;
          for (const f of readdirSync(catDir)) {
            if (!f.endsWith('.md')) continue;
            const fullPath = `${catDir}/${f}`;
            const mtime = statSync(fullPath).mtimeMs;
            if (mtime > latestTime) { latestTime = mtime; latestNote = `.research/notes/${cat}/${f}`; }
          }
        }
        if (latestNote) {
          state.researchNotes = latestNote;
          log(`[PIPELINE] 리서치 노트 연결: ${latestNote}`);
        }
      }
    }

    // Ralph 데몬 시작
    const daemonPath = resolve(__dirname, 'ralph-daemon.mjs');
    if (!existsSync(daemonPath)) {
      log(`[PIPELINE] ralph-daemon.mjs 없음: ${daemonPath}`);
      return;
    }

    const { buildClaudeEnv, getPermissionMode: getPermMode } = await import('./daemon-utils.mjs');
    const env = buildClaudeEnv();
    // Research가 결정한 permission mode를 Ralph에 명시 전파 (claude --help 중복 방지)
    env.CLAUDE_PERMISSION_MODE = getPermMode();

    const ralphLog = `${RESEARCH_DIR}/ralph-daemon.log`;
    const { openSync } = await import('fs');
    const logFd = openSync(ralphLog, 'a');

    const proc = spawn('node', [daemonPath], {
      cwd: REPO_ROOT,
      env,
      stdio: ['ignore', logFd, logFd],
      detached: true,
    });
    proc.unref();

    // spawn 비동기 — error 이벤트 전에 status 변경됨. 실패 시 catch에서 pending으로 롤백
    state.status = 'running';
    state.startedAt = Date.now();
    // CSO-M02: non-atomic write → atomicWriteJSON (partial write 방지)
    atomicWriteJSON(ralphState, state);

    log(`[PIPELINE] Ralph 데몬 시작됨 (PID: ${proc.pid})`);
  } catch (e) {
    // spawn 실패 시 status를 pending으로 유지 (재시도 가능)
    log(`[PIPELINE] Ralph 전환 실패: ${e.message}`);
    try {
      const state = JSON.parse(readFileSync(ralphState, 'utf8'));
      if (state.status === 'running') {
        state.status = 'pending';
        // CSO-M02: atomic write for rollback as well
        atomicWriteJSON(ralphState, state);
        log(`[PIPELINE] status를 pending으로 롤백`);
      }
    } catch {}
  }
}

// ─── 메인 루프 ──────────────────────────────────────────────────────────────
async function mainLoop() {
  ensureDirs();
  writePid();
  log(`[DAEMON] 시작 — PID: ${process.pid}, 유휴 임계값: ${CONFIG.idleThresholdMs / 60000}분`);

  // 시작 시 미완료 activeCycle 확인
  const initialState = loadState();
  if (initialState.activeCycle?.sessionId) {
    log(`[DAEMON] 미완료 사이클 감지: ${initialState.activeCycle.category} (세션: ${initialState.activeCycle.sessionId})`);
    log(`[DAEMON] 다음 유휴 시점에 자동 재개됩니다.`);
  }

  process.on('SIGTERM', () => {
    log('[DAEMON] 종료 신호 수신');
    removePid();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    log('[DAEMON] 인터럽트 신호 수신');
    removePid();
    process.exit(0);
  });

  while (true) {
    await sleep(CONFIG.pollIntervalMs);

    const idleMs = Date.now() - getLastActivityMs();
    const idleMins = Math.floor(idleMs / 60000);

    if (idleMs < CONFIG.idleThresholdMs) {
      log(`[POLL] 활성 (유휴 ${idleMins}분). 대기.`);
      continue;
    }

    const state = loadState();

    // 미완료 사이클 재개 우선
    if (state.activeCycle?.sessionId) {
      log(`[POLL] 미완료 사이클 재개: ${state.activeCycle.category}`);
      const resumeResult = await runCycle(state.activeCycle.category);
      const updated = loadState();
      updated.categoryIndex = (updated.categoryIndex + 1) % CATEGORIES.length;
      saveState(updated);
      // 재개 후 연속 사이클 진입
      await runConsecutiveCycles(resumeResult.costUsd || 0);
      continue;
    }

    const timeSinceLastRun = Date.now() - state.lastRunAt;
    if (timeSinceLastRun < CONFIG.cycleCooldownMs) {
      const waitMins = Math.ceil((CONFIG.cycleCooldownMs - timeSinceLastRun) / 60000);
      log(`[POLL] 쿨다운 중. 다음 세션까지 ${waitMins}분.`);
      continue;
    }

    const category = CATEGORIES[state.categoryIndex % CATEGORIES.length];
    log(`[CYCLE] #${state.runCount + 1} 시작: ${category} (세션 시작)`);

    state.lastRunAt = Date.now();
    state.runCount++;
    saveState(state);

    const firstResult = await runCycle(category);

    const updated = loadState();
    updated.categoryIndex = (updated.categoryIndex + 1) % CATEGORIES.length;
    saveState(updated);

    log(`[CYCLE] 완료. 누적: $${(firstResult.costUsd || 0).toFixed(4)}`);

    // 남은 예산으로 연속 사이클 실행
    await runConsecutiveCycles(firstResult.costUsd || 0);
  }
}

// ─── 엔트리포인트 ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === 'stop') {
  const pidFile = `${RESEARCH_DIR}/daemon.pid`;
  if (!existsSync(pidFile)) { console.log('실행 중인 데몬 없음'); process.exit(0); }
  const pid = parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`데몬 종료 (PID: ${pid})`);
  } catch (e) {
    console.log(`종료 실패: ${e.message}`);
  }
  process.exit(0);
}

if (args[0] === '--once') {
  const target = args[1] || 'frontend';
  ensureDirs();

  if (target === 'all') {
    // 모든 카테고리 순환 (연속 사이클)
    log(`[TEST] 전체 순환 시작 (최대 $${CONFIG.maxSessionBudgetUsd})`);
    const state = loadState();
    state.activeCycle = null;
    const startIdx = state.categoryIndex;
    saveState(state);

    const firstCategory = CATEGORIES[startIdx % CATEGORIES.length];
    state.runCount++;
    state.lastRunAt = Date.now();
    saveState(state);

    const firstResult = await runCycle(firstCategory);
    const updated = loadState();
    updated.categoryIndex = (updated.categoryIndex + 1) % CATEGORIES.length;
    saveState(updated);

    await runConsecutiveCycles(firstResult.costUsd || 0);
    process.exit(0);
  }

  if (!CATEGORIES.includes(target)) {
    console.error(`알 수 없는 카테고리: ${target}\n사용 가능: ${CATEGORIES.join(', ')}, all`);
    process.exit(1);
  }
  log(`[TEST] 단일 사이클: ${target}`);
  const state = loadState();
  state.activeCycle = null;
  saveState(state);
  await runCycle(target);
  process.exit(0);
}

if (args[0] === 'status') {
  ensureDirs();
  const idleMs = Date.now() - getLastActivityMs();
  const idleMins = Math.floor(idleMs / 60000);
  const state = loadState();
  const nextCategory = CATEGORIES[state.categoryIndex % CATEGORIES.length];

  let daemonStatus = '중지됨';
  const pidFile = `${RESEARCH_DIR}/daemon.pid`;
  if (existsSync(pidFile)) {
    const pid = parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
    try { process.kill(pid, 0); daemonStatus = `실행 중 (PID: ${pid})`; }
    catch { daemonStatus = '중지됨 (stale PID)'; }
  }

  const resumable = state.activeCycle?.sessionId
    ? `⚠️  재개 가능: ${state.activeCycle.category} (세션: ${state.activeCycle.sessionId})`
    : '없음';

  console.log(`
리서치 데몬 상태
─────────────────────────────────────
데몬:           ${daemonStatus}
유휴 시간:      ${idleMins}분 (임계값: ${CONFIG.idleThresholdMs / 60000}분)
마지막 사이클:  ${state.runCount > 0 ? new Date(state.lastRunAt).toLocaleString('ko-KR') : '없음'}
총 사이클:      ${state.runCount}회
다음 카테고리:  ${nextCategory}
미완료 사이클:  ${resumable}
  `);
  process.exit(0);
}

// 기본: 데몬 시작
mainLoop().catch(err => {
  console.error('[FATAL]', err);
  removePid();
  process.exit(1);
});
