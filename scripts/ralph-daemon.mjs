#!/usr/bin/env node
// ralph-daemon.mjs
// Ralph Loop 자율 개발 데몬
//
// 사용법 (프로젝트 루트에서 실행):
//   node /path/to/A-Team/scripts/ralph-daemon.mjs          # 데몬 시작 (state.json 미리 작성 필요)
//   node /path/to/A-Team/scripts/ralph-daemon.mjs stop     # 종료
//   node /path/to/A-Team/scripts/ralph-daemon.mjs status   # 상태 확인
//
// state.json 위치: {projectRoot}/.research/ralph-state.json

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, unlinkSync } from 'fs';
import { spawnSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createLogger, sleep, findClaude, buildClaudeEnv, atomicWriteJSON, getPermissionMode } from './daemon-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();
const RESEARCH_DIR = `${PROJECT_ROOT}/.research`;
const STATE_FILE    = `${RESEARCH_DIR}/ralph-state.json`;
const PID_FILE      = `${RESEARCH_DIR}/ralph-daemon.pid`;
const LOG_FILE      = `${RESEARCH_DIR}/ralph-daemon.log`;
const PROGRESS_FILE = `${RESEARCH_DIR}/ralph-progress.md`;

const log = createLogger(LOG_FILE);

// ─── 설정 ──────────────────────────────────────────────────────────────────
const CONFIG = {
  interIterationDelayMs: 10_000,     // iteration 간 10초 (스로틀)
  iterationTimeoutMs:    10 * 60_000, // iteration당 최대 10분
  maxBudgetPerIter:      '0.50',      // L4: claude --max-budget-usd 인자
  stallThreshold:        2,           // L2: 연속 no-progress 허용 횟수
  promiseTag:            '<promise>COMPLETE</promise>',
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────
function ensureDirs() { mkdirSync(RESEARCH_DIR, { recursive: true }); }

// ─── 상태 관리 ──────────────────────────────────────────────────────────────
function loadState() {
  if (!existsSync(STATE_FILE)) {
    throw new Error(`ralph-state.json 없음: ${STATE_FILE}\n/ralph start "task" 로 먼저 시작하세요.`);
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function saveState(s) { atomicWriteJSON(STATE_FILE, s); }

// ─── PID 관리 ───────────────────────────────────────────────────────────────
function writePid() { writeFileSync(PID_FILE, String(process.pid)); }
function removePid() { try { unlinkSync(PID_FILE); } catch {} }

// ─── Git 유틸 ───────────────────────────────────────────────────────────────
function getGitHead() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  return r.stdout?.trim() || 'unknown';
}

function getCurrentBranch() {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  return r.stdout?.trim() || 'unknown';
}

// Ralph 전용 브랜치 생성 — 원본 브랜치 보호
function ensureRalphBranch(state) {
  const current = getCurrentBranch();

  if (current.startsWith('ralph/')) {
    log(`[BRANCH] 기존 ralph 브랜치 사용: ${current}`);
    return current;
  }

  state.originalBranch = current;

  const date = new Date().toISOString().slice(0, 10);
  const slug = state.task
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30);
  const branch = `ralph/${date}-${slug}`;

  const r = spawnSync('git', ['checkout', '-b', branch], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    const r2 = spawnSync('git', ['checkout', branch], { cwd: PROJECT_ROOT, encoding: 'utf8' });
    if (r2.status !== 0) {
      throw new Error(`브랜치 생성/체크아웃 실패: ${r.stderr} / ${r2.stderr}`);
    }
  }
  log(`[BRANCH] Ralph 브랜치 생성: ${branch} (원본: ${current})`);
  return branch;
}

// ─── L1: Pre-check gate ─────────────────────────────────────────────────────
function runPreCheck(checkCommand) {
  if (!checkCommand) return false;
  const r = spawnSync('sh', ['-c', checkCommand], {
    cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 60_000,
  });
  return r.status === 0;
}

// ─── 진행 파일 갱신 ──────────────────────────────────────────────────────────
function appendProgress(state, summary) {
  const ts = new Date().toISOString();
  const line = `### 반복 ${state.currentIteration} (${ts})\n${summary}\n\n`;
  if (!existsSync(PROGRESS_FILE)) {
    writeFileSync(PROGRESS_FILE, `# Ralph Loop 진행 기록\n\n## 태스크\n${state.task}\n\n`);
  }
  appendFileSync(PROGRESS_FILE, line);
}

// ─── Claude 프로세스 실행 ────────────────────────────────────────────────────
function spawnClaudeProcess(claudePath, prompt, model) {
  return new Promise((resolvePromise) => {
    const tracker = {
      costUsd: 0, inputTokens: 0, outputTokens: 0,
      sessionId: null,
    };
    let rawOutput = '';
    let lineBuffer = '';

    const permMode = getPermissionMode();
    log(`[PERM] permission-mode: ${permMode}`);

    const env = buildClaudeEnv();
    const args = [
      '--print',
      '--permission-mode', permMode,
      '--max-budget-usd', CONFIG.maxBudgetPerIter,
      '--model', model,
      '--output-format', 'stream-json',
      '--verbose',
      prompt,
    ];

    const proc = spawn(claudePath, args, { cwd: PROJECT_ROOT, env });
    proc.stdin?.end();

    // iteration timeout (spawn은 timeout 미지원)
    const timer = setTimeout(() => {
      log(`[TIMEOUT] ${CONFIG.iterationTimeoutMs / 60_000}분 초과 — 프로세스 종료`);
      proc.kill('SIGTERM');
    }, CONFIG.iterationTimeoutMs);

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      rawOutput += text;
      lineBuffer += text;

      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.session_id && !tracker.sessionId) tracker.sessionId = event.session_id;
          if (event.type === 'result') {
            if (typeof event.total_cost_usd === 'number') tracker.costUsd = event.total_cost_usd;
            if (event.usage) {
              tracker.inputTokens  = event.usage.input_tokens  ?? tracker.inputTokens;
              tracker.outputTokens = event.usage.output_tokens ?? tracker.outputTokens;
            }
          }
        } catch { /* plain-text line */ }
      }
    });

    proc.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) log(`[STDERR] ${msg}`);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (lineBuffer.trim()) {
        try { const e = JSON.parse(lineBuffer); if (typeof e.total_cost_usd === 'number') tracker.costUsd = e.total_cost_usd; } catch {}
      }
      log(`[ITER] 완료: code=${code} cost=$${tracker.costUsd.toFixed(4)} in=${tracker.inputTokens} out=${tracker.outputTokens}`);
      resolvePromise({ code, costUsd: tracker.costUsd, rawOutput, sessionId: tracker.sessionId });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      log(`[ERROR] 프로세스 오류: ${err.message}`);
      resolvePromise({ code: 1, costUsd: tracker.costUsd, rawOutput, sessionId: null });
    });
  });
}

