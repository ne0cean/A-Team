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

function apiPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const json = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(json);
    req.end();
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

async function restore(date, apply = false) {
  const file = path.join(BACKUP_DIR, `${date}.json`);
  if (!fs.existsSync(file)) {
    console.error(`백업 없음: ${file}`);
    console.log('사용 가능한 백업:', fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).join(', '));
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`백업 날짜: ${snapshot.date} (${snapshot.timestamp})`);
  console.log(`복구할 데이터:`);

  const kvEndpoints = {
    'standing-orders': '/api/standing-orders',
    'day-frames': '/api/day-frames',
    'vision': '/api/vision',
    'recurring-templates': '/api/recurring-templates',
  };

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

  if (!apply) {
    console.log('\n[dry-run] 실제 복구하려면 --apply 플래그를 추가하세요.');
    console.log('예: node backup-d1.mjs --restore ' + date + ' --apply');
    console.log('예: node backup-d1.mjs --restore-day 2026-06-04 4 outcome --apply');
    return;
  }

  // --apply: 현재 D1 상태를 먼저 자동 백업 후 복구
  console.log('\n[apply] 복구 전 현재 상태 백업 중...');
  await backup();

  console.log('\n[apply] D1에 복구 중...');
  let ok = 0, fail = 0;

  for (const [key, val] of Object.entries(snapshot.data)) {
    if (key.match(/^\d{4}-\d{2}$/)) {
      // Month data
      const res = await apiPost(`${API}/api/month`, { ym: key, data: val });
      if (res.status === 200 && res.body?.ok) {
        console.log(`  ✓ ${key}`);
        ok++;
      } else {
        console.error(`  ✗ ${key}: status=${res.status} body=${JSON.stringify(res.body)}`);
        fail++;
      }
    } else if (kvEndpoints[key]) {
      // KV data: GET current _version first (optimistic locking), then POST
      try {
        const current = await apiFetch(`${API}${kvEndpoints[key]}`);
        const version = current._version;
        const payload = { ...val, _version: version };
        const res = await apiPost(`${API}${kvEndpoints[key]}`, payload);
        if (res.status === 200 && res.body?.ok) {
          console.log(`  ✓ ${key}`);
          ok++;
        } else {
          console.error(`  ✗ ${key}: status=${res.status} body=${JSON.stringify(res.body)}`);
          fail++;
        }
      } catch (e) {
        console.error(`  ✗ ${key}: ${e.message}`);
        fail++;
      }
    }
  }

  console.log(`\n[완료] 복구 ${ok}개 성공, ${fail}개 실패`);
  if (fail > 0) process.exit(1);
}

async function restoreDay(backupDate, day, cat, apply = false) {
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

  if (!apply) {
    console.log('\n[dry-run] 실제 복구하려면 --apply 플래그를 추가하세요.');
    return;
  }

  // --apply: fetch current month, patch specific day, POST back
  console.log('\n[apply] 현재 월 데이터 로드 중...');
  const current = await apiFetch(`${API}/api/month?ym=${ym}`);

  if (!current.days) current.days = {};
  if (cat) {
    // Restore only the specified category for this day
    if (!current.days[String(day)]) current.days[String(day)] = {};
    current.days[String(day)][cat] = dayData[cat];
    console.log(`  → day ${day}.${cat}: ${dayData[cat]?.length ?? 0}개 항목 복구`);
  } else {
    // Restore entire day
    current.days[String(day)] = dayData;
    console.log(`  → day ${day} 전체 복구`);
  }

  const res = await apiPost(`${API}/api/month`, { ym, data: current });
  if (res.status === 200 && res.body?.ok) {
    console.log('[완료] 복구 성공');
  } else {
    console.error(`[실패] status=${res.status} body=${JSON.stringify(res.body)}`);
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);
const applyFlag = args.includes('--apply');

if (args[0] === '--restore' && args[1]) {
  restore(args[1], applyFlag).catch(console.error);
} else if (args[0] === '--restore-day' && args[1] && args[2]) {
  restoreDay(args[1], args[2], args[3] !== '--apply' ? args[3] : undefined, applyFlag).catch(console.error);
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
