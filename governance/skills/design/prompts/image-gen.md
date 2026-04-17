# Image Generation — 프롬프트 라이브러리

> 버전: v1.0 | 상태: baseline
> 목표: AI 냄새 없는 이미지 생성. 도구: Midjourney, DALL-E 3, Stable Diffusion

---

## 핵심 원칙

### Anti-Pattern 회피 목록 (프롬프트에 절대 포함 금지)

```
금지 단어/표현:
- "beautiful", "stunning", "gorgeous" → 과잉 보정 유발
- "perfect", "flawless" → AI 과잉 완벽함 유발
- "colorful", "vibrant" → Midjourney 과포화 유발
- "8k", "hyper realistic", "ultra detailed" → AI 필터 강화
- 중앙 배치 암시 표현 → 모든 AI의 기본값 → 의도적으로 회피

권장 대안:
- "candid", "documentary style", "natural light"
- "slightly imperfect", "film grain", "authentic"
- "off-center composition", "rule of thirds"
```

---

## Phase A: 스타일 기반 추출 프롬프트

### A-1: 사진 스타일 레퍼런스 템플릿

```
You are a photography director. Convert this concept into a specific photographic style brief.

CONCEPT: {CONCEPT}
USAGE: {USAGE_CONTEXT}  (blog thumbnail / social post / hero image)
BRAND_TONE: {TONE}  (minimal / bold / warm / technical / editorial)

Generate a photographic style brief with:

CAMERA_SETUP:
- camera_body: [specific model that evokes correct feel, e.g., "Leica M10", "Canon AE-1"]
- lens: [focal length + aperture, e.g., "35mm f/2.0"]
- film_stock: [if analog feel, e.g., "Kodak Portra 400", "Ilford HP5"]

LIGHTING:
- type: [natural/studio/street]
- direction: [overhead/side/backlit/overcast]
- quality: [hard/soft/diffused/golden hour]
- avoid: ["studio perfect lighting", "ring light"]

COMPOSITION:
- rule: [rule of thirds / leading lines / negative space]
- subject_position: [off-center-left / off-center-right / bottom-third]
- background: [specific texture/location, NOT "blurred background"]

MOOD_MODIFIERS:
- time_of_day: [specify if relevant]
- season: [specify if relevant]
- era_feel: [contemporary/70s/90s/etc]

Return as exact Midjourney/DALL-E prompt suffix (15-25 words).
Example output: "shot on Leica M10, 35mm, natural overcast light, off-center composition, 
                 slight grain, muted earth tones, documentary feel --ar 16:9"
```

### A-2: 일러스트레이션 스타일 추출

```
Convert this concept into a specific illustration style — NOT the generic Midjourney aesthetic.

CONCEPT: {CONCEPT}
AVOID: [flat design, generic vector, corporate clipart]

Choose ONE of these distinctive styles and adapt:
- "1960s instructional diagram" (technical, clean lines, limited palette)
- "Japanese woodblock print" (bold outlines, flat color areas, pattern fills)
- "Soviet constructivist poster" (geometric, stark contrast, propaganda aesthetics)
- "1980s scientific textbook" (cross-sections, annotations, technical precision)
- "Swiss International Style" (grid-based, Helvetica, primary colors)
- "Risograph print" (misregistered colors, grain texture, limited color overlap)
- "Newspaper editorial cartoon" (heavy line, crosshatch, expressive distortion)

For the chosen style, specify:
1. exact_color_count: N (MAX 4 for authentic vintage print feel)
2. line_weight: [hairline/thin/medium/bold]
3. texture: [smooth/grain/crosshatch/dot matrix]
4. typography_style: [if text in image]
5. composition_grid: [symmetric/asymmetric/diagonal/radiating]

Output: Full generation prompt (30-40 words) ready for Midjourney or DALL-E 3.
```

---

## Phase B: 컨텍스트별 특화 프롬프트

### B-1: 블로그 썸네일

