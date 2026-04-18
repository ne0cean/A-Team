# Design Anti-Patterns — 24 Detection Rules

> **출처**: Impeccable (pbakaus, Google/Anthropic) 24 정량 anti-pattern + A-Team 확장.
> **구현 현황**: `lib/design-smell-detector.ts`에 **22개 static rule 구현** (v3, 2026-04-18) — AI-01..08 (포함 AI-07 signal), RD-01/02/03/04/05/06, A11Y-01..05, LS-01/02/03. 나머지 2개는 LLM critique (PL-01 tone mismatch, PL-02 missing personality) — design-auditor 에이전트가 처리.
> **보안 가드**: 입력 content > 2MB 시 detector 조기 반환 (regex DoS 방지). 파일 경로는 **메타데이터 전용** — detector는 파일을 읽지 않음.
> **사용처**: design-auditor 서브에이전트, `/qa --design`, PR 머지 전 게이트.

---

## 분류

- **AI Slop** (8) — LLM이 기본값으로 회귀 시 나오는 전형적 패턴
- **Readability** (6) — 가독성 저하
- **A11y** (5) — 접근성 위반 (비협상)
- **Layout/Spacing** (3) — 그리드 일관성
- **Polish** (2) — 완성도 (LLM critique 필요)

---

## AI Slop (8)

### [AI-01] Purple Gradient
**감지**: CSS/JSX에 다음 패턴 중 1개:
- `linear-gradient(.*purple|violet|#7C3AED|#8B5CF6|#A78BFA)`
- Tailwind `from-purple-\d+ to-(pink|indigo|violet)`
- `bg-gradient-to-(br|r)` + purple/pink 계열

**예외**: tone=`playful` 선언 시 완화 (warning only).
**Fix**: tone 팔레트 변수 사용 (`--ds-accent`).

### [AI-02] Generic Font Stack
**감지**: `font-family` 또는 `font-*` 클래스가:
- `Inter`, `Roboto`, `Arial`, `Helvetica Neue`, `Space Grotesk` 단독
- 페어링 없음 (display + body 구분 없음)

**예외 (페어링 인식)**: 같은 파일에 distinctive font가 함께 선언되면 위반 아님.
- 키워드: `monospace`, `serif`, `IBM Plex`, `JetBrains Mono`, `Plex Mono`, `SF Mono`,
  `Fira Code`, `Iosevka`, `PT Serif`, `Source Serif`, `Recoleta`, `Cormorant`,
  `Playfair`, `Geist Mono`, `Menlo`, `Consolas`, `Courier`.

**Fix**: tone별 추천 페어링 적용. `@font-face` 또는 CSS variable.

### [AI-03] AI Triad (grid-3 + rounded-2xl + shadow-lg)
**감지**: 단일 컴포넌트에서 동시 사용:
- `grid-cols-3` (또는 `display: grid` + `grid-template-columns: repeat(3, 1fr)`)
- `rounded-2xl` / `border-radius: 16px+`
- `shadow-lg` / `box-shadow` lg 이상

**가장 강한 AI smell signal**. 3개 중 2개까지만 허용.

