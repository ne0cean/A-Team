#!/usr/bin/env node
/**
 * telegram-bot.mjs — Cortex Research Gateway 텔레그램 surface
 *
 * long-poll(getUpdates)로 메시지 수신 → research.mjs CLI 재사용 → 답 전송.
 * launchd로 상시 가동. 순수 로직은 lib/telegram.ts(테스트됨).
 *
 * 환경(.env 또는 env):
 *   TELEGRAM_BOT_TOKEN=...   (@BotFather에서 발급, 필수)
 *   TELEGRAM_CHAT_ID=12345   (소유자 chat id; 비우면 전체 허용 — 보안상 설정 권장)
 *   EXA_API_KEY=...          (research.mjs가 사용)
 *
 * Usage: npx tsx scripts/research/telegram-bot.mjs
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFile } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'scripts', 'research', 'research.mjs');

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  return null;
}

const TOKEN = loadEnvKey('TELEGRAM_BOT_TOKEN');
if (!TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN 미설정.');
  console.error('  1) Telegram에서 @BotFather → /newbot → 토큰 발급');
  console.error('  2) .env에 TELEGRAM_BOT_TOKEN=... (선택: TELEGRAM_CHAT_ID=내chatid)');
  process.exit(2);
}
const ALLOW = (loadEnvKey('TELEGRAM_CHAT_ID') || '').split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite);
const API = `https://api.telegram.org/bot${TOKEN}`;

const { parseUpdates, isAllowed, classifyMessage, formatReply, HELP_TEXT } =
  await import(pathToFileURL(path.join(REPO_ROOT, 'lib', 'telegram.ts')).href);

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
}

function runResearch(query) {
  return new Promise((resolve) => {
    execFile('npx', ['tsx', CLI, `--q=${query}`, '--synth=groq', '--json'],
      { cwd: REPO_ROOT, timeout: 90_000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout) => {
        const s = stdout || '';
        const a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a >= 0 && b > a) { try { return resolve(JSON.parse(s.slice(a, b + 1))); } catch { /* fall */ } }
        resolve({ error: err ? err.message : 'no output' });
      });
  });
}

async function handle(msg) {
  if (!isAllowed(msg.chatId, ALLOW)) return;
  const { kind, query } = classifyMessage(msg.text);
  if (kind === 'help') { await tg('sendMessage', { chat_id: msg.chatId, text: HELP_TEXT }); return; }
  await tg('sendChatAction', { chat_id: msg.chatId, action: 'typing' });
  const result = await runResearch(query);
  await tg('sendMessage', { chat_id: msg.chatId, text: formatReply(result), disable_web_page_preview: true });
}

let offset = 0;
let running = true;
process.on('SIGTERM', () => { running = false; });
process.on('SIGINT', () => { running = false; });

console.log(`[research-tg] 시작. allowlist=${ALLOW.length ? ALLOW.join(',') : '(전체)'}`);
while (running) {
  try {
    const data = await tg('getUpdates', { offset, timeout: 25 });
    const { messages, nextOffset } = parseUpdates(data, offset);
    offset = nextOffset;
    for (const m of messages) {
      handle(m).catch(e => console.error('[research-tg] handle 에러:', e?.message));
    }
  } catch (e) {
    console.error('[research-tg] poll 에러:', e?.message);
    await new Promise(r => setTimeout(r, 3000));
  }
}
console.log('[research-tg] 종료');
