#!/usr/bin/env node
/**
 * Telegram → cortex/inbox/ 자동 저장 데몬
 * 모바일에서 텔레그램 봇에 보내면 즉시 .md로 저장
 *
 * Usage: node scripts/telegram-inbox.mjs
 * launchd로 상시 실행 권장
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) { console.error('[telegram-inbox] TELEGRAM_BOT_TOKEN env required'); process.exit(1); }
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

// --- Cortex + Web search ---

function searchCortexLocal(query) {
  try {
    const body = JSON.stringify({
      q: query, limit: 6,
      attributesToRetrieve: ['filename', 'path', 'pillar'],
      attributesToCrop: ['content'], cropLength: 80,
    });
    const result = execSync(
      `curl -s -m 3 "http://127.0.0.1:7700/indexes/cortex/search" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const data = JSON.parse(result);
    return (data.hits || []).map(h => ({
      path: h.path,
      context: h._formatted?.content?.replace(/<[^>]+>/g, '').slice(0, 120) || h.filename,
    }));
  } catch { return []; }
}

function searchWebDDG(query) {
  try {
    const encoded = encodeURIComponent(query);
    const raw = execSync(
      `curl -s -m 6 "https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1"`,
      { encoding: 'utf-8', timeout: 8000 }
    );
    const data = JSON.parse(raw);
    const results = [];
    // Abstract (Wikipedia etc.)
    if (data.Abstract) {
      results.push({ title: data.Heading || query, snippet: data.Abstract.slice(0, 150) });
    }
    // Related topics
    for (const t of (data.RelatedTopics || [])) {
      if (results.length >= 4) break;
      if (t.Text) results.push({ title: t.FirstURL?.split('/').pop()?.replace(/_/g, ' ') || '', snippet: t.Text.slice(0, 120) });
    }
    return results;
  } catch { return []; }
}

function synthesize(query, cortexHits, webResults) {
  const GROQ_KEY = process.env.GROQ_API_KEY || '';
  if (!GROQ_KEY) return null;

  const cortexSummary = cortexHits.length
    ? cortexHits.map(h => `- ${h.path}: ${h.context}`).join('\n')
    : '내부 자료 없음';
  const webSummary = webResults.length
    ? webResults.map(w => `- ${w.title}: ${w.snippet}`).join('\n')
    : '외부 검색 결과 없음';

  const prompt = `사용자가 "${query}"를 검색했다.

내부 자료(cortex):
${cortexSummary}

외부 검색(웹):
${webSummary}

위 정보를 종합해서 사용자에게 도움이 되는 핵심 인사이트를 한국어 3줄로 제공해. 내부 자료가 있으면 "이미 알고 있는 것"과 "새로 알 수 있는 것"을 구분해.`;

  try {
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });
    const result = execSync(
      `curl -s -m 8 https://api.groq.com/openai/v1/chat/completions ` +
      `-H "Authorization: Bearer ${GROQ_KEY}" ` +
      `-H "Content-Type: application/json" ` +
      `-d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    return JSON.parse(result).choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

async function searchAll(query) {
  const cortexHits = searchCortexLocal(query);
  const webResults = searchWebDDG(query);

  let msg = `🔍 <b>"${query}"</b>\n\n`;

  // 1. Cortex
  msg += `<b>1. Cortex</b> (${cortexHits.length}건)\n`;
  if (cortexHits.length) {
    cortexHits.forEach((h, i) => {
      const name = h.path.split('/').pop();
      msg += `  ${i + 1}. <b>${name}</b>\n     ${h.context}\n`;
    });
  } else {
    msg += `  결과 없음\n`;
  }

  // 2. Web
  msg += `\n<b>2. Web</b> (${webResults.length}건)\n`;
  if (webResults.length) {
    webResults.forEach((w, i) => {
      msg += `  ${i + 1}. <b>${w.title}</b>\n     ${w.snippet}\n`;
    });
  } else {
    msg += `  결과 없음\n`;
  }

  // 3. 종합 (Groq synthesis)
  msg += `\n<b>3. 종합</b>\n`;
  const insight = synthesize(query, cortexHits, webResults);
  msg += insight ? `  ${insight}` : `  종합 불가`;

  return msg;
}

// --- Dashboard integration ---
const DASHBOARD_API = 'https://cortex.feat-breeze.workers.dev';
const DASHBOARD_AUTH = 'Bearer cortex-ritual-2026-fb';
const CAT_ALIASES = {
  input: 'input', i: 'input', 인풋: 'input', 공부: 'input', 학습: 'input', 읽기: 'input',
  work: 'work', w: 'work', 워크: 'work', 업무: 'work', 일: 'work',
  outcome: 'outcome', o: 'outcome', 아웃컴: 'outcome', 결과: 'outcome', 산출: 'outcome', 약속: 'outcome', 외출: 'outcome',
};

function normalizeCat(s) {
  const lower = s.toLowerCase().trim();
  return CAT_ALIASES[lower] || null;
}

async function dashboardApiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(DASHBOARD_API + path);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': DASHBOARD_AUTH },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function tryDashboardAdd(text) {
  const t = text.trim();

  // Pattern: [월/]일 카테고리 내용
  // Examples:
  //   28 work CPFR 미팅       → 당월 28일 work
  //   6/28 work CPFR 미팅     → 6월 28일 work
  //   7/3 input Python 강의   → 7월 3일 input
  //   28 w 팀미팅              → 당월 28일 work (alias)
  //   28 업무 팀미팅           → 당월 28일 work (한국어 alias)
  const match = t.match(/^(?:(\d{1,2})\/)?(\d{1,2})\s+(\S+)\s+(.+)$/);
  if (!match) return null;

  const [, monthStr, dayStr, catRaw, content] = match;
  const cat = normalizeCat(catRaw);
  if (!cat) return null; // not a category keyword → fall through to inbox

  const now = new Date();
  const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;
  const day = parseInt(dayStr);

  // Validate
  const year = now.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;

  const ym = `${year}-${String(month).padStart(2, '0')}`;

  try {
    const result = await dashboardApiPost('/api/add-item', {
      ym,
      day: String(day),
      category: cat,
      item: { text: content.trim(), url: '', done: false },
    });
    if (result?.ok) {
      const catNames = { ritual: 'RITUAL', input: 'INPUT', work: 'WORK', outcome: 'OUTCOME' };
      return `✅ ${month}/${day} ${catNames[cat]}: ${content.trim()}`;
    }
    return null;
  } catch (e) {
    console.error(`[dashboard] ${e.message}`);
    return null;
  }
}

async function transcribeVoice(filePath) {
  try {
    // Groq Whisper API — same as /yt uses
    const result = execSync(
      `curl -s -X POST "https://api.groq.com/openai/v1/audio/transcriptions" ` +
      `-H "Authorization: Bearer ${process.env.GROQ_API_KEY || ''}" ` +
      `-H "Content-Type: multipart/form-data" ` +
      `-F "file=@${filePath}" ` +
      `-F "model=whisper-large-v3-turbo" ` +
      `-F "language=ko" ` +
      `-F "response_format=text"`,
      { timeout: 30000, encoding: 'utf-8' }
    ).trim();
    if (result && !result.includes('error')) {
      console.log(`[transcribe] ${result.slice(0, 60)}...`);
      return result;
    }
  } catch (e) {
    console.error(`[transcribe error] ${e.message}`);
  }
  return null;
}

async function processMessage(msg) {
  if (String(msg.from?.id) !== ALLOWED_USER) return;

  const ts = timestamp();
  let title = '';
  let body = '';
  let attachments = [];

  // 텍스트 처리: 검색 → 일정 추가 → inbox 저장
  if (msg.text) {
    // 검색: ?키워드
    if (msg.text.startsWith('?')) {
      const query = msg.text.slice(1).trim();
      if (query) {
        const results = await searchAll(query);
        await apiCall('sendMessage', {
          chat_id: msg.chat.id,
          text: results,
          reply_to_message_id: msg.message_id,
          parse_mode: 'HTML',
        });
        return;
      }
    }
    // 일정 추가: 28 w 팀미팅
    const dashResult = await tryDashboardAdd(msg.text);
    if (dashResult) {
      await apiCall('sendMessage', {
        chat_id: msg.chat.id,
        text: dashResult,
        reply_to_message_id: msg.message_id,
      });
      return;
    }
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

  // 음성 → Groq Whisper 전사
  if (msg.voice) {
    const fileName = await downloadFile(msg.voice.file_id);
    if (fileName) {
      attachments.push(fileName);
      const transcription = await transcribeVoice(join(INBOX_DIR, fileName));
      if (transcription) {
        body = transcription;
        title = slug(transcription);
      } else {
        body = '(voice memo — 전사 실패)';
        title = 'voice-memo';
      }
    }
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
