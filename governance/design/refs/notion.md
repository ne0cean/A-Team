# Notion — Editorial Minimalism

**tone**: editorial | **variant**: minimalist | **variance**: 3 | **motion**: 2 | **density**: 4

## Brand Essence

Your second brain. 빈 캔버스. 블록 = 단위. 사용자가 스타일을 채움. 도구는 invisible.

## Typography

- Body: Segoe UI / system font stack (macOS/Windows native)
- Display: 동일 폰트, 크기로만 위계
- Mono: Monaco / Consolas
- Scale: 14 / 16 / 20 / 24 / 32
- Line-height: 1.5 (편집 가독성)

## Color Palette

- Primary: `#2E2E2E` (near black) / `#FFFFFF`
- Background: `#FFFFFF` / `#191919` (dark)
- Accent: 유저 선택 10 colors (default 파스텔)
- Text: `#37352F` / `#D4D4D4`
- Hover: `#F7F6F3` — 극단적으로 subtle

## Spacing

블록 기준 — 8px grid. 페이지 여백: 96px 좌우.

## Motion

- Transition: 100ms 이하 (즉각)
- Drag-and-drop feedback: outline 변화
- No decorative animation — 편집 중 방해 최소

## Components Signature

- Block: hover 시 drag handle 표시
- Command palette: `/` 트리거, 16px mono 인라인
- Sidebar: collapsible, 280px 기본
- Icon: emoji 가능 (사용자 개성)

## Anti-Patterns

- ❌ 화려한 그라디언트
- ❌ 장식적 motion
- ❌ 위압적 shadow
- ❌ Heavy brand color (user content 우선)

## Quantified Constraints

```yaml
radius:
  button_max_px: 4
  card_max_px: 4
  block_hover_px: 2
shadow:
  offset_y_max_px: 1
  blur_max_px: 3
  opacity_max: 0.04
easing:
  allowed: [ease-out, linear]
  forbidden: [bounce, overshoot, spring, elastic]
transition_ms:
  min: 0
  max: 100
gradient:
  allowed: false
color:
  accent_user_selectable: 10
  default_pastel: true
  brand_restraint: true
  hover_bg: "#F7F6F3"
typography:
  body_px: [14, 16]
  body_line_height: 1.5
  system_font_stack: true
density:
  score: 4
  spacing_base_px: 8
  page_margin_px: 96
```

## 언제 참고

- Document editor, knowledge base, flexible canvas
- "invisible tool + user ownership" 톤
- 블록 기반 UI 설계 시
