# HTML Presenter — 레이아웃 템플릿 & 생성 규칙

> html-writer 에이전트가 on-demand 로드. spec.json → 단일 self-contained index.html 변환 가이드.

---

## 1. 출력 파일 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{meta.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>/* === INLINE CSS (아래 섹션 2 전체 붙여넣기) === */</style>
</head>
<body data-theme="{meta.theme}">
  <div class="deck" id="deck">
    <!-- 슬라이드들을 순서대로 삽입 -->
  </div>
  <div class="progress-bar" id="progress-bar"></div>
  <div class="slide-counter" id="slide-counter">1 / {total}</div>
  <button class="nav-btn prev" id="btn-prev" aria-label="이전">&#8592;</button>
  <button class="nav-btn next" id="btn-next" aria-label="다음">&#8594;</button>
  <script>/* === INLINE JS (아래 섹션 3 전체 붙여넣기) === */</script>
</body>
</html>
```

**테마 매핑** (`data-theme` 값):
- `dark` — #0f172a 배경, #f8fafc 텍스트, #6366f1 강조
- `light` — #ffffff 배경, #0f172a 텍스트, #6366f1 강조
- `executive` — #1e293b 배경, #e2e8f0 텍스트, #f59e0b 강조

spec.json `meta.theme`이 없으면 `dark` 기본값.

---

## 2. 인라인 CSS (전체 붙여넣기)

```css
/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif;
  --transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  --slide-w: 100vw; --slide-h: 100vh;
}

[data-theme="dark"]  { --bg:#0f172a; --bg2:#1e293b; --text:#f8fafc; --text2:#94a3b8; --accent:#6366f1; --accent2:#818cf8; --border:#334155; }
[data-theme="light"] { --bg:#ffffff; --bg2:#f1f5f9; --text:#0f172a; --text2:#64748b; --accent:#6366f1; --accent2:#4338ca; --border:#e2e8f0; }
[data-theme="executive"] { --bg:#1e293b; --bg2:#0f172a; --text:#e2e8f0; --text2:#94a3b8; --accent:#f59e0b; --accent2:#fbbf24; --border:#334155; }

html, body { width:100%; height:100%; overflow:hidden; background:var(--bg); font-family:var(--font); color:var(--text); }

/* ===== DECK & SLIDES ===== */
.deck { position:relative; width:100%; height:100%; }

.slide {
  position:absolute; inset:0;
  display:flex; flex-direction:column; justify-content:center; align-items:flex-start;
  padding: 6vh 8vw;
  opacity:0; transform:translateY(24px);
  transition: opacity var(--transition), transform var(--transition);
  pointer-events:none;
}
.slide.active {
  opacity:1; transform:translateY(0);
  pointer-events:all;
}
.slide.exit {
  opacity:0; transform:translateY(-24px);
}

/* ===== STAGGER ANIMATION ===== */
.stagger > * { opacity:0; transform:translateY(16px); }
.slide.active .stagger > *:nth-child(1) { animation: fadeUp 0.5s 0.1s forwards; }
.slide.active .stagger > *:nth-child(2) { animation: fadeUp 0.5s 0.2s forwards; }
.slide.active .stagger > *:nth-child(3) { animation: fadeUp 0.5s 0.3s forwards; }
.slide.active .stagger > *:nth-child(4) { animation: fadeUp 0.5s 0.4s forwards; }
.slide.active .stagger > *:nth-child(5) { animation: fadeUp 0.5s 0.5s forwards; }
.slide.active .stagger > *:nth-child(6) { animation: fadeUp 0.5s 0.6s forwards; }
@keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

/* ===== TYPOGRAPHY ===== */
.slide-tag  { font-size:0.75rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--accent); margin-bottom:1.5rem; }
.slide-title { font-size:clamp(1.8rem, 4vw, 3.2rem); font-weight:800; line-height:1.2; color:var(--text); margin-bottom:1rem; }
.slide-subtitle { font-size:clamp(1rem, 2vw, 1.4rem); font-weight:400; color:var(--text2); margin-bottom:2rem; }
.slide-body { font-size:clamp(0.9rem, 1.5vw, 1.1rem); color:var(--text2); line-height:1.8; max-width:70ch; }
.highlight { color:var(--accent); font-weight:700; }

/* ===== BULLET LIST ===== */
.bullet-list { list-style:none; display:flex; flex-direction:column; gap:1rem; width:100%; max-width:75ch; }
.bullet-list li { display:flex; align-items:flex-start; gap:0.75rem; font-size:clamp(0.95rem,1.8vw,1.15rem); color:var(--text); line-height:1.5; }
.bullet-list li::before { content:""; flex-shrink:0; width:6px; height:6px; border-radius:50%; background:var(--accent); margin-top:0.55em; }

/* ===== TWO COLUMN ===== */
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:4vw; width:100%; max-width:1100px; }
.col-card { background:var(--bg2); border:1px solid var(--border); border-radius:1rem; padding:2rem; }
.col-card h3 { font-size:1.1rem; font-weight:700; color:var(--accent); margin-bottom:0.75rem; }
.col-card p, .col-card li { font-size:0.95rem; color:var(--text2); line-height:1.7; }

/* ===== BIG NUMBER ===== */
.big-number-wrap { display:flex; flex-direction:column; align-items:flex-start; gap:0.5rem; }
.big-number { font-size:clamp(5rem, 15vw, 10rem); font-weight:800; color:var(--accent); line-height:1; letter-spacing:-0.03em; }
.big-number-label { font-size:clamp(1rem, 2vw, 1.5rem); color:var(--text2); font-weight:500; }
.big-number-desc { font-size:0.95rem; color:var(--text2); max-width:50ch; margin-top:1rem; line-height:1.6; }

/* ===== STATS GRID ===== */
.stats-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:2vw; width:100%; max-width:1100px; }
.stat-card { background:var(--bg2); border:1px solid var(--border); border-radius:1rem; padding:2rem 1.5rem; }
.stat-num  { font-size:clamp(2rem, 4vw, 3rem); font-weight:800; color:var(--accent); }
.stat-label { font-size:0.85rem; color:var(--text2); margin-top:0.25rem; font-weight:500; }
.stat-desc  { font-size:0.8rem; color:var(--text2); margin-top:0.5rem; line-height:1.5; opacity:0.7; }

