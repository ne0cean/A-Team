# Figma — Playful Collaboration

**tone**: playful | **variant**: soft | **variance**: 5 | **motion**: 6 | **density**: 6

## Brand Essence

Design together, live. Multi-color brand. 친근함 + 프로 도구의 정교함. 커서 = 사람.

## Typography

- Display: Whyte (custom)
- Body: Inter
- Scale: 11 / 12 / 14 / 16 / 20 / 28 / 48
- Line-height: 1.4
- UI 안에서 font-size 11-12 빈도 높음 (dense canvas)

## Color Palette

- Primary: `#0D99FF` (Figma blue)
- Brand: red `#F24E1E`, purple `#A259FF`, orange `#FF7262`, green `#0ACF83` — 5 core
- Background: `#FFFFFF` / `#2C2C2C`
- Surface: `#F5F5F5` / `#383838`

## Spacing

4px grid (더 조밀한 canvas tool). 8 / 12 / 16 / 24 / 32.

## Motion

- Transition: 150-200ms, spring ease
- Cursor trail (멀티플레이어)
- Comment bubble 등장 spring
- 전환: 빠르고 가볍게 (느리면 canvas 방해)

## Components Signature

- Icon button: 28-32px, hover = background shift
- Color picker: 고유 방식 (2D saturation + hue slider)
- Layer list: 12-13px dense list
- Multiplayer cursors: named + colored

## Anti-Patterns

- ❌ Serif body (creative tool 분위기 아님)
- ❌ Corporate restraint (Figma는 표현적)
- ❌ Mono-color system

## Quantified Constraints

```yaml
radius:
  button_max_px: 8
  icon_button_max_px: 4
  card_max_px: 8
shadow:
  offset_y_max_px: 2
  blur_max_px: 8
  opacity_max: 0.1
easing:
  allowed: [spring, ease-out]
  forbidden: [bounce-heavy, elastic]
  allow_soft_spring: true
transition_ms:
  min: 150
  max: 200
gradient:
  allowed: subtle
  forbidden: heavy-generic-purple
color:
  accent_count_min: 3
  brand_multi_color: true
  core_colors: 5
  primary: "#0D99FF"
typography:
  body_px: [12, 14]
  allow_serif_body: false
  ui_font_px_min: 11
density:
  score: 6
  spacing_base_px: 4
```

## 언제 참고

- Creative tool, collaborative canvas, design software
- "multiplayer + expressive + professional" 톤
- tone=playful + density 6 기준점
