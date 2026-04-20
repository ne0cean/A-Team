# Raycast — Soft Pastel Precision

**tone**: soft-pastel | **variant**: soft | **variance**: 3 | **motion**: 5 | **density**: 5

## Brand Essence

macOS native feel. Command palette is the app. Playful micro-interactions. 파스텔 + 높은 대비의 절제된 사용.

## Typography

- Display: Inter / SF Pro Display
- Body: SF Pro / Inter
- Mono: SF Mono
- Scale: 13 / 14 / 15 / 17 / 22 / 28
- Line-height: 1.4

## Color Palette

- Primary: `#FF6363` (Raycast red)
- Background: macOS vibrancy / `#1E1E1E`
- Surface: native blur
- Accent: 채도 높은 coral + peach pastels
- 파스텔이지만 대비 높음 (a11y AA 유지)

## Spacing

8px grid. 조밀한 command palette 내부 + 여유 있는 settings.

## Motion

- Transition: 200ms, `ease-out`
- Keyboard interaction feedback (hold 시 확장, release 시 복귀)
- Sound effect (option)
- Hover spring (약함, tone=playful 경계)

## Components Signature

- Command row: 36-44px, 6px radius, hover = subtle background
- Icon: 16-20px, 단색 또는 brand coral
- Keyboard shortcut pill: mono 12px, bordered
- Alfred/Spotlight 스타일의 fuzzy search

## Anti-Patterns

- ❌ Heavy shadows (macOS native는 vibrancy만)
- ❌ 보라 그라디언트
- ❌ Rounded-2xl (Raycast는 4-6px)
- ❌ Serif fonts

## Quantified Constraints

```yaml
radius:
  button_max_px: 6
  card_max_px: 8
  row_max_px: 6
shadow:
  offset_y_max_px: 0
  allowed_only: native-vibrancy
easing:
  allowed: [ease-out]
  forbidden: [bounce-hard, elastic]
  allow_soft_spring: true
transition_ms:
  min: 150
  max: 200
gradient:
  allowed: accent-subtle
  forbidden: purple
color:
  primary: "#FF6363"
  accent_count_max: 3
  pastel_saturation: high-contrast
  a11y_contrast: AA
typography:
  body_px: [13, 15]
  allow_serif_body: false
density:
  score: 5
  spacing_base_px: 8
```

## 언제 참고

- macOS / cross-platform utility, launcher, productivity
- "native feel + playful polish" 톤
- Keyboard-first UX 설계 시
