#!/usr/bin/env node
/**
 * mesh-engine.mjs — Mesh State Machine Engine v2
 *
 * 상태 기반 조건부 라우팅 + 4가지 실행 패턴 (LangGraph-inspired)
 *
 * 사용법:
 *   node scripts/mesh-engine.mjs --evaluate [--cwd PATH] [--last-cmd CMD]
 *   node scripts/mesh-engine.mjs --set-context tdd.passed=true tdd.coverage=87
 *   node scripts/mesh-engine.mjs --start-chain build-ship
 *   node scripts/mesh-engine.mjs --status
 *   node scripts/mesh-engine.mjs --reset
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, '..');

// ── CLI 파싱 ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const MODE = args.find(a => a.startsWith('--'))?.replace('--', '') || 'evaluate';
const CWD = args.includes('--cwd') ? args[args.indexOf('--cwd') + 1] : DEFAULT_ROOT;
const LAST_CMD = args.includes('--last-cmd') ? args[args.indexOf('--last-cmd') + 1] : null;
const SET_CONTEXT_ARGS = MODE === 'set-context' ? args.filter(a => !a.startsWith('--') && a.includes('=')) : [];
const START_CHAIN_ARG = MODE === 'start-chain' ? args.find(a => !a.startsWith('--')) : null;

const CHAINS_FILE = join(CWD, 'governance/skill-chains.yaml');
const STATE_FILE = join(CWD, '.context/chain-state.json');
const TRACE_FILE = join(CWD, '.context/mesh-trace.jsonl');
const CONTEXT_DIR = join(CWD, '.context');

// ── 파일 I/O ──────────────────────────────────────────────────────────

const readJson = (p, def = {}) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return def; }
};

const writeJson = (p, obj) => {
  try {
    if (!existsSync(dirname(p))) mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    process.stderr.write(`mesh-engine: writeJson failed: ${e.message}\n`);
  }
};

const appendTrace = (entry) => {
  try {
    if (!existsSync(CONTEXT_DIR)) mkdirSync(CONTEXT_DIR, { recursive: true });
    appendFileSync(TRACE_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', 'utf8');
  } catch { /* 추적 실패는 무시 */ }
};

// ── 조건 평가기 ───────────────────────────────────────────────────────

function getPath(obj, path) {
  return path.split('.').reduce((acc, k) => acc?.[k], obj);
}

