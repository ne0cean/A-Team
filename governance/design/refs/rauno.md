# Rauno.me — Brutalist Interaction Craft

**tone**: brutalist | **variant**: brutalist | **variance**: 9 | **motion**: 8 | **density**: 6

## Brand Essence

Rauno Freiberg's personal site. 실험적 interaction. 가독성-파괴 직전 균형. 디자이너 × 엔지니어 정체성.

## Typography

- Display: 대담한 sans (Degular / custom)
- Body: Inter Mono hybrid
- Scale: 13 / 14 / 16 / 20 / 28 / 48 / 80+
- Letter-spacing: tight on display, wider on micro
- 믹스된 weight (100 ↔ 900) 과감하게 사용

## Color Palette

- Primary: `#000000` / `#FFFFFF`
- Accent: 단 하나의 형광색 (녹색 `#0BF` 또는 빨강)
- Background: pure white / pure black
- Surface: `#FAFAFA` 거의 동일

## Spacing

비균등 — broken grid. 섹션마다 다른 리듬.

## Motion

- Magnetic cursor, physics-based
- Scroll-linked element morphing
- Stagger animation 자주
- 실험적 canvas interaction
- `prefers-reduced-motion` 대응 필수 (motion 8이므로)

## Components Signature

- 링크: underline on hover + layout shift 허용
- 버튼: 박스 모델 파괴 (border만, 배경 없음)
- 스크롤 인디케이터: 고유 디자인
- 인터랙티브 토이 (별도 canvas)

## Anti-Patterns

- ❌ Generic template (hero + 3-col + CTA)
- ❌ Rounded-2xl + shadow-lg
- ❌ Soft pastels
- ❌ 보라 그라디언트
- ❌ "Clean modern SaaS" 분위기

## Quantified Constraints

```yaml
radius:
  button_max_px: 0
  card_max_px: 0
  forbid_pill_rounded: true
shadow:
  offset_y_max_px: 0
  allowed_only: none
easing:
  allowed: [physics-based, spring, magnetic]
  require_reduced_motion_handler: true
transition_ms:
  min: 100
  max: 600
  allow_complex_choreography: true
gradient:
  allowed: false
  pure_bw_only: true
color:
  primary: pure-black-white
  accent_count_max: 1
  accent_fluorescent: true
  forbidden_hues: [pastel, purple, multi-color]
typography:
  body_mix_weights: true
  weight_range: [100, 900]
  display_scale_max_px: 120
  letter_spacing_display: tight
density:
  score: 6
  spacing_base_px: irregular
  broken_grid_allowed: true
a11y:
  reduced_motion_required: true
  focus_state_required: true
```

## 언제 참고

- 디자이너/엔지니어 포트폴리오
- 창의적 agency
- 실험적 제품 마케팅
- tone=brutalist + motion 8 경계선 케이스
- **주의**: a11y 노력 필수 (reduced-motion, focus state, contrast)
