#!/usr/bin/env node
/**
 * web-server.mjs — Cortex Research Gateway 브라우저 surface
 *
 * 기존 research.mjs CLI를 재사용(spawn)해 브라우저에서 검색 가능하게 한다.
 * launchd로 상시 가동 + 기존 cloudflared 터널로 폰/원격 접근.
 *
 * Usage:
 *   PORT=4010 npx tsx scripts/research/web-server.mjs
 *   브라우저: http://localhost:4010
 *
 * 의존: .env의 EXA_API_KEY (research.mjs가 읽음), llm 바이너리(--synth=groq).
 */

import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'scripts', 'research', 'research.mjs');
const PORT = parseInt(process.env.PORT || '4010', 10);

/** research.mjs를 spawn해 JSON 결과 반환 */
function runResearch(query, synth = 'groq') {
  return new Promise((resolve) => {
    execFile('npx', ['tsx', CLI, `--q=${query}`, `--synth=${synth}`, '--json'],
      { cwd: REPO_ROOT, timeout: 90_000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        // stdout에 JSON 외 노이즈가 섞일 수 있으니 첫 { ~ 마지막 } 만 추출
        const s = stdout || '';
        const a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a >= 0 && b > a) {
          try { return resolve(JSON.parse(s.slice(a, b + 1))); } catch { /* fallthrough */ }
        }
        if (stderr) console.error('[research-web] spawn stderr:', stderr.slice(0, 300));
        resolve({ error: err ? err.message : 'no JSON in output', raw: s.slice(0, 300) });
      });
  });
}

function esc(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function page(query, result) {
  const answer = result?.answer ? esc(result.answer) : '';
  const sources = (result?.sources || []).map((h, i) =>
    `<li><a href="${esc(h.url)}" target="_blank">[${i + 1}] ${esc(h.title)}</a></li>`).join('');
  const ctx = result?.contextUsed
    ? `과거리서치 ${result.contextUsed.priorFindings} · Cortex ${result.contextUsed.cortexDocs} · 프로필 ${result.contextUsed.profile}`
    : '';
  const reform = result?.reformulated && result.reformulated !== query
    ? `<p class="meta">재구성: ${esc(result.reformulated)}</p>` : '';
  const err = result?.error ? `<p class="err">에러: ${esc(result.error)}</p>` : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Research</title>
<style>
:root{color-scheme:dark}
body{font:16px/1.6 -apple-system,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#0f1115;color:#e6e6e6}
h1{font-size:18px;font-weight:600;margin:0 0 16px}
form{display:flex;gap:8px;margin-bottom:16px}
input[type=text]{flex:1;padding:12px;border-radius:10px;border:1px solid #2a2e37;background:#171a21;color:#e6e6e6;font-size:16px}
button{padding:12px 18px;border-radius:10px;border:0;background:#3b82f6;color:#fff;font-size:16px;cursor:pointer}
.answer{white-space:pre-wrap;background:#171a21;border:1px solid #2a2e37;border-radius:12px;padding:16px;margin:12px 0}
.meta{color:#8b93a1;font-size:13px}
.err{color:#f87171}
ul{padding-left:18px} a{color:#7dd3fc}
</style></head><body>
<h1>🔎 Cortex Research <span class="meta">— 개인화+복리</span></h1>
<form method="POST" action="/search">
  <input type="text" name="q" placeholder="검색…" value="${esc(query)}" autofocus>
  <button type="submit">검색</button>
</form>
${err}
${answer ? `<div class="answer">${answer}</div>` : ''}
${reform}
${ctx ? `<p class="meta">개인화 맥락: ${ctx} · 적립 ${result?.deposited ? '✓' : '—'}</p>` : ''}
${sources ? `<h2 class="meta">출처</h2><ul>${sources}</ul>` : ''}
</body></html>`;
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page('', null));
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === 'POST' && req.url === '/search') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const query = (params.get('q') || '').trim();
      if (!query) { res.writeHead(302, { Location: '/' }); return res.end(); }
      const result = await runResearch(query);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page(query, result));
    });
    return;
  }
  // JSON API
  if (req.method === 'POST' && req.url === '/api/search') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', async () => {
      let q = '';
      try { q = (JSON.parse(body).q || '').trim(); } catch { /* ignore */ }
      if (!q) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"error":"q required"}'); }
      const result = await runResearch(q);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, () => console.log(`[research-web] http://localhost:${PORT}`));