function parseValue(raw) {
  const s = raw.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  const n = Number(s);
  return isNaN(n) ? s.replace(/^["']|["']$/g, '') : n;
}

function compare(val, op, cmp) {
  switch (op) {
    case '==': return val == cmp;  // eslint-disable-line eqeqeq
    case '!=': return val != cmp;  // eslint-disable-line eqeqeq
    case '>=': return val >= cmp;
    case '<=': return val <= cmp;
    case '>':  return val > cmp;
    case '<':  return val < cmp;
    default:   return true;
  }
}

/**
 * 조건 표현식 평가
 * 예: "tdd.passed == true", "craft.score >= 70"
 * 경로가 없으면 null 반환 (미설정 = 조건 미충족)
 */
function evalCondition(expr, context) {
  if (!expr) return { result: true, reason: null };
  const m = expr.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!m) return { result: true, reason: `파싱 불가: ${expr}` };

  const [, path, op, rawVal] = m;
  const val = getPath(context, path);

  if (val === undefined || val === null) {
    return { result: null, reason: `컨텍스트 미설정: ${path}` };  // null = 미결정
  }

  const cmp = parseValue(rawVal);
  const result = compare(val, op, cmp);
  return { result, reason: result ? `${path}=${val} ${op} ${cmp} ✓` : `${path}=${val} ${op} ${cmp} ✗` };
}

// ── 스텝 정규화 ───────────────────────────────────────────────────────

function normalizeStep(step) {
  if (typeof step === 'string') return { cmd: step };
  if (typeof step === 'object' && step !== null) return step;
  return null;
}

// ── 패턴별 라우팅 ─────────────────────────────────────────────────────

function resolveSequential(chain, state) {
  const steps = (chain.steps || []).map(normalizeStep).filter(Boolean);
  const currentIdx = state.current_step ?? 0;
  const context = state.context || {};

  // 현재 스텝 이후부터 탐색
  for (let i = currentIdx; i < steps.length; i++) {
    const step = steps[i];
    const { cmd, condition, on_fail } = step;

    if (!condition) {
      return { next: cmd, step_idx: i, pattern: 'sequential', reason: '무조건 실행' };
    }

    const { result, reason } = evalCondition(condition, context);

    if (result === true) {
      return { next: cmd, step_idx: i, pattern: 'sequential', reason, condition };
    } else if (result === false && on_fail) {
      return { next: on_fail, step_idx: i, pattern: 'sequential', reason: `on_fail: ${reason}`, condition, is_on_fail: true };
    } else if (result === false) {
      // on_fail 없음 → 스킵하고 다음 스텝
      continue;
    } else {
      // null (미결정) → 조건 스킵하고 일단 제안 (컨텍스트 채우도록 유도)
      return {
        next: cmd,
        step_idx: i,
        pattern: 'sequential',
        reason: `컨텍스트 미설정 — 실행 후 컨텍스트 업데이트 필요 (${reason})`,
        condition,
        context_missing: true
      };
    }
  }

  return { done: true, reason: '체인 완료' };
}

function resolveParallel(chain) {
  const steps = chain.parallel_steps || (chain.steps || []).map(s => typeof s === 'string' ? s : s.cmd);
  return { next: steps, pattern: 'parallel', reason: '병렬 실행' };
}

function resolveLoop(chain, state) {
  const steps = (chain.steps || []).map(normalizeStep).filter(Boolean);
  const context = state.context || {};
  const loopsCount = state.loops_count ?? 0;
  const maxLoops = chain.max_loops ?? 3;
  const exitCondition = chain.exit_condition;

  // 탈출 조건 체크
  if (exitCondition) {
    const { result } = evalCondition(exitCondition, context);
    if (result === true) {
      return { done: true, reason: `탈출 조건 충족: ${exitCondition}`, pattern: 'loop' };
    }
  }

  if (loopsCount >= maxLoops) {
    return { done: true, reason: `최대 루프(${maxLoops}) 도달`, pattern: 'loop' };
  }

  // 루프 내 다음 스텝
  const currentIdx = state.current_step ?? 0;
  if (currentIdx < steps.length) {
    const step = steps[currentIdx];
    return {
      next: step.cmd,
      step_idx: currentIdx,
      pattern: 'loop',
      loops_count: loopsCount,
      loops_remaining: maxLoops - loopsCount,
      reason: `루프 ${loopsCount + 1}/${maxLoops}`
    };
  }

  // 루프 한 사이클 완료 → 처음으로
  return {
    next: steps[0]?.cmd,
    step_idx: 0,
    pattern: 'loop',
    loops_count: loopsCount + 1,
    loops_remaining: maxLoops - loopsCount - 1,
    reason: `루프 재시작 (${loopsCount + 1}/${maxLoops})`
  };
}

function resolveHierarchical(chain) {
  const steps = (chain.steps || []).map(normalizeStep).filter(Boolean);
  const subChain = steps.find(s => s.chain);
  if (subChain) {
    return { next_chain: subChain.chain, pattern: 'hierarchical', reason: `서브체인: ${subChain.chain}` };
  }
  return { done: true, reason: '서브체인 없음', pattern: 'hierarchical' };
}

// ── 핵심 평가 함수 ────────────────────────────────────────────────────

async function evaluate(chains, state, lastCmd) {
  const activeChainId = state.active_chain;

  // 1) 활성 체인이 있으면 진행
  if (activeChainId) {
    const chain = chains.find(c => c.id === activeChainId);
    if (chain) {
      const pattern = chain.pattern || 'sequential';
      let result;
      if (pattern === 'parallel') result = resolveParallel(chain);
      else if (pattern === 'loop') result = resolveLoop(chain, state);
      else if (pattern === 'hierarchical') result = resolveHierarchical(chain);
      else result = resolveSequential(chain, state);

      return { chain, result };
    }
  }

  // 2) 새 체인 시작 가능 여부 (lastCmd 기반)
  if (!lastCmd) return { chain: null, result: null };

  const matched = chains.filter(c => (c.trigger_after || []).includes(lastCmd));
  if (!matched.length) return { chain: null, result: null };

  const chain = matched[0];
  const pattern = chain.pattern || 'sequential';

  // 새 체인 state 초기화 (기존 컨텍스트 보존)
  const newState = {
    active_chain: chain.id,
    current_step: 0,
    pattern,
    context: state.context || {},
    loops_count: 0,
    started_at: new Date().toISOString(),
    history: state.history || []
  };

  let result;
  if (pattern === 'parallel') result = resolveParallel(chain);
  else if (pattern === 'loop') result = resolveLoop(chain, newState);
  else if (pattern === 'hierarchical') result = resolveHierarchical(chain);
  else result = resolveSequential(chain, newState);

  return { chain, result, new_state: newState };
}

// ── 상태 업데이트 ─────────────────────────────────────────────────────

function advanceState(state, chain, result, lastCmd) {
  const updated = { ...state };

  if (result.new_state) {
    Object.assign(updated, result.new_state);
  }

  if (result.done) {
    delete updated.active_chain;
    delete updated.current_step;
    delete updated.pattern;
    updated.loops_count = 0;
    return updated;
  }

  if (!updated.active_chain) {
    updated.active_chain = chain.id;
    updated.pattern = chain.pattern || 'sequential';
    updated.context = updated.context || {};
    updated.loops_count = 0;
  }

  if (result.step_idx !== undefined) {
    updated.current_step = result.step_idx + (result.is_on_fail ? 0 : 1);
  }

  if (result.loops_count !== undefined) {
    updated.loops_count = result.loops_count;
    if (result.step_idx !== undefined) {
      updated.current_step = result.step_idx + 1;
      if (updated.current_step >= (chain.steps || []).length) {
        updated.current_step = 0;
      }
    }
  }

  if (!updated.history) updated.history = [];
  updated.history.push({
    step: result.is_on_fail ? `on_fail:${result.next}` : result.next,
    ts: new Date().toISOString(),
    trigger: lastCmd,
    condition: result.condition || null,
    condition_result: result.is_on_fail ? false : (result.context_missing ? null : true)
  });

  // 최근 20개만 유지
  if (updated.history.length > 20) updated.history = updated.history.slice(-20);

  return updated;
}

// ── 출력 포맷팅 ───────────────────────────────────────────────────────

function formatOutput(chain, result, lastCmd) {
  if (!chain || !result) {
    return '';
  }

  const lines = [];

  if (result.done) {
    if (chain) lines.push(`[Mesh] ${chain.name} 체인 완료!`);
    return lines.join('\n');
  }

  lines.push(`[Mesh] '${lastCmd || chain.id}' → ${chain.name}`);

  if (result.pattern === 'parallel') {
    const cmds = Array.isArray(result.next) ? result.next : [result.next];
    lines.push(`       병렬 권장: ${cmds.map(c => `/${c}`).join(' + ')}`);
  } else if (result.pattern === 'loop') {
    lines.push(`       루프 ${result.loops_count + 1}/${(result.loops_count || 0) + (result.loops_remaining || 0) + 1}`);
    lines.push(`       다음: /${result.next}`);
    if (result.loops_remaining !== undefined) {
      lines.push(`       남은 루프: ${result.loops_remaining}회`);
    }
  } else if (result.pattern === 'hierarchical') {
    lines.push(`       서브체인 위임: /${result.next_chain || result.next}`);
  } else {
    // sequential
    if (result.condition) {
      const indicator = result.is_on_fail ? '✗' : (result.context_missing ? '?' : '✓');
      lines.push(`       ${indicator} 조건: ${result.condition} (${result.reason})`);
    }
    if (result.is_on_fail) {
      lines.push(`       대신 권장: /${result.next}`);
    } else {
      lines.push(`       다음 권장: /${result.next}`);
    }
  }

  return lines.join('\n');
}

// ── --set-context ─────────────────────────────────────────────────────

function setContext(pairs) {
  const state = readJson(STATE_FILE, {});
  if (!state.context) state.context = {};

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const path = pair.substring(0, eqIdx);
    const rawVal = pair.substring(eqIdx + 1);
    const val = parseValue(rawVal);

    // path: "tdd.passed" → state.context.tdd.passed
    const parts = path.split('.');
    let obj = state.context;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
  }

  writeJson(STATE_FILE, state);
  console.log(`[Mesh] 컨텍스트 업데이트:`);
  for (const pair of pairs) console.log(`       ${pair}`);
  console.log(`       저장: ${STATE_FILE}`);
}

