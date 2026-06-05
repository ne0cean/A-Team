#!/usr/bin/env node
/**
 * check-scheduled-reviews.mjs
 * due date가 오늘 이하인 예약 리뷰를 stdout으로 출력.
 * vibe.md Step 0.75에서 호출.
 *
 * 종료 코드: 0 = due 항목 있음, 1 = 없음 또는 파일 없음
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REVIEWS_PATH = resolve(ROOT, '.context', 'scheduled-reviews.json');

if (!existsSync(REVIEWS_PATH)) {
  process.exit(1);
}

const reviews = JSON.parse(readFileSync(REVIEWS_PATH, 'utf-8'));
// 로컬 타임존 기준 날짜 (UTC가 아닌 사용자 시간대)
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const due = reviews.filter(r => r.due <= today && r.status !== 'done');

if (due.length === 0) {
  process.exit(1);
}

console.log(`scheduled_reviews_due: ${due.length}건`);
for (const r of due) {
  const overdue = r.due < today ? ` (${Math.floor((Date.now() - new Date(r.due).getTime()) / 86400000)}일 초과)` : '';
  console.log(`  - [${r.due}${overdue}] ${r.title}`);
  if (r.context) console.log(`    context: ${r.context}`);
}