```
Generate a thumbnail image concept for this blog post.

POST_TITLE: {TITLE}
POST_TOPIC: {TOPIC}
BRAND_COLORS: {HEX_COLORS}  (provide 2-3 hex codes)
PLATFORM: WordPress/Medium/Substack

RULES:
1. NO stock photo look (no fake smile, no handshake, no laptop on table)
2. Text in image: MAXIMUM 5 words (AI handles text badly — keep short)
3. The image must work at 300×300px thumbnail AND 1200×630px banner
4. Concept must be immediately scannable in 0.3 seconds

GENERATE:
1. primary_concept: [ONE visual metaphor or scene, specific not generic]
2. composition: [how elements are arranged]
3. color_palette: [adapted from brand colors, 2-3 colors + neutrals]
4. text_overlay_area: [where text can be placed safely]
5. midjourney_prompt: [exact prompt, 20-30 words + flags]
6. dalle_prompt: [same concept, different phrasing for DALL-E 3]
7. fallback_canva: [if AI image fails — describe Canva template approach]

ANTI-AI CHECK: Does this avoid Midjourney's default tendencies?
□ No central-subject-on-gradient-background
□ No hyper-saturated colors
□ No impossible-lighting perfection
□ Has a specific photographic/artistic reference
```

### B-2: LinkedIn 캐러셀 슬라이드

```
Design a LinkedIn carousel visual system for this content.

CONTENT_TOPIC: {TOPIC}
SLIDE_COUNT: {N}
BRAND_PALETTE: {COLORS}

For a cohesive carousel that humans mistake for designer-made:

VISUAL_SYSTEM:
- grid: [12-column baseline grid, specified]
- typography_hierarchy: [H1 size/weight, H2, body, caption]
- accent_element: [ONE recurring visual element — not generic icons]
  Options: [geometric shape / data visualization / photograph fragment / hand-drawn element]
- slide_template: [exact layout for each slide type]

Per SLIDE TYPE:
COVER_SLIDE:
- headline: {HEADLINE}
- visual: [specific image concept, NOT gradient + text]
- subtext_position: [bottom-left / top-right]

CONTENT_SLIDE (repeat pattern):
- section_header: [small, top-left, brand color]
- main_visual: [chart/icon/image — specify exact type]
- text_max_words: 25 per slide

DATA_SLIDE (if applicable):
- chart_type: [bar/line/scatter — specify reason for choice]
- data_source_note: [always include, builds trust]
- highlight_element: [one key number at 3× scale]

FINAL_CTA_SLIDE:
- avoid: "Follow me for more!" → use specific actionable offer
- visual: [callback to cover slide — visual continuity]

Return: Figma/Canva layout spec + Midjourney prompts for any photography needed.
```

### B-3: Instagram 정사각형 + 세로형

```
Create Instagram visual specs for this content.

CAPTION_HOOK: {HOOK}
VISUAL_THEME: {THEME}
FORMAT: square(1:1) / portrait(4:5) / story(9:16)

DESIGN_DIRECTION:
- style_reference: [name a specific Instagram account or visual aesthetic — be precise]
  Examples: "Bloomberg editorial", "Kinfolk magazine", "NatGeo documentary"
  NOT: "minimalist", "aesthetic", "clean"

- color_temperature: [warm/cool/neutral, specific Kelvin range if photo]
- typography_feel: [serif/sans/mono, and specific font if possible]
- text_treatment: [outlined / filled / handwritten overlay / negative space]

COMPOSITION_VARIANTS (generate 3):
1. Dominant visual: image takes 80%, text 20% (top or bottom strip)
2. Split: 50/50 image and typographic block
3. Pure type: no image, typography-only design

For each variant:
- exact_element_positions: [specify in %, from top-left]
- font_size_ratio: [H1:body ratio]
- negative_space_usage: [left/right/top/bottom breathing room]

GENERATION_PROMPTS:
- If photography needed: [Midjourney prompt with camera reference]
- If texture/background needed: [Stable Diffusion prompt for seamless textures]
- Canva fallback: [template category + customization steps]
```

---

## Phase C: 브랜드 일관성 유지

### C-1: 브랜드 스타일 가이드 생성

