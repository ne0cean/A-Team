#!/usr/bin/env node
/**
 * Cortex D1 Backup Script
 * 매일 실행 — D1 전체 데이터를 로컬 JSON으로 백업
 * 복구: node backup-d1.mjs --restore 2026-06-04
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'backups');
const API = 'https://cortex.feat-breeze.workers.dev';
const KEEP_DAYS = 14;

function apiFetch(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function backup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const outFile = path.join(BACKUP_DIR, `${today}.json`);

  console.log(`[${new Date().toISOString()}] Cortex D1 백업 시작...`);

  const snapshot = { date: today, timestamp: new Date().toISOString(), data: {} };

  // Month data — current + next 2 months
  const now = new Date();
  for (let i = -1; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    try {
      snapshot.data[ym] = await apiFetch(`${API}/api/month?ym=${ym}`);
      console.log(`  ✓ ${ym}: ${Object.keys(snapshot.data[ym].days || {}).length} days`);
    } catch (e) {
      console.error(`  ✗ ${ym}: ${e.message}`);
    }
  }

  // Key-value data
  for (const key of ['standing-orders', 'day-frames', 'vision']) {
    try {
      snapshot.data[key] = await apiFetch(`${API}/api/${key}`);
      console.log(`  ✓ ${key}`);
    } catch (e) {
      console.error(`  ✗ ${key}: ${e.message}`);
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
  console.log(`  → 저장: ${outFile} (${Math.round(fs.statSync(outFile).size / 1024)}KB)`);

  // Purge old backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();
  files.slice(KEEP_DAYS).forEach(f => {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`  → 삭제 (${KEEP_DAYS}일 초과): ${f}`);
  });

  console.log(`[완료] 백업 ${files.length}개 보유 (최대 ${KEEP_DAYS}일)`);
  return outFile;
}

async function restore(date) {
  const file = path.join(BACKUP_DIR, `${date}.json`);
  if (!fs.existsSync(file)) {
    console.error(`백업 없음: ${file}`);
    console.log('사용 가능한 백업:', fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).join(', '));
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`백업 날짜: ${snapshot.date} (${snapshot.timestamp})`);
  console.log(`복구할 데이터:`);

  for (const [key, val] of Object.entries(snapshot.data)) {
    if (key.match(/^\d{4}-\d{2}$/)) {
      const days = Object.keys(val.days || {}).length;
      const hasData = Object.values(val.days || {}).some(d =>
        ['outcome','work','ritual','input','hexagonal'].some(c => d[c]?.length > 0)
      );
      console.log(`  ${key}: ${days} days, 데이터: ${hasData ? '있음' : '없음'}`);
    } else {
      console.log(`  ${key}`);
    }
  }

  console.log('\n이 백업으로 복구하려면 수동으로 진행하거나, 특정 날짜/카테고리를 지정해 주세요.');
  console.log('예: node backup-d1.mjs --restore-day 2026-06-04 4 outcome');
}

async function restoreDay(backupDate, day, cat) {
  const file = path.join(BACKUP_DIR, `${backupDate}.json`);
  if (!fs.existsSync(file)) {
    console.error(`백업 없음: ${file}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  const [year, month] = backupDate.split('-');
  const ym = `${year}-${month}`;
  const monthData = snapshot.data[ym];
  if (!monthData) {
    console.error(`백업에 ${ym} 없음`);
    process.exit(1);
  }

  const dayData = monthData.days?.[String(day)];
  if (!dayData) {
    console.error(`백업에 day ${day} 없음`);
    process.exit(1);
  }

  if (cat) {
    console.log(`Day ${day} ${cat} from ${backupDate}:`, JSON.stringify(dayData[cat], null, 2));
  } else {
    console.log(`Day ${day} from ${backupDate}:`, JSON.stringify(dayData, null, 2));
  }
}

// CLI
const args = process.argv.slice(2);
if (args[0] === '--restore' && args[1]) {
  restore(args[1]).catch(console.error);
} else if (args[0] === '--restore-day' && args[1] && args[2]) {
  restoreDay(args[1], args[2], args[3]).catch(console.error);
} else if (args[0] === '--list') {
  if (!fs.existsSync(BACKUP_DIR)) { console.log('백업 없음'); process.exit(0); }
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse();
  files.forEach(f => {
    const stat = fs.statSync(path.join(BACKUP_DIR, f));
    console.log(`  ${f} (${Math.round(stat.size / 1024)}KB)`);
  });
} else {
  backup().catch(e => { console.error(e); process.exit(1); });
}
