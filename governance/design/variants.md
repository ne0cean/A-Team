# Design Variants — 파라미터화된 Taste 시스템

> **출처**: Taste-Skill (Leonxlnx). 고정 규칙 대신 1-10 스케일 파라미터로 AI가 값 조정하며 학습하는 구조.
> **관계**: tone(무엇) × variants(얼마나) 두 축으로 디자인 공간 정의.
> **로드 타이밍**: tone 결정 직후 함께 결정.

---

## 3 Axes

### 1. Design Variance (레이아웃 파괴성)

| Value | 특성 | 그리드 | 비대칭 | 레퍼런스 |
|---|---|---|---|---|
| 1-3 | 정렬된, 예측 가능 | 12-col 정렬 | 없음 | Stripe docs |
| 4-6 | 표준 + 소량 변주 | 8-12 col | 악센트 요소 | Linear |
| 7-9 | 대담한 구성 | broken grid | 적극 활용 | Rauno.me |
| 10 | 실험적 파괴 | gridless | 지배적 | Bloomberg redesign |

### 2. Motion Intensity (애니메이션 강도)

| Value | 특성 | Transition | Scroll-triggered | Micro |
|---|---|---|---|---|
| 1-3 | 거의 없음 | 150ms ease | 없음 | hover only |
| 4-6 | 적당 | 200-300ms ease-out | enter 1-2곳 | hover + focus |
| 7-9 | 풍부 | spring/ease | 다수 parallax | stagger, magnetic cursor |
| 10 | 드라마틱 | 복합 curve | 페이지 전체 | 대화형 |

**a11y 오버라이드**: `prefers-reduced-motion: reduce` 사용자에겐 강제 1-2.

### 3. Visual Density (정보 밀도)

| Value | 특성 | Padding | Font size | 레퍼런스 |
|---|---|---|---|---|
| 1-3 | 럭셔리, 호흡 | 64-128px | 18-24px body | Apple marketing |
| 4-6 | 균형 | 24-48px | 14-16px body | Linear, Stripe |
| 7-9 | 조밀 대시보드 | 8-16px | 12-14px body | Bloomberg, Figma |
| 10 | 데이터 극밀도 | 2-8px | 10-12px body | Trading terminal |

---

## 7 Preset Variants

빠른 선택을 위한 조합. 세밀 조정 없이 즉시 사용.

### `minimalist`
- variance: 2, motion: 2, density: 3
- Tone: luxury / soft-pastel / editorial 적합
- 예: Notion homepage, Linear marketing

### `soft`
- variance: 3, motion: 4, density: 4
- Tone: playful / soft-pastel 적합
- 예: Arc, Raycast homepage

### `brutalist`
- variance: 8, motion: 2, density: 7
- Tone: brutalist / bold-typographic 적합
- 예: Rauno.me, ARCengine

### `editorial`
- variance: 5, motion: 3, density: 4
- Tone: editorial / luxury 적합
- 예: NYT, Medium premium

### `industrial`
- variance: 4, motion: 3, density: 8
- Tone: industrial / bold-typographic 적합
- 예: Vercel observability, Railway

### `experimental`
- variance: 9, motion: 8, density: 5
- Tone: maximalist / retro-futuristic 적합
- 예: Stripe Sessions, Apple event

### `data-dense`
- variance: 3, motion: 2, density: 9
- Tone: industrial / brutalist 적합
- 예: Trading dashboard, analytics tools

---

## Tone × Variant 유효 매트릭스

아무 조합이나 유효하지 않음. 충돌 시 tone이 우선.

| Tone | 권장 variant | 금지 |
|---|---|---|
| luxury | minimalist, editorial | brutalist, data-dense |
| brutalist | brutalist, data-dense | soft, minimalist |
| playful | soft, experimental | brutalist, data-dense |
| editorial | editorial, minimalist | data-dense, experimental |
| industrial | industrial, data-dense | soft, experimental |
| maximalist | experimental | minimalist |

변환 규칙: 사용자가 tone=luxury + data-dense 선택 시 → designer 서브에이전트가 `editorial` 권장 + 이유 설명 후 확인.

---

## 저장 형식

`.design-override.md` frontmatter:

```markdown
---
design: on
tone: editorial
variant: editorial
# 또는 세밀 조정
variance: 5
motion: 3
density: 4
a11y_level: AA
---
```

variant 선택 시 3 axes 자동 채움. 세밀 조정 시 variant 무시.

---

## 자동 튜닝 (learnings 연동)

사용자가 생성 결과에 대해:
- "너무 밀도 낮다" → density +2 기록
- "애니메이션 과하다" → motion -2
- "더 대담하게" → variance +2

다음 세션부터 해당 프로젝트 기본값이 튜닝된 값으로 시작.
`lib/learnings.ts` `logDesignOutcome({ type: 'preference', key: 'density', delta: +2 })`.

---

## 주의

- 7 variant는 **출발점**. 프로젝트마다 미세 조정 필요.
- 레퍼런스는 **분위기 참고용** — 그대로 복제 금지 (legal + taste 둘 다 문제).
- density 증가 시 touch target 44px 최소는 유지 (a11y 비협상).
