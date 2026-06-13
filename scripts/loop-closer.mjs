#!/usr/bin/env node
/**
 * loop-closer.mjs — 자율 지속학습 루프 CLI
 *
 * 사용: npx tsx scripts/loop-closer.mjs [--trigger=daily|campaign|manual] [--dry-run] [--json] [--root=.]
 *
 * lib/loop-closer.ts 순수 로직을 실 IO와 결합. launchd 일일 실행용.
 * 전 단계 try/catch + exit 0 (launchd crash-loop 방지 — 메모리 레슨).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';
import { spawnSync } from 'child_process';

try { register('tsx/esm', import.meta.url); } catch { /* tsx already loaded */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = {};
for (const a of args) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? true; }
}
const ROOT = flags.root ? path.resolve(flags.root) : REPO_ROOT;
const trigger = flags.trigger || 'manual';

const lib = await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'loop-closer.ts')).href);

const io = {
  readFile(rel) {
    const abs = path.join(ROOT, rel);
    return existsSync(abs) ? readFileSync(abs, 'utf-8') : null;
  },
  writeFile(rel, content) {
    const abs = path.join(ROOT, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  },
  appendFile(rel, content) {
    const abs = path.join(ROOT, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    appendFileSync(abs, content);
  },
  exec(cmd, argv) {
    const r = spawnSync(cmd, argv, { cwd: ROOT, stdio: 'ignore' });
    return { status: r.status ?? 1 };
  },
  log(event, extra) {
    if (ROOT !== REPO_ROOT) return; // 격리 root에선 로깅 스킵
    spawnSync('node', ['scripts/log-event.mjs', event, ...Object.entries(extra).map(([k, v]) => `${k}=${v}`)], { cwd: REPO_ROOT, stdio: 'ignore' });
  },
};

try {
  const report = lib.runLoopCloser(io, { trigger, now: new Date().toISOString(), dryRun: !!flags['dry-run'] });
  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`loop-closer [${trigger}]${flags['dry-run'] ? ' (dry-run)' : ''}`);
    console.log(`  에스컬레이션: ${report.escalations.length}건`);
    console.log(`  coverage 제안: ${report.proposals.length}건`);
    console.log(`  Pre-flight 아카이브: ${report.preflight_archived ?? '없음'}`);
    console.log(`  gardener 호출 필요: ${report.gardener_needed ? '예' : '아니오'}`);
  }
  process.exit(0);
} catch (e) {
  console.error(`loop-closer error (무시, exit 0): ${e?.message ?? e}`);
  process.exit(0);
}