// ─── 메인 루프 ──────────────────────────────────────────────────────────────
async function mainLoop() {
  ensureDirs();
  writePid();

  const state = loadState();
  // checkCommand를 시작 시 freeze — 런타임 중 state.json 변경으로 인한 명령 주입 방지
  const frozenCheckCommand = state.checkCommand || null;
  log(`[RALPH] 시작 — PID: ${process.pid}`);
  log(`[RALPH] 태스크: ${state.task}`);
  log(`[RALPH] 모델: ${state.model} | 최대: ${state.maxIterations}회 | 예산: $${state.budgetCapUsd}`);
  log(`[RALPH] checkCommand (frozen): ${frozenCheckCommand || '없음'}`);

  // 별도 브랜치에서 작업 (원본 보호)
  const ralphBranch = ensureRalphBranch(state);
  state.branch = ralphBranch;
  saveState(state);

  // 모델 결정 (L4 tiering)
  const MODEL_MAP = {
    haiku:  'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-6',
    opus:   'claude-opus-4-6',
  };
  const model = MODEL_MAP[state.model] || state.model || MODEL_MAP.sonnet;

  const claudePath = findClaude();
  const { collectContext, buildRalphPrompt } = await import('./ralph-prompts.mjs');

  // Graceful shutdown: state 저장 후 종료
  let currentState = state;
  const gracefulExit = (signal) => {
    log(`[RALPH] ${signal} — 상태 저장 후 종료`);
    try { saveState(currentState); } catch {}
    removePid();
    process.exit(0);
  };
  process.on('SIGTERM', () => gracefulExit('SIGTERM'));
  process.on('SIGINT',  () => gracefulExit('SIGINT'));

  while (true) {
    const s = loadState();
    currentState = s;

    // ── 종료 조건 체크 ──────────────────────────────────────────────────────
    if (s.currentIteration >= s.maxIterations) {
      log(`[RALPH] 최대 반복 도달 (${s.maxIterations}회). 완료.`);
      s.status = 'max_iterations'; saveState(s); break;
    }

    if (s.totalCostUsd >= s.budgetCapUsd) {
      log(`[RALPH] 예산 소진 ($${s.totalCostUsd.toFixed(4)} / $${s.budgetCapUsd}). 종료.`);
      s.status = 'budget_exceeded'; saveState(s); break;
    }

    // L1: Pre-check gate
    log(`[RALPH] 반복 ${s.currentIteration + 1}/${s.maxIterations} — Pre-check 실행`);
    if (runPreCheck(frozenCheckCommand)) {
      log(`[RALPH] ✅ Pre-check 통과 — 태스크 완료!`);
      s.status = 'complete'; saveState(s);
      appendProgress(s, '✅ Pre-check 통과 — 완료 확인됨');
      break;
    }

    // L2: Stall detection
    if (s.stallCount >= CONFIG.stallThreshold) {
      log(`[RALPH] ⚠️  ${CONFIG.stallThreshold}회 연속 진전 없음 — 중단.`);
      s.status = 'stalled'; saveState(s);
      appendProgress(s, `⛔ Stall 감지 — 데몬 중단`);
      break;
    }

    // ── Iteration 실행 ───────────────────────────────────────────────────────
    const preHead = getGitHead();
    log(`[RALPH] 반복 ${s.currentIteration + 1} 시작 (HEAD: ${preHead.slice(0, 7)})`);

    const ctx = collectContext(PROJECT_ROOT, s);
    const prompt = buildRalphPrompt(s, ctx, PROJECT_ROOT);
    const result = await spawnClaudeProcess(claudePath, prompt, model);

    // ── 결과 분석 ────────────────────────────────────────────────────────────
    const postHead = getGitHead();
    const hasProgress = preHead !== postHead;

    if (!hasProgress) {
      s.stallCount = (s.stallCount || 0) + 1;
      log(`[RALPH] 변경 없음 (stall ${s.stallCount}/${CONFIG.stallThreshold})`);
    } else {
      s.stallCount = 0;
      log(`[RALPH] 진전 확인 (HEAD: ${postHead.slice(0, 7)})`);
    }

    s.currentIteration++;
    s.totalCostUsd = (s.totalCostUsd || 0) + result.costUsd;
    log(`[RALPH] 누적 비용: $${s.totalCostUsd.toFixed(4)} / $${s.budgetCapUsd}`);

    if (result.rawOutput.includes(CONFIG.promiseTag)) {
      log(`[RALPH] <promise> 태그 감지 — 완료 검증 중`);
      if (runPreCheck(frozenCheckCommand)) {
        log(`[RALPH] ✅ 완료 검증 통과!`);
        s.status = 'complete'; saveState(s);
        appendProgress(s, `✅ 외부 검증 통과 — 완료`);
        break;
      }
      appendProgress(s, `⚠️  <promise> 태그 있으나 체크 실패 — 반복 계속`);
    } else {
      appendProgress(s, `반복 ${s.currentIteration}: ${hasProgress ? '진전 있음' : '변경 없음'} | $${result.costUsd.toFixed(4)}`);
    }

    saveState(s);

    log(`[RALPH] ${CONFIG.interIterationDelayMs / 1000}초 대기`);
    await sleep(CONFIG.interIterationDelayMs);
  }

  const finalState = loadState();
  const branch = finalState.branch || getCurrentBranch();
  const orig = finalState.originalBranch || 'master';

  log(`[RALPH] 종료 — 상태: ${finalState.status} | 총 ${finalState.currentIteration}회 | 총 $${finalState.totalCostUsd?.toFixed(4)}`);
  log(`[RALPH] ─────────────────────────────────────`);
  log(`[RALPH] 브랜치: ${branch} | 원본: ${orig}`);
  log(`[RALPH] 머지:     git checkout ${orig} && git merge ${branch}`);
  log(`[RALPH] 되돌리기: git checkout ${orig} && git branch -D ${branch}`);
  log(`[RALPH] ─────────────────────────────────────`);

  // Notify relay server (if running) so iPhone gets push
  try {
    const notifyUrl = process.env.RALPH_NOTIFY_URL || 'http://localhost:3001/api/ralph/notify';
    await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: finalState.task,
        status: finalState.status,
        iterations: finalState.currentIteration,
        cost: finalState.totalCostUsd,
      }),
    });
    log(`[RALPH] 릴레이 서버 알림 전송 완료`);
  } catch (e) {
    log(`[RALPH] 릴레이 서버 알림 실패 (무시): ${e.message}`);
  }

  removePid();
}

