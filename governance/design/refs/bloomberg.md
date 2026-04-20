# Bloomberg Terminal — Brutalist Data Density

**tone**: brutalist | **variant**: data-dense | **variance**: 3 | **motion**: 1 | **density**: 10

## Brand Essence

정보 밀도의 끝. 전문가가 하루 12시간 본다. 아름다움 < 조회 속도. 키보드 명령어가 UI.

## Typography

- Body: Bloomberg Console mono (custom)
- Scale: 10 / 11 / 12 / 14 (극단적으로 작음 — 전문가용)
- Line-height: 1.1-1.2
- Monospace 전체 (격자 정렬)

## Color Palette

- Primary: `#FF6600` (Bloomberg orange — 유명)
- Background: `#000000` / `#0A0A0A`
- Text: `#FFFFFF`, `#AAAAAA` (primary/secondary)
- Signal:
  - Green `#00FF00` = up/positive
  - Red `#FF0000` = down/negative
  - Amber `#FFAA00` = warning/change
- 채도 100% (정보 신호)

## Spacing

1-2px grid (극단적 밀도). Padding 2-8px 최대.

## Motion

- 거의 없음 — 데이터 업데이트 깜빡임만
- 깜빡임도 subtle (1 frame)
- transition 완전 제거

## Components Signature

- Table row: 14-16px row-height, mono, no padding
- Button: 플랫, 테두리 없음, 배경 orange
- Input: 인라인 CLI 같은 command bar
- Chart: minimal grid, 숫자가 주인공

## Anti-Patterns

- ❌ 모든 modern design 조언 (brutalist-data-dense는 규칙 밖)
- ❌ Rounded corners
- ❌ Shadows
- ❌ 여백
- ❌ Motion

## Quantified Constraints

```yaml
radius:
  button_max_px: 0
  card_max_px: 0
  all_zero: true
shadow:
  offset_y_max_px: 0
  blur_max_px: 0
  allowed_only: none
easing:
  allowed: [linear, none]
  forbidden: [ease-out, bounce, spring, elastic]
transition_ms:
  min: 0
  max: 16
  disable_preferred: true
gradient:
  allowed: false
color:
  primary: "#FF6600"
  bg: "#000000"
  signal_saturation: 100
  semantic_required:
    up: "#00FF00"
    down: "#FF0000"
    warn: "#FFAA00"
typography:
  body_px: [10, 14]
  mono_only: true
  line_height: [1.1, 1.2]
density:
  score: 10
  spacing_base_px: 2
  padding_max_px: 8
  row_height_px: [14, 16]
consumer_app: forbidden
```

## 언제 참고

- Trading terminal, ops dashboard, NOC
- 전문가가 데이터 밀도를 원할 때
- **주의**: 일반 소비자 앱에 이 톤 적용 절대 금지 (접근성 파괴)
- tone=brutalist 극단 케이스, density 10 기준점

## Caveat

Bloomberg는 **전문가 도구**다. 일반 소비자용 fintech 앱은 editorial + minimalist 쪽으로. 오용 시 a11y/학습곡선 문제.
