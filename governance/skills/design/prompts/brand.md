# Brand Identity — 브랜드 아이덴티티 프롬프트 라이브러리

> 버전: v1.0
> 목표: 1인 콘텐츠 비즈니스를 위한 완전한 브랜드 시스템 구축.
> AI 도구로 에이전시 수준의 브랜드 일관성 달성.

---

## 브랜드 시스템 구축 순서

```
Phase 1: 브랜드 포지셔닝 → 언어적 정체성 먼저
Phase 2: 색상 시스템
Phase 3: 타이포그래피
Phase 4: 비주얼 언어 (사진/일러/레이아웃)
Phase 5: 응용 (각 채널 적용 규칙)
```

**왜 이 순서인가**: AI 도구에 색상을 먼저 고르면 반드시 진부해짐.
포지셔닝 → 감정 → 색상 순서로 역산해야 고유한 시스템이 나온다.

---

## Phase 1: 브랜드 포지셔닝 추출

```
You are a brand strategist. Extract the brand positioning from this founder profile.

FOUNDER_PROFILE:
- Topics I write about: {TOPICS}
- My unique perspective/angle: {PERSPECTIVE}
- Who I'm writing for: {AUDIENCE}
- What I want them to feel after reading: {DESIRED_FEELING}
- 3 brands I admire (any industry): {REFERENCES}
- 3 brands I explicitly don't want to look like: {ANTI_REFERENCES}

EXTRACT:

POSITIONING_STATEMENT:
"For [audience], [your name/brand] is the [category] that [unique benefit]
because [proof/reason to believe]."

BRAND_PERSONALITY (choose 2-3 primary, 1-2 secondary):
Primary options: Expert | Guide | Challenger | Pioneer | Curator | Builder
Secondary options: Warm | Precise | Playful | Bold | Understated | Urgent

TONE_OF_VOICE_SPECTRUM:
For each axis, mark where your brand sits (1-10):
- Formal ←————→ Conversational
- Serious ←————→ Playful  
- Complex ←————→ Simple
- Reserved ←————→ Bold
- Traditional ←————→ Innovative

WHAT WE ARE NOT (equally important):
List 5 things your brand explicitly rejects
(e.g., "We are not: corporate, preachy, trend-chasing, jargon-heavy, apologetic")

BRAND_ESSENCE (1 sentence, the core idea):
"{What we stand for in one sentence a 10-year-old could understand}"

Output: Brand DNA document (save to content/brand/positioning.md)
```

---

## Phase 2: 색상 시스템

```
Derive a color system from this brand positioning — NOT the other way around.

BRAND_DNA: {From Phase 1}
INDUSTRY: {TOPIC_AREA}
COMPETITOR_COLORS: {what competitors use — we must differ}

COLOR PSYCHOLOGY FIRST:
Based on brand personality "{PERSONALITY}", the emotional targets are:
- primary_emotion_to_evoke: {emotion}
- secondary_emotion: {emotion}
- emotions_to_avoid: {emotions}

COMPETITIVE DIFFERENTIATION:
In {INDUSTRY}, the typical color choices are {COMMON_COLORS}.
We will stand out by: {DIFFERENTIATION_STRATEGY}

DERIVE COLOR SYSTEM:

PRIMARY COLOR:
- Color: {specific HEX}
- Why this specific shade (not just the family): {reasoning}
- Psychological effect: {what it communicates}
- Usage: {when/where — not everywhere}

SECONDARY COLOR:
- Color: {specific HEX}
- Relationship to primary: [complement/split-complement/analogous]
- Usage: {supporting contexts}

ACCENT COLOR:
- Color: {specific HEX}
- Usage: CTAs, highlights, links ONLY
- Rule: max 10% of any composition

NEUTRALS (2 values):
- Near-white: {HEX} — why not pure #FFFFFF: {reason}
- Near-black: {HEX} — why not pure #000000: {reason}
- Note: Pure black/white feels digital and harsh — 95%/5% is warmer

EXTENDED PALETTE (for data visualization, 4-6 colors):
{Harmonious set for charts/infographics, all readable on both neutrals}

BRAND COLOR RULES:
- Primary color used: {contexts — e.g., "headlines and key accents only"}
- Background: {which neutral and when}
- Text: {which neutral}
- Never combine: {specific combinations that clash with brand feel}

Output: content/brand/color-palette.json
{
  "primary": {"hex": "...", "usage": "..."},
  "secondary": {"hex": "...", "usage": "..."},
  "accent": {"hex": "...", "usage": "..."},
  "neutral_light": {"hex": "...", "usage": "..."},
  "neutral_dark": {"hex": "...", "usage": "..."},
  "data_palette": ["...", "...", "...", "...", "..."]
}
```

---

## Phase 3: 타이포그래피 시스템

