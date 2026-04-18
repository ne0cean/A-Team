# Social Visual — 플랫폼별 비주얼 스펙

> 버전: v1.0
> 각 플랫폼의 알고리즘 + 사용자 행동 패턴에 최적화된 비주얼 시스템.

---

## 플랫폼별 핵심 차이

| 플랫폼 | 사용자 스크롤 속도 | 시선 체류 시간 | 최우선 전략 |
|--------|-----------------|--------------|-----------|
| Instagram 피드 | 빠름 (0.5-1초) | 0.3초 결정 | 색상 대비 + 강한 구성 |
| Instagram 스토리 | 매우 빠름 (3초) | 즉각 판단 | 첫 1초에 핵심 노출 |
| LinkedIn 피드 | 느림 (읽는 중) | 3-5초 | 데이터/인사이트 선행 |
| Twitter/X | 중간 | 1-2초 | 텍스트와 시각의 조화 |
| Pinterest | 탐색형 | 1-3초 | 수직 구성, 텍스트 오버레이 |

---

## Phase 1: Instagram

### 1-A: 피드 이미지 (1080×1080, 1080×1350)

```
You are an Instagram visual strategist. Design a feed post visual for:

CONTENT: {CAPTION_HOOK}
BRAND_TONE: {TONE}
VISUAL_STYLE: {STYLE}

INSTAGRAM ALGORITHM FACTORS (optimize for these):
- Save rate: content people want to reference later → dense information value
- Share rate: content worth sending to someone → surprising or validating
- Time on post: complex visuals that reward closer inspection

DESIGN PRINCIPLES for high-performing Instagram:
1. "3-second rule": The core value proposition must be obvious in 3 seconds
2. "Zoom test": Interesting details reward zoom-in → increases time on post
3. "Context collapse": Works equally well in dark mode and light mode

GENERATE:

VISUAL_CONCEPT:
- primary_element: [the ONE thing that carries the visual weight]
- supporting_elements: [2-3 supporting details maximum]
- negative_space: [where breathing room is — Instagram rewards restraint]

COLOR_STRATEGY:
- dominant: {BRAND_COLOR or contrast choice}
- accent: [ONE pop color for CTA or key element]
- background_note: [why this background, not just "looks good"]

COMPOSITION_OPTIONS (provide 2):
A. Image-dominant (80% visual, 20% text):
   - image_description: [specific, not generic]
   - text_placement: [exact position]
   - text_content: [3-5 words maximum]

B. Typography-dominant (70% type, 30% graphic):
   - background: [color/gradient/texture]
   - headline_treatment: [size, weight, color]
   - graphic_element: [ONE decorative element]

GENERATION_PROMPTS:
- Midjourney: [prompt for option A image, --ar 1:1 or 4:5]
- Canva_approach: [for option B typography]

AI_SMELL_PREVENTION:
- Avoid: [specific AI aesthetic traps for this concept]
- Add: [specific humanizing element]
```

### 1-B: 캐러셀 (복수 슬라이드)

```
Design a cohesive Instagram carousel for this content.

TOPIC: {TOPIC}
SLIDE_COUNT: {N} (optimal: 5-10 slides)
GOAL: save-worthy reference content

CAROUSEL PSYCHOLOGY:
- Slide 1 (Cover): Must create curiosity gap — viewers should NEED to swipe
- Slides 2-N (Content): Each must end on a "what's next?" moment
- Last slide (CTA): Specific action, not "follow me"

VISUAL CONSISTENCY SYSTEM:
- grid_template: [one layout that repeats with variation across slides]
- color_allocation: 
    background: {consistent color}
    text: {consistent color}
    accent: {consistent color — used for emphasis only}
- typography_lock: [font + weight + size — do NOT vary across slides]
- progress_indicator: [how viewer knows they're swiping — subtle page numbers, etc.]

PER-SLIDE SPECS:

SLIDE 1 (Cover):
- hook: "{CURIOSITY_GAP_STATEMENT}" — does not give away the answer
- visual_treatment: [specific — not "nice background"]
- brand_identification: [subtle logo placement]

SLIDES 2-{N-1} (Content):
- layout: [text-left/image-right OR full-text OR data-forward]
- max_words_per_slide: 30
- visual_anchor: [one image or icon per slide]
- bottom_tease: [last line of each slide hints at next]

SLIDE {N} (CTA):
- cta_text: [specific offer — NOT "follow for more"]
  Examples: "Download the checklist → Link in bio"
            "Reply with your answer"
            "Tag someone who needs this"
- visual_callback: [echoes cover slide for visual closure]

OUTPUT: Canva design spec (colors + fonts + layout) + Midjourney prompts for any photography.
```

