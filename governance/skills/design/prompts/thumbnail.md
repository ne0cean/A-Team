# Thumbnail Prompt Library

> 버전: v1.0
> 목표: 썸네일만으로 CTR 2-4× 향상. 인간 디자이너와 구별 불가한 결과물.

---

## 썸네일 심리학 (핵심 원칙)

```
CTR을 결정하는 요소 순위 (연구 기반):
1. 색상 대비 (0.3초 내 시선 포착)
2. 얼굴/감정 (인간 뇌는 얼굴에 자동 집중)
3. 텍스트 (3-5단어, 즉각 이해 가능)
4. 호기심 갭 (이미지가 질문을 만들 때)
5. 브랜드 일관성 (신뢰 누적)

AI 썸네일의 전형적 실패:
- "너무 완벽한" 구성 → 클릭하기엔 믿음이 가지 않음
- 색상 과잉 → 눈이 어디에 집중해야 할지 모름
- 텍스트 없거나 너무 많음
- 개성 없는 스톡 이미지 느낌
```

---

## Phase 1: 콘셉트 추출 프롬프트

```
You are a thumbnail director who has studied 10,000 high-CTR thumbnails.

TITLE: {POST_OR_VIDEO_TITLE}
TOPIC: {MAIN_TOPIC}
AUDIENCE: {TARGET_AUDIENCE}
PLATFORM: YouTube / Blog / Newsletter / Twitter

Extract the thumbnail concept:

EMOTIONAL_HOOK:
- primary_emotion_to_trigger: [curiosity/fear/excitement/surprise/validation]
- specific_trigger: [NOT "interesting image" — what specific element triggers this?]

VISUAL_METAPHOR:
- abstract_concept_made_visual: [how to show "{TOPIC}" without text?]
- reference_image_type: [documentary photo / graph / before-after / object closeup / face]
- specific_NOT_generic: [describe as if you're telling a photographer exactly what to shoot]

TEXT_STRATEGY:
- word_count: 3-5 maximum (fewer is usually better)
- text_content: [options — A, B, C]
  - A: [number + noun: "7 Tools That..."]
  - B: [bold claim: "Everyone Is Wrong About..."]
  - C: [curiosity gap: "The Reason Why..."]
- text_placement: [top / bottom / left / right — where image composition allows]
- text_size: [dominant / secondary — based on visual hierarchy]

COLOR_STRATEGY:
- background_dominant: [specific color with reason]
- accent_pop: [color that creates instant contrast]
- text_color: [for maximum legibility on background]

COMPOSITION:
- focal_point: [where eye goes first]
- subject_placement: [specific position, NOT centered]
- breathing_room: [where negative space is]

UNIQUENESS_CHECK:
If I search "{TOPIC} thumbnail" on Google Images, does this look identical?
If yes, redesign.
```

---

## Phase 2: 생성 프롬프트 (플랫폼별)

### YouTube 썸네일 (1280×720)

```
Generate a YouTube thumbnail for: "{TITLE}"

VISUAL_ELEMENT: {from Phase 1 extraction}
BRAND_COLORS: {HEX codes}

Midjourney prompt structure:
"{SPECIFIC_VISUAL_DESCRIPTION}, {CAMERA_STYLE}, {LIGHTING_TYPE}, 
{COLOR_MOOD}, --ar 16:9 --style raw --no text, watermark, logo"

Rules for Midjourney:
- "--style raw" for more photographic, less AI-filtered look
- "--no text" always (add text in Canva/Figma after)
- Specify camera: "shot on Sony A7 IV" or "35mm film photograph"
- Specify lighting: "soft window light" or "harsh morning sun" or "neon backlight"
- Avoid: "4k ultra realistic" (triggers AI aesthetic)

Example structure:
"[subject] [action/state], [location detail], shot on [camera], 
[lighting description], [color grade], rule of thirds composition, 
natural depth of field --ar 16:9 --style raw --no text"

Post-generation in Canva:
1. Upload image
2. Add text: [chosen from Phase 1]
3. Text font: [bold sans-serif, e.g., Montserrat ExtraBold]
4. Text color: [high contrast against image]
5. Optional: subtle drop shadow on text
```

