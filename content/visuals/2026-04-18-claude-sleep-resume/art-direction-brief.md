# Art Direction Brief — Claude Code Sleep Mode

**브리프 일시**: 2026-04-18
**타겟 콘텐츠**: Twitter thread + LinkedIn post + Instagram carousel
**브랜드 톤**: editorial-technical (A-Team 자체 톤 — Linear/Stripe 사이)

---

## 핵심 결정

**비주얼 유형**: **CODE (HTML/CSS)** — 이미지 생성(Midjourney) X
**근거**:
1. 콘텐츠가 기술 다이어그램 (5-layer architecture) 중심
2. 정확한 타이포그래피 + 데이터 표현 필요
3. AI 생성 이미지의 텍스트 렌더링 한계 회피
4. 코드 = AI 냄새 0%, 정확한 브랜드 일관성

**스타일 레퍼런스**:
- Linear의 monospace + sans 페어링
- Bloomberg의 데이터 다이어그램 정밀도
- Rauno의 의도적 raw HTML 느낌 일부 (필드 노트 톤)

**피할 것**:
- 보라색 그라디언트 (AI 냄새 강함)
- 로봇/AI 아이콘 (진부함)
- 일반 테크 일러스트 (특색 없음)

---

## 색상 시스템

```css
--color-bg: #0F0F12;        /* near-black 배경 */
--color-text: #F5F5F0;      /* warm white */
--color-dim: #6B6B6B;       /* secondary text */
--color-accent: #FFB800;    /* caution yellow (limit/risk) */
--color-highlight: #00D9FF; /* electric cyan (automation) */
--color-rule: #2A2A30;      /* border */
```

## 타이포그래피

```css
--font-mono: 'IBM Plex Mono', 'SF Mono', monospace;
--font-sans: 'Inter', system-ui, sans-serif;

--text-display: 48px / 1.1 / -0.02em;
--text-h1: 32px / 1.2 / -0.01em;
--text-h2: 20px / 1.3;
--text-body: 14px / 1.6;
--text-mono: 13px / 1.5;
```

---

## 생성할 비주얼 자산

### 1. OG Image (1200×630) — 블로그/LinkedIn 공유용

**컨셉**: 5-Layer architecture 시각화
- 좌측: 큰 모노스페이스 텍스트 "5h → ∞"
- 우측: 5층 빌딩 다이어그램 (각 layer 색상 코딩)
- 하단: 작은 GitHub URL + A-Team 마크
- **도구**: HTML/CSS → Puppeteer screenshot OR 직접 디자인 도구

**파일**: `og-image.html` (코드 포함, 직접 generate)

### 2. Twitter Card (1600×900)

**컨셉**: Tweet 1의 hook을 시각화
- 큰 텍스트 "잠든 6시간을 코드로"
- 시계 아이콘 (모노 라인) + 'continue' 버튼 (회색 처리)
- 좌상단에 작은 코드 발췌 (sleep-resume.sh 핵심 라인)

**파일**: `twitter-card.html`

### 3. Instagram Carousel — 8 slides (1080×1350)

**컨셉**: 단일 비주얼 시스템 + 슬라이드별 변화
- 모든 슬라이드 동일 grid + 색상 + 폰트
- 각 슬라이드: 단일 핵심 메시지 + 시각 요소 1개
- 진행감: 좌상단 "01/08", 마지막 슬라이드는 CTA

**파일**: 8개 HTML (slide-01.html ~ slide-08.html)

---

## 구현 우선순위

이 세션에서 생성:
1. ✅ OG Image HTML (실제 코드, screenshot 가능)
2. 📋 Twitter Card 스펙만 (실제 생성은 나중)
3. 📋 Carousel 스펙만 (8개는 너무 많음, 1번 슬라이드 코드만 샘플로)

다음 세션 또는 자동화로:
- Puppeteer로 HTML → PNG 변환
- Canva 템플릿화
- 8 슬라이드 caraousel 풀 코드 (각 슬라이드별 커스터마이즈)

---

## AI 냄새 체크 (생성 전)

이 비주얼이 AI 냄새를 안 내는 이유:
- ✅ 코드 생성 = AI 시각 알고리즘 거치지 않음
- ✅ 정확한 데이터 표현 (디테일 정확)
- ✅ 모노스페이스 + 절제된 색상 (Midjourney 기본값과 정반대)
- ✅ 실제 GitHub issue 번호 등 구체적 데이터
- ✅ 필요한 만큼만 디자인 (장식 X)

위험 요소:
- ⚠️ "5층 빌딩" 메타포 → 너무 일반적이면 진부. 실제 코드 라인 number를 layer 번호로 사용해 차별화.
- ⚠️ 모든 슬라이드가 동일 grid → PL-02 (missing personality) 위험. 슬라이드 4-5번에 데이터 차트 변형 추가.
