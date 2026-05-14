"""
A-Team PPT Intake Server
로컬 웹 서버로 클릭형 PPT 인테이크 제공

사용:
  python scripts/ppt/server.py
  → http://localhost:7842 자동 오픈
"""
import http.server, json, os, sys, subprocess, threading, webbrowser, time
from urllib.parse import parse_qs

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
.card{background:#1a1a22;border:0.5px solid #2a2a30;max-width:720px;width:100%;padding:48px 52px}
h1{font-size:1.15rem;font-weight:300;color:#8a8680;letter-spacing:.18em;text-transform:uppercase;margin-bottom:6px}
h2{font-size:2rem;font-weight:700;color:#e8e4dc;letter-spacing:-.02em;margin-bottom:40px;line-height:1.2}
.rule{height:.5px;background:#2a2a30;margin:32px 0}
.q-label{font-size:.68rem;font-weight:300;letter-spacing:.18em;text-transform:uppercase;color:#a89878;margin-bottom:14px}
.q-input{width:100%;background:#111116;border:0.5px solid #2a2a30;color:#e8e4dc;
         font-family:inherit;font-size:1rem;padding:14px 16px;outline:none;
         transition:border-color .2s}
.q-input:focus{border-color:#a89878}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:4px}
.chip{background:#111116;border:0.5px solid #2a2a30;color:#8a8680;
      font-family:inherit;font-size:.82rem;padding:10px 20px;cursor:pointer;
      transition:all .15s;user-select:none;letter-spacing:.02em}
.chip:hover{border-color:#a89878;color:#e8e4dc}
.chip.active{background:#4a7fa8;border-color:#4a7fa8;color:#e8e4dc;font-weight:500}
.theme-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.theme-card{background:#111116;border:0.5px solid #2a2a30;padding:18px 16px;cursor:pointer;transition:all .15s}
.theme-card:hover{border-color:#a89878}
.theme-card.active{border-color:#4a7fa8}
.theme-card .dot{width:28px;height:4px;margin-bottom:10px}
.theme-card .name{font-size:.78rem;font-weight:500;color:#e8e4dc;margin-bottom:4px}
.theme-card .desc{font-size:.7rem;color:#8a8680;line-height:1.5}
.slide-row{display:flex;align-items:center;gap:20px;margin-top:14px}
.slide-val{font-size:2rem;font-weight:700;color:#e8e4dc;width:56px;text-align:center}
input[type=range]{-webkit-appearance:none;flex:1;height:2px;background:#2a2a30;outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;
  background:#4a7fa8;cursor:pointer;border-radius:50%}
.q-textarea{width:100%;background:#111116;border:0.5px solid #2a2a30;color:#e8e4dc;
           font-family:inherit;font-size:.88rem;padding:14px 16px;resize:vertical;
           min-height:88px;outline:none;transition:border-color .2s;line-height:1.6}
.q-textarea:focus{border-color:#a89878}
.submit-btn{width:100%;background:#4a7fa8;border:none;color:#e8e4dc;
            font-family:inherit;font-size:1rem;font-weight:500;padding:18px;
            cursor:pointer;margin-top:36px;letter-spacing:.08em;transition:background .2s}
.submit-btn:hover{background:#5a8fb8}
.submit-btn:disabled{background:#2a2a30;color:#4a4844;cursor:not-allowed}
.status{margin-top:20px;padding:16px;background:#111116;border:0.5px solid #2a2a30;
        font-size:.82rem;color:#8a8680;display:none;line-height:1.7}
.status.show{display:block}
.status.done{border-color:#4a8060;color:#7ab89a}
.status.err{border-color:#8a4040;color:#c07070}
.dl-btn{display:none;width:100%;background:#4a8060;border:none;color:#e8e4dc;
        font-family:inherit;font-size:.95rem;font-weight:500;padding:16px;
        cursor:pointer;margin-top:12px;letter-spacing:.06em;transition:background .2s}
.dl-btn:hover{background:#5a9070}
.dl-btn.show{display:block}
a{color:#6a9fc8}
</style>
</head>
<body>
<div class="card">
  <h1>A-Team</h1>
  <h2>PPT 생성</h2>

  <div class="q-label">01 &nbsp; 주제 / 제목</div>
  <input class="q-input" id="topic" type="text" placeholder="예: Q1 영업 성과 보고 / Series A 투자 제안서" autocomplete="off">

  <div class="rule"></div>

  <div class="q-label">02 &nbsp; 발표 유형</div>
  <div class="chips" id="ptype">
    <button class="chip" data-v="보고형" onclick="pick('ptype',this)">보고형<br><small style="font-weight:300;opacity:.7">실적·현황·결과</small></button>
    <button class="chip" data-v="기획형" onclick="pick('ptype',this)">기획형<br><small style="font-weight:300;opacity:.7">제안·계획·전략</small></button>
    <button class="chip" data-v="교육형" onclick="pick('ptype',this)">교육형<br><small style="font-weight:300;opacity:.7">교육·온보딩·설명</small></button>
    <button class="chip" data-v="설득형" onclick="pick('ptype',this)">설득형<br><small style="font-weight:300;opacity:.7">투자·승인·외부제안</small></button>
  </div>

  <div class="rule"></div>

  <div class="q-label">03 &nbsp; 주요 청중</div>
  <div class="chips" id="audience">
    <button class="chip" data-v="임원진" onclick="pick('audience',this,true)">임원진</button>
    <button class="chip" data-v="팀원" onclick="pick('audience',this,true)">팀원</button>
    <button class="chip" data-v="외부 고객" onclick="pick('audience',this,true)">외부 고객</button>
    <button class="chip" data-v="투자자" onclick="pick('audience',this,true)">투자자</button>
    <button class="chip" data-v="전체" onclick="pick('audience',this,true)">전체</button>
  </div>
  <input class="q-input" id="audience-etc" type="text" placeholder="직접 입력 (선택)" style="margin-top:10px">

  <div class="rule"></div>

  <div class="q-label">04 &nbsp; 핵심 데이터 / 수치 &nbsp;<span style="color:#4a4844">(없으면 [DATA] 플레이스홀더 처리)</span></div>
  <textarea class="q-textarea" id="data" placeholder="예) Q1 매출 23억, 목표 대비 +7%&#10;HBM 시장 점유율 38%, YoY +12%p&#10;없으면 비워두세요"></textarea>

  <div class="rule"></div>

  <div class="q-label">05 &nbsp; 테마</div>
  <div class="theme-grid" id="theme">
    <div class="theme-card" data-v="dark_editorial" onclick="pickTheme(this)">
      <div class="dot" style="background:#4a7fa8"></div>
      <div class="name">Dark Editorial</div>
      <div class="desc">사업 보고<br>전략 발표<br>데이터 대시보드</div>
    </div>
    <div class="theme-card" data-v="consulting_clean" onclick="pickTheme(this)">
      <div class="dot" style="background:#1d4e8a"></div>
      <div class="name">Consulting Clean</div>
      <div class="desc">컨설팅 보고서<br>내부 제안서<br>교육 자료</div>
    </div>
    <div class="theme-card" data-v="executive_deep" onclick="pickTheme(this)">
      <div class="dot" style="background:#9f1239"></div>
      <div class="name">Executive Deep</div>
      <div class="desc">임원 보고<br>투자 제안<br>공식 발표</div>
    </div>
  </div>

  <div class="rule"></div>

  <div class="q-label">06 &nbsp; 슬라이드 수</div>
  <div class="slide-row">
    <span style="font-size:.75rem;color:#4a4844">5</span>
    <input type="range" id="slides" min="5" max="20" value="10"
           oninput="document.getElementById('slideval').textContent=this.value">
    <span style="font-size:.75rem;color:#4a4844">20</span>
    <div class="slide-val" id="slideval">10</div>
    <span style="font-size:.75rem;color:#4a4844">장</span>
  </div>

  <button class="submit-btn" id="submit-btn" onclick="generate()">PPT 생성</button>

  <div class="status" id="status"></div>
  <button class="dl-btn" id="dl-btn" onclick="download()">PPTX 다운로드</button>
</div>

<script>
const state = {theme:'dark_editorial', outfile:null};

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

// default selections
document.querySelector('#theme [data-v="dark_editorial"]').classList.add('active');

function getChips(groupId){
  return [...document.getElementById(groupId).querySelectorAll('.chip.active')]
         .map(c=>c.dataset.v).join(', ');
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

  if(!topic){ alert('주제를 입력해주세요.'); return; }
  if(!ptype){ alert('발표 유형을 선택해주세요.'); return; }

  const btn = document.getElementById('submit-btn');
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
      setStatus(`완료: <strong>${result.filename}</strong><br>${result.slides}장 / 테마: ${theme}<br><span style="color:#4a4844">${result.spec_path}</span>`, 'done');
      document.getElementById('dl-btn').className = 'dl-btn show';
    } else {
      setStatus('오류: ' + result.error, 'err');
    }
  } catch(e){
    setStatus('서버 오류: ' + e.message, 'err');
  }
  btn.disabled = false; btn.textContent = 'PPT 생성';
}

function download(){
  if(state.outfile) window.location.href = '/download/' + encodeURIComponent(state.outfile);
}
</script>
</body>
</html>"""


# ── 스펙 빌더 (템플릿 기반) ───────────────────────────────────

STRUCTURES = {
    "보고형": [
        ("핵심 요약 — 3줄 결론", "stats_grid"),
        ("현황 데이터", "data_table"),
        ("원인 분석", "two_column"),
        ("시사점", "bullets"),
        ("Next Action", "bullets"),
    ],
    "기획형": [
        ("문제 정의 — Why Now", "two_column"),
        ("기회 및 목표", "stats_grid"),
        ("솔루션 구조", "flow_diagram"),
        ("실행 계획", "timeline"),
        ("기대 효과", "bullets"),
    ],
    "교육형": [
        ("배경 및 목적", "bullets"),
        ("핵심 개념", "two_column"),
        ("방법론", "flow_diagram"),
        ("적용 사례", "data_table"),
        ("요약 정리", "bullets"),
    ],
    "설득형": [
        ("Why Now — 시장 기회", "stats_grid"),
        ("문제 정의", "two_column"),
        ("솔루션", "flow_diagram"),
        ("실행 로드맵", "timeline"),
        ("투자 요청 / Ask", "bullets"),
    ],
}

SECTION_NAMES = {
    "보고형": ["현황 진단", "데이터 분석", "시사점 & Action"],
    "기획형": ["문제 & 기회", "솔루션 설계", "실행 계획"],
    "교육형": ["개요", "핵심 내용", "실습 & 정리"],
    "설득형": ["기회 & 문제", "솔루션", "실행 & 요청"],
}


def build_spec(req):
    topic    = req.get("topic", "제목 없음")
    ptype    = req.get("ptype", "보고형")
    audience = req.get("audience", "팀원")
    data_raw = req.get("data", "").strip()
    n_slides = req.get("slides", 10)
    theme    = req.get("theme", "dark_editorial")

    has_data = bool(data_raw)
    data_note = data_raw if has_data else "[DATA: 실제 수치로 교체]"

    slides = []

    # Cover
    slides.append({
        "layout": "cover",
        "kicker": f"{ptype} · {audience}",
        "headline": topic,
        "subtitle": ptype + " — " + ("데이터 기반 분석" if has_data else "현황 분석 및 제안"),
        "meta": "A-Team · " + __import__("datetime").date.today().isoformat(),
        "tags": [ptype, audience] + (["데이터 포함"] if has_data else ["[DATA]"])
    })

    # 섹션 구조
    structure = STRUCTURES.get(ptype, STRUCTURES["보고형"])
    sections  = SECTION_NAMES.get(ptype, ["섹션 01", "섹션 02", "섹션 03"])

    # 섹션 break + 콘텐츠 슬라이드
    chunk = max(1, len(structure) // len(sections))
    for si, sec_name in enumerate(sections):
        slides.append({
            "layout": "section_break",
            "section_number": f"{si+1:02d}",
            "headline": sec_name,
            "description": topic + " · " + ptype
        })
        # 해당 섹션 슬라이드
        start = si * chunk
        end   = start + chunk if si < len(sections)-1 else len(structure)
        for title, layout in structure[start:end]:
            slide = {
                "layout": layout,
                "headline": f"{topic} — {title}",
            }
            # 레이아웃별 기본 콘텐츠 주입
            if layout == "bullets":
                slide["bullets"] = [
                    data_note if has_data else f"[DATA: {topic} 핵심 수치]",
                    f"{audience} 관점 핵심 포인트",
                    "추가 인사이트 — [DATA]",
                ]
            elif layout == "two_column":
                slide["left"]  = {"title": "현황", "bullets": [data_note, "[DATA: 비교 수치]", "주요 변화"]}
                slide["right"] = {"title": "시사점", "bullets": ["핵심 발견", "대응 방향", "[DATA: 목표치]"]}
            elif layout == "stats_grid":
                slide["stats"] = [
                    {"label": "핵심 지표 1", "value": "[DATA]", "delta": "+[%]", "note": "설명"},
                    {"label": "핵심 지표 2", "value": "[DATA]", "delta": "[%]",  "note": "설명"},
                    {"label": "핵심 지표 3", "value": "[DATA]", "delta": "-[%]", "note": "설명"},
                ]
            elif layout == "data_table":
                slide["table"] = {
                    "headers": ["항목", "현황", "목표", "달성율", "비고"],
                    "rows": [
                        [f"{topic} A", data_note, "[TARGET]", "[%]", ""],
                        [f"{topic} B", "[DATA]",  "[TARGET]", "[%]", ""],
                        [f"{topic} C", "[DATA]",  "[TARGET]", "[%]", ""],
                    ],
                    "highlight_col": 1
                }
            elif layout == "flow_diagram":
                slide["steps"] = [
                    {"label": "현황 파악", "sub": "데이터 수집"},
                    {"label": "문제 정의", "sub": "근본 원인"},
                    {"label": "대안 도출", "sub": "옵션 비교"},
                    {"label": "실행 결정", "sub": "우선순위"},
                    {"label": "모니터링", "sub": "KPI 추적"},
                ]
            elif layout == "timeline":
                slide["events"] = [
                    {"date": "STEP 1", "title": "준비 단계", "desc": "[DATA: 일정/담당]"},
                    {"date": "STEP 2", "title": "실행 단계", "desc": "[DATA: 마일스톤]"},
                    {"date": "STEP 3", "title": "점검 단계", "desc": "[DATA: KPI]"},
                    {"date": "STEP 4", "title": "완료 단계", "desc": "[DATA: 결과]"},
                    {"date": "STEP 5", "title": "회고 단계", "desc": "개선사항 반영"},
                ]
            slides.append(slide)

    # Quote 슬라이드
    slides.append({
        "layout": "quote",
        "quote": f"{topic}의 성공은\n데이터 기반 의사결정에서\n시작된다.",
        "attribution": f"{ptype} · {audience}"
    })

    # Closing
    slides.append({
        "layout": "closing",
        "headline": "질문 및 토론",
        "contact": f"{audience} 대상 · {__import__('datetime').date.today().isoformat()}",
        "note": f"별첨: {topic} 상세 데이터 / [DATA] 플레이스홀더 교체 필요"
    })

    # 슬라이드 수 조정 (너무 많으면 trim)
    max_slides = max(n_slides, 6)
    if len(slides) > max_slides:
        keep_last = 2  # quote + closing
        slides = slides[:max_slides - keep_last] + slides[-keep_last:]

    return {
        "meta": {"title": topic, "theme": theme},
        "slides": slides
    }


# ── HTTP 서버 ─────────────────────────────────────────────────

_generated = {}   # filename → abs path


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # 로그 억제

    def do_GET(self):
        if self.path == "/" or self.path == "":
            self._serve_html()
        elif self.path.startswith("/download/"):
            fname = self.path[len("/download/"):]
            self._serve_file(fname)
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
        import datetime, pathlib
        try:
            spec     = build_spec(req)
            topic    = req.get("topic", "ppt")
            slug     = topic[:30].replace(" ", "-").replace("/", "-")
            date_str = datetime.date.today().isoformat()
            out_dir  = os.path.join(CONTENT_DIR, f"{date_str}-{slug}")
            os.makedirs(out_dir, exist_ok=True)

            spec_path = os.path.join(out_dir, "spec.json")
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f, ensure_ascii=False, indent=2)

            out_pptx = os.path.join(out_dir, f"{slug}.pptx")
            gen_script = os.path.join(SCRIPT_DIR, "generate_v2.py")
            result = subprocess.run(
                [PYEXE, gen_script, spec_path,
                 "--theme", req.get("theme", "dark_editorial"),
                 "--output", out_pptx],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr or result.stdout)

            fname = f"{slug}.pptx"
            _generated[fname] = out_pptx

            resp = {
                "ok": True,
                "filename": fname,
                "slides": len(spec["slides"]),
                "spec_path": spec_path,
            }
        except Exception as e:
            resp = {"ok": False, "error": str(e)}

        body = json.dumps(resp, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, fname):
        from urllib.parse import unquote
        fname = unquote(fname)
        path  = _generated.get(fname)
        if not path or not os.path.exists(path):
            self.send_error(404); return
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
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
