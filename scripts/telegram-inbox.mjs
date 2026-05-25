#!/usr/bin/env node
/**
 * Telegram → cortex/inbox/ 자동 저장 데몬
 * 모바일에서 텔레그램 봇에 보내면 즉시 .md로 저장
 *
 * Usage: node scripts/telegram-inbox.mjs
 * launchd로 상시 실행 권장
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8627846938:AAGAY1G5NIKtTPr0QCDG0Yo4rvLMHmJsvR8';
const ALLOWED_USER = '207169746';
const INBOX_DIR = join(process.env.HOME, 'Projects/a-team/cortex/inbox');
const POLL_INTERVAL = 3000; // 3초
let offset = 0;

if (!existsSync(INBOX_DIR)) mkdirSync(INBOX_DIR, { recursive: true });

function apiCall(method, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const req = https.get(url, { timeout: 35000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error: ${data.slice(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); resolve({ ok: true, result: [] }); });
  });
}

function slug(text) {
  return text
    .slice(0, 40)
    .replace(/[^\w가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'untitled';
}

function timestamp() {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
}

async function downloadFile(fileId) {
  const res = await apiCall('getFile', { file_id: fileId });
  if (!res.ok) return null;
  const filePath = res.result.file_path;
  const ext = filePath.split('.').pop();
  const localName = `${timestamp()}.${ext}`;
  const localPath = join(INBOX_DIR, localName);

  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        writeFileSync(localPath, Buffer.concat(chunks));
        resolve(localName);
      });
    }).on('error', reject);
  });
}

async function processMessage(msg) {
  if (String(msg.from?.id) !== ALLOWED_USER) return;

  const ts = timestamp();
  let title = '';
  let body = '';
  let attachments = [];

  // 텍스트
  if (msg.text) {
    title = slug(msg.text);
    body = msg.text;
  }

  // 사진
  if (msg.photo) {
    const largest = msg.photo[msg.photo.length - 1];
    const fileName = await downloadFile(largest.file_id);
    if (fileName) attachments.push(fileName);
    body = msg.caption || '(photo)';
    title = slug(body);
  }

  // 문서
  if (msg.document) {
    const fileName = await downloadFile(msg.document.file_id);
    if (fileName) attachments.push(fileName);
    body = msg.caption || `(file: ${msg.document.file_name})`;
    title = slug(body);
  }

  // 음성
  if (msg.voice) {
    const fileName = await downloadFile(msg.voice.file_id);
    if (fileName) attachments.push(fileName);
    body = '(voice memo)';
    title = 'voice-memo';
  }

  // 링크 (forwarded)
  if (msg.forward_from || msg.forward_from_chat) {
    body = msg.text || msg.caption || '(forwarded)';
    title = slug(body);
  }

  if (!body && !attachments.length) return;

  const filename = `${ts}-${title}.md`;
  const content = [
    '---',
    `captured: ${new Date().toISOString()}`,
    `source: telegram`,
    attachments.length ? `attachments: [${attachments.join(', ')}]` : null,
    '---',
    '',
    body,
    '',
    ...attachments.map(a => `![[${a}]]`),
  ].filter(l => l !== null).join('\n');

  writeFileSync(join(INBOX_DIR, filename), content);
  console.log(`[inbox] ${filename}`);

  // 확인 이모지
  await apiCall('sendMessage', {
    chat_id: msg.chat.id,
    text: '📥',
    reply_to_message_id: msg.message_id,
  });
}

async function poll() {
  try {
    const res = await apiCall('getUpdates', {
      offset: String(offset),
      timeout: '30',
      allowed_updates: JSON.stringify(['message']),
    });

    if (res.ok && res.result?.length) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        if (update.message) await processMessage(update.message);
      }
    }
  } catch (e) {
    console.error(`[poll error] ${e.message}`);
  }

  setTimeout(poll, POLL_INTERVAL);
}

console.log(`[telegram-inbox] Listening... (user: ${ALLOWED_USER})`);
console.log(`[telegram-inbox] Saving to: ${INBOX_DIR}`);
poll();
