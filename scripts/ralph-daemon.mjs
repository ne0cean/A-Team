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
import { createLogger, sleep, findClaude, buildClaudeEnv, atomicWriteJSON, getPermissionMode, callSdkWithAdvisor, SimpleCircuitBreaker, ADVISOR_TOOL_BREAKER_CONFIG } from './daemon-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();
const RESEARCH_DIR = `${PROJECT_ROOT}/.research`;
const STATE_FILE    = `${RESEARCH_DIR}/ralph-state.json`;
const PID_FILE      = `${RESEARCH_DIR}/ralph-daemon.pid`;
const LOG_FILE      = `${RESEARCH_DIR}/ralph-daemon.log`;
const PROGRESS_FILE = `${RESEARCH_DIR}/ralph-progress.md`;

const log = createLogger(LOG_FILE);

// ─── #1: checkCommand 셸 인젝션 방지 ─────────────────────────────────────────
/** checkCommand 허용 명령어 화이트리스트 (첫 토큰 기준) */
export const ALLOWED_CHECK_COMMANDS = new Set([
  'npm', 'pnpm', 'yarn', 'node', 'tsc', 'vitest', 'jest',
  'bash', 'sh', 'test', 'bun', 'deno',
]);

/** checkCommand에 허용되지 않는 셸 메타문자 패턴 */
const SHELL_META_RE = /[|;&`$><\\]/;

/**
 * checkCommand를 안전하게 파싱해 spawnSync 인자로 반환.
 * 셸 메타문자, 경로 트래버설, 비허용 명령 거부.
 * @returns {{ cmd: string, args: string[] } | null} null이면 거부
 */
export function parseCheckCommand(checkCommand) {
  if (!checkCommand || typeof checkCommand !== 'string') return null;
  const trimmed = checkCommand.trim();
  if (!trimmed) return null;

  // 셸 메타문자 감지 → 거부
  if (SHELL_META_RE.test(trimmed)) {
    log(`[SECURITY] checkCommand 거부 — 셸 메타문자 감지: ${trimmed}`);
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  // 경로 트래버설 감지 → 거부
  if (cmd.includes('../') || cmd.includes('..\\')) {
    log(`[SECURITY] checkCommand 거부 — 경로 트래버설 감지: ${cmd}`);
    return null;
  }

  // 화이트리스트 검사 (절대경로/상대경로 시작 제외 후 첫 토큰만)
  const baseName = cmd.replace(/^.*\//, ''); // 마지막 경로 성분
  if (!ALLOWED_CHECK_COMMANDS.has(cmd) && !ALLOWED_CHECK_COMMANDS.has(baseName)) {
    log(`[SECURITY] checkCommand 거부 — 허용 목록 외 명령: ${cmd}`);
    return null;
  }

  return { cmd, args };
}

// ─── #2: 허용 모델 allowlist ───────────────────────────────────────────────────
const ALLOWED_MODELS = new Set([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-haiku-4-5',
]);

// ─── #12: SSRF 방지 — notify URL 검증 ──────────────────────────────────────────
function isNotifyUrlAllowed(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === '169.254.169.254') return false; // AWS/GCP metadata
    if (/^\[?::1\]?$/.test(host) || /^\[?fc/i.test(host)) return false; // IPv6 loopback/private
    return true;
  } catch {
    return false;
  }
}

// ─── 설정 ──────────────────────────────────────────────────────────────────
const CONFIG = {
  interIterationDelayMs: 10_000,     // iteration 간 10초 (스로틀)
  iterationTimeoutMs:    10 * 60_000, // iteration당 최대 10분
  maxBudgetPerIter:      '0.50',      // L4: claude --max-budget-usd 인자
  stallThreshold:        2,           // L2: 연속 no-progress 허용 횟수
  promiseTag:            '<promise>COMPLETE</promise>',
  // SDK Advisor path 기본값 (state.json으로 opt-in)
  useSdkPath:            false,
  advisorEnabled:        false,
  advisorModel:          'claude-opus-4-6',
  advisorMaxUses:        3,
  advisorCacheTtl:       '1h',
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
  // #10: 유니코드 공백 제거 + 한글 제거 + 안전 문자만 허용
  const cleanSlug = state.task
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '') // 제로폭/유니코드 공백 제거
    .replace(/[^a-zA-Z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'task';
  const branch = `ralph/${date}-${cleanSlug}`;
  // 최종 형식 검증
  if (!/^ralph\/\d{4}-\d{2}-\d{2}-[a-zA-Z0-9\-_]+$/.test(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

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
  // #1: sh -c 제거, 토큰 파싱 후 shell:false 실행
  const parsed = parseCheckCommand(checkCommand);
  if (!parsed) {
    log(`[PRE-CHECK] 명령 거부됨 (보안): ${checkCommand}`);
    return false;
  }
  const r = spawnSync(parsed.cmd, parsed.args, {
    cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 60_000, shell: false,
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

  // 모델 결정 (L4 tiering) — #2: ALLOWED_MODELS allowlist 적용
  const MODEL_MAP = {
    haiku:  'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-6',
    opus:   'claude-opus-4-6',
  };
  let model;
  if (MODEL_MAP[state.model]) {
    model = MODEL_MAP[state.model];
  } else if (ALLOWED_MODELS.has(state.model)) {
    model = state.model;
  } else {
    log(`[RALPH] 알 수 없는 모델 "${state.model}" — 기본값(sonnet) 사용`);
    model = MODEL_MAP.sonnet;
  }

  const claudePath = findClaude();
  const { collectContext, buildRalphPrompt } = await import('./ralph-prompts.mjs');

  // #7: SDK 경로용 CircuitBreaker 인스턴스 — ADVISOR_TOOL_BREAKER_CONFIG 설정 활용
  const sdkCircuitBreaker = new SimpleCircuitBreaker({
    name: ADVISOR_TOOL_BREAKER_CONFIG.name,
    failureThreshold: ADVISOR_TOOL_BREAKER_CONFIG.failureThreshold,
    windowMs: ADVISOR_TOOL_BREAKER_CONFIG.windowMs,
    cooldownMs: ADVISOR_TOOL_BREAKER_CONFIG.cooldownMs,
  });

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

    // ── SDK Advisor 분기 (opt-in flag) ───────────────────────────────────────
    // 기존 CLI 경로는 절대 변경하지 않음. useSdkPath && advisorEnabled 일 때만 SDK 경로 사용.
    let result;
    const useSdk = (s.useSdkPath ?? CONFIG.useSdkPath) && (s.advisorEnabled ?? CONFIG.advisorEnabled);

    if (useSdk) {
      // #5: SDK 호출 전 예산 잔량 검사
      const remainingBudget = s.budgetCapUsd - (s.totalCostUsd || 0);
      if (remainingBudget <= 0) {
        log('[RALPH] 예산 소진 — SDK 호출 차단');
        s.stopReason = 'budget-exhausted';
        s.status = 'budget_exceeded';
        saveState(s);
        break;
      }

      // #7: CircuitBreaker 상태 확인
      if (!sdkCircuitBreaker.canExecute()) {
        log('[RALPH] SDK CircuitBreaker OPEN — CLI fallback');
        result = await spawnClaudeProcess(claudePath, prompt, model);
      } else {
      log(`[RALPH] SDK Advisor 경로 사용 (model: ${model})`);
      const sdkResult = await callSdkWithAdvisor({
        task: prompt,
        executorModel: model,
        advisorModel: s.advisorModel || CONFIG.advisorModel,
        maxUses: s.advisorMaxUses ?? CONFIG.advisorMaxUses,
        cacheTtl: s.advisorCacheTtl || CONFIG.advisorCacheTtl,
        maxTokens: 8192,
      });

      if (sdkResult.error) {
        // SDK 실패 → #7 CB 기록 → advisor stats 기록 후 CLI fallback
        log(`[RALPH] SDK Advisor 실패 (${sdkResult.error.code}: ${sdkResult.error.message}) — CLI fallback`);
        sdkCircuitBreaker.recordFailure(); // #7

        // advisorStats 실패 카운트 갱신
        if (!s.advisorStats) s.advisorStats = { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, failures: 0 };
        s.advisorStats.failures = (s.advisorStats.failures || 0) + 1;

        // 연속 실패 3회 이상이면 useSdkPath 자동 비활성화
        const failRate = s.advisorStats.failures / Math.max(1, (s.currentIteration + 1));
        if (failRate >= 0.20 || s.advisorStats.failures >= 3) {
          log(`[RALPH] Advisor 실패율 임계치 초과 — useSdkPath=false 자동 전환`);
          s.useSdkPath = false;
        }

        // CLI fallback
        result = await spawnClaudeProcess(claudePath, prompt, model);
      } else {
        // SDK 성공 → #7 CB 기록 → result 형태로 변환
        sdkCircuitBreaker.recordSuccess(); // #7
        const usage = sdkResult.usage || {};
        log(`[RALPH] SDK 완료: advisorCalls=${sdkResult.advisorCalls} in=${usage.inputTokens} out=${usage.outputTokens}`);

        // advisorStats 업데이트
        if (!s.advisorStats) s.advisorStats = { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, failures: 0, totalCostUsd: 0 };
        s.advisorStats.totalCalls = (s.advisorStats.totalCalls || 0) + sdkResult.advisorCalls;
        s.advisorStats.totalInputTokens = (s.advisorStats.totalInputTokens || 0) + (usage.advisorInputTokens || 0);
        s.advisorStats.totalOutputTokens = (s.advisorStats.totalOutputTokens || 0) + (usage.advisorOutputTokens || 0);

        // SDK 경로 비용 누적 (토큰 기반 추산)
        if (usage.costUsd) {
          s.totalCostUsd = (s.totalCostUsd || 0) + usage.costUsd;
          s.advisorStats.totalCostUsd = (s.advisorStats.totalCostUsd || 0) + usage.costUsd;
        }

        // SDK 결과를 기존 CLI result 형태에 맞게 변환
        // costUsd: SDK 경로에서 이미 s.totalCostUsd에 누적했으므로 0 전달 (하단 누적 로직 중복 방지)
        result = {
          code: 0,
          costUsd: 0,
          rawOutput: sdkResult.content
            ? sdkResult.content.map(c => c.text || '').join('')
            : '',
          sessionId: null,
        };
      }
      } // end sdkCircuitBreaker.canExecute() else block
    } else {
      // 기존 CLI 경로 (변경 없음)
      result = await spawnClaudeProcess(claudePath, prompt, model);
    }

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
  // #12: SSRF 방지 — URL 검증 후 요청
  const rawNotifyUrl = process.env.RALPH_NOTIFY_URL;
  if (rawNotifyUrl) {
    if (!isNotifyUrlAllowed(rawNotifyUrl)) {
      log(`[RALPH] 릴레이 서버 알림 건너뜀 — URL 차단됨 (SSRF 방지): ${rawNotifyUrl}`);
    } else {
      try {
        await fetch(rawNotifyUrl, {
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
    }
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