### [AI-04] Bounce Easing
**감지**: `cubic-bezier` 값이 overshoot 포함:
- `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (기본 bounce)
- `cubic-bezier(.*-\d.*1\.\d)` — 음수 control + 1 초과

**Fix**: tone=playful만 허용. 나머지는 `ease-out` / `cubic-bezier(0.4, 0, 0.2, 1)`.

### [AI-05] Default Heavy Shadow
**감지**: `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)` (shadow-2xl default) 또는 `shadow-2xl` 클래스.
**Fix**: tone에 맞는 shadow 또는 제거.

### [AI-06] Universal Transition
**감지**: `transition: all 0.3s` 또는 `transition-all` 전역 적용.
**Fix**: 명시적 속성만 (`transition: transform 200ms ease-out`).

### [AI-07] Hero-Features-CTA Template
**감지**: 단일 파일에 순서대로:
1. `<section>` with `h1` + CTA (hero)
2. `grid-cols-3` with 3 identical cards (features)
3. `<section>` with centered text + CTA (final CTA)

**LLM critique 필요** (구조 판단). 정규식으로 signal만 감지 후 LLM 호출.

### [AI-08] Generic Marketing Copy
**감지**: 다음 문자열 포함:
- `Revolutionize`, `Supercharge`, `Unleash`, `Effortlessly`, `Seamless experience`
- `Transform your workflow`, `10x your productivity`
- Lorem ipsum (`lorem`, `ipsum`, `dolor sit amet`)

**Fix**: 도메인 구체 카피로 교체.

---

## Readability (6)

### [RD-01] Long Line Length
**감지**: 텍스트 컨테이너에 `max-width` 없음 + 부모 폭 960px 이상.
**Fix**: `max-width: 65ch` (본문) / `max-width: 45ch` (리드).

### [RD-02] Cramped Line Height
**감지**: body text `line-height < 1.4` (절대값 또는 unitless).
**Fix**: body 1.5-1.7, heading 1.1-1.25.

### [RD-03] Low Contrast
**감지**: 색상 대비 계산 (WCAG). 텍스트 색 + 배경색 조합:
- 일반 텍스트: ratio < 4.5
- 대형 (18pt+ 또는 14pt+ bold): ratio < 3.0

**비협상 a11y**. 자동 감지, override 불가.

### [RD-04] Tiny Body Text
**감지**: body 텍스트 `font-size < 14px` (모바일 대응).
**예외 (caption 클래스)**: 셀렉터가 `.caption`, `.meta`, `.label`, `.footer-meta`,
`.pretitle`, `.tag`, `.hint`, `.small`, `.micro`, `.footnote`, `.tooltip`, `.layer-tag`,
`.chip`, `.badge`, `.crumb`, `.byline`, `.copyright`, `.kbd` 중 하나면 ≥10px 허용.
**예외 (tone)**: `tone` 옵션이 `editorial-technical`, `brutalist`, `bold-typographic`,
`minimal` 중 하나면 ≥10px 허용 (Linear/Stripe/Bloomberg/Rauno 톤).
**하한선**: 10px 미만은 어떤 경우에도 위반.
**Fix**: 최소 14px (본문), 10-13px는 caption/meta 한정.

### [RD-05] Heading Hierarchy Skip
**감지**: DOM에서 h1 → h3, h2 → h4 등 단계 skip.
**Fix**: 순차적 heading 구조.

### [RD-06] Justified Text
**감지**: `text-align: justify`.
**Fix**: left align. justify는 공백 불균형 → 가독성 저하.

---

## A11y (5) — 비협상

### [A11Y-01] Missing Alt
**감지**: `<img>` 태그에 `alt` 속성 없음 또는 비어있고 의미 있는 이미지.
**Fix**: 장식 이미지 `alt=""`, 의미 있는 이미지 설명적 alt.

### [A11Y-02] Icon Button Without Label
**감지**: `<button>` 내부에 아이콘만 있고 텍스트/`aria-label` 없음.
**Fix**: `aria-label` 필수 또는 `sr-only` 텍스트.

### [A11Y-03] Touch Target < 44px
**감지**: 인터랙티브 요소 (button/a/input) 높이 또는 폭 < 44px (모바일).
**Fix**: min-height: 44px 또는 tap 영역 확장.

### [A11Y-04] Focus Outline Removed
**감지**: `outline: none` 또는 `outline: 0` + 대체 focus state 없음.
**Fix**: `:focus-visible` 스타일 필수.

### [A11Y-05] Form Field Without Label
**감지**: `<input>` / `<select>` / `<textarea>` 에 연결된 `<label>` 없음 (`for` 또는 wrapping) + `aria-label` 없음.
**Fix**: `<label for>` 또는 `aria-label`.

---

## Layout/Spacing (3)

### [LS-01] Non-Grid Spacing
**감지**: padding/margin 값이 8 배수 아님 (7px, 13px, 19px 등).
**Fix**: 4, 8, 12, 16, 24, 32, 48, 64 중 선택.

### [LS-02] Absolute Positioning Overuse
**감지**: 한 컴포넌트 내 `position: absolute` 3개 이상 + flexbox/grid 없음.
**Fix**: flex/grid 우선. absolute는 overlay/badge만.

### [LS-03] Fixed Height on Text Containers
**감지**: 텍스트 포함 컨테이너에 `height: Npx` (고정). `min-height` 아님.
**Fix**: `min-height` 또는 자연 흐름.

---

## Polish (2) — LLM Critique 필요

### [PL-01] Tone Mismatch
**감지**: 선언 tone과 실제 스타일 불일치. 예: tone=luxury인데 `shadow-2xl` + `from-purple-500`.
**방법**: `.design-override.md` tone 읽고 LLM이 컴포넌트 JSX/CSS 검토.

### [PL-02] Missing Personality
**감지**: 모든 섹션이 동일한 카드 레이아웃, 위계 없음, 포인트 요소 부재.
**방법**: LLM이 스크린샷 + 코드 검토. 개선 제안.

---

## 감지 결과 스키마

```json
{
  "score": 82,
  "violations": [
    {
      "rule": "AI-01",
      "severity": "HIGH",
      "file": "src/components/Hero.tsx",
      "line": 23,
      "match": "bg-gradient-to-br from-purple-500 to-pink-500",
      "fix": "Use tone palette variable: var(--ds-accent)"
    }
  ],
  "summary": {
    "ai_slop": 2,
    "readability": 0,
    "a11y": 1,
    "layout": 1,
    "polish": 0
  },
  "tokens_consumed": 0
}
```

---

## 점수 계산

- 시작: 100
- A11Y 위반: -15 / 건 (비협상)
- AI Slop: -8 / 건
- Readability: -5 / 건
- Layout: -3 / 건
- Polish: -5 / 건 (LLM critique)
- 최하: 0

**게이트**:
- `/ship` / `/review` 머지 전: 점수 ≥ 70 + A11Y 위반 0
- `/craft` PRO tier: 점수 ≥ 85 + A11Y 위반 0
- 일반 PR: 점수 ≥ 60 (경고만)

---

## 학습 피드백

사용자가 특정 룰을 override 하면:
```typescript
logDesignOutcome({
  type: 'preference',
  key: `anti-pattern-${rule}`,
  insight: `사용자가 ${rule} 경고를 거부함 (이유: ${reason})`,
  confidence: 6,
});
```
반복 override 시 해당 프로젝트에서 rule 약화. cross-project 일관 override 시 A-Team 글로벌 튜닝 검토.
