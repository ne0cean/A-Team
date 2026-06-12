#!/usr/bin/env node
/**
 * analytics-sqlite.mjs
 * analytics.jsonl → SQLite 마이그레이션 + 쿼리 CLI
 *
 * 서브커맨드:
 *   migrate                          jsonl → SQLite (멱등)
 *   insert <json-string>             단건 삽입
 *   query  <sql>                     임의 SELECT
 *   stats                            요약 통계
 *   recent [--limit N] [--event E]   최근 이벤트
 */

import { DatabaseSync } from 'node:sqlite';
import { createReadStream } from 'node:fs';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DB_PATH   = path.join(ROOT, '.context', 'analytics.db');
const JSONL_PATH = path.join(ROOT, '.context', 'analytics.jsonl');

// ── DB 초기화 ──────────────────────────────────────────────────────────────
function getDB() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ts          TEXT NOT NULL,
      event       TEXT NOT NULL,
      skill       TEXT,
      repo        TEXT,
      data        TEXT,
      imported_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique ON events(ts, event, skill);
    CREATE INDEX IF NOT EXISTS idx_ts    ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_event ON events(event);
    CREATE INDEX IF NOT EXISTS idx_skill ON events(skill);
  `);
  return db;
}

// ── 공통 유틸 ─────────────────────────────────────────────────────────────
function parseRow(raw) {
  let obj;
  try { obj = JSON.parse(raw); } catch { return null; }
  const { ts, event, skill, repo, ...rest } = obj;
  if (!ts || !event) return null;
  return {
    ts,
    event,
    skill: skill ?? null,
    repo:  repo  ?? null,
    data:  Object.keys(rest).length ? JSON.stringify(rest) : null,
  };
}

// ── 서브커맨드: migrate ────────────────────────────────────────────────────
async function cmdMigrate() {
  if (!existsSync(JSONL_PATH)) {
    console.error(`analytics.jsonl not found: ${JSONL_PATH}`);
    process.exit(1);
  }

  const db = getDB();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO events (ts, event, skill, repo, data)
    VALUES (:ts, :event, :skill, :repo, :data)
  `);

  // 전체 줄 수 (진행률용)
  const total = readFileSync(JSONL_PATH, 'utf8').split('\n').filter(Boolean).length;

  const rl = createInterface({
    input: createReadStream(JSONL_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let migrated = 0;
  let skipped  = 0;
  let lineNo   = 0;

  db.exec('BEGIN');
  for await (const line of rl) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const row = parseRow(trimmed);
    if (!row) { skipped++; continue; }

    const result = insert.run(row);
    if (result.changes > 0) migrated++;

    if (lineNo % 1000 === 0) {
      db.exec('COMMIT');
      process.stdout.write(`Migrated ${migrated}/${total} (line ${lineNo})\n`);
      db.exec('BEGIN');
    }
  }
  db.exec('COMMIT');

  const duplicates = lineNo - skipped - migrated;
  console.log(`\nDone. migrated=${migrated}, skipped(bad)=${skipped}, duplicate-ignored=${duplicates}`);
  console.log(`DB: ${DB_PATH}`);
  db.close();
}

// ── 서브커맨드: insert ────────────────────────────────────────────────────
function cmdInsert(jsonStr) {
  if (!jsonStr) { console.error('Usage: insert <json-string>'); process.exit(1); }
  const row = parseRow(jsonStr);
  if (!row) { console.error('Invalid JSON or missing ts/event fields'); process.exit(1); }

  const db = getDB();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO events (ts, event, skill, repo, data)
    VALUES (:ts, :event, :skill, :repo, :data)
  `);
  const result = insert.run(row);
  console.log(result.changes > 0 ? 'Inserted.' : 'Duplicate — ignored.');
  db.close();
}

// ── 서브커맨드: query ────────────────────────────────────────────────────
function cmdQuery(sql) {
  if (!sql) { console.error('Usage: query <sql>'); process.exit(1); }
  const db = getDB();
  try {
    const rows = db.prepare(sql).all();
    console.table(rows);
  } catch (e) {
    console.error('Query error:', e.message);
    process.exit(1);
  }
  db.close();
}

// ── 서브커맨드: stats ────────────────────────────────────────────────────
function cmdStats() {
  const db = getDB();

  const { cnt: total } = db.prepare('SELECT COUNT(*) as cnt FROM events').get();
  const { first, last } = db.prepare(`
    SELECT MIN(ts) as first, MAX(ts) as last FROM events
  `).get();

  const topEvents = db.prepare(`
    SELECT event, COUNT(*) as cnt FROM events
    GROUP BY event ORDER BY cnt DESC LIMIT 10
  `).all();

  const topSkills = db.prepare(`
    SELECT skill, COUNT(*) as cnt FROM events
    WHERE skill IS NOT NULL
    GROUP BY skill ORDER BY cnt DESC LIMIT 10
  `).all();

  const firstDate = first ? first.slice(0, 10) : '-';
  const lastDate  = last  ? last.slice(0, 10)  : '-';

  console.log('\nAnalytics Stats');
  console.log(`Total events: ${total.toLocaleString()}`);
  console.log(`Date range:   ${firstDate} ~ ${lastDate}`);

  console.log('\nTop events:');
  for (const r of topEvents) {
    console.log(`  ${r.event.padEnd(32)} ${String(r.cnt).padStart(6)}`);
  }

  console.log('\nTop skills:');
  for (const r of topSkills) {
    console.log(`  ${r.skill.padEnd(32)} ${String(r.cnt).padStart(6)}`);
  }
  console.log('');
  db.close();
}

// ── 서브커맨드: recent ────────────────────────────────────────────────────
function cmdRecent(args) {
  let limit = 20;
  let eventFilter = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) { limit = parseInt(args[++i], 10); }
    if (args[i] === '--event' && args[i + 1]) { eventFilter = args[++i]; }
  }

  const db = getDB();
  let rows;

  if (eventFilter) {
    rows = db.prepare(
      `SELECT ts, event, skill, repo, data FROM events WHERE event = ? ORDER BY ts DESC LIMIT ?`
    ).all(eventFilter, limit);
  } else {
    rows = db.prepare(
      `SELECT ts, event, skill, repo, data FROM events ORDER BY ts DESC LIMIT ?`
    ).all(limit);
  }

  if (rows.length === 0) {
    console.log('No events found.');
  } else {
    console.table(rows.map(r => ({
      ts:    r.ts.slice(0, 19),
      event: r.event,
      skill: r.skill ?? '',
      repo:  r.repo  ?? '',
      data:  r.data ? (r.data.length > 60 ? r.data.slice(0, 60) + '…' : r.data) : '',
    })));
  }
  db.close();
}

// ── 진입점 ────────────────────────────────────────────────────────────────
const [,, subcmd, ...rest] = process.argv;

switch (subcmd) {
  case 'migrate':
    await cmdMigrate();
    break;
  case 'insert':
    cmdInsert(rest[0]);
    break;
  case 'query':
    cmdQuery(rest.join(' '));
    break;
  case 'stats':
    cmdStats();
    break;
  case 'recent':
    cmdRecent(rest);
    break;
  default:
    console.log(`Usage: node scripts/analytics-sqlite.mjs <subcmd> [args]

Subcmds:
  migrate                          jsonl → SQLite (idempotent)
  insert <json-string>             단건 삽입
  query  <sql>                     임의 SELECT
  stats                            요약 통계
  recent [--limit N] [--event E]   최근 이벤트`);
    process.exit(subcmd ? 1 : 0);
}
