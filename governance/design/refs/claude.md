# Claude (Anthropic) — Editorial Restraint

**tone**: editorial | **variant**: minimalist | **variance**: 3 | **motion**: 2 | **density**: 4

## Brand Essence

Thoughtful. Quiet confidence. 텍스트 콘텐츠가 중심. 흑백 + 딱 하나의 accent. 연구 기관 분위기.

## Typography

- Display: Styrene A (Anthropic custom)
- Body: Tiempos / system serif (장문 독해용)
- Mono: Berkeley Mono / JetBrains Mono
- Scale: 14 / 16 / 18 / 21 / 28 / 42
- Line-height: 1.6 body (장문 가독성), 1.2 heading
- Serif body는 매우 드문 선택 — 글 읽기 강조

## Color Palette

- Primary: `#CC785C` (terra-cotta, Claude signature)
- Background: `#F5F4ED` (warm off-white) / `#2B2B2B` (warm black)
- Text: `#141413` / `#F0EEE6`
- Accent: 단색만 — 상황별 차이 최소
- Gradient 사용 0

## Spacing

- 8px grid, 본문 line-length 65ch 유지
- 섹션 간 64-96px
- Card padding: 24-32px

## Motion

- Transition: 150ms, `ease-out`
- Subtle only — fade, minimal translate
- NO scroll-triggered, NO parallax
- Focus state: 강한 outline (a11y 신호)

## Components Signature

- Button: 44px height, 4-6px radius, solid fill
- Input: 44px, 1px border, thick focus outline
- Card: 8px radius, 1px border, no shadow
- Chat bubble: terra-cotta accent for user, neutral for Claude

## Anti-Patterns

- ❌ 보라 (경쟁사 AI 시그널)
- ❌ Heavy motion
- ❌ Multi-color accents
- ❌ Rounded-2xl

## Quantified Constraints

```yaml
radius:
  button_max_px: 6
  card_max_px: 8
  input_max_px: 6
shadow:
  offset_y_max_px: 0
  blur_max_px: 0
  opacity_max: 0
  allowed_only: border-based
easing:
  allowed: [ease-out]
  forbidden: [bounce, overshoot, spring, elastic]
transition_ms:
  min: 100
  max: 200
gradient:
  allowed: false
color:
  accent_count_max: 1
  brand_terracotta: "#CC785C"
  forbidden_hues: [purple, magenta, violet]
typography:
  body_px: [16, 18]
  body_line_height: 1.6
  allow_serif_body: true
  line_length_ch: 65
density:
  score: 4
  spacing_base_px: 8
  section_gap_px: [64, 96]
```

## 언제 참고

- AI tool, research-facing product, reading-heavy app
- "quiet + thoughtful + credible" 톤
- 본문 중심 레이아웃 설계 시
