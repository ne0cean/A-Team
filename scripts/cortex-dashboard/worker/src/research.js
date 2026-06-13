/**
 * research.js — Cortex Research Gateway (Worker surface)
 *
 * Mac CLI(lib/research-*.ts)와 같은 데이터(D1 research_memory + Vectorize cortex-research)를
 * 공유하는 Worker 클라이언트. 외부 URL로 폰/브라우저 어디서나 접근.
 *
 * 레이어: L1 Exa(env.EXA_API_KEY) / L2 개인화(grounding) / L3 복리(Vectorize+D1)
 * 바인딩: env.AI(@cf/baai/bge-m3, @cf/meta/llama-3.1-8b-instruct), env.VECTORIZE, env.DB
 *
 * 데이터 보호: research_memory 신규 테이블만 사용. 기존 ritual_data/cortex_search 미수정.
 */

const EMBED_MODEL = '@cf/baai/bge-m3';
const LLM_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MIN_SCORE = 0.5;

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'is', 'are', '그', '이', '저', '것', '수', '등', '및']);
function extractEntities(text, cap = 10) {
  const out = [], seen = new Set();
  const add = (t) => {
    const n = t.trim(), k = n.toLowerCase();
    if (n.length < 2 || STOP.has(k) || seen.has(k)) return;
    seen.add(k); out.push(n);
  };
  for (const m of text.matchAll(/[`"']([^`"']{2,40})[`"']/g)) add(m[1]);
  for (const m of text.matchAll(/[A-Z][A-Za-z0-9_-]{1,}|[가-힣]{2,}|[a-z][a-z0-9_-]{2,}/g)) add(m[0]);
  return out.slice(0, cap);
}

async function ensureTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS research_memory (
      hash TEXT PRIMARY KEY, query TEXT, reformulated TEXT, summary TEXT,
      entities TEXT, sources TEXT, ts TEXT
    )`
  ).run();
}

/** L3 recall: Vectorize 시맨틱 + cortex_search 노트 */
async function recall(env, query, qvec) {
  let priorFindings = [];
  try {
    const vres = await env.VECTORIZE.query(qvec, { topK: 5, returnMetadata: 'all' });
    priorFindings = (vres?.matches || [])
      .filter(m => (m.score ?? 0) >= MIN_SCORE)
      .map(m => ({ query: m.metadata?.query || '', summary: m.metadata?.summary || '', score: m.score }));
  } catch (e) { console.error('vectorize query:', e?.message); }

  let cortexDocs = [];
  try {
    // 긴 문장 통째 LIKE는 SQLITE "pattern too complex" → 가장 긴 키워드 1개로 단순화 + % _ 이스케이프
    const kw = (query.split(/\s+/).filter(w => w.length >= 2).sort((a, b) => b.length - a.length)[0] || query.slice(0, 20))
      .replace(/[%_]/g, '');
    const like = `%${kw}%`;
    const rows = await env.DB.prepare(
      'SELECT title, body FROM cortex_search WHERE title LIKE ? OR body LIKE ? LIMIT 4'
    ).bind(like, like).all();
    cortexDocs = (rows?.results || []).map(r => ({ title: r.title, snippet: String(r.body || '').slice(0, 160) }));
  } catch (e) { console.error('cortex_search:', e?.message); }

  return { priorFindings, cortexDocs };
}

function buildGrounding(profile, priorFindings, cortexDocs) {
  const lines = ['당신은 이 사용자 전용 리서치 엔진이다. 일반 검색보다 뛰어난 이유는 사용자를 알기 때문이다.'];
  if (profile.length) { lines.push('\n## 사용자 프로필'); profile.forEach(p => lines.push(`- ${p}`)); }
  if (priorFindings.length) {
    lines.push('\n## 과거 관련 리서치(이미 아는 것 — 반복 말고 연결·심화)');
    priorFindings.forEach(f => lines.push(`- "${f.query}" → ${(f.summary || '').slice(0, 180)}`));
  }
  if (cortexDocs.length) {
    lines.push('\n## 사용자 Cortex 노트');
    cortexDocs.forEach(d => lines.push(`- ${d.title}: ${d.snippet}`));
  }
  lines.push('\n## 합성 규칙\n- 사용자가 아는 건 압축, 새로운 것·사용자 맥락 특화 함의에 집중.\n- 모든 주장에 출처 번호 [n].\n- 일반론 금지. 한국어로 답한다.');
  return lines.join('\n');
}

const PROFILE = [
  '1인 + AI 팀으로 대기업 수준 마케팅/디자인/QA/분석을 자동화하는 A-Team 툴킷을 만든다',
  '인프라 선호: Cloudflare Workers + D1 + Vectorize, Node/TypeScript',
  'Cortex 개인 지식 시스템에 모든 지식을 축적해 복리로 키운다',
  '결론 우선·근거 체인 선호, 한국어 소통, 빈 인사말 싫어함',
];

/** POST /api/research */
export async function handleResearch(request, env, headers) {
  const body = await request.json().catch(() => ({}));
  const query = (body.query || '').trim();
  if (query.length < 2) {
    return new Response(JSON.stringify({ error: 'query too short' }), { status: 400, headers });
  }
  if (!env.EXA_API_KEY) {
    return new Response(JSON.stringify({ error: 'EXA_API_KEY 미설정 — wrangler secret put EXA_API_KEY' }), { status: 500, headers });
  }

  await ensureTable(env);

  // ① 질의 임베딩
  let qvec = null;
  try { qvec = (await env.AI.run(EMBED_MODEL, { text: [query] }))?.data?.[0] || null; }
  catch (e) { console.error('embed:', e?.message); }

  // ② L3 recall + L2 grounding
  const { priorFindings, cortexDocs } = qvec ? await recall(env, query, qvec) : { priorFindings: [], cortexDocs: [] };
  const reformulated = priorFindings.length
    ? `${query} (${[...new Set(priorFindings.flatMap(f => extractEntities(f.query)))].slice(0, 3).join(', ')})`
    : query;
  const grounding = buildGrounding(PROFILE, priorFindings, cortexDocs);

  // ③ L1 Exa 검색
  let hits = [];
  try {
    const er = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': env.EXA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: reformulated, numResults: 8, type: 'auto', contents: { text: { maxCharacters: 6000 } } }),
    });
    if (!er.ok) {
      const d = await er.text();
      return new Response(JSON.stringify({ error: `Exa ${er.status}`, detail: d.slice(0, 150) }), { status: 502, headers });
    }
    const ed = await er.json();
    hits = (ed.results || []).map(r => ({
      url: r.url || '', title: (r.title || '').trim(), text: typeof r.text === 'string' ? r.text : '',
      author: r.author || null, publishedDate: r.publishedDate || null,
    }));
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Exa fetch failed', detail: e?.message }), { status: 502, headers });
  }

  // ④ L2 개인화 합성 (Workers AI LLM)
  let answer = '';
  try {
    const ctx = hits.map((h, i) => `[${i + 1}] ${h.title} (${h.url})\n${(h.text || '').slice(0, 1200)}`).join('\n\n');
    const llm = await env.AI.run(LLM_MODEL, {
      messages: [
        { role: 'system', content: grounding },
        { role: 'user', content: `# 질의\n${query}\n\n# 웹 검색 결과\n${ctx}\n\n# 지시\n위 grounding(사용자 맥락)에 따라 인용 [n] 포함 개인화 답을 한국어로 합성하라.` },
      ],
      max_tokens: 900,
    });
    answer = (llm?.response || '').trim();
  } catch (e) { console.error('llm:', e?.message); }
  if (!answer) answer = hits.slice(0, 5).map((h, i) => `[${i + 1}] ${h.title}\n${h.url}`).join('\n\n');

  // ⑤ L3 deposit (복리 적립): D1 + Vectorize
  const sources = [...new Set(hits.map(h => h.url).filter(Boolean))];
  const hash = djb2(`${query.toLowerCase()}|${sources.slice().sort().join(',')}`);
  const entities = extractEntities(`${query} ${answer}`);
  const summary = answer.length > 1000 ? answer.slice(0, 1000) + '…' : answer;
  const ts = new Date().toISOString();
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO research_memory (hash, query, reformulated, summary, entities, sources, ts) VALUES (?,?,?,?,?,?,?)'
    ).bind(hash, query, reformulated, summary, JSON.stringify(entities), JSON.stringify(sources), ts).run();
  } catch (e) { console.error('d1 deposit:', e?.message); }
  try {
    const avec = (await env.AI.run(EMBED_MODEL, { text: [`${query}\n${answer}`] }))?.data?.[0];
    if (avec) await env.VECTORIZE.upsert([{ id: hash, values: avec, metadata: { query, reformulated, summary, entities: JSON.stringify(entities), sources: JSON.stringify(sources), ts } }]);
  } catch (e) { console.error('vectorize upsert:', e?.message); }

  return new Response(JSON.stringify({
    query, reformulated, answer, sources: hits.map(h => ({ url: h.url, title: h.title })),
    contextUsed: { priorFindings: priorFindings.length, cortexDocs: cortexDocs.length, profile: PROFILE.length },
    deposited: true,
  }), { headers });
}