// ── --start-chain ─────────────────────────────────────────────────────

function startChain(chainId, chains) {
  const chain = chains.find(c => c.id === chainId);
  if (!chain) {
    console.error(`[Mesh] 체인 없음: ${chainId}`);
    process.exit(1);
  }

  const newState = {
    active_chain: chain.id,
    current_step: 0,
    pattern: chain.pattern || 'sequential',
    context: {},
    loops_count: 0,
    started_at: new Date().toISOString(),
    history: []
  };

  writeJson(STATE_FILE, newState);
  console.log(`[Mesh] 체인 시작: ${chain.name} (${chain.id})`);
  console.log(`       패턴: ${newState.pattern}`);
}

// ── --status ──────────────────────────────────────────────────────────

function showStatus(chains) {
  const state = readJson(STATE_FILE, {});

  if (!state.active_chain) {
    console.log('[Mesh] 활성 체인 없음');
    return;
  }

  const chain = chains.find(c => c.id === state.active_chain);
  console.log(`[Mesh] 활성 체인: ${chain?.name || state.active_chain}`);
  console.log(`       패턴: ${state.pattern || 'sequential'}`);
  console.log(`       스텝: ${state.current_step ?? 0}`);
  if (state.loops_count) console.log(`       루프: ${state.loops_count}회`);

  if (state.context && Object.keys(state.context).length) {
    console.log(`       컨텍스트:`);
    const flat = flattenContext(state.context);
    for (const [k, v] of Object.entries(flat)) {
      console.log(`         ${k} = ${JSON.stringify(v)}`);
    }
  } else {
    console.log(`       컨텍스트: (없음)`);
  }
}

