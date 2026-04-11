// daemon-utils.mjs
// Research/Ralph 데몬 공통 유틸리티

import { readFileSync, writeFileSync, existsSync, appendFileSync, renameSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

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
const DANGEROUS_ENV_VARS = ['CLAUDECODE', 'NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES'];
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
  } = options;

  // 공식 권장 advisor 시스템 프롬프트 (100단어 + 타이밍)
  const ADVISOR_SYSTEM = `You have access to an advisor tool backed by a stronger reviewer model. Call advisor BEFORE substantive work — before writing, before committing to an interpretation. Also call advisor when the task is complete, when stuck, or when considering a change of approach. On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done.

The advisor should respond in under 100 words and use enumerated steps, not explanations.`;

  const fullSystem = systemPrompt
    ? `${ADVISOR_SYSTEM}\n\n${systemPrompt}`
    : ADVISOR_SYSTEM;

  try {
    // Dynamic import — SDK는 optional dependency
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();

    const response = await client.beta.messages.create({
      model: executorModel,
      max_tokens: maxTokens,
      betas: ['advisor-tool-2026-03-01'],
      system: fullSystem,
      tools: [{
        type: 'advisor_20260301',
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