---

## Phase 2: LinkedIn

### 2-A: 단일 이미지 포스트 (1200×627)

```
Create a LinkedIn visual for this content.

INSIGHT: {KEY_INSIGHT}
PROFESSIONAL_CONTEXT: {INDUSTRY/TOPIC}

LINKEDIN VISUAL RULES:
- LinkedIn audience skews analytical → data visuals outperform photography
- Professional credibility is the filter — every visual must answer "would I share this in a meeting?"
- Text in image: acceptable if it's the primary content (unlike Instagram where text is secondary)

VISUAL TYPE SELECTION:
Choose the most appropriate:
A. DATA_VISUAL: For insights with numbers → chart, graph, or key stat
B. QUOTE_CARD: For memorable insight → typography on brand background
C. FRAMEWORK_VISUAL: For concepts/models → diagram, matrix, flowchart
D. DOCUMENTARY_PHOTO: For stories → candid professional photo

For chosen type:

A. DATA_VISUAL:
   - chart_type: [specific, with reason]
   - key_number: [size 3× larger than labels — the takeaway is the number]
   - source_attribution: [always include — builds LinkedIn credibility]
   - color_encoding: [brand primary for highlight, neutral for comparison]

B. QUOTE_CARD:
   - quote: [verbatim, attributed]
   - visual_weight: [quote 70% / attribution 20% / visual element 10%]
   - background: [solid color from brand palette, NOT gradient]

C. FRAMEWORK_VISUAL:
   - structure: [2×2 matrix / 3-step process / hierarchy / cycle]
   - label_clarity: [each element labeled in plain language]
   - emphasis: [which quadrant/step is the "hero" of the insight]

D. DOCUMENTARY_PHOTO:
   - Midjourney/DALL-E prompt: [specific editorial style]
   - text_overlay: [title + subtitle, left-aligned]
   - avoid: [handshake, team meeting, laptop, generic office]
```

---

## Phase 3: Twitter/X

### 3-A: 이미지 첨부 (최대 4장)

```
Design Twitter/X visual content for this thread.

THREAD_HOOK: {HOOK_TWEET}
VISUAL_ROLE: support (not standalone) — Twitter users read the text first

TWITTER VISUAL STRATEGY:
- Images on Twitter are SUPPORTING, not leading
- First image must not repeat the hook verbatim — ADD information
- Data images perform significantly better than photography on Twitter

BEST PERFORMING FORMATS for Twitter:
1. Screenshot of interesting data/chart (authentic feel)
2. Custom data visualization (original research)
3. Quote cards from the thread (for shareability)
4. Before/after comparisons

GENERATE:

For each image position (1-4):
Position 1: [primary supporting visual — data or key concept diagram]
  - format: chart/diagram/table/screenshot
  - information_not_in_text: [what this adds beyond the tweet]
  
Position 2-4 (optional): [supporting evidence or quote cards]

ANTI-PATTERN for Twitter:
- NO: generic stock photo that could accompany any tweet
- NO: text that exactly repeats the tweet
- NO: heavy branding (Twitter audiences are skeptical of corporate feel)

Midjourney/Code prompts for each image needed.
```

---

## Phase 4: Pinterest (롱-테일 트래픽용)

```
Create Pinterest-optimized visuals for this content.

TOPIC: {TOPIC}
KEYWORD_TARGET: {SEARCH_TERMS}  (Pinterest is a search engine)

PINTEREST ALGORITHM: 
- Vertical format (2:3 or 9:16) dominates
- Text overlay is EXPECTED (unlike Instagram where it feels heavy)
- Save rate determines distribution — design for reference value

VISUAL REQUIREMENTS:
- aspect_ratio: 1000×1500px (2:3) for standard pins
- text_overlay: clear title + brief description (20-40 words)
- branding: logo + website URL (Pinterest users DO click through)
- quality_signal: professional design signals trustworthiness

DESIGN SPEC:
- background: [photography or solid color — which serves the topic better?]
- headline_font: [large, bold, immediately readable]
- body_text: [brief, valuable, teases the full content]
- cta_element: ["Get the full guide at yoursite.com" at bottom]
- color_palette: [optimized for visual search — stand out in feed]

SERIES POTENTIAL: Does this topic merit 5-10 related pins? 
If yes, define the visual system for consistency across the series.
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
