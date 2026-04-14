# Tone-First Design — 극단 선택 강제

> **출처**: Anthropic Frontend Design Skill 철학 (277K+ 설치). Claude가 평균 패턴으로 수렴하는 것을 원천 차단.
> **원칙**: "Intentionality matters more than intensity." 생성 *전* 방향 강제하면 생성 *후* 일관성 자동 확보.
> **로드 타이밍**: 새 UI 작업 시작 시 (gate 통과 후 Design Brief phase).

---

## Core Rule

UI 생성 전 **반드시 Tone 결정**. Tone은 **11개 중 1개 극단**만 선택. 혼합 금지 (혼합 = generic).

기본값 없음. "그냥 예쁘게" / "modern clean" / "minimal" 단독은 **거부 사유**.

---

## 11 Tone Palette

| Tone | 핵심 정체성 | Font 힌트 | Color 힌트 | 레퍼런스 |
|---|---|---|---|---|
| **brutalist** | 날것, 격자, 터미널 | Mono, Helvetica, Grotesk | 흑백 + 경고색 1개 | ARCengine, Bloomberg terminal |
| **luxury** | 여백, 타이포 위계 강조 | Didone, Serif display | 블랙/크림/골드 | Hermès, Apple marketing |
| **playful** | 일러스트, 유기적 곡선 | Rounded sans, 손글씨 | 파스텔 다색 | Duolingo, Figma |
| **editorial** | 잡지, 타이포 중심 | Serif body + display sans | 종이색 + 포인트 1-2 | NYT, Medium premium |
| **retro-futuristic** | 80s grid, scanline | Mono + display retro | CMYK pop | Stripe Sessions, Linear 2019 |
| **organic** | 손글씨, 자연 비율 | Humanist serif, script | Earth tones | Notion Labs, Input |
| **industrial** | 엔지니어링, 블루프린트 | Technical mono | Steel gray + amber | Vercel observability, Railway |
| **maximalist** | 정보 밀도, 층 | Bold display mix | 채도 높은 대비 | Figma FigJam, Miro |
| **soft/pastel** | 라운드, 낮은 채도 | Rounded sans | 파스텔 grayscale | Linear homepage, Arc |
| **art-deco** | 기하학, 금속 | Geometric display | Black + metallic | Gucci web, luxury CPG |
| **bold-typographic** | 큰 글자, 그리드 파괴 | Variable font heavy | Mono 1-2 색 + 대비 | Vercel Ship, Rauno.me |

각 tone은 `governance/design/refs/` 의 세부 가이드 링크 (Phase 3에서 확장).

---

## Anti-Generic Rules (Hard Ban)

다음은 tone 무관 **전부 금지** (`lib/design-smell-detector.ts` 자동 감지):

### Font
- ❌ `Inter`, `Roboto`, `Arial`, `Helvetica Neue`, `Space Grotesk` 단독 사용
- ✅ Tone에 맞는 distinctive display font + refined body font **페어링**

### Color
- ❌ `linear-gradient(purple, pink)` / `from-purple-500 to-pink-500`
- ❌ 보라 계열 accent (`#7C3AED`, `#8B5CF6`, `#A78BFA`) tone=playful 외
- ❌ 흰 배경 + 보라 그라디언트 조합 (가장 강한 AI smell signal)
- ✅ tone에 정의된 팔레트 변수만 (`--ds-primary`, `--ds-accent` 등)

### Layout
- ❌ 히어로(1) + 3-column features(2) + CTA(3) 템플릿 그대로
- ❌ `grid-cols-3` + `rounded-2xl` + `shadow-lg` 동시 사용 (AI smell triad)
- ❌ 모든 카드 동일 크기 (비대칭성 있어야 taste)

### Effects
- ❌ `transition: all 0.3s ease` 모든 요소에 적용
- ❌ `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (bounce, AI slop)
- ❌ `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)` (default shadow-2xl)
- ✅ tone에 정의된 motion curve + intensity만

### Copy
- ❌ "Revolutionize your workflow" / "Supercharge" / "Effortless" 같은 제네릭 마케팅 카피
- ❌ 플레이스홀더 lorem ipsum 배포
- ✅ 도메인 구체 content-first

---

## Tone 결정 프로토콜 (designer 서브에이전트)

1. **추론 먼저**: 프로젝트 도메인 + CURRENT.md + CLAUDE.md 읽어 후보 3개 자동 선별
2. **1개 질문**: "3개 중 선택 또는 다른 것?" (1회만, 묻지 않고 기본 추천 가능)
3. **`.design-override.md`** 에 tone + 하위 파라미터(variance/motion/density) 저장
4. 이후 모든 UI 태스크는 저장된 tone을 자동 주입

tone이 이미 결정된 프로젝트는 Phase 전체 스킵 (토큰 0).

---

## 검증 (design-auditor)

생성 후 다음 확인:
- 선언된 tone의 font 힌트 준수율 ≥ 80%
- color 힌트 준수율 ≥ 80%
- anti-generic 룰 위반 0
- tone 일관성 (페이지 내 tone 혼합 감지)

위반 시 리포트 반환. 수정은 coder에 위임.
