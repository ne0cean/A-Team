#!/usr/bin/env node
/**
 * confluence-sync/daemon.mjs
 * Cortex ↔ Confluence 양방향 실시간 동기화 데몬
 *
 * Usage:
 *   node scripts/confluence-sync/daemon.mjs          # 데몬 시작
 *   node scripts/confluence-sync/daemon.mjs --once   # 1회 실행 후 종료
 *   node scripts/confluence-sync/daemon.mjs --push   # Cortex→Confluence 강제 푸시
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CONFIG } from './config.mjs';
import { confGetPage, confGetPageVersion, confUpdatePage, cortexGetMonth, cortexGetStandingOrders, cortexSaveDay } from './api.mjs';
import { renderPage, pageTitle } from './render.mjs';
import { parseConfluencePage, applyUpdatesToMonthData, extractMeta } from './parse.mjs';

const ONCE = process.argv.includes('--once');
const FORCE_PUSH = process.argv.includes('--push');

// ── 상태 파일 ──────────────────────────────────────────────────────────────────
function loadState() {
  if (!existsSync(CONFIG.sync.stateFile)) return {};
  try { return JSON.parse(readFileSync(CONFIG.sync.stateFile, 'utf8')); } catch { return {}; }
}

function saveState(s) {
  writeFileSync(CONFIG.sync.stateFile, JSON.stringify(s, null, 2), 'utf8');
}

// ── 날짜 유틸 ──────────────────────────────────────────────────────────────────
function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function currentYm() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function hashData(data) {
  const str = JSON.stringify(data);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return (h >>> 0).toString(16);
}

// ── 메인 싱크 루프 ─────────────────────────────────────────────────────────────
async function syncOnce() {
  const state = loadState();
  const today = todayStr();
  const ym = currentYm();

  console.log(`[sync] ${new Date().toISOString()} — 시작`);

  // 1. Cortex 데이터 가져오기
  let monthData, soData;
  try {
    [monthData, soData] = await Promise.all([
      cortexGetMonth(ym),
      cortexGetStandingOrders(),
    ]);
  } catch (e) {
    console.error('[sync] Cortex 조회 실패:', e.message);
    return;
  }

  const cortexHash = hashData(monthData);

  // 2. Confluence 페이지 가져오기
  let confPage;
  try {
    confPage = await confGetPage();
  } catch (e) {
    console.error('[sync] Confluence 조회 실패:', e.message);
    return;
  }

  const confVersion = confPage.version?.number ?? 0;
  const confXhtml = confPage.body?.storage?.value ?? '';

  // 3. Confluence → Cortex (Confluence가 더 최신인 경우)
  const lastConfVersion = state.lastConfVersion ?? 0;
  const lastCortexHash = state.lastCortexHash ?? '';

  if (confVersion > lastConfVersion && !FORCE_PUSH) {
    console.log(`[sync] Confluence 변경 감지 (v${lastConfVersion}→v${confVersion})`);
    const updates = parseConfluencePage(confXhtml);
    const dayNum = String(parseInt(today.split('-')[2]));

    if (Object.keys(updates).length > 0) {
      const { modified, updatedMonthData } = applyUpdatesToMonthData(monthData, updates);
      if (modified) {
        console.log(`[sync] Cortex 업데이트: ${Object.keys(updates).length}건`);
        try {
          // 오늘 날짜 데이터만 저장
          await cortexSaveDay(today, updatedMonthData.days?.[dayNum] ?? {});
          monthData = updatedMonthData;
          console.log('[sync] Cortex 저장 완료');
        } catch (e) {
          console.error('[sync] Cortex 저장 실패:', e.message);
        }
      } else {
        console.log('[sync] Cortex 변경 없음 (done 상태 동일)');
      }
    }
  }

  // 4. Cortex → Confluence (Cortex 데이터가 변경된 경우 또는 강제 푸시)
  const cortexChanged = cortexHash !== lastCortexHash;
  const todayChanged = today !== (state.lastToday ?? '');

  if (cortexChanged || todayChanged || FORCE_PUSH || confVersion === 0) {
    console.log(`[sync] Confluence 업데이트 (cortex 변경: ${cortexChanged}, 날짜 변경: ${todayChanged})`);
    const xhtml = renderPage(monthData, soData, today);
    const title = pageTitle(today);
    try {
      await confUpdatePage(title, xhtml, confPage.version.number);
      console.log(`[sync] Confluence 업데이트 완료 → v${confPage.version.number + 1}`);
      saveState({
        lastCortexHash: cortexHash,
        lastConfVersion: confPage.version.number + 1,
        lastToday: today,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[sync] Confluence 업데이트 실패:', e.message);
    }
  } else {
    console.log('[sync] 변경 없음 — 스킵');
    saveState({ ...state, lastConfVersion: confVersion });
  }
}

// ── 실행 ───────────────────────────────────────────────────────────────────────
async function main() {
  if (!CONFIG.confluence.pat) {
    console.error('오류: CONFLUENCE_PAT 환경변수 또는 .env.confluence 파일이 필요합니다.');
    process.exit(1);
  }

  console.log(`Cortex ↔ Confluence 동기화 데몬 시작`);
  console.log(`  페이지: ${CONFIG.confluence.baseUrl}/pages/viewpage.action?pageId=${CONFIG.confluence.pageId}`);
  console.log(`  간격: ${CONFIG.sync.intervalMs / 1000}초`);

  await syncOnce();

  if (ONCE || FORCE_PUSH) {
    process.exit(0);
  }

  setInterval(async () => {
    try { await syncOnce(); } catch (e) { console.error('[sync] 루프 오류:', e.message); }
  }, CONFIG.sync.intervalMs);
}

main().catch(e => { console.error(e); process.exit(1); });