// ─── 엔트리포인트 ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === 'stop') {
  if (!existsSync(PID_FILE)) { console.log('실행 중인 Ralph 데몬 없음'); process.exit(0); }
  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
  try { process.kill(pid, 'SIGTERM'); console.log(`Ralph 데몬 종료 (PID: ${pid})`); }
  catch (e) { console.log(`종료 실패: ${e.message}`); }
  process.exit(0);
}

if (args[0] === 'status') {
  ensureDirs();
  let daemonStatus = '중지됨';
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
    try { process.kill(pid, 0); daemonStatus = `실행 중 (PID: ${pid})`; }
    catch { daemonStatus = '중지됨 (stale PID)'; }
  }

  if (!existsSync(STATE_FILE)) {
    console.log(`Ralph 데몬: ${daemonStatus}\n상태 파일 없음 — /ralph start "task" 로 시작하세요.`);
    process.exit(0);
  }

  const s = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  console.log(`
Ralph 데몬 상태
─────────────────────────────────────
데몬:       ${daemonStatus}
상태:       ${s.status || 'ready'}
태스크:     ${s.task}
브랜치:     ${s.branch || '미생성'}
진행:       ${s.currentIteration || 0} / ${s.maxIterations} 반복
예산:       $${(s.totalCostUsd || 0).toFixed(4)} / $${s.budgetCapUsd}
모델:       ${s.model}
체크:       ${s.checkCommand || '없음'}
Stall:      ${s.stallCount || 0} / ${CONFIG.stallThreshold}
시작:       ${s.startedAt ? new Date(s.startedAt).toLocaleString('ko-KR') : '미시작'}
  `);
  process.exit(0);
}

mainLoop().catch(err => {
  log(`[FATAL] ${err.message}`);
  removePid();
  process.exit(1);
});
