# Component Decision Rules

> **출처**: UI Design Brain (carmahhawwari) 60 component 요약 + 6 core principles.
> **용도**: 컴포넌트 생성 직전 coder에 주입. 의사결정을 객체화해 generic 방어.
> **로드 타이밍**: on-demand (컴포넌트 코드 작성 직전 orchestrator가 prepend).

---

## 6 Core Principles

1. **Restraint** — 모든 요소가 강조되면 아무것도 강조 안 됨. 페이지당 1 primary CTA.
2. **Typography as Hierarchy** — 크기/굵기/간격으로 위계. 색상으로 위계 금지.
3. **One Accent Color** — primary + neutrals + 1 accent. 나머지는 회색조.
4. **8px Grid** — 모든 spacing은 8 배수 (4, 8, 12, 16, 24, 32, 48, 64). 임의 값 금지.
5. **Accessibility-First** — WCAG AA 최소, touch target 44px, focus state 필수.
6. **Context-Specific** — "모든 앱에 좋은 버튼" 없음. 도메인/빈도/위험도 고려.

---

## Core Components (20 most common)

### Button
- 크기: sm(32) / md(40) / lg(48) — 44px 이하는 모바일 금지
- 변종: primary (1개만 강조) / secondary (outline) / ghost (text only) / destructive
- 라벨: **동사 먼저** ("Save changes" ✅ / "Submit" ❌)
- Disabled: 이유 표시 (tooltip / helper text) — 그냥 회색 처리 금지
- Loading: spinner + 라벨 유지 ("Saving..." ) — 라벨 사라지면 버튼 폭 흔들림 금지

### Input (Text)
- 라벨: **위쪽 고정** (floating label 금지 — a11y 저하 + generic 신호)
- Placeholder: 예시만, 라벨 대체 금지
- Error: 필드 아래 + 적색 + `aria-describedby` 연결
- Helper text: 필드 아래 + 회색 + `aria-describedby`
- 크기: 40-48px height, padding 좌우 12-16px
- Focus: 2px outline + 색상 대비 3:1 이상

### Select / Dropdown
- 옵션 5개 미만: radio 고려 (가시성)
- 옵션 10개 이상: search 내장
- Native `<select>` 우선 (모바일 a11y)
- Custom UI: 키보드 네비 (↑↓ Enter Esc) 필수

### Checkbox / Radio
- Touch target 44×44px (체크박스 자체는 16-20px여도 tap 영역 확장)
- 라벨 클릭 영역도 포함
- Group: `<fieldset>` + `<legend>` 필수

### Form
- Single-column 권장 (scannability)
- 필수 표시: `*` 또는 (required) — "optional" 표시도 가능
- Submit 버튼: 맨 아래, primary 1개만
- Inline validation: blur 시점, submit 전 X
- 에러 요약: 상단에 포함 (여러 필드 에러 시)

### Modal / Dialog
- **중첩 금지** (모달 안의 모달)
- Focus trap 필수 (Tab이 모달 밖으로 안 나감)
- Escape / X / Overlay click / Cancel 모두 작동
- Entry/exit 150-200ms transition
- Mobile: full-screen sheet 권장 (중앙 정렬 모달 X)
- Backdrop: `rgba(0,0,0,0.4-0.6)` — 풀 블랙 금지

### Toast / Snackbar
- 3-5초 자동 dismiss (사용자 조작 제외)
- 스택: 3개 초과 시 merge
- 위치: 고정 (top-right 또는 bottom-center) — 섞이면 generic
- Action 버튼: "Undo" 같은 1개 action까지만

### Card
- 동일 페이지 내 카드 스타일 **1-2종**만
- 그림자: tone에 따라 — brutalist는 hard shadow, luxury는 no shadow
- 내부 패딩 일관: 16-24px
- Hover: transform/shadow 변화는 tone=playful/soft만. minimal에선 border만

