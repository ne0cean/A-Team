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