### 블로그 OG 이미지 (1200×630)

```
Blog Open Graph image for: "{TITLE}"

This image appears when the post is shared on Twitter, LinkedIn, Facebook.
It must work in a 2:1 ratio with your URL overlaid at the bottom.

Approach A — Photography-based:
"{VISUAL_METAPHOR}, {STYLE_REFERENCE}, {LIGHTING}, {COLOR_TONE},
horizontal composition, negative space on left third, --ar 1.91:1 --style raw"

Approach B — Typographic:
No generated image needed. Instead:
- Background: {SOLID_COLOR or subtle texture}
- Large type: {POST_TITLE in 2-3 lines}
- Brand logo/mark: bottom right
- Decorative element: {ONE graphic element from brand system}
Implement in: Canva / Figma / HTML+CSS

Approach C — Data-Forward (for data-driven posts):
- Key statistic from the post, massive type
- Supporting label, smaller
- Minimal brand identification
- Background: near-black or near-white for maximum contrast
Implement in: HTML+CSS for pixel-perfect typography control

Choose based on: Does this post have a strong visual metaphor? → A
                 Is the title/insight itself the hook? → B
                 Is the key data point the hook? → C
```

### 뉴스레터 헤더 (600×300)

```
Newsletter header image for issue: "{ISSUE_TOPIC}"

Newsletter opens in email — constraints:
- Many email clients block images
- Must work at 600px wide
- File size <100KB (load time matters)

Design rules:
1. Text as image is risky (not accessible, not searchable)
   → Use as accent only, with HTML fallback
2. Color should be immediately recognizable as YOUR brand
3. Horizontal format with clear left-to-right reading

APPROACH (choose):
A. Abstract pattern/texture (brand colors, NO text in image)
   → Midjourney: "subtle geometric pattern, {COLORS}, minimal, 
      low contrast texture, --ar 2:1 --style raw --tile"
   
B. Illustrative icon (one symbol representing the issue topic)
   → DALL-E 3: "simple line icon of {SYMBOL}, {STYLE},
      on {BACKGROUND_COLOR} background, centered"
   → Scale to 100×100 display, centered in header band

C. Color band only (no image at all)
   → Brand primary color
   → Issue number in light type
   → Simple, clean, consistent
   → Best for: maximizing email deliverability
```

---

## Phase 3: AI 냄새 제거 체크리스트

생성 후 발행 전 반드시 확인:

```
BEFORE PUBLISHING THUMBNAIL — AI SMELL AUDIT

□ 1. COLOR TEST
     Is the saturation excessive? (does it look like a video game UI?)
     Fix: Reduce saturation 20-30% in any editor

□ 2. COMPOSITION TEST
     Is the main subject exactly centered?
     Fix: Crop to move subject off-center

□ 3. PERFECTION TEST
     Does everything look impossibly clean?
     Fix: Add subtle grain overlay (5-15% opacity)

□ 4. UNIQUENESS TEST
     Could this be any brand's thumbnail?
     Fix: Add your brand's specific color or recurring element

□ 5. TEXT READABILITY
     Is text legible at 120×68px (mobile thumbnail size)?
     Test: Scale down in browser and check

□ 6. CONSISTENCY TEST
     Does this look like it belongs in your channel/blog's visual library?
     Fix: Apply consistent color grade or frame treatment

□ 7. FACE/HAND CHECK (if people visible)
     Count fingers, check proportions
     Fix: Crop to avoid problematic areas, or switch to abstract concept

SCORE: Pass all 7 → publish. Fail 1-2 → fix and re-audit. Fail 3+ → regenerate.
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
