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
const RERANK_MODEL = '@cf/baai/bge-reranker-base';
const MIN_SCORE = 0.5;

/**
 * 리랭킹(정리): Exa 결과를 질의 관련도로 재정렬해 상위 N개만 합성에 넘긴다.
 * 실패하면 원본 순서 그대로 topN — graceful 폴백.
 */
async function rerankHits(env, query, hits, topN) {
  if (hits.length <= 1) return hits.slice(0, topN);
  try {
    const contexts = hits.map(h => ({ text: clean(`${h.title}. ${h.text || ''}`).slice(0, 1500) }));
    const res = await env.AI.run(RERANK_MODEL, { query, contexts });
    const scored = res?.response;
    if (!Array.isArray(scored) || scored.length === 0) return hits.slice(0, topN);
    const order = [...scored]
      .filter(s => typeof s.id === 'number' && typeof s.score === 'number')
      .sort((a, b) => b.score - a.score);
    const out = [];
    const seen = new Set();
    for (const s of order) {
      if (s.id < 0 || s.id >= hits.length || seen.has(s.id)) continue;
      seen.add(s.id);
      out.push({ ...hits[s.id], rerankScore: s.score });
      if (out.length >= topN) break;
    }
    return out.length ? out : hits.slice(0, topN);
  } catch (e) {
    console.error('rerank:', e?.message);
    return hits.slice(0, topN);
  }
}

/** 제어문자·HTML엔티티·과도공백 제거 — LLM 입력 안전화(3043 internal error 방지) */
function clean(s) {
  let out = "";
  for (const ch of String(s || "")) { const c = ch.codePointAt(0); out += (c < 0x20 || c === 0x7f) ? " " : ch; }
  return out.replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/\s+/g, " ").trim();
}

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
      .map(m => ({ query: clean(m.metadata?.query), summary: clean(m.metadata?.summary), score: m.score }));
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
    cortexDocs = (rows?.results || []).map(r => ({ title: clean(r.title), snippet: clean(r.body).slice(0, 140) }));
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
      body: JSON.stringify({ query: reformulated, numResults: 12, type: 'auto', contents: { text: { maxCharacters: 6000 } } }),
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

  // ④ 리랭킹(정리): 12개 후보 → 관련도순 상위 5개만 합성에 투입
  const ranked = await rerankHits(env, query, hits, 5);

  // ⑤ L2 개인화 합성 (Workers AI LLM). 입력 과대 시 3043 internal error → 축소 + 1회 재시도.
  let answer = '';
  const synth = async (perHit, n) => {
    const ctx = ranked.slice(0, n).map((h, i) => `[${i + 1}] ${clean(h.title)} (${h.url})\n${clean(h.text).slice(0, perHit)}`).join('\n\n');
    const llm = await env.AI.run(LLM_MODEL, {
      messages: [
        { role: 'system', content: grounding },
        { role: 'user', content: `# 질의\n${query}\n\n# 웹 검색 결과\n${ctx}\n\n# 지시\n위 grounding(사용자 맥락)에 따라 인용 [n] 포함 개인화 답을 한국어로 합성하라.` },
      ],
      max_tokens: 800,
    });
    return (llm?.response || '').trim();
  };
  try { answer = await synth(700, 5); }
  catch (e1) {
    console.error('llm try1:', e1?.message);
    try { answer = await synth(350, 4); }   // 축소 재시도(한국어 풀텍스트 토큰 과다 대비)
    catch (e2) { console.error('llm try2:', e2?.message); }
  }
  if (!answer) answer = ranked.slice(0, 5).map((h, i) => `[${i + 1}] ${h.title}\n${h.url}`).join('\n\n');

  // ⑥ L3 deposit (복리 적립): D1 + Vectorize
  const sources = [...new Set(ranked.map(h => h.url).filter(Boolean))];
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
    query, reformulated, answer, sources: ranked.map(h => ({ url: h.url, title: h.title, rerankScore: h.rerankScore })),
    contextUsed: { priorFindings: priorFindings.length, cortexDocs: cortexDocs.length, profile: PROFILE.length },
    deposited: true,
  }), { headers });
}
