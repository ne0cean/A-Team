#!/usr/bin/env node
/**
 * log-session-event.mjs — append event to governance/events.jsonl
 *
 * Usage: node scripts/log-session-event.mjs <type> [key=value ...]
 *
 * Types: message | action | observation
 *
 * Examples:
 *   node scripts/log-session-event.mjs action action=command_start name=tdd
 *   node scripts/log-session-event.mjs action action=file_edit path=worker/src/index.ts lines_changed=15
 *   node scripts/log-session-event.mjs observation observation=test_pass details="541 tests"
 *   node scripts/log-session-event.mjs observation observation=deploy_success details="cortex.feat-breeze.workers.dev"
 *   node scripts/log-session-event.mjs observation observation=error details="SyntaxError in worker/src/index.ts:45"
 *   node scripts/log-session-event.mjs message content_preview="user asked about..."
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, '..');
const LOG_PATH = resolve(REPO_ROOT, 'governance', 'events.jsonl');
const MAX_LINES = 10_000;

try {
  const [,, eventType, ...pairs] = process.argv;

  if (!eventType) {
    process.stderr.write('Usage: node scripts/log-session-event.mjs <type> [key=value ...]\n');
    process.exit(0); // silent fail
  }

  // governance/events.jsonl이 없으면 skip (이 레포에서만 동작)
  if (!existsSync(LOG_PATH)) {
    process.exit(0);
  }

  // SESSION_ID: env var → PPID-pid 폴백
  const sessionId = process.env.CLAUDE_SESSION_ID
    ?? `${process.ppid ?? 0}-${process.pid}`;

  // key=value 파싱
  const extra = {};
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx);
      const v = pair.slice(idx + 1);
      extra[k] = isNaN(Number(v)) || v.trim() === '' ? v : Number(v);
    }
  }

  const event = {
    type: eventType,
    ts: new Date().toISOString(),
    session_id: sessionId,
    ...extra,
  };

  // Rotate if over MAX_LINES
  if (existsSync(LOG_PATH)) {
    const content = readFileSync(LOG_PATH, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= MAX_LINES) {
      // Keep last 8000 lines
      const trimmed = lines.slice(lines.length - 8000).join('\n') + '\n';
      writeFileSync(LOG_PATH, trimmed, 'utf8');
    }
  }

  appendFileSync(LOG_PATH, JSON.stringify(event) + '\n', 'utf8');
} catch {
  // silent fail — never block Claude
  process.exit(0);
}