/* ===== BAR CHART ===== */
.bar-chart { display:flex; flex-direction:column; gap:1.25rem; width:100%; max-width:800px; }
.bar-row { display:flex; align-items:center; gap:1rem; }
.bar-label { width:140px; font-size:0.9rem; color:var(--text2); text-align:right; flex-shrink:0; }
.bar-track { flex:1; height:10px; background:var(--bg2); border-radius:99px; overflow:hidden; }
.bar-fill  { height:100%; background:linear-gradient(90deg, var(--accent), var(--accent2)); border-radius:99px; width:0; transition:width 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s; }
.slide.active .bar-fill { width:var(--pct); }
.bar-value { width:48px; font-size:0.9rem; font-weight:700; color:var(--text); }

/* ===== QUOTE ===== */
.quote-wrap { max-width:80ch; }
.quote-mark { font-size:6rem; line-height:0.5; color:var(--accent); font-family:serif; margin-bottom:1rem; display:block; }
.quote-text { font-size:clamp(1.2rem, 2.5vw, 1.8rem); font-weight:600; color:var(--text); line-height:1.5; margin-bottom:1.5rem; font-style:italic; }
.quote-attr { font-size:1rem; color:var(--accent); font-weight:600; }

/* ===== COVER ===== */
.slide.cover { justify-content:flex-end; padding-bottom:10vh; background:radial-gradient(ellipse at 70% 30%, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 60%); }
.cover .slide-title { font-size:clamp(2.5rem, 6vw, 4.5rem); max-width:18ch; }
.cover-meta { display:flex; gap:2rem; align-items:center; margin-top:2rem; }
.cover-meta span { font-size:0.85rem; color:var(--text2); }
.cover-divider { width:1px; height:16px; background:var(--border); }

/* ===== SECTION BREAK ===== */
.slide.section-break { justify-content:center; align-items:center; background:linear-gradient(135deg, var(--bg), var(--bg2)); }
.section-num  { font-size:8rem; font-weight:800; color:var(--border); line-height:1; position:absolute; top:6vh; left:7vw; }
.section-title { font-size:clamp(2rem, 5vw, 4rem); font-weight:800; text-align:center; max-width:18ch; }
.section-subtitle { font-size:1.1rem; color:var(--text2); margin-top:1rem; }