```
Create a visual brand system for a one-person content business.

BUSINESS_TYPE: {TYPE}
CONTENT_TOPICS: {TOPICS}
TARGET_AUDIENCE: {AUDIENCE}
PERSONALITY_WORDS: {3-5 words}  (e.g., "precise, curious, unconventional")

Generate a complete visual brand system:

COLOR_SYSTEM:
- primary: [1 color, with HEX + why it was chosen]
- secondary: [1 color, contrast + complement logic]
- accent: [1 color, used sparingly for CTAs/highlights]
- neutrals: [2 values — near-white + near-black, NOT pure #000/#FFF]
- avoid: [colors that feel generic for this space]

TYPOGRAPHY:
- headline_font: [specific font name + weight] — [why this font signals authority/personality]
- body_font: [specific font name] — [readability + pairing logic]
- accent_font: [optional, for pull quotes or data callouts]
- sizing_scale: [specific px values for H1/H2/H3/body/caption]

PHOTOGRAPHY_DIRECTION:
- shot_style: [specific type — documentary/editorial/product]
- color_grade: [warm/cool/tonal description]
- subject_treatment: [candid/posed/abstract]
- avoid_absolutely: [3 specific stock photo clichés to never use]

RECURRING_VISUAL_ELEMENT:
- element: [geometric / pattern / icon system / illustration style]
- usage_rules: [when to use, when NOT to use]
- how_it_identifies_us: [why this is ownable]

LAYOUT_PRINCIPLES:
- grid: [columns, margins, gutter]
- white_space_policy: [minimum breathing room rule]
- hierarchy_rule: [how size/weight/color signal importance]

Output format: Markdown style guide that can be given to AI generators as context.
```

### C-2: 생성물 브랜드 일관성 체크

```
Audit this generated image/design for brand consistency.

BRAND_GUIDE: {BRAND_SYSTEM}
GENERATED_ASSET: {DESCRIPTION or image analysis}
INTENDED_USE: {PLATFORM + CONTEXT}

CHECK EACH:

COLOR_COMPLIANCE:
- Colors used: [list]
- Brand palette: [list from guide]
- Violations: [specific off-brand colors]
- Fix: [exact correction]

TYPOGRAPHY_COMPLIANCE:
- Fonts visible: [list]
- Expected: [from guide]
- Violations: [mismatches]

COMPOSITION_CONSISTENCY:
- Layout matches brand grid: yes/no
- White space adequate: yes/no
- Visual hierarchy clear: yes/no

AI_SMELL_SCORE: [0-10, where 10 = obvious AI]
Red flags detected:
□ Over-saturated colors
□ Symmetrical central composition
□ Impossible perfection (no grain, no texture)
□ Generic stock photo feel
□ Text rendering errors
□ Anatomical errors (if people)

OVERALL_VERDICT:
- PUBLISH: [ready as-is]
- ADJUST: [specific fixes needed]
- REGENERATE: [fundamental problems]

Fix instructions: [exact prompt additions or Canva edits to resolve issues]
```

---

## Phase D: 인터랙티브 대안

### D-1: CSS 인터랙티브 대체

```
This visual concept can be better executed as interactive code than a static image.

CONCEPT: {CONCEPT}
REASON_TO_CODE: [animation needed / data-driven / customizable]

Generate:

HTML_CSS_STRUCTURE:
- component_type: [card / hero / infographic / data-viz / loading-state]
- animation_trigger: [on-load / on-scroll / on-hover / on-click]
- animation_type: [fade / slide / scale / draw / count-up]
- duration: [in ms]
- easing: [specific CSS easing curve]

IMPLEMENTATION:
- framework: [vanilla CSS / Tailwind / CSS-in-JS]
- dependencies: [list, keep to minimum]
- responsive_breakpoints: [mobile-first, 3 breakpoints]

Return: Complete, copy-paste-ready HTML + CSS code.
No placeholder comments — the code must work immediately.
```

### D-2: 데이터 시각화 (차트/인포그래픽)

```
Convert this data into an interactive visualization — better than any static image.

DATA: {RAW_DATA}
INSIGHT_TO_COMMUNICATE: {KEY_INSIGHT}  (one sentence, the "so what")
AUDIENCE_DATA_LITERACY: [beginner / intermediate / expert]

Choose the optimal chart type:
- Bar: comparison between discrete categories
- Line: change over time
- Scatter: correlation between two variables
- Waffle: part-to-whole (more readable than pie)
- Slope: before/after comparison
- Dot plot: ranking without distracting bars
- Flow/Sankey: process or conversion

DESIGN_SPEC:
- chart_type: [chosen + why]
- color_encoding: [specific colors for each data series, from brand palette]
- annotation: [ONE key callout with specific value highlighted]
- axis_labels: [minimal — only what reader needs]
- title: [insight-first, not describe-the-chart]
  BAD: "Monthly Active Users by Quarter"
  GOOD: "Growth plateaued in Q3 — before the feature launch"

Return: Recharts or Chart.js component code + copy for title/annotations.
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
