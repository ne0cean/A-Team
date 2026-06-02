#!/usr/bin/env node
/**
 * analytics-logger.js — UserPromptSubmit 훅
 * 슬래시 커맨드(/vibe, /end 등) 감지 → A-Team analytics.jsonl 자동 로깅
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const ATEAM_ROOT = 'C:/Users/SKTelecom/tools/A-Team';
const LOG_PATH = resolve(ATEAM_ROOT, '.context', 'analytics.jsonl');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim();

    // 슬래시 커맨드 감지
    const match = prompt.match(/^\/([a-z][a-z0-9\-]*)/i);
    if (!match) process.exit(0);

    const commandName = match[1].toLowerCase();

    const dir = resolve(ATEAM_ROOT, '.context');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const event = {
      event: 'command_start',
      ts: new Date().toISOString(),
      repo: 'A-Team',
      name: commandName,
      source: 'hook-auto',
    };

    appendFileSync(LOG_PATH, JSON.stringify(event) + '\n', 'utf8');
  } catch (_) {}
  process.exit(0);
});
