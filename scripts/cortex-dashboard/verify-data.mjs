#!/usr/bin/env node
/**
 * Cortex post-deploy data integrity check.
 *
 * Usage:
 *   node verify-data.mjs              # check current month
 *   node verify-data.mjs 2026-05      # check specific month
 *   node verify-data.mjs --all        # check current + prev month
 *
 * Exit 0 = OK, Exit 1 = integrity issue detected
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'backups');
const API = 'https://cortex.feat-breeze.workers.dev';

function apiFetch(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse failed: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function countItems(days) {
  return Object.values(days || {}).reduce((n, dd) => {
    for (const k of Object.keys(dd)) {
      if (Array.isArray(dd[k])) n += dd[k].length;
    }
    return n;
  }, 0);
}

function countDone(days) {
  return Object.values(days || {}).reduce((n, dd) => {
    for (const k of Object.keys(dd)) {
      if (Array.isArray(dd[k])) n += dd[k].filter(i => i.done).length;
    }
    return n;
  }, 0);
}

async function checkMonth(ym) {
  const errors = [];
  const warnings = [];

  // 1. API reachable + valid JSON
  let res;
  try {
    res = await apiFetch(`${API}/api/month?ym=${ym}`);
  } catch (e) {
    errors.push(`GET /api/month?ym=${ym} failed: ${e.message}`);
    return { ym, errors, warnings };
  }

  if (res.status !== 200) {
    errors.push(`HTTP ${res.status} from /api/month?ym=${ym}`);
    return { ym, errors, warnings };
  }

  const data = res.body;

  // 2. days object exists
  if (!data.days || typeof data.days !== 'object') {
    errors.push(`No valid days object in response`);
    return { ym, errors, warnings };
  }

  const dayCount = Object.keys(data.days).length;
  const itemCount = countItems(data.days);
  const doneCount = countDone(data.days);

  // 2b. Structural invariants — catch cross-month clone + phantom/out-of-range days.
  // These are the exact corruption signatures of the 2026-06→2026-07 clone incident.
  const [yy, mm] = ym.split('-').map(Number);
  const dim = new Date(yy, mm, 0).getDate(); // real days in this month
  if (data.month && data.month !== ym) {
    errors.push(`month field mismatch: stored .month="${data.month}" but key="${ym}" — cross-month clone`);
  }
  const KNOWN_ARRAY_KEYS = new Set(['ritual', 'input', 'work', 'hexagonal', 'outcome', 'source', 'events', 'workout']);
  for (const dk of Object.keys(data.days)) {
    const dn = Number(dk);
    if (!Number.isInteger(dn) || dn < 1 || dn > dim) {
      errors.push(`out-of-range day key "${dk}" (${ym} has ${dim} days) — phantom day`);
    }
    const dd = data.days[dk] || {};
    for (const k of Object.keys(dd)) {
      if (Array.isArray(dd[k]) && !k.startsWith('_') && !KNOWN_ARRAY_KEYS.has(k)) {
        warnings.push(`day ${dk}: unknown array category "${k}"`);
      }
    }
  }

  // 3. Compare against local backup if available
  const latestBackup = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse()[0]
    : null;

  if (latestBackup) {
    try {
      const snapshot = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, latestBackup), 'utf8'));
      const backupMonthData = snapshot.data?.[ym];
      if (backupMonthData) {
        const backupItemCount = countItems(backupMonthData.days);
        const backupDoneCount = countDone(backupMonthData.days);

        // Warn if total items shrank by >20% vs backup
        if (backupItemCount > 10 && itemCount < backupItemCount * 0.8) {
          warnings.push(`Item count dropped: backup=${backupItemCount} current=${itemCount} (${Math.round(itemCount/backupItemCount*100)}%)`);
        }
        // Error if done count dropped significantly (data wipe signal)
        if (backupDoneCount > 5 && doneCount < backupDoneCount * 0.5) {
          errors.push(`done=true count dropped significantly: backup=${backupDoneCount} current=${doneCount} — possible stale write wipe`);
        }
      }
    } catch (e) {
      warnings.push(`Could not read backup ${latestBackup}: ${e.message}`);
    }
  }

  const summary = `${ym}: ${dayCount} days, ${itemCount} items, ${doneCount} done`;
  return { ym, errors, warnings, summary };
}

async function main() {
  const args = process.argv.slice(2);
  const checkAll = args.includes('--all');
  const now = new Date();

  let months = [];
  if (checkAll) {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    months = [
      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`,
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    ];
  } else if (args[0] && /^\d{4}-\d{2}$/.test(args[0])) {
    months = [args[0]];
  } else {
    months = [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  }

  let totalErrors = 0;

  for (const ym of months) {
    const result = await checkMonth(ym);
    if (result.errors.length > 0) {
      console.error(`FAIL [${ym}]:`);
      result.errors.forEach(e => console.error(`  ✗ ${e}`));
      totalErrors += result.errors.length;
    } else {
      console.log(`PASS ${result.summary}`);
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.warn(`  ⚠ ${w}`));
    }
  }

  if (totalErrors > 0) {
    console.error(`\n무결성 이상 감지: ${totalErrors}개 오류. 배포 롤백 또는 복구 검토 필요.`);
    console.error('복구: node scripts/cortex-dashboard/backup-d1.mjs --list');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('verify-data error:', e.message);
  process.exit(1);
});