/* ===== AGENDA ===== */
.agenda-list { display:flex; flex-direction:column; gap:1rem; width:100%; max-width:700px; counter-reset:agenda; }
.agenda-item { display:flex; align-items:center; gap:1.5rem; counter-increment:agenda; padding:1rem 1.5rem; border-radius:0.75rem; border:1px solid var(--border); }
.agenda-item::before { content:counter(agenda, decimal-leading-zero); font-size:0.8rem; font-weight:700; color:var(--accent); min-width:24px; }
.agenda-item span { font-size:1rem; font-weight:500; color:var(--text); }

/* ===== DATA TABLE ===== */
.data-table { width:100%; border-collapse:collapse; font-size:0.9rem; }
.data-table th { text-align:left; padding:0.75rem 1rem; border-bottom:2px solid var(--accent); color:var(--accent); font-weight:700; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.06em; }
.data-table td { padding:0.75rem 1rem; border-bottom:1px solid var(--border); color:var(--text); }
.data-table tr:nth-child(even) td { background:var(--bg2); }

/* ===== CLOSING ===== */
.slide.closing { justify-content:center; align-items:center; text-align:center; }
.closing .slide-title { font-size:clamp(2rem, 5vw, 3.5rem); }
.closing-actions { display:flex; gap:1rem; margin-top:2rem; flex-wrap:wrap; justify-content:center; }
.action-chip { background:var(--accent); color:#fff; font-size:0.9rem; font-weight:600; padding:0.6rem 1.4rem; border-radius:99px; }

/* ===== PROGRESS & CONTROLS ===== */
.progress-bar { position:fixed; bottom:0; left:0; height:3px; background:var(--accent); transition:width 0.4s var(--transition); }
.slide-counter { position:fixed; bottom:16px; right:24px; font-size:0.75rem; color:var(--text2); font-weight:500; letter-spacing:0.05em; }
.nav-btn { position:fixed; top:50%; transform:translateY(-50%); background:transparent; border:1px solid var(--border); color:var(--text2); width:44px; height:44px; border-radius:50%; font-size:1.2rem; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; }
.nav-btn:hover { background:var(--bg2); color:var(--text); border-color:var(--accent); }
.nav-btn.prev { left:20px; }
.nav-btn.next { right:20px; }
.nav-btn:disabled { opacity:0.2; cursor:default; }
```

---

## 3. 인라인 JS (전체 붙여넣기)

```js
(function() {
  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const progressBar = document.getElementById('progress-bar');
  const counter = document.getElementById('slide-counter');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  let current = 0;
  const total = slides.length;

  function goTo(n) {
    if (n < 0 || n >= total) return;
    const prev = slides[current];
    prev.classList.remove('active');
    prev.classList.add('exit');
    setTimeout(() => prev.classList.remove('exit'), 450);
    current = n;
    slides[current].classList.add('active');
    progressBar.style.width = ((current + 1) / total * 100) + '%';
    counter.textContent = (current + 1) + ' / ' + total;
    btnPrev.disabled = current === 0;
    btnNext.disabled = current === total - 1;
  }

  slides[0].classList.add('active');
  progressBar.style.width = (1 / total * 100) + '%';
  counter.textContent = '1 / ' + total;
  btnPrev.disabled = true;
  if (total <= 1) btnNext.disabled = true;

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
  });
  btnPrev.addEventListener('click', () => goTo(current - 1));
  btnNext.addEventListener('click', () => goTo(current + 1));

  // Touch swipe
  let touchX = 0;
  deck.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', e => {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) goTo(current + (dx > 0 ? 1 : -1));
  });

  // Count-up animation for big numbers
  function countUp(el) {
    const target = parseFloat(el.dataset.target) || 0;
    const isFloat = el.dataset.target && el.dataset.target.includes('.');
    const decimals = isFloat ? (el.dataset.target.split('.')[1] || '').length : 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * ease).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('[data-target]').forEach(countUp);
        observer.unobserve(entry.target);
      }
    });
  });
  slides.forEach(s => observer.observe(s));
})();
```

---

## 4. 레이아웃별 HTML 템플릿

### 4.1 cover

```html
<section class="slide cover" data-index="0">
  <div class="slide-tag">{{meta.company}} | {{meta.date}}</div>
  <h1 class="slide-title">{{headline}}</h1>
  <p class="slide-subtitle">{{subheadline}}</p>
  <div class="cover-meta">
    <span>{{meta.author}}</span>
    <div class="cover-divider"></div>
    <span>{{meta.date}}</span>
  </div>
