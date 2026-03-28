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
export function buildClaudeEnv() {
  const env = { ...process.env };
  // 중첩 세션 감지 우회
  delete env.CLAUDECODE;
  return env;
}

// ─── 경로 안전 검증 ─────────────────────────────────────────────────────────
// path traversal 방지: projectRoot 하위 경로만 허용
export function safePath(projectRoot, relativePath) {
  const resolved = resolve(projectRoot, relativePath);
  if (!resolved.startsWith(projectRoot)) {
    throw new Error(`경로 트래버설 감지: ${relativePath}`);
  }
  return resolved;
}
