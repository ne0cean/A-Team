#!/usr/bin/env node
/**
 * mesh-patch.mjs — Mesh 자동 패치
 *
 * 사용법:
 *   node scripts/mesh-patch.mjs --dry-run   # 계획만 출력 (기본)
 *   node scripts/mesh-patch.mjs --apply     # 실제 수정
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const HOME = process.env.HOME;
const DRY_RUN = !process.argv.includes('--apply');

const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const write = (p, c) => { if (!DRY_RUN) writeFileSync(p, c, 'utf8'); };
const run = (cmd) => { try { return execSync(cmd, { stdio: ['pipe','pipe','pipe'], timeout: 10000 }).toString().trim(); } catch (e) { return e.message; } };

function log(msg) { console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : `[PATCH]   ${msg}`); }

// ── Patch 1: daily-brief-collect launchd PATH 수정 ─────────────

function patchDailyBriefPath() {
  const plistPath = join(HOME, 'Library/LaunchAgents/com.ateam.daily-brief-collect.plist');
  if (!existsSync(plistPath)) {
    log('P1: com.ateam.daily-brief-collect.plist 없음 — 스킵');
    return false;
  }

  const content = read(plistPath);
  if (!content.includes('<string>node</string>')) {
    log('P1: daily-brief-collect PATH 이미 정상 — 스킵');
    return true;
  }

  // nvm node 경로 탐지
  const nvmNodePath = run(`ls ${HOME}/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1`);
  const nodePath = nvmNodePath || run('which node') || '/usr/local/bin/node';

  if (!nodePath) {
    log('P1: node 경로 탐지 실패 — 수동 수정 필요');
    return false;
  }

  log(`P1: daily-brief-collect.plist — node → ${nodePath}`);
  const patched = content.replace(/<string>node<\/string>/g, `<string>${nodePath}</string>`);
  write(plistPath, patched);

  if (!DRY_RUN) {
    run(`launchctl unload "${plistPath}" 2>/dev/null; launchctl load "${plistPath}"`);
    log(`P1: launchd reload 완료 (${plistPath})`);
  }
  return true;
}

// ── Patch 2: mesh-monthly launchd 신규 ─────────────────────────

function patchMeshMonthly() {
  const plistPath = join(HOME, 'Library/LaunchAgents/com.ateam.mesh-monthly.plist');
  if (existsSync(plistPath)) {
    log('P2: com.ateam.mesh-monthly.plist 이미 존재 — 스킵');
    return true;
  }

  const nodePath = run(`ls ${HOME}/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1`) || run('which node') || '/usr/local/bin/node';
  const scriptPath = join(REPO_ROOT, 'scripts/log-event.mjs');
  const notifyScript = join(REPO_ROOT, 'scripts/notify-telegram.sh');

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ateam.mesh-monthly</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>${nodePath} "${scriptPath}" scheduled_trigger name=mesh 2>/dev/null; echo "[Mesh] 월간 /mesh 점검 필요" | ${existsSync(notifyScript) ? `bash "${notifyScript}"` : 'cat'}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Day</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/com.ateam.mesh-monthly.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/com.ateam.mesh-monthly.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>`;

  log(`P2: com.ateam.mesh-monthly.plist 생성 (매월 1일 09:00)`);
  write(plistPath, plistContent);

  if (!DRY_RUN) {
    run(`launchctl load "${plistPath}"`);
    log('P2: launchd load 완료');
  }
  return true;
}

// ── Patch 3: chain-suggester Stop 훅 등록 ──────────────────────

function patchChainSuggesterHook() {
  const settingsPath = join(HOME, '.claude/settings.json');
  if (!existsSync(settingsPath)) {
    log('P3: ~/.claude/settings.json 없음 — 스킵');
    return false;
  }

  let settings;
  try { settings = JSON.parse(read(settingsPath)); }
  catch { log('P3: settings.json 파싱 실패 — 스킵'); return false; }

  const hooks = settings.hooks || {};
  const stopHooks = hooks.Stop || [];

  // 이미 등록되어 있는지 확인
  const alreadyRegistered = stopHooks.some(group =>
    (group.hooks || []).some(h => h.command && h.command.includes('chain-suggester'))
  );

  if (alreadyRegistered) {
    log('P3: chain-suggester 이미 등록됨 — 스킵');
    return true;
  }

  const chainSuggesterPath = join(REPO_ROOT, 'scripts/hooks/chain-suggester.sh');
  const newHookGroup = {
    hooks: [{
      type: 'command',
      command: `bash "${chainSuggesterPath}"`,
      timeout: 8,
    }]
  };

  hooks.Stop = [newHookGroup, ...stopHooks];
  settings.hooks = hooks;

  log(`P3: chain-suggester Stop 훅 등록 → ${settingsPath}`);
  write(settingsPath, JSON.stringify(settings, null, 2));
  return true;
}

// ── Patch 4: vibe-init.sh mesh 체크 추가 ───────────────────────

function patchVibeInitMeshCheck() {
  const vibeInitPath = join(REPO_ROOT, 'scripts/vibe-init.sh');
  if (!existsSync(vibeInitPath)) {
    log('P4: scripts/vibe-init.sh 없음 — 스킵');
    return false;
  }

  const content = read(vibeInitPath);

  // 이미 mesh 체크 있으면 스킵
  if (content.includes('mesh-health.md') || content.includes('/mesh')) {
    log('P4: vibe-init.sh에 이미 mesh 체크 있음 — 스킵');
    return true;
  }

  // cold-review 체크 블록 찾아서 직후 삽입
  const coldReviewPattern = /(\$DAYS_SINCE_COLD[^\n]*30[^\n]*cold-review[^\n]*\n)/;
  const meshCheck = [
    '',
    '# Mesh 체크 (30일 이상 경과 시)',
    'MESH_HEALTH="$HOME/Projects/a-team/governance/mesh-health.md"',
    'if [ -f "$MESH_HEALTH" ]; then',
    '  LAST_MESH=$(grep "^| 20" "$MESH_HEALTH" | tail -1 | awk -F\'|\' \'{print $2}\' | tr -d \' \')',
    '  if [ -n "$LAST_MESH" ]; then',
    '    MESH_AGE_SEC=$(( $(date +%s) - $(date -j -f "%Y-%m-%d" "$LAST_MESH" +%s 2>/dev/null || echo 0) ))',
    '    MESH_AGE=$(( MESH_AGE_SEC / 86400 ))',
    '    [ "$MESH_AGE" -ge 30 ] && echo "→ /mesh (메시 점검 ${MESH_AGE}일 경과)"',
    '  else',
    '    echo "→ /mesh (첫 메시 점검 필요)"',
    '  fi',
    'fi',
    '',
  ].join('\n');

  let patched = content;
  if (coldReviewPattern.test(content)) {
    patched = content.replace(coldReviewPattern, `$1${meshCheck}`);
    log('P4: vibe-init.sh — cold-review 체크 직후 mesh 체크 삽입');
  } else {
    // cold-review 패턴 못 찾으면 파일 끝에 추가
    patched = content + meshCheck;
    log('P4: vibe-init.sh — 파일 끝에 mesh 체크 추가');
  }

  write(vibeInitPath, patched);
  return true;
}

// ── 메인 ──────────────────────────────────────────────────────────

console.log(`\n━━━ Mesh Patch ${DRY_RUN ? '(Dry Run)' : '(Apply)'} ━━━`);
console.log('패치 4개 실행:\n');

const results = [
  patchDailyBriefPath(),
  patchMeshMonthly(),
  patchChainSuggesterHook(),
  patchVibeInitMeshCheck(),
];

const ok = results.filter(Boolean).length;
console.log(`\n완료: ${ok}/${results.length}`);

if (DRY_RUN) {
  console.log('\n→ 실제 적용: node scripts/mesh-patch.mjs --apply');
}
console.log('━━━━━━━━━━━━━━━━━━━━━\n');