</section>
```

### 4.2 single / bullets

```html
<section class="slide" data-index="N">
  <div class="slide-tag">{{section_label}}</div>
  <h2 class="slide-title">{{headline}}</h2>
  <ul class="bullet-list stagger">
    <li>{{bullets[0]}}</li>
    <li>{{bullets[1]}}</li>
    <li>{{bullets[2]}}</li>
  </ul>
  <!-- notes는 숨김: <aside class="sr-only">{{notes}}</aside> -->
</section>
```

`bullets` 없으면 `<p class="slide-body stagger">{{body}}</p>` 로 대체.

### 4.3 two_column / comparison

```html
<section class="slide" data-index="N">
  <div class="slide-tag">{{section_label}}</div>
  <h2 class="slide-title" style="margin-bottom:2rem">{{headline}}</h2>
  <div class="two-col stagger">
    <div class="col-card">
      <h3>{{left.title}}</h3>
      <ul class="bullet-list">
        <li>{{left.items[0]}}</li>
        <li>{{left.items[1]}}</li>
      </ul>
    </div>
    <div class="col-card">
      <h3>{{right.title}}</h3>
      <ul class="bullet-list">
        <li>{{right.items[0]}}</li>
        <li>{{right.items[1]}}</li>
      </ul>
    </div>
  </div>
</section>
```

### 4.4 big_number

```html
<section class="slide" data-index="N">
  <div class="slide-tag">{{section_label}}</div>
  <h2 class="slide-title">{{headline}}</h2>
  <div class="big-number-wrap">
    <div class="big-number" data-target="{{number}}" data-prefix="{{prefix}}" data-suffix="{{suffix}}">{{number}}{{suffix}}</div>
    <div class="big-number-label">{{label}}</div>
    <p class="big-number-desc stagger">{{description}}</p>
  </div>
</section>
```

count-up: `data-target="23.4"` (소수점 포함 시) / `data-suffix="%"` / `data-prefix="₩"` 활용.

### 4.5 stats_grid

```html
<section class="slide" data-index="N">
  <div class="slide-tag">{{section_label}}</div>
  <h2 class="slide-title" style="margin-bottom:2rem">{{headline}}</h2>
  <div class="stats-grid stagger">
    <div class="stat-card">
      <div class="stat-num" data-target="{{items[0].number}}" data-suffix="{{items[0].suffix}}">{{items[0].number}}{{items[0].suffix}}</div>
      <div class="stat-label">{{items[0].label}}</div>
      <div class="stat-desc">{{items[0].description}}</div>
    </div>
    <!-- 반복 -->
  </div>
</section>
```

### 4.6 bar_chart

```html
<section class="slide" data-index="N">
  <div class="slide-tag">{{section_label}}</div>
  <h2 class="slide-title" style="margin-bottom:2rem">{{headline}}</h2>
  <div class="bar-chart stagger">
    <div class="bar-row">
      <div class="bar-label">{{items[0].label}}</div>
      <div class="bar-track"><div class="bar-fill" style="--pct:{{items[0].pct}}%"></div></div>
      <div class="bar-value">{{items[0].value}}</div>
    </div>
    <!-- 반복 -->
  </div>
  <p class="slide-body" style="margin-top:1.5rem;font-size:0.8rem">출처: {{source}}</p>
</section>
```

`--pct` 값은 0~100 (퍼센트). 데이터가 절댓값이면 max값 기준으로 정규화.

### 4.7 quote

```html
<section class="slide" data-index="N">
  <div class="quote-wrap">
    <span class="quote-mark">"</span>
    <blockquote class="quote-text">{{quote}}</blockquote>
    <cite class="quote-attr">— {{attribution}}</cite>
  </div>
</section>
```

### 4.8 section_break

```html
<section class="slide section-break" data-index="N">
  <div class="section-num">{{section_number}}</div>
  <h2 class="section-title">{{headline}}</h2>
  <p class="section-subtitle">{{subtitle}}</p>
