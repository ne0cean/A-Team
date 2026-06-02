"""
A-Team PPT Intake Server
로컬 웹 서버로 Wizard 패턴 PPT 인테이크 제공 (6단계 스텝)

사용:
  python scripts/ppt/server.py
  → http://localhost:7842 자동 오픈
"""
import http.server, json, os, re, sys, subprocess, threading, time, uuid, webbrowser, socketserver, datetime

PORT = 7842
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(SCRIPT_DIR, "..", "..", "content", "ppt")
PYEXE       = sys.executable

HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>A-Team PPT 생성</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0e0e14;color:#e8e4dc;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;
     min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 16px}

/* ── 카드 ── */
.card{background:#1a1a22;border:0.5px solid #2a2a30;max-width:680px;width:100%;padding:48px 52px}

/* ── 진행 표시기 ── */
.progress-bar{display:flex;align-items:center;gap:0;margin-bottom:44px}
.step-dot{width:28px;height:28px;border-radius:50%;border:1.5px solid #2a2a30;
          display:flex;align-items:center;justify-content:center;
          font-size:.62rem;font-weight:600;color:#4a4844;flex-shrink:0;
          transition:all .25s;background:#111116}
.step-dot.done{background:#4a8060;border-color:#4a8060;color:#e8e4dc}
.step-dot.active{background:#4a7fa8;border-color:#4a7fa8;color:#e8e4dc;
                 box-shadow:0 0 0 3px rgba(74,127,168,.18)}
.step-line{flex:1;height:1px;background:#2a2a30;transition:background .25s}
.step-line.done{background:#4a8060}

/* ── 헤더 ── */
.wiz-header{margin-bottom:32px}
.step-label{font-size:.62rem;font-weight:300;letter-spacing:.2em;text-transform:uppercase;
            color:#a89878;margin-bottom:10px}
.step-title{font-size:1.55rem;font-weight:700;color:#e8e4dc;letter-spacing:-.02em;line-height:1.25}
.step-hint{font-size:.78rem;color:#4a4844;margin-top:8px;line-height:1.6}

/* ── 입력 요소 ── */
.q-input{width:100%;background:#111116;border:0.5px solid #2a2a30;color:#e8e4dc;
         font-family:inherit;font-size:1.05rem;padding:16px 18px;outline:none;
         transition:border-color .2s}
.q-input:focus{border-color:#a89878}
.q-input::placeholder{color:#3a3834}

.q-textarea{width:100%;background:#111116;border:0.5px solid #2a2a30;color:#e8e4dc;
            font-family:inherit;font-size:.9rem;padding:16px 18px;resize:vertical;
            min-height:110px;outline:none;transition:border-color .2s;line-height:1.7}
.q-textarea:focus{border-color:#a89878}
.q-textarea::placeholder{color:#3a3834}

/* ── 칩 ── */
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{background:#111116;border:0.5px solid #2a2a30;color:#6a6660;
      font-family:inherit;font-size:.85rem;padding:12px 22px;cursor:pointer;
      transition:all .15s;user-select:none;line-height:1.5;text-align:left}
.chip:hover{border-color:#a89878;color:#e8e4dc}
.chip.active{background:#1e3448;border-color:#4a7fa8;color:#e8e4dc;font-weight:500}
.chip small{display:block;font-size:.72rem;font-weight:300;opacity:.65;margin-top:2px}

/* ── 테마 카드 ── */
.theme-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.theme-card{background:#111116;border:0.5px solid #2a2a30;padding:20px 18px;cursor:pointer;
            transition:all .15s}
.theme-card:hover{border-color:#a89878}
.theme-card.active{border-color:#4a7fa8;background:#1e3448}
.theme-card .dot{width:32px;height:3px;margin-bottom:12px}
.theme-card .tc-name{font-size:.8rem;font-weight:600;color:#e8e4dc;margin-bottom:6px}
.theme-card .tc-desc{font-size:.7rem;color:#6a6660;line-height:1.6}

/* ── 슬라이더 ── */
.slide-row{display:flex;align-items:center;gap:16px;margin-top:8px}
.slide-val{font-size:2.4rem;font-weight:700;color:#e8e4dc;width:64px;text-align:center;
           font-variant-numeric:tabular-nums}
.slide-unit{font-size:.78rem;color:#4a4844}
input[type=range]{-webkit-appearance:none;flex:1;height:2px;background:#2a2a30;outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;
  background:#4a7fa8;cursor:pointer;border-radius:50%;transition:background .15s}
input[type=range]:hover::-webkit-slider-thumb{background:#5a8fb8}

/* ── 검토 요약 ── */
.review-grid{display:grid;grid-template-columns:auto 1fr;gap:10px 20px;align-items:start}
.rv-label{font-size:.65rem;letter-spacing:.16em;text-transform:uppercase;color:#a89878;
          padding-top:2px;white-space:nowrap}
.rv-value{font-size:.92rem;color:#e8e4dc;line-height:1.5}
.rv-data{font-size:.82rem;color:#6a9fc8;line-height:1.6;background:#111116;
         border:0.5px solid #2a2a30;padding:10px 14px;margin-top:4px;white-space:pre-wrap}
.review-grid .rule{grid-column:1/-1;height:.5px;background:#2a2a30}

/* ── 버튼 행 ── */
.btn-row{display:flex;gap:10px;margin-top:36px}
.btn-back{flex:0 0 auto;background:transparent;border:0.5px solid #2a2a30;color:#6a6660;
          font-family:inherit;font-size:.88rem;padding:14px 24px;cursor:pointer;
          transition:all .15s;letter-spacing:.04em}
.btn-back:hover{border-color:#a89878;color:#e8e4dc}
.btn-next{flex:1;background:#4a7fa8;border:none;color:#e8e4dc;
          font-family:inherit;font-size:.95rem;font-weight:500;padding:16px;
          cursor:pointer;letter-spacing:.08em;transition:background .2s}
.btn-next:hover{background:#5a8fb8}
.btn-next:disabled{background:#2a2a30;color:#4a4844;cursor:not-allowed}
.btn-generate{flex:1;background:#4a8060;border:none;color:#e8e4dc;
              font-family:inherit;font-size:.95rem;font-weight:500;padding:16px;
              cursor:pointer;letter-spacing:.08em;transition:background .2s}
.btn-generate:hover{background:#5a9070}
.btn-generate:disabled{background:#2a2a30;color:#4a4844;cursor:not-allowed}

/* ── 상태 ── */
.status{padding:16px 18px;background:#111116;border:0.5px solid #2a2a30;
        font-size:.82rem;color:#8a8680;display:none;line-height:1.7;margin-top:16px}
.status.show{display:block}
.status.done{border-color:#4a8060;color:#7ab89a}
.status.err{border-color:#8a4040;color:#c07070}
.dl-btn{display:none;width:100%;background:#4a8060;border:none;color:#e8e4dc;
        font-family:inherit;font-size:.92rem;font-weight:500;padding:15px;
        cursor:pointer;margin-top:10px;letter-spacing:.06em;transition:background .2s}
.dl-btn:hover{background:#5a9070}
.dl-btn.show{display:block}

/* ── 단계 전환 ── */
.step{display:none;animation:fadeIn .22s ease}
.step.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

.skip-hint{font-size:.72rem;color:#4a4844;margin-top:10px}
</style>
</head>
<body>
<div class="card">

  <!-- 진행 표시기 -->
  <div class="progress-bar">
    <div class="step-dot active" id="pd-1">1</div>
    <div class="step-line" id="pl-1"></div>
    <div class="step-dot" id="pd-2">2</div>
    <div class="step-line" id="pl-2"></div>
    <div class="step-dot" id="pd-3">3</div>
    <div class="step-line" id="pl-3"></div>
    <div class="step-dot" id="pd-4">4</div>
    <div class="step-line" id="pl-4"></div>
    <div class="step-dot" id="pd-5">5</div>
    <div class="step-line" id="pl-5"></div>
    <div class="step-dot" id="pd-6">6</div>
    <div class="step-line" id="pl-6"></div>
    <div class="step-dot" id="pd-7">&#10003;</div>
  </div>

  <!-- STEP 1: 주제 -->
  <div class="step active" id="step-1">
    <div class="wiz-header">
      <div class="step-label">Step 1 / 6 &nbsp;&middot;&nbsp; 주제</div>
      <div class="step-title">어떤 내용의 PPT인가요?</div>
      <div class="step-hint">제목이 구체적일수록 슬라이드 내용이 정교해집니다.</div>
    </div>
    <input class="q-input" id="topic" type="text" autocomplete="off"
           placeholder="예: Q1 영업 성과 보고 &middot; Series A 투자 제안서 &middot; AI 온보딩 교육">
    <div class="btn-row">
      <button class="btn-next" onclick="goNext(1)">다음 &rarr;</button>
    </div>
  </div>

  <!-- STEP 2: 발표 유형 -->
  <div class="step" id="step-2">
    <div class="wiz-header">
      <div class="step-label">Step 2 / 6 &nbsp;&middot;&nbsp; 발표 유형</div>
      <div class="step-title">어떤 목적의 발표인가요?</div>
    </div>
    <div class="chips" id="ptype">
      <button class="chip" data-v="보고형" onclick="pick('ptype',this)">보고형<small>실적 &middot; 현황 &middot; 결과 보고</small></button>
      <button class="chip" data-v="기획형" onclick="pick('ptype',this)">기획형<small>제안 &middot; 계획 &middot; 전략 수립</small></button>
      <button class="chip" data-v="교육형" onclick="pick('ptype',this)">교육형<small>내부 교육 &middot; 온보딩 &middot; 설명</small></button>
      <button class="chip" data-v="설득형" onclick="pick('ptype',this)">설득형<small>투자 유치 &middot; 경영진 승인 &middot; 외부 제안</small></button>
    </div>
    <div class="btn-row">
      <button class="btn-back" onclick="goBack(2)">&larr; 이전</button>
      <button class="btn-next" onclick="goNext(2)">다음 &rarr;</button>
    </div>
  </div>

  <!-- STEP 3: 청중 -->
  <div class="step" id="step-3">
    <div class="wiz-header">
      <div class="step-label">Step 3 / 6 &nbsp;&middot;&nbsp; 청중</div>
      <div class="step-title">누가 보는 PPT인가요?</div>
      <div class="step-hint">복수 선택 가능. 직접 입력도 됩니다.</div>
    </div>
    <div class="chips" id="audience">
      <button class="chip" data-v="임원진" onclick="pick('audience',this,true)">임원진</button>
      <button class="chip" data-v="팀원" onclick="pick('audience',this,true)">팀원</button>
      <button class="chip" data-v="외부 고객" onclick="pick('audience',this,true)">외부 고객</button>
      <button class="chip" data-v="투자자" onclick="pick('audience',this,true)">투자자</button>
      <button class="chip" data-v="전체" onclick="pick('audience',this,true)">전체</button>
    </div>
    <input class="q-input" id="audience-etc" type="text"
           placeholder="직접 입력 (예: 개발팀, 파트너사)" style="margin-top:14px">
    <div class="btn-row">
      <button class="btn-back" onclick="goBack(3)">&larr; 이전</button>
      <button class="btn-next" onclick="goNext(3)">다음 &rarr;</button>
    </div>
  </div>

  <!-- STEP 4: 데이터 -->
  <div class="step" id="step-4">
    <div class="wiz-header">
      <div class="step-label">Step 4 / 6 &nbsp;&middot;&nbsp; 데이터</div>
      <div class="step-title">핵심 수치가 있나요?</div>
      <div class="step-hint">없으면 비워도 됩니다 &mdash; [DATA] 플레이스홀더로 자동 처리됩니다.</div>
    </div>
    <textarea class="q-textarea" id="data"
      placeholder="예) Q1 매출 23억, 목표 대비 +7%&#10;HBM 시장 점유율 38%, YoY +12%p&#10;고객 만족도 4.3/5.0, 전분기 대비 +0.4"></textarea>
    <div class="skip-hint">스킵 가능 &mdash; [DATA] 플레이스홀더로 대체됩니다</div>
    <div class="btn-row">
      <button class="btn-back" onclick="goBack(4)">&larr; 이전</button>
      <button class="btn-next" onclick="goNext(4)">다음 &rarr;</button>
    </div>
  </div>

  <!-- STEP 5: 테마 -->
  <div class="step" id="step-5">
    <div class="wiz-header">
      <div class="step-label">Step 5 / 6 &nbsp;&middot;&nbsp; 테마</div>
      <div class="step-title">어떤 분위기의 디자인인가요?</div>
    </div>
    <div class="theme-grid" id="theme" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div class="theme-card active" data-v="dark_editorial" onclick="pickTheme(this)">
        <div class="dot" style="background:#4a7fa8"></div>
        <div class="tc-name">Dark Editorial</div>
        <div class="tc-desc">사업 보고<br>전략 발표</div>
      </div>
      <div class="theme-card" data-v="consulting_clean" onclick="pickTheme(this)">
        <div class="dot" style="background:#1d4e8a"></div>
        <div class="tc-name">Consulting Clean</div>
        <div class="tc-desc">컨설팅 보고서<br>내부 제안서</div>
      </div>
      <div class="theme-card" data-v="executive_deep" onclick="pickTheme(this)">
        <div class="dot" style="background:#9f1239"></div>
        <div class="tc-name">Executive Deep</div>
        <div class="tc-desc">임원 보고<br>투자 제안</div>
      </div>
      <div class="theme-card" data-v="midnight_blue" onclick="pickTheme(this)">
        <div class="dot" style="background:#3b82f6"></div>
        <div class="tc-name">Midnight Blue</div>
        <div class="tc-desc">테크 발표<br>제품 소개</div>
      </div>
      <div class="theme-card" data-v="warm_earth" onclick="pickTheme(this)">
        <div class="dot" style="background:#b45309"></div>
        <div class="tc-name">Warm Earth</div>
        <div class="tc-desc">브랜드 제안<br>크리에이티브</div>
      </div>
      <div class="theme-card" data-v="nordic_frost" onclick="pickTheme(this)">
        <div class="dot" style="background:#0ea5e9"></div>
        <div class="tc-name">Nordic Frost</div>
        <div class="tc-desc">SaaS 발표<br>클린 리포트</div>
      </div>
      <div class="theme-card" data-v="mono_sharp" onclick="pickTheme(this)">
        <div class="dot" style="background:#0a0a0a"></div>
        <div class="tc-name">Mono Sharp</div>
        <div class="tc-desc">미니멀<br>모던 스타일</div>
      </div>
      <div class="theme-card" data-v="sage_green" onclick="pickTheme(this)">
        <div class="dot" style="background:#2d6a4f"></div>
        <div class="tc-name">Sage Green</div>
        <div class="tc-desc">ESG 보고<br>자연/웰빙</div>
      </div>
    </div>
    <div style="font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:#a89878;margin:18px 0 10px">컨설팅 펌 스타일</div>
    <div class="theme-grid" id="consulting-theme" style="grid-template-columns:1fr 1fr 1fr">
      <div class="theme-card" data-v="consulting_mckinsey" onclick="pickTheme(this)">
        <div class="dot" style="background:#003366"></div>
        <div class="tc-name">McKinsey</div>
        <div class="tc-desc">전략 제안서<br>임원 보고</div>
      </div>
      <div class="theme-card" data-v="consulting_bcg" onclick="pickTheme(this)">
        <div class="dot" style="background:#00a651"></div>
        <div class="tc-name">BCG</div>
        <div class="tc-desc">시장 분석<br>BCG 매트릭스</div>
      </div>
      <div class="theme-card" data-v="consulting_bain" onclick="pickTheme(this)">
        <div class="dot" style="background:#cc0000"></div>
        <div class="tc-name">Bain</div>
        <div class="tc-desc">투자 DD<br>고객 분석</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn-back" onclick="goBack(5)">&larr; 이전</button>
      <button class="btn-next" onclick="goNext(5)">다음 &rarr;</button>
    </div>
  </div>

  <!-- STEP 6: 슬라이드 수 -->
  <div class="step" id="step-6">
    <div class="wiz-header">
      <div class="step-label">Step 6 / 6 &nbsp;&middot;&nbsp; 분량</div>
      <div class="step-title">슬라이드 몇 장으로 만들까요?</div>
      <div class="step-hint">10장이 기본값입니다. 간결하면 8장, 상세하면 12&ndash;15장.</div>
    </div>
    <div class="slide-row">
      <span class="slide-unit">5</span>
      <input type="range" id="slides" min="5" max="20" value="10"
             oninput="document.getElementById('slideval').textContent=this.value">
      <span class="slide-unit">20</span>
      <div class="slide-val" id="slideval">10</div>
      <span class="slide-unit">장</span>
    </div>
    <div class="btn-row">
      <button class="btn-back" onclick="goBack(6)">&larr; 이전</button>
      <button class="btn-next" onclick="goNext(6)">검토 &rarr;</button>
    </div>
  </div>

  <!-- STEP 7: 검토 & 생성 -->
  <div class="step" id="step-7">
    <div class="wiz-header">
      <div class="step-label">검토</div>
      <div class="step-title">이대로 생성할까요?</div>
    </div>
    <div class="review-grid" id="review-grid"></div>
    <div class="btn-row">
      <button class="btn-back" onclick="goBack(7)">&larr; 수정</button>
      <button class="btn-generate" id="generate-btn" onclick="generate()">PPT 생성 &rarr;</button>
    </div>
    <div class="status" id="status"></div>
    <button class="dl-btn" id="dl-btn" onclick="download()">PPTX 다운로드</button>
  </div>

</div><!-- .card -->

<script>
const TOTAL = 6;
const state = {cur:1, theme:'dark_editorial', outfile:null};

function updateProgress(step){
  for(let i=1; i<=TOTAL+1; i++){
    const dot = document.getElementById('pd-'+i);
    if(!dot) continue;
    dot.classList.toggle('active', i===step);
    dot.classList.toggle('done', i<step);
  }
  for(let i=1; i<=TOTAL; i++){
    const line = document.getElementById('pl-'+i);
    if(line) line.classList.toggle('done', i<step);
  }
}

function showStep(n){
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-'+n).classList.add('active');
  state.cur = n;
  updateProgress(n);
  if(n===7) buildReview();
}

function goBack(from){ showStep(from-1); }

function goNext(from){
  if(from===1){
    const t = document.getElementById('topic').value.trim();
    if(!t){ flash('topic'); return; }
  }
  if(from===2){
    if(!getChips('ptype')){ flashGroup('ptype'); return; }
  }
  showStep(from+1);
}

function flash(id){
  const el = document.getElementById(id);
  el.style.borderColor='#8a4040'; el.focus();
  setTimeout(()=>el.style.borderColor='', 1400);
}
function flashGroup(id){
  const el = document.getElementById(id);
  el.style.outline='1px solid #8a4040';
  setTimeout(()=>el.style.outline='', 1400);
}

function pick(groupId, el, multi=false){
  const group = document.getElementById(groupId);
  if(!multi) group.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.toggle('active');
}

function pickTheme(el){
  document.querySelectorAll('.theme-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  state.theme = el.dataset.v;
}

function getChips(groupId){
  return [...document.getElementById(groupId).querySelectorAll('.chip.active')]
         .map(c=>c.dataset.v).join(', ');
}

const THEME_LABELS = {
  dark_editorial:'Dark Editorial', consulting_clean:'Consulting Clean',
  executive_deep:'Executive Deep', midnight_blue:'Midnight Blue',
  warm_earth:'Warm Earth', nordic_frost:'Nordic Frost',
  mono_sharp:'Mono Sharp', sage_green:'Sage Green',
  consulting_mckinsey:'McKinsey (컨설팅)', consulting_bcg:'BCG (컨설팅)',
  consulting_bain:'Bain (컨설팅)'
};

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function buildReview(){
  const topic    = document.getElementById('topic').value.trim();
  const ptype    = getChips('ptype') || '&mdash;';
  const audience = getChips('audience') || document.getElementById('audience-etc').value.trim() || '&mdash;';
  const data     = document.getElementById('data').value.trim();
  const slides   = document.getElementById('slides').value;
  const theme    = THEME_LABELS[state.theme] || state.theme;

  document.getElementById('review-grid').innerHTML = `
    <div class="rv-label">주제</div><div class="rv-value">${esc(topic)}</div>
    <div class="rule"></div>
    <div class="rv-label">유형</div><div class="rv-value">${ptype}</div>
    <div class="rule"></div>
    <div class="rv-label">청중</div><div class="rv-value">${audience}</div>
    <div class="rule"></div>
    <div class="rv-label">데이터</div><div class="rv-value">${
      data ? `<div class="rv-data">${esc(data)}</div>`
           : '<span style="color:#4a4844">[DATA] 플레이스홀더 처리</span>'
    }</div>
    <div class="rule"></div>
    <div class="rv-label">테마</div><div class="rv-value">${esc(theme)}</div>
    <div class="rule"></div>
    <div class="rv-label">슬라이드</div><div class="rv-value">${slides}장</div>
  `;
}

function setStatus(msg, type=''){
  const el = document.getElementById('status');
  el.className = 'status show' + (type?' '+type:'');
  el.innerHTML = msg;
}

async function generate(){
  const topic    = document.getElementById('topic').value.trim();
  const ptype    = getChips('ptype');
  const audience = getChips('audience') || document.getElementById('audience-etc').value.trim();
  const data     = document.getElementById('data').value.trim();
  const slides   = document.getElementById('slides').value;
  const theme    = state.theme;

  const btn = document.getElementById('generate-btn');
  btn.disabled = true; btn.textContent = '생성 중...';
  document.getElementById('dl-btn').className = 'dl-btn';
  setStatus('슬라이드 스펙 생성 중...', '');

  try{
    const resp = await fetch('/generate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({topic, ptype, audience, data, slides:parseInt(slides), theme})
    });
    const result = await resp.json();
    if(result.ok){
      state.outfile = result.filename;
      const dispName = result.display_name || result.filename;
      setStatus(`완료: <strong>${dispName}</strong><br>${result.slides}장 / 테마: ${theme}<br><span style="color:#4a4844">${result.spec_path}</span>`, 'done');
      document.getElementById('dl-btn').className = 'dl-btn show';
    } else {
      setStatus('오류: ' + result.error, 'err');
    }
  } catch(e){
    setStatus('서버 오류: ' + e.message, 'err');
  }
  btn.disabled = false; btn.textContent = 'PPT 생성 &rarr;';
}

function download(){
  if(state.outfile) window.location.href = '/download/' + encodeURIComponent(state.outfile);
}

document.getElementById('topic').addEventListener('keydown', e=>{
  if(e.key==='Enter') goNext(1);
});
</script>
</body>
</html>"""


# ── 스펙 빌더 (컨설팅 narrative 기반) ───────────────────────────


def build_spec(req):
    topic    = req.get("topic", "제목 없음")
    ptype    = req.get("ptype", "보고형")
    audience = req.get("audience", "팀원")
    data_raw = req.get("data", "").strip()
    n_slides = req.get("slides", 10)
    theme    = req.get("theme", "dark_editorial")

    has_data = bool(data_raw)
    data_note = data_raw if has_data else "Assumption model: TAM 4.2B, SAM 820M, first-year ARR target 0.6M, CAC 120, LTV 2,400, monthly churn 3.2%"
    source_note = "Source: user input" if has_data else "Source: A-Team assumption model; replace with validated market and finance data before external use"
    today = datetime.date.today().isoformat()
    main_segment = _segment_for(topic, audience)
    n_slides = max(6, min(int(n_slides), 20))

    slides = []

    slides.append({
        "layout": "cover",
        "kicker": f"{ptype} · {audience}",
        "headline": topic,
        "subtitle": "Evidence-led strategy deck",
        "meta": "A-Team · " + today,
        "tags": [ptype, audience] + (["data_input"] if has_data else ["assumption_model"])
    })

    slides.extend(_consulting_storyline(topic, ptype, audience, data_note, source_note, main_segment))

    slides.append({
        "layout": "closing",
        "headline": "Decision required",
        "contact": f"{audience} 대상 · {today}",
        "note": "Approve validation budget, success metrics, and stop/go gates"
    })

    if len(slides) > n_slides:
        slides = slides[:n_slides - 1] + [slides[-1]]

    return {
        "meta": {"title": topic, "theme": theme},
        "slides": slides
    }


def _segment_for(topic, audience):
    text = f"{topic} {audience}".lower()
    if any(k in text for k in ["투자", "investor", "saas", "ai"]):
        return "high-urgency enterprise workflow"
    if any(k in text for k in ["교육", "온보딩", "training"]):
        return "role-specific learning workflow"
    if any(k in text for k in ["보고", "성과", "q1", "kpi"]):
        return "management decision workflow"
    return "highest-urgency target segment"


def _consulting_storyline(topic, ptype, audience, data_note, source_note, main_segment):
    return [
        {
            "layout": "bullets",
            "headline": f"{main_segment}에 집중해야 초기 traction과 자본 효율을 동시에 높인다",
            "bullets": [
                f"{topic}의 초기 승부처는 넓은 시장 전체가 아니라 구매 긴급도가 높은 {main_segment}이다.",
                "첫 2개 분기는 segment proof, repeatable sales motion, retention signal 확보에 집중한다.",
                data_note,
            ],
            "source": source_note
        },
        {
            "layout": "bar_chart",
            "headline": "초기 시장을 좁히면 12개월 매출 목표 달성 가능성이 높아진다",
            "categories": ["TAM", "SAM", "Year 1 target"],
            "series": [{"name": "Opportunity", "values": [4200, 820, 0.6]}],
            "unit": "USD M",
            "source": source_note,
            "notes": "Opportunity-sizing page; replace assumptions with validated market model."
        },
        {
            "layout": "comparison",
            "headline": "범용 포지셔닝보다 긴급 워크플로우 포지셔닝이 CAC 회수 리스크를 낮춘다",
            "before": {
                "title": "Broad positioning",
                "bullets": ["넓은 메시지로 차별성이 약함", "도입 명분이 부서별로 분산됨", "세일즈 사이클이 길어질 가능성"]
            },
            "after": {
                "title": f"{main_segment}",
                "bullets": ["명확한 pain point와 구매 명분", "ROI 산식 제시가 쉬움", "초기 레퍼런스 축적에 유리"]
            },
            "source": source_note
        },
        {
            "layout": "stats_grid",
            "headline": "Unit economics는 작은 유료 파일럿에서 먼저 검증해야 한다",
            "stats": [
                {"label": "CAC", "value": "$120", "delta": "assumption", "note": "paid pilot acquisition"},
                {"label": "LTV", "value": "$2.4K", "delta": "20x CAC", "note": "gross retention scenario"},
                {"label": "Monthly churn", "value": "3.2%", "delta": "risk watch", "note": "must validate by cohort"}
            ],
            "source": source_note
        },
        {
            "layout": "timeline",
            "headline": "3단계 출시 순서는 학습을 먼저 만들고 그 다음 확장한다",
            "events": [
                {"date": "0-30d", "title": "Segment proof", "desc": "10 customer interviews, 3 paid pilots"},
                {"date": "31-90d", "title": "Repeatable offer", "desc": "pricing test, onboarding playbook, ROI case"},
                {"date": "91-180d", "title": "Scale motion", "desc": "channel test, referral loop, retention dashboard"},
                {"date": "181-365d", "title": "Expansion", "desc": "second segment only after retention proof"}
            ],
            "source": source_note
        },
        {
            "layout": "data_table",
            "headline": "투자 판단은 성장성보다 검증 가능한 위험 제거 속도로 해야 한다",
            "table": {
                "headers": ["Risk", "Current signal", "90-day proof", "Decision rule"],
                "rows": [
                    ["Demand", "High stated pain", "3 paid pilots", "Continue if 2 convert"],
                    ["Retention", "Assumption only", "Cohort churn below 4%", "Pause scale if above 5%"],
                    ["Sales motion", "Founder-led", "Repeatable demo-to-close", "Hire only after repeatability"]
                ],
                "highlight_col": 2
            },
            "source": source_note
        },
        {
            "layout": "big_number",
            "headline": "이번 의사결정은 대규모 확장이 아니라 검증 예산 승인이어야 한다",
            "number": "$50K",
            "label": "90-day validation budget",
            "delta": "stage-gated",
            "detail": "Fund only experiments needed to prove demand, unit economics, and retention.",
            "source": source_note
        }
    ]


# ── HTTP 서버 ─────────────────────────────────────────────────

_generated = {}  # file_id -> (path, expire_ts)

VALID_THEMES = frozenset([
    "dark_editorial", "consulting_clean", "executive_deep", "midnight_blue",
    "warm_earth", "nordic_frost", "mono_sharp", "sage_green",
    "consulting_mckinsey", "consulting_bcg", "consulting_bain",
])
CONSULTING_STYLES = {
    "consulting_mckinsey": "mckinsey",
    "consulting_bcg": "bcg",
    "consulting_bain": "bain",
}
_GENERATED_TTL = 3600  # 1 hour


def _sanitize_slug(s):
    s = re.sub(r'\.\.+', '', s)
    s = re.sub(r'[^\w\u3131-\uD7A3가-힣-]', '-', s[:30])
    return s.strip('-') or 'ppt'


def _cleanup_generated():
    now = time.time()
    for k in [k for k, (_, ts) in list(_generated.items()) if ts < now]:
        del _generated[k]


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        if self.path in ("/", ""):
            self._serve_html()
        elif self.path.startswith("/download/"):
            self._serve_file(self.path[len("/download/"):])
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/generate":
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length).decode("utf-8"))
            self._handle_generate(body)
        else:
            self.send_error(404)

    def _serve_html(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(HTML.encode("utf-8"))

    def _handle_generate(self, req):
        import datetime
        try:
            # Validate + sanitize
            theme = req.get("theme", "dark_editorial")
            if theme not in VALID_THEMES:
                theme = "dark_editorial"
            req = dict(req, theme=theme)

            spec     = build_spec(req)
            topic    = req.get("topic", "ppt")
            slug     = _sanitize_slug(topic)
            date_str = datetime.date.today().isoformat()
            out_dir  = os.path.join(CONTENT_DIR, f"{date_str}-{slug}")
            os.makedirs(out_dir, exist_ok=True)

            spec_path = os.path.join(out_dir, "spec.json")
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f, ensure_ascii=False, indent=2)

            # Benchmark Gate: block weak consulting specs before rendering.
            bench_script = os.path.join(SCRIPT_DIR, "benchmark-audit.mjs")
            bench = subprocess.run(
                ["node", bench_script, spec_path, "--json", "--threshold", "70"],
                capture_output=True, text=True, timeout=30
            )
            bench_score = 0
            bench_grade = "?"
            try:
                bench_report = json.loads(bench.stdout)
                bench_score = bench_report.get("score", 0)
                bench_grade = bench_report.get("grade", "?")
            except Exception:
                pass
            if bench.returncode != 0:
                raise RuntimeError(f"Benchmark gate failed: {bench_score}/100 ({bench_grade})")

            out_pptx = os.path.join(out_dir, f"{slug}.pptx")
            consulting_style = CONSULTING_STYLES.get(theme)
            if consulting_style:
                gen_script = os.path.join(SCRIPT_DIR, "generate_consulting.py")
                result = subprocess.run(
                    [PYEXE, gen_script, spec_path,
                     "--style", consulting_style,
                     "--output", out_pptx],
                    capture_output=True, text=True, timeout=60
                )
            else:
                gen_script = os.path.join(SCRIPT_DIR, "generate_v2.py")
                result = subprocess.run(
                    [PYEXE, gen_script, spec_path,
                     "--theme", theme,
                     "--output", out_pptx],
                    capture_output=True, text=True, timeout=60
                )
            if result.returncode != 0:
                raise RuntimeError(result.stderr or result.stdout)

            # QA Gate
            qa_script = os.path.join(SCRIPT_DIR, "qa-pptx.py")
            qa = subprocess.run(
                [PYEXE, qa_script, out_pptx, "--spec", spec_path, "--json"],
                capture_output=True, text=True, timeout=30
            )
            qa_score = 0
            qa_grade = "?"
            try:
                qa_report = json.loads(qa.stdout)
                qa_score = qa_report.get("score", 0)
                qa_grade = qa_report.get("grade", "?")
            except Exception:
                pass
            if qa.returncode != 0:
                os.remove(out_pptx)
                raise RuntimeError(f"QA failed: {qa_score}/100 ({qa_grade})")

            _cleanup_generated()
            file_id = str(uuid.uuid4())[:8]
            _generated[file_id] = (out_pptx, time.time() + _GENERATED_TTL)
            resp = {"ok": True, "filename": file_id, "display_name": f"{slug}.pptx",
                    "slides": len(spec["slides"]), "spec_path": spec_path,
                    "benchmark_score": bench_score, "benchmark_grade": bench_grade,
                    "qa_score": qa_score, "qa_grade": qa_grade}
        except Exception as e:
            resp = {"ok": False, "error": str(e)}

        body = json.dumps(resp, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, file_id):
        from urllib.parse import unquote
        file_id = unquote(file_id)
        entry = _generated.get(file_id)
        if not entry or time.time() > entry[1] or not os.path.exists(entry[0]):
            self.send_error(404); return
        path = entry[0]
        display = os.path.basename(path)
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        self.send_header("Content-Disposition", f'attachment; filename="{display}"')
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)


def run():
    url = f"http://localhost:{PORT}"
    print(f"A-Team PPT 서버 시작: {url}")
    print("종료: Ctrl+C")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    with socketserver.TCPServer(("", PORT), Handler) as s:
        s.allow_reuse_address = True
        s.serve_forever()


if __name__ == "__main__":
    run()