```
Select a typography system that expresses this brand personality.

BRAND_PERSONALITY: {from Phase 1}
COLOR_SYSTEM: {from Phase 2}

TYPOGRAPHY SELECTION PRINCIPLES:
- Font choice signals intent before a word is read
- Brand fonts should feel different from competitors WITHOUT being weird
- System fonts (Inter, Georgia) → competent but forgettable
- Custom/distinctive fonts → memorable but potentially inaccessible

PERSONALITY → FONT DIRECTION MAPPING:
Expert/Precise → Geometric sans (Neue Haas Grotesk, ABC Diatype)
Warm/Guide → Humanist sans (Söhne, Aktiv Grotesk)  
Bold/Challenger → Condensed or Display (obviously strong)
Pioneer/Innovative → Something unexpected (slab serif where none exist)
Curator/Editorial → Classic serif (Canela, GT Sectra)

GENERATE:

HEADLINE_FONT:
- font_name: {specific, not generic category}
- weight: {specific weight for headlines}
- why_this_font: {personality + differentiation reasoning}
- where_to_get: {Google Fonts (free) / Adobe Fonts / buy ($)}
- fallback_stack: {CSS fallback if not loaded}

BODY_FONT:
- font_name: {optimized for readability at small sizes}
- pairing_logic: {why this works with headline font}
- where_to_get: {source}

ACCENT_FONT (optional):
- Use cases: pull quotes, data callouts, special emphasis
- If using: {font name + exactly when}
- If not: "Single font family, weight variation only"

SIZING_SCALE (desktop):
- Display: {px} / {rem} — hero headlines only
- H1: {px} / {rem}
- H2: {px} / {rem}
- H3: {px} / {rem}
- Body: {px} / {rem} (optimize for 65-75 characters per line)
- Caption/Label: {px} / {rem}
- Minimum readable: {px} (accessibility baseline)

MOBILE_ADJUSTMENTS:
- H1: -{N}px (reduce for mobile)
- Body: keep ≥16px (iOS zooms smaller)
- Line height: 1.5-1.7 for body (readability)

CSS IMPLEMENTATION:
:root {
  --font-heading: '{HEADLINE}', {FALLBACK};
  --font-body: '{BODY}', {FALLBACK};
  --text-xs: {rem};
  --text-sm: {rem};
  --text-base: {rem};
  --text-lg: {rem};
  --text-xl: {rem};
  --text-2xl: {rem};
  --text-3xl: {rem};
  --text-4xl: {rem};
}
```

---

## Phase 4: 비주얼 언어 정의

```
Define the visual language rules for this brand.

BRAND_SYSTEM: {Phases 1-3 combined}

PHOTOGRAPHY DIRECTION:
- style: [documentary/editorial/lifestyle/abstract/data-forward]
- forbidden_subjects: [5 specific stock photo clichés to NEVER use]
- color_grade: [warm/cool/neutral/high-contrast/muted]
- composition_preference: [tight/environmental/abstract]
- human_presence: [always/never/optional — and why]

ILLUSTRATION DIRECTION (if used):
- style: [flat/textured/3D/hand-drawn/data-viz only]
- line_weight: [thin/medium/bold]
- color_count: [maximum colors in any illustration]
- complexity: [simple icon-level/detailed narrative/data visualization]

RECURRING_VISUAL_ELEMENTS:
Element 1: {describe a shape/pattern/motif that's specifically yours}
  - When to use: {contexts}
  - How to use: {size, placement, opacity}

Element 2: {another ownable element}
  
LAYOUT_PRINCIPLES:
- grid: [{N}-column, {margin}px margins, {gutter}px gutters}
- white_space_rule: [specific minimum around key elements]
- alignment_preference: [left-heavy/centered/dynamic]
- information_density: [sparse/balanced/dense]

WHAT MAKES US VISUALLY RECOGNIZABLE:
One-paragraph description of what makes our brand unmistakable at a glance,
even without logo or text — what's the visual fingerprint?

Output: content/brand/visual-language.md
```

---

## Phase 5: 채널별 브랜드 응용 규칙

```
Adapt the brand system for each content channel.

BRAND_SYSTEM: {Phases 1-4}
ACTIVE_CHANNELS: {list}

For each channel, define:

CHANNEL: {name}
Constraints: {technical constraints — size, format, algorithm}
Brand adaptation:
- What stays identical: {non-negotiables}
- What adapts: {what's allowed to flex for platform}
- What's channel-exclusive: {features only possible here}
Template library: {how many base templates needed}

BRAND_CONSISTENCY_RATING:
After all channels defined:
- Strict consistency: {which elements NEVER change}
- Flexible adaptation: {which elements can vary by platform}
- Channel-specific: {what's unique to each}

Rule of thumb: 
  Strict: Logo, primary color, font family
  Flexible: Layout, image style, color emphasis
  Channel-specific: Format, length, interaction patterns
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