</section>
```

`section_number` 없으면 `02` 같은 현재 섹션 순번 자동 부여.

### 4.9 agenda

```html
<section class="slide" data-index="N">
  <div class="slide-tag">목차</div>
  <h2 class="slide-title" style="margin-bottom:2rem">{{headline}}</h2>
  <ol class="agenda-list stagger">
    <li class="agenda-item"><span>{{items[0]}}</span></li>
    <li class="agenda-item"><span>{{items[1]}}</span></li>
    <!-- 반복 -->
  </ol>
</section>
```

### 4.10 data_table

```html
<section class="slide" data-index="N">
  <div class="slide-tag">{{section_label}}</div>
  <h2 class="slide-title" style="margin-bottom:1.5rem">{{headline}}</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>{{table.headers[0]}}</th>
        <th>{{table.headers[1]}}</th>
        <!-- 반복 -->
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{{table.rows[0][0]}}</td>
        <td>{{table.rows[0][1]}}</td>
      </tr>
      <!-- 반복 -->
    </tbody>
  </table>
  <p class="slide-body" style="margin-top:1rem;font-size:0.8rem">출처: {{source}}</p>
</section>
```

### 4.11 closing

```html
<section class="slide closing" data-index="N">
  <h2 class="slide-title">{{headline}}</h2>
  <p class="slide-subtitle">{{subtitle}}</p>
  <div class="closing-actions stagger">
    <span class="action-chip">{{actions[0]}}</span>
    <span class="action-chip">{{actions[1]}}</span>
  </div>
  <div class="cover-meta" style="margin-top:3rem">
    <span>{{meta.company}}</span>
    <div class="cover-divider"></div>
    <span>{{meta.author}}</span>
    <div class="cover-divider"></div>
    <span>{{meta.date}}</span>
  </div>