function esc(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** GET /research → 모바일 검색 페이지 */
export function researchPage() {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cortex Research</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{font:16px/1.6 -apple-system,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:20px;background:#0f1115;color:#e6e6e6}
h1{font-size:18px;font-weight:600;margin:0 0 16px}
form{display:flex;gap:8px;margin-bottom:8px}
input{flex:1;padding:13px;border-radius:10px;border:1px solid #2a2e37;background:#171a21;color:#e6e6e6;font-size:16px}
button{padding:13px 18px;border-radius:10px;border:0;background:#3b82f6;color:#fff;font-size:16px;cursor:pointer}
button:disabled{opacity:.5}
.answer{white-space:pre-wrap;background:#171a21;border:1px solid #2a2e37;border-radius:12px;padding:16px;margin:12px 0}
.meta{color:#8b93a1;font-size:13px} .err{color:#f87171}
ul{padding-left:18px} a{color:#7dd3fc;word-break:break-all}
#status{color:#8b93a1;font-size:14px;margin:8px 0}
</style></head><body>
<h1>🔎 Cortex Research <span class="meta">— 개인화+복리</span></h1>
<form id="f"><input id="q" placeholder="검색…" autofocus autocomplete="off"><button id="b" type="submit">검색</button></form>
<div id="status"></div>
<div id="out"></div>
<script>
const f=document.getElementById('f'),q=document.getElementById('q'),b=document.getElementById('b'),st=document.getElementById('status'),out=document.getElementById('out');
function esch(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
f.onsubmit=async(e)=>{e.preventDefault();const query=q.value.trim();if(!query)return;
  b.disabled=true;st.textContent='검색 중… (10~20초)';out.innerHTML='';
  try{
    const r=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})});
    const j=await r.json();
    if(j.error){out.innerHTML='<p class="err">에러: '+esch(j.error)+'</p>';}
    else{
      let h='<div class="answer">'+esch(j.answer)+'</div>';
      if(j.reformulated&&j.reformulated!==query)h+='<p class="meta">재구성: '+esch(j.reformulated)+'</p>';
      const c=j.contextUsed||{};h+='<p class="meta">🧠 맥락: 과거 '+(c.priorFindings||0)+' · Cortex '+(c.cortexDocs||0)+' · 프로필 '+(c.profile||0)+' · 적립 '+(j.deposited?'✓':'—')+'</p>';
      if(j.sources&&j.sources.length){h+='<h2 class="meta">출처</h2><ul>';j.sources.slice(0,8).forEach((s,i)=>{h+='<li><a href="'+esch(s.url)+'" target="_blank">['+(i+1)+'] '+esch(s.title)+'</a></li>';});h+='</ul>';}
      out.innerHTML=h;
    }
  }catch(err){out.innerHTML='<p class="err">요청 실패: '+esch(err.message)+'</p>';}
  st.textContent='';b.disabled=false;
};
</script></body></html>`;
}