function flattenContext(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(result, flattenContext(v, key));
    else result[key] = v;
  }
  return result;
}

// ── --reset ───────────────────────────────────────────────────────────

function resetState() {
  writeJson(STATE_FILE, {});
  console.log('[Mesh] 체인 상태 초기화');
}

// ── 메인 ─────────────────────────────────────────────────────────────

async function main() {
  // YAML 로드
  let chains = [];
  if (existsSync(CHAINS_FILE)) {
    const text = readFileSync(CHAINS_FILE, 'utf8');
    chains = await loadChains(text);
  }

  const mode = MODE.replace(/-/g, '_');

  if (mode === 'set_context') {
    setContext(SET_CONTEXT_ARGS);
    return;
  }

  if (mode === 'start_chain') {
    if (!START_CHAIN_ARG) { console.error('사용법: --start-chain <chain-id>'); process.exit(1); }
    startChain(START_CHAIN_ARG, chains);
    return;
  }

  if (mode === 'status') {
    showStatus(chains);
    return;
  }

  if (mode === 'reset') {
    resetState();
    return;
  }

  // --evaluate (기본)
  const state = readJson(STATE_FILE, {});

  // stdin에서 last_cmd 추출 가능하면 우선
  let lastCmd = LAST_CMD;
  if (!lastCmd && !process.stdin.isTTY) {
    try {
      const stdin = readFileSync('/dev/stdin', 'utf8').trim();
      if (stdin) {
        const parsed = JSON.parse(stdin);
        lastCmd = parsed.last_cmd || null;
      }
    } catch { /* stdin 없으면 무시 */ }
  }

  const { chain, result, new_state } = await evaluate(chains, state, lastCmd);

  if (!chain || !result) {
    process.exit(0);  // 감지된 체인 없음 — 정상
  }

  // 상태 저장
  const updatedState = advanceState(new_state ? { ...state, ...new_state } : state, chain, result, lastCmd);
  writeJson(STATE_FILE, updatedState);

  // trace 기록
  appendTrace({
    chain: chain.id,
    step: Array.isArray(result.next) ? result.next.join('+') : (result.next || null),
    trigger: lastCmd,
    condition: result.condition || null,
    condition_result: result.is_on_fail ? false : (result.context_missing ? null : (result.condition ? true : null)),
    pattern: result.pattern || 'sequential',
    on_fail: result.is_on_fail ? result.next : null,
    done: result.done || false
  });

  // 출력 (chain-suggester.sh가 이걸 캡처)
  const output = formatOutput(chain, result, lastCmd);
  if (output) console.log(output);
}

// ── YAML 로드 (js-yaml 또는 python3 폴백) ────────────────────────────

async function loadChains(text) {
  // js-yaml 시도
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const yaml = require('js-yaml');
    return yaml.load(text)?.chains || [];
  } catch { /* js-yaml 없음 */ }

  // python3 폴백
  try {
    const { execSync } = await import('child_process');
    const result = execSync(
      `python3 -c "import yaml,json,sys; data=yaml.safe_load(sys.stdin.read()); print(json.dumps(data.get('chains',[]) if data else []))"`,
      { input: text, encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(result.trim());
  } catch { /* python3 없음 */ }

  process.stderr.write('mesh-engine: YAML 파싱 실패 (js-yaml 또는 python3 필요)\n');
  return [];
}

main().catch(e => {
  process.stderr.write(`mesh-engine error: ${e.message}\n`);
  process.exit(1);
});