</section>
```

---

## 5. spec.json → HTML 변환 규칙

1. `meta.theme` → `<body data-theme="...">` 설정 (없으면 `dark`)
2. `meta.title` → `<title>` + cover 슬라이드 headline 우선
3. `slides[]` 배열을 순서대로 순회, `layout` 값으로 템플릿 선택
4. `section_break`에는 자동 섹션 번호 부여 (`01`, `02`, ...)
5. `bullets` 배열이 있으면 `<li>` 반복 생성
6. `table` 객체가 있으면 `headers` + `rows` 배열로 `<th>/<td>` 생성
7. `source` 있으면 슬라이드 하단 소각자 텍스트로 추가
8. `notes` 있으면 `<aside class="sr-only" aria-hidden="true">` 로 숨김 처리
9. `[DATA]` 플레이스홀더가 있는 슬라이드는 `<span class="highlight">[DATA]</span>` 로 강조 처리
10. 알 수 없는 `layout` → `single` 템플릿으로 fallback

---

## 6. 완성도 체크리스트

생성 후 확인:
- [ ] 모든 슬라이드에 `headline` 있음 (빈 `<h2>` 없음)
- [ ] `cover`, `closing` 슬라이드 각 1개 이상
- [ ] CSS `<style>` 태그 안에 인라인 (외부 파일 참조 없음, 폰트 CDN 제외)
- [ ] JS `<script>` 태그 인라인
- [ ] 총 슬라이드 수 = spec.json `slides[]` 배열 길이
- [ ] `slide-counter` 초기값 = "1 / N"
- [ ] 반-AI 라이팅 위반 없음 (아래 섹션 7 기준)

---

## 7. 반-AI 라이팅 인라인 체크리스트

> html-writer가 슬라이드 HTML 생성 전 각 슬라이드에 대해 아래 항목 검증. 위반 발견 시 자동 수정 후 진행.

### 헤드라인 규칙
- **금지**: 주제만 쓴 순수 명사형 ("현황", "분석", "전략", "소개", "개요")
- **필수**: 결론/주장/수치가 포함된 문장형
  - X: "매출 현황"
  - O: "Q1 매출 [DATA]억원 — 목표 대비 [DATA: ±X%]"
- **금지 표현** (발견 즉시 제거/교체): 다양한, 상당한, 혁신적, 지속적으로, 여러, 획기적, 효과적인, 전략적으로, 기반으로

### 불릿 규칙
- 슬라이드당 불릿 최대 3개 — 초과 시 자동으로 상위 3개만 유지
- 불릿당 최대 30자 (한글 기준) — 초과 시 핵심만 추출해 단축
- 각 불릿은 명사형 또는 수치 종결 (동사 어미 금지: "~합니다", "~됩니다")

### 데이터 규칙
- 수치 없으면 `[DATA: 지표명]` 형식 플레이스홀더 사용 — 임의 숫자 생성 절대 금지
- 단위 + 기간 + 비교 기준 명시: "23억원 (전기 대비 +7%)" 형식

### 레이아웃 다양성
- 동일 레이아웃 3장 연속 금지 (cover/closing 제외)
- 권장 시퀀스: cover → agenda → section_break → single/bullets → two_column → data_table/stats_grid → quote → closing

---

## 8. 3 디자인 시스템 정의

html-preview 에이전트가 시안 생성 시, html-writer가 전체 생성 시 사용.
`design_system` 파라미터로 1/2/3 중 하나를 전달받아 해당 CSS 토큰 적용.

### 시스템 1: Editorial Dark

```
배경: #0a0a0a (거의 순수 검정)
보조배경: #141414
텍스트: #fafafa
보조텍스트: #888888
강조: #e11d48 (크림슨 레드)
강조2: #fb7185
경계: #2a2a2a
폰트: 헤드라인=Georgia/serif, 본문=system-ui
특징: 대형 세리프 헤드라인, 최소 요소, 수직 리듬 강조
```

```css
[data-ds="1"] {
  --bg:#0a0a0a; --bg2:#141414; --bg3:#1a1a1a;
  --text:#fafafa; --text2:#888888;
  --accent:#e11d48; --accent2:#fb7185; --accent-glow:rgba(225,29,72,0.12);
  --border:#2a2a2a;
  --font-head: Georgia, 'Times New Roman', serif;
  --font-body: system-ui, sans-serif;
  --weight-head: 700;
  --title-size: clamp(2.2rem, 5vw, 4rem);
}
```

### 시스템 2: Corporate Light

```
배경: #f8f9fa (오프화이트)
보조배경: #ffffff
텍스트: #111827
보조텍스트: #6b7280
강조: #0ea5e9 (스카이블루)
강조2: #38bdf8
경계: #e5e7eb
폰트: 모두 sans-serif (가독성 최우선)
특징: 화이트 배경, 수평 데이터 레이아웃, 비즈니스 전문성
```

```css
[data-ds="2"] {
  --bg:#f8f9fa; --bg2:#ffffff; --bg3:#eff6ff;
  --text:#111827; --text2:#6b7280;
  --accent:#0ea5e9; --accent2:#0284c7; --accent-glow:rgba(14,165,233,0.1);
  --border:#e5e7eb;
  --font-head: 'Noto Sans KR', system-ui, sans-serif;
  --font-body: 'Noto Sans KR', system-ui, sans-serif;
  --weight-head: 800;
  --title-size: clamp(1.8rem, 3.5vw, 3rem);
}
```

### 시스템 3: Cinematic

```
배경: #0d0d0d
보조배경: #1a0a00 (따뜻한 다크)
텍스트: #f5f0e8 (크림)
보조텍스트: #a89880
강조: #f97316 (버닝 오렌지)
강조2: #fb923c
경계: #2d1f0e
폰트: 헤드라인=굵은 확장 폰트, 본문=모노
특징: 비대칭 레이아웃, 사이드 텍스트, 영화 포스터 구도, 드라마틱
```

```css
[data-ds="3"] {
  --bg:#0d0d0d; --bg2:#1a0a00; --bg3:#120800;
  --text:#f5f0e8; --text2:#a89880;
  --accent:#f97316; --accent2:#fb923c; --accent-glow:rgba(249,115,22,0.15);
  --border:#2d1f0e;
  --font-head: 'Noto Sans KR', system-ui, sans-serif;
  --font-body: 'Courier New', 'Noto Sans KR', monospace;
  --weight-head: 900;
  --title-size: clamp(2.5rem, 6vw, 5rem);
}
```

> **Anti-Generic 금지 색상** (designer.md 준수):
> `#6366f1` 인디고, `#8b5cf6` 퍼플, `#a855f7` 바이올렛 — 위 3개 시스템에서 모두 사용 금지.