### Navigation (Top)
- 항목 수: **7 ± 2** (Miller's law)
- Active state: underline 또는 배경 차이, **폰트 굵기 변화로 스페이스 점프 금지**
- 모바일: 햄버거 → full-screen menu 또는 bottom tabs
- Logo: 왼쪽 고정 (RTL은 반대)

### Sidebar
- Collapsible: 토큰화된 width 2-state (280 / 64)
- Section 구분: label + spacing, border 최소화
- Active item: 배경 채움 (color, not border)
- 모바일: drawer (slide in), overlay 필수

### Table
- Sticky header (스크롤 긴 테이블)
- Zebra striping: subtle (`rgba(0,0,0,0.02)`) 또는 아예 없음
- Hover row: 배경 변화
- Sort: 헤더 아이콘 + aria-sort
- Pagination: 20-50개/page 기본
- Mobile: horizontal scroll 또는 card list 변환

### Pagination
- 범위 표시: "21-40 of 234"
- Prev/Next + 첫/끝 페이지 점프
- 페이지 번호: 현재 ± 2

### Breadcrumb
- 3단계 이상일 때만
- 마지막은 현재 페이지 (링크 X, aria-current)
- `/` 구분자 또는 `›`

### Tabs
- 항목 3-7개
- Active state: underline + 색상
- Horizontal scroll (모바일)
- Content: 전환 시 page shift 없이

### Accordion
- 기본 접힘 (펼침이면 section 그대로 써야)
- 1개만 열림 vs 다중: 용도에 따라
- Chevron 회전 애니메이션 150ms

### Avatar
- 크기: 24/32/40/48/64
- Fallback: initials (no image 시)
- Shape: tone에 따라 — circle(기본) / rounded-square(industrial, brutalist)
- Badge: 우하단 (status), 우상단 (count)

### Badge / Chip
- 크기: 20-24px height
- Variant: neutral / info / success / warning / error
- 5색 초과 사용 금지 (rainbow badge = anti-pattern)

### Tooltip
- 지연: 500-700ms hover (즉시 표시 금지 — 의도치 않은 show)
- 키보드 접근성: focus 시에도 표시
- 최대 폭: 240px
- 본문 대체 금지 (`title` 속성만 X)

### Empty State
- 일러스트 또는 아이콘 + 설명 + primary action
- "No data" 단독 표시 금지 (사용자에게 다음 행동 제시)

### Loading / Skeleton
- Skeleton 우선 (spinner 대신)
- 3초 초과 시 "Still loading..." 메시지
- Shimmer: 1.5-2s cycle, subtle

---

## Anti-Patterns (거부 목록)

| 패턴 | 왜 나쁜가 |
|---|---|
| Rainbow badges (5+ 색 동시) | 위계 파괴, generic |
| Placeholder-only label | a11y, 입력 시 사라짐 |
| Disabled button 이유 없음 | 사용자 혼란 |
| Equal-weight buttons (모두 primary) | 결정 유도 실패 |
| Floating label (animated) | a11y 저하, generic |
| Centered modal on mobile | 가려짐, 불편 |
| Hover-only interaction | 모바일/키보드 실패 |
| Icon-only button (라벨 없음) | a11y, 이해 불가 |
| Gradient text (blur, readability) | a11y, generic |
| Nested scroll containers | UX 혼란 |
| Full-width on desktop (max-width 없음) | 읽기 힘듦 |
| 12px 이하 body text | a11y 실패 |

---

## Tone별 스타일 차이

| 요소 | brutalist | luxury | playful | editorial |
|---|---|---|---|---|
| Button radius | 0 | 2-4px | 8-16px | 2-4px |
| Shadow | hard (solid 2-4px) | none 또는 subtle | soft diffused | minimal |
| Hover | invert | subtle 1-2px shift | bounce/scale | color shift |
| Border | 2-3px solid | 1px 또는 none | 1-2px rounded | 1px underline |

Tailwind `rounded-2xl` + `shadow-lg` 동시 = generic 기본값. tone에 맞게 조정 필수.

---

## 생성 체크리스트 (coder용)

```
[ ] Touch target ≥ 44px
[ ] Focus state 정의
[ ] 라벨 (placeholder 단독 X)
[ ] 8px 그리드 spacing
[ ] 1 accent color만 사용
[ ] 동사-first 버튼 라벨
[ ] tone 선언과 일치 (radius/shadow/motion)
[ ] 반응형 확인 (375px 이하)
```

design-auditor가 이 체크리스트를 24 rule과 자동 대조.
