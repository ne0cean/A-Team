#!/usr/bin/env node
/**
 * cortex-health — 주간 진단 리포트
 * Cortex 시스템의 건강 상태를 측정하고 문제를 조기 발견
 *
 * Usage: node scripts/cortex-health.mjs
 * 출력: .context/briefs/cortex-health-{date}.md
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CORTEX = join(process.env.HOME, 'Projects/a-team/cortex');
const CATALOG = join(CORTEX, 'catalog.jsonl');
const ACCESS_LOG = join(CORTEX, 'access-log.jsonl');
const BRIEFS = join(process.env.HOME, 'Projects/a-team/.context/briefs');
const TODAY = new Date().toISOString().slice(0, 10);

function loadJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

const catalog = loadJsonl(CATALOG);
const accessLog = loadJsonl(ACCESS_LOG);

// --- Metrics ---

// 1. Tidy progress
const totalFiles = catalog.length;
const reviewed = catalog.filter(e => e.reviewed).length;
const tidyRate = totalFiles ? ((reviewed / totalFiles) * 100).toFixed(1) : 0;
const deletedCount = catalog.filter(e => e.action === 'delete').length;
const archivedCount = catalog.filter(e => e.action === 'archive').length;

// 2. Inbox health
const inboxDir = join(CORTEX, 'inbox');
let inboxCount = 0;
let inboxOldest = null;
if (existsSync(inboxDir)) {
  const inboxFiles = readdirSync(inboxDir).filter(f => f.endsWith('.md'));
  inboxCount = inboxFiles.length;
  if (inboxCount > 0) {
    const dates = inboxFiles.map(f => {
      try { return statSync(join(inboxDir, f)).mtime; } catch { return new Date(); }
    });
    inboxOldest = Math.floor((Date.now() - Math.min(...dates)) / 86400000);
  }
}

// 3. Access patterns (last 7 days)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
const recentAccess = accessLog.filter(e => e.ts > weekAgo);
const uniqueAccessed = new Set(recentAccess.map(e => e.path)).size;
const accessFreq = {};
recentAccess.forEach(e => { accessFreq[e.path] = (accessFreq[e.path] || 0) + 1; });
const hotNotes = Object.entries(accessFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
const coldCount = totalFiles - new Set(accessLog.map(e => e.path)).size;

// 4. Structure health
const emptyFiles = catalog.filter(e => e.lines <= 3).length;
const largeFiles = catalog.filter(e => e.bytes > 50000).length;
const untitled = catalog.filter(e => /untitled/i.test(e.path)).length;

// 5. Pillar balance
const pillarCounts = {};
catalog.forEach(e => {
  const match = e.path.match(/^hexagonal pillars_rocks_helm\/(\d-[^/]+)/);
  if (match) pillarCounts[match[1]] = (pillarCounts[match[1]] || 0) + 1;
});

// --- Health Score ---
let score = 100;
const issues = [];

// Inbox overflow (>20 items or >7 days old)
if (inboxCount > 20) { score -= 15; issues.push(`inbox ${inboxCount}개 과적 (>20)`); }
if (inboxOldest > 7) { score -= 10; issues.push(`inbox 최고령 ${inboxOldest}일 (>7일)`); }

// Tidy stall (<5% per month projected)
if (tidyRate < 5 && totalFiles > 100) { score -= 10; issues.push(`tidy ${tidyRate}% — 진행 느림`); }

// Dead notes (>80% never accessed)
const deadRatio = totalFiles ? (coldCount / totalFiles * 100).toFixed(0) : 0;
if (deadRatio > 90) { score -= 10; issues.push(`${deadRatio}% 노트 한 번도 접근 안 됨`); }

// Structural noise
if (emptyFiles > 20) { score -= 5; issues.push(`빈 파일 ${emptyFiles}개`); }
if (untitled > 10) { score -= 5; issues.push(`untitled 파일 ${untitled}개`); }

// Access diversity (if logging active but only touching same 5 files)
if (recentAccess.length > 20 && uniqueAccessed < 5) {
  score -= 5; issues.push(`주간 접근 다양성 낮음 (${uniqueAccessed}개만 사용)`);
}

score = Math.max(0, score);

// --- Tier 2 readiness ---
const tier2Ready = accessLog.length >= 100;
const tier2Msg = tier2Ready
  ? `접근 로그 ${accessLog.length}건 축적 — Tier 2 (co-access 분석) 가능`
  : `접근 로그 ${accessLog.length}/100건 — Tier 2까지 ${100 - accessLog.length}건 더 필요`;

// --- Report ---
const report = `# Cortex Health Report — ${TODAY}

## Score: ${score}/100 ${score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'}

## Tidy 진행
- 전체: ${totalFiles}개 / 리뷰 완료: ${reviewed}개 (${tidyRate}%)
- 삭제: ${deletedCount}개 / 보관: ${archivedCount}개
- 예상 완료: ${reviewed > 0 ? Math.ceil((totalFiles - reviewed) / (reviewed / Math.max(1, Math.floor((Date.now() - new Date('2026-05-26').getTime()) / 86400000)))) + '일' : '측정 불가 (아직 시작 안 함)'}

## Inbox
- 현재: ${inboxCount}개
- 최고령: ${inboxOldest !== null ? inboxOldest + '일' : 'N/A'}

## 접근 패턴 (최근 7일)
- 접근 이벤트: ${recentAccess.length}건
- 고유 노트: ${uniqueAccessed}개
- 한 번도 접근 안 된 노트: ${coldCount}개 (${deadRatio}%)
${hotNotes.length ? '\n### Hot Notes\n' + hotNotes.map(([p, c]) => `- ${p} (${c}회)`).join('\n') : ''}

## 구조
- 빈 파일 (≤3줄): ${emptyFiles}개
- 대용량 (>50KB): ${largeFiles}개
- untitled: ${untitled}개

## 기둥별 분포
${Object.entries(pillarCounts).sort().map(([k, v]) => `- ${k}: ${v}개`).join('\n')}

## Tier 2 준비
${tier2Msg}

## 이슈
${issues.length ? issues.map(i => `- ⚠️ ${i}`).join('\n') : '- 없음 ✅'}

## 권고
${score < 60 ? '- 🔴 긴급: inbox 정리 + tidy 재개 필요' : ''}
${inboxCount > 10 ? '- inbox 과적 — /tidy-inbox 실행 권장' : ''}
${tidyRate < 10 ? '- tidy 진행 느림 — 일일 목표 5개 유지' : ''}
${tier2Ready ? '- 🟢 Tier 2 전환 가능 — co-access 분석 활성화 검토' : ''}
${!issues.length && score >= 80 ? '- 현재 상태 양호. 유지.' : ''}
`;

writeFileSync(join(BRIEFS, `cortex-health-${TODAY}.md`), report);
console.log(`[cortex-health] Score: ${score}/100`);
console.log(`[cortex-health] Issues: ${issues.length}`);
console.log(`[cortex-health] Report: .context/briefs/cortex-health-${TODAY}.md`);
if (tier2Ready) console.log(`[cortex-health] Tier 2 ready (${accessLog.length} access logs)`);
