# Linear — Editorial Minimalism

**tone**: editorial | **variant**: editorial | **variance**: 4 | **motion**: 3 | **density**: 5

## Brand Essence

Keyboard-first. Developer-calm. Type-driven hierarchy. 즉각 반응성. 대담한 여백.

## Typography

- Display: Inter Display (custom-tuned) — Linear 고유 변형
- Body: Inter (14-16px)
- Mono: SF Mono / Berkeley Mono (code context)
- Scale: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36
- Line-height: 1.5 body, 1.2 heading
- Letter-spacing: tighter (-0.01em) on display

## Color Palette

- Primary: `#5E6AD2` (Linear indigo, 절제된 사용)
- Background: `#08080F` (dark) / `#FCFCFD` (light)
- Surface: `#101014` / `#F7F7F8`
- Border: `#26262E` / `#ECECF0`
- Text: `#E6E6E9` / `#0C0C12`
- Accent: 이슈 상태별 색상 (single-hue range)

## Spacing Grid

8px base. 주요 간격: 8 / 12 / 16 / 24 / 32 / 48.

## Motion

- Transition: 100-200ms, `cubic-bezier(0.16, 1, 0.3, 1)` (subtle ease-out)
- NO bounce, NO overshoot
- Micro-interaction: keyboard shortcut visible cue

## Components Signature

- Button: 32-36px height, 6-8px radius, subtle border, hover = background shift
- Input: 32px, bottom border focus highlight
- Card: 8-12px radius, 1px border, 거의 no shadow
- Shadow: `0 1px 2px rgba(0,0,0,0.04)` 최대치

## Anti-Patterns (Linear은 절대 안 함)

- ❌ Gradient (그라디언트 사용 사례 0)
- ❌ 16px+ border-radius
- ❌ shadow-lg/xl
- ❌ Bounce easing
- ❌ Heavy marketing copy

## Quantified Constraints

```yaml
radius:
  button_max_px: 8
  card_max_px: 12
  input_max_px: 8
shadow:
  offset_y_max_px: 2
  blur_max_px: 8
  opacity_max: 0.08
  allowed_only: subtle-1px
easing:
  allowed: [ease-out, "cubic-bezier(0.16, 1, 0.3, 1)"]
  forbidden: [bounce, overshoot, spring, elastic]
transition_ms:
  min: 100
  max: 200
gradient:
  allowed: false
color:
  accent_count_max: 2
  saturation_max: moderate
typography:
  body_px: [14, 16]
  heading_line_height_max: 1.3
density:
  score: 5
  spacing_base_px: 8
```

## 언제 참고

- Dev tool, AI tool, productivity, B2B SaaS
- "professional + calm + fast" 톤이 필요할 때
- tone=editorial + density 5 기준점
