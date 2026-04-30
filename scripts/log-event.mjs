#!/usr/bin/env node
/**
 * log-event.mjs — CLI analytics event logger
 *
 * Usage:
 *   node scripts/log-event.mjs <event_type> [key=value ...]
 *
 * Examples:
 *   node scripts/log-event.mjs command_start name=retro
 *   node scripts/log-event.mjs command_end name=ship success=true duration_sec=45
 *   node scripts/log-event.mjs session_start
 *   node scripts/log-event.mjs friction point="hook not installed" workaround="manual"
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, '..');
const LOG_PATH = resolve(REPO_ROOT, '.context', 'analytics.jsonl');

// Ensure .context/ exists
const logDir = dirname(LOG_PATH);
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

const [,, eventType, ...pairs] = process.argv;

if (!eventType) {
  console.error('Usage: node scripts/log-event.mjs <event_type> [key=value ...]');
  process.exit(1);
}

const extra = {};
for (const pair of pairs) {
  const idx = pair.indexOf('=');
  if (idx > 0) {
    const k = pair.slice(0, idx);
    const v = pair.slice(idx + 1);
    // Coerce numeric strings
    extra[k] = isNaN(Number(v)) ? v : Number(v);
  }
}

const event = {
  event: eventType,
  ts: new Date().toISOString(),
  repo: REPO_ROOT.split(/[\\/]/).pop() ?? 'unknown',
  ...extra,
};

appendFileSync(LOG_PATH, JSON.stringify(event) + '\n', 'utf8');
