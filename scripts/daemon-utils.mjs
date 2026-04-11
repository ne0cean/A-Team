// daemon-utils.mjs
// Research/Ralph 데몬 공통 유틸리티

import { readFileSync, writeFileSync, existsSync, appendFileSync, renameSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 로거 팩토리 ──────────────────────────────────────────────────────────
export function createLogger(logFile) {
  return function log(msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${msg}\n`;
    process.stdout.write(line);
    appendFileSync(logFile, line);
  };
}

// ─── sleep ──────────────────────────────────────────────────────────────────
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Atomic 파일 저장 ───────────────────────────────────────────────────────
// tmp 파일에 쓰고 rename으로 교체 — 프로세스 중단 시 파일 손상 방지
export function atomicWriteJSON(filePath, data) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, filePath);
}

// ─── Claude CLI 경로 탐색 ──────────────────────────────────────────────────
export function findClaude() {
  // 환경 변수 기반 동적 경로 (하드코딩 제거)
  const home = process.env.HOME || '/Users/default';
  const candidates = [
    `${home}/.nvm/versions/node/${process.versions?.node ? `v${process.versions.node}` : 'current'}/bin/claude`,
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  const result = spawnSync('which', ['claude'], { encoding: 'utf8' });
  return result.stdout?.trim() || 'claude';
}

// ─── Claude 실행 환경 ───────────────────────────────────────────────────────
// 위험한 코드 주입 환경변수를 제거하고 Claude 프로세스에 전달
// #4: ANTHROPIC_BASE_URL 추가 — 자식 프로세스에서 프록시 하이재킹 방지
const DANGEROUS_ENV_VARS = ['CLAUDECODE', 'NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES', 'ANTHROPIC_BASE_URL'];
export function buildClaudeEnv() {
  const env = { ...process.env };
  for (const key of DANGEROUS_ENV_VARS) delete env[key];
  return env;
}

// ─── 경로 안전 검증 ─────────────────────────────────────────────────────────
// path traversal 방지: projectRoot 하위 경로만 허용
export function safePath(projectRoot, relativePath) {
  const resolved = resolve(projectRoot, relativePath);
  if (resolved !== projectRoot && !resolved.startsWith(projectRoot + '/')) {
    throw new Error(`경로 트래버설 감지: ${relativePath}`);
  }
  return resolved;
}

// ─── Permission Mode 결정 ──────────────────────────────────────────────────
// Auto mode 우선, 미지원 환경에서는 bypassPermissions 폴백
// 환경 변수 CLAUDE_PERMISSION_MODE 로 오버라이드 가능
// 결과를 프로세스 내 캐시하여 반복 서브프로세스 스폰 방지 (프로세스 경계를 넘지 않음)
const ALLOWED_MODES = ['auto', 'bypassPermissions', 'acceptEdits', 'plan'];
let _cachedPermMode = null;

export function getPermissionMode() {
  if (_cachedPermMode !== null) return _cachedPermMode;

  // 1) 환경변수 오버라이드 (허용 목록 검증)
  const envMode = process.env.CLAUDE_PERMISSION_MODE;
  if (envMode) {
    if (!ALLOWED_MODES.includes(envMode)) {
      throw new Error(`Invalid CLAUDE_PERMISSION_MODE: "${envMode}". Allowed: ${ALLOWED_MODES.join(', ')}`);
    }
    _cachedPermMode = envMode;
    return _cachedPermMode;
  }

  // 2) auto mode 가용성 확인: claude --help 출력에서 permission 컨텍스트 내 auto 매칭
  const claudePath = findClaude();
  try {
    const r = spawnSync(claudePath, ['--help'], { encoding: 'utf8', timeout: 10_000 });
    const output = (r.stdout || '') + (r.stderr || '');
    if (/permission[- ]mode.*\bauto\b/i.test(output) || /\bauto\b.*permission/i.test(output)) {
      _cachedPermMode = 'auto';
      return 'auto';
    }
  } catch {}

  _cachedPermMode = 'bypassPermissions';
  return 'bypassPermissions';
}

// ─── 토큰 기반 비용 추정 ────────────────────────────────────────────────────
// #6: lib/model-pricing.json 단일 진실 공급원 로드 (리터럴 이중 정의 제거)
const MODEL_PRICING_MIRROR = JSON.parse(
  readFileSync(new URL('../lib/model-pricing.json', import.meta.url), 'utf-8')
);
const SONNET_FALLBACK = MODEL_PRICING_MIRROR['claude-sonnet-4-6'];

/** 단일 호출의 토큰 → USD (lib/cost-tracker.ts estimateCostUsd 미러) */
function _estimateCostUsd({ model, inputTokens, outputTokens, cacheReadInputTokens = 0, cacheCreationInputTokens = 0 }) {
  const p = MODEL_PRICING_MIRROR[model] ?? SONNET_FALLBACK;
  const M = 1_000_000;
  const cost =
    (inputTokens * p.inputPerMillion) / M +
    (outputTokens * p.outputPerMillion) / M +
    (cacheReadInputTokens * p.inputPerMillion * p.cacheReadMultiplier) / M +
    (cacheCreationInputTokens * p.inputPerMillion * p.cacheWriteMultiplier) / M;
  return Number(cost.toFixed(6));
}

/** iterations[] 전체 합산 USD (lib/cost-tracker.ts estimateIterationsCostUsd 미러) */
function _estimateIterationsCostUsd(iterations, executorModel) {
  let total = 0;
  for (const iter of (iterations || [])) {
    // #8: 알 수 없는 타입은 가장 비싼 가격(Opus)으로 보수적 추산
    let model;
    if (iter.type === 'advisor_message') {
      model = iter.model ?? 'claude-opus-4-6';
    } else if (iter.type === 'message') {
      model = executorModel;
    } else {
      model = 'claude-opus-4-6'; // 알 수 없는 타입 — 보수적으로 가장 비싼 가격
    }
    total += _estimateCostUsd({
      model,
      inputTokens: iter.input_tokens ?? 0,
      outputTokens: iter.output_tokens ?? 0,
      cacheReadInputTokens: iter.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: iter.cache_creation_input_tokens ?? 0,
    });
  }
  return Number(total.toFixed(6));
}

// ─── #15: Advisor beta header 상수 (환경변수 오버라이드 가능) ──────────────────
export const ADVISOR_BETA_HEADER = process.env.A_TEAM_ADVISOR_BETA_HEADER || 'advisor-tool-2026-03-01';
export const ADVISOR_TOOL_TYPE = process.env.A_TEAM_ADVISOR_TOOL_TYPE || 'advisor_20260301';

// ─── Advisor Tool Breaker 설정 (lib/circuit-breaker.ts ADVISOR_TOOL_BREAKER_CONFIG 미러) ────
// TS 버전과 동일 설정값 유지. JSON import 미지원 환경 대응용 JS 미러.
// 변경 시 lib/circuit-breaker.ts와 동기화 필수.
export const ADVISOR_TOOL_BREAKER_CONFIG = {
  name: 'advisor-tool',
  failureThreshold: 0.20,      // 20% 실패율
  windowMs: 5 * 60 * 1000,     // 5분 창
  cooldownMs: 10 * 60 * 1000,  // OPEN 후 10분 쿨다운
};

// #4: SDK 공식 엔드포인트 상수 (프록시 하이재킹 방지)
export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

// ─── #7: SimpleCircuitBreaker — JS 경량 미러 ──────────────────────────────────
// lib/circuit-breaker.ts의 TS 버전과 동일 인터페이스 (슬라이딩 윈도우 기반)
export class SimpleCircuitBreaker {
  constructor({ name, failureThreshold = 0.5, windowMs = 60_000, cooldownMs = 30_000 } = {}) {
    this.name = name || 'default';
    this.failureThreshold = failureThreshold;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
    this.events = []; // [{ ts, success }]
    this.state = 'CLOSED';
    this.openedAt = null;
  }

  recordSuccess() {
    this.events.push({ ts: Date.now(), success: true });
    this._trim();
    this._maybeClose();
  }

  recordFailure() {
    this.events.push({ ts: Date.now(), success: false });
    this._trim();
    this._maybeOpen();
  }

  canExecute() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  _trim() {
    const cutoff = Date.now() - this.windowMs;
    this.events = this.events.filter(e => e.ts >= cutoff);
  }

  _maybeOpen() {
    if (this.events.length < 3) return;
    const fails = this.events.filter(e => !e.success).length;
    if (fails / this.events.length >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }

  _maybeClose() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.openedAt = null;
    }
  }
}

// ─── Advisor Tool SDK 호출 ──────────────────────────────────────────────────
// Anthropic SDK 직접 호출 + Advisor tool 사용 (beta API)
// @anthropic-ai/sdk 는 optional dependency — import 실패 시 에러 반환
/**
 * @param {object} options
 * @param {string} options.task - executor 프롬프트
 * @param {string} [options.executorModel='claude-sonnet-4-6']
 * @param {string} [options.advisorModel='claude-opus-4-6']
 * @param {number} [options.maxUses=3]
 * @param {'5m'|'1h'} [options.cacheTtl='1h']
 * @param {string} [options.systemPrompt] - 추가 시스템 프롬프트
 * @param {number} [options.maxTokens=4096]
 * @returns {Promise<{content, usage, advisorCalls: number, error: {message:string,code:string}|null}>}
 */
export async function callSdkWithAdvisor(options) {
  const {
    task,
    executorModel = 'claude-sonnet-4-6',
    advisorModel = 'claude-opus-4-6',
    maxUses = 3,
    cacheTtl = '1h',
    systemPrompt = '',
    maxTokens = 4096,
    _startMs = Date.now(), // 내부 타이밍 추적
  } = options;

  // #4: API 키 명시 검증
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      content: null,
      usage: null,
      advisorCalls: 0,
      error: { message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않음', code: 'missing_api_key' }
    };
  }

  // 공식 권장 advisor 시스템 프롬프트 (100단어 + 타이밍)
  const ADVISOR_SYSTEM = `You have access to an advisor tool backed by a stronger reviewer model. Call advisor BEFORE substantive work — before writing, before committing to an interpretation. Also call advisor when the task is complete, when stuck, or when considering a change of approach. On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done.

The advisor should respond in under 100 words and use enumerated steps, not explanations.`;

  const fullSystem = systemPrompt
    ? `${ADVISOR_SYSTEM}\n\n${systemPrompt}`
    : ADVISOR_SYSTEM;

  try {
    // Dynamic import — SDK는 optional dependency
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    // #4: baseURL 명시로 ANTHROPIC_BASE_URL 환경변수 무력화
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: DEFAULT_ANTHROPIC_BASE_URL,
    });

    const response = await client.beta.messages.create({
      model: executorModel,
      max_tokens: maxTokens,
      betas: [ADVISOR_BETA_HEADER],  // #15: 상수 사용
      system: fullSystem,
      tools: [{
        type: ADVISOR_TOOL_TYPE,     // #15: 상수 사용
        name: 'advisor',
        model: advisorModel,
        max_uses: maxUses,
        caching: { type: 'ephemeral', ttl: cacheTtl }
      }],
      messages: [{ role: 'user', content: task }]
    });

    // iterations에서 advisor 통계 추출
    const iterations = response.usage?.iterations || [];
    const advisorIters = iterations.filter(it => it.type === 'advisor_message');
    const advisorCalls = advisorIters.length;
    const advisorInputTokens = advisorIters.reduce((s, it) => s + (it.input_tokens || 0), 0);
    const advisorOutputTokens = advisorIters.reduce((s, it) => s + (it.output_tokens || 0), 0);
    const cacheReadInputTokens = advisorIters.reduce((s, it) => s + (it.cache_read_input_tokens || 0), 0);
    const cacheCreationInputTokens = advisorIters.reduce((s, it) => s + (it.cache_creation_input_tokens || 0), 0);

    // #15: advisor 호출 0회이고 5분 이상 실행 시 무음 실패 경고
    const elapsedMs = Date.now() - _startMs;
    if (advisorCalls === 0 && elapsedMs >= 5 * 60_000) {
      process.stderr.write(`[daemon-utils] 경고: advisor 호출 0회, 실행 ${Math.round(elapsedMs / 60000)}분 경과 — 무음 실패 가능성\n`);
    }

    // iterations[] 전체 토큰 → 비용 추산 (executor + advisor 모두 포함)
    const costUsd = _estimateIterationsCostUsd(iterations, executorModel);

    return {
      content: response.content,
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        advisorCalls,
        advisorInputTokens,
        advisorOutputTokens,
        cacheReadInputTokens,
        cacheCreationInputTokens,
        costUsd,
      },
      advisorCalls,
      error: null
    };
  } catch (err) {
    return {
      content: null,
      usage: null,
      advisorCalls: 0,
      error: { message: err.message, code: err.code || 'unknown' }
    };
  }
}
