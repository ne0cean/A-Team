# Design Gate — 자동 트리거 판정

> **목적**: UI 작업이 아닌 경우 design 체인 오버헤드 0으로 유지. UI 작업일 때만 tone-first / variants / components / anti-patterns 로드.
> **로드 타이밍**: orchestrator Phase 2.1 직후 (항상 로드, ~800 토큰).

---

## 1. UI 프로젝트 감지 Heuristic

다음 중 **2개 이상** 충족 시 `isUIWork = true`:

- 요청 키워드: `UI`, `화면`, `컴포넌트`, `레이아웃`, `디자인`, `스타일`, `페이지`, `버튼`, `폼`, `대시보드`, `landing`, `component`, `screen`, `page`, `button`, `form`
- 변경 대상 파일: `*.tsx`, `*.jsx`, `*.vue`, `*.svelte`, `*.astro`, `*.html`, `*.css`, `*.scss`, `tailwind.config.*`
- 프로젝트에 `tailwind.config.*` / `postcss.config.*` / `shadcn` 디렉토리 존재
- CLAUDE.md에 `ui: true` 또는 `design: on` 플래그

감지 실패 시 → **design 체인 전체 스킵** (토큰 0).

---

## 2. Opt-Out / 프로젝트 Calibration

### 우선순위 (높은 순)
1. **`.design-override.md`** 파일이 프로젝트 루트 또는 `.context/`에 있으면 설정 존중
2. **CLAUDE.md** 내 frontmatter `design:` 블록
3. **기본값**: `design: auto` (감지 heuristic 따름)

### `.design-override.md` 스키마
```markdown
---
design: off | on | auto
tone: brutalist | luxury | playful | editorial | minimal | bold | ...
variance: 1-10
motion: 1-10
density: 1-10
a11y_level: AA | AAA  # 항상 최소 AA
exemptions: ["admin", "internal", "prototype"]  # 해당 경로는 design 체인 스킵
---
```

### 세부 규칙
- `design: off` → a11y 체크만 유지, 나머지 스킵
- `exemptions` 경로 하위 파일 수정 시 → design 체인 스킵 (a11y만)
- 미설정 시 → auto 감지

---

## 3. A11y Non-Negotiable 축 (tone과 독립)

**Tone/variant이 무엇이든 다음은 강제**:

- WCAG 2.1 AA 대비율 (일반 텍스트 4.5:1, 대형 텍스트 3:1)
- Touch target ≥ 44×44px (모바일)
- Focus state 시각화 (outline 제거 시 대체 표시 필수)
- Heading hierarchy (h1 → h2 → h3 순차, skip 금지)
- `alt`, `aria-label` 필수 (이미지 · 아이콘 버튼)
- Reduced motion (`prefers-reduced-motion`) 대응
- 키보드 네비게이션 (Tab/Enter/Escape 지원)

**충돌 시 규칙**: tone.motion=10 이어도 `prefers-reduced-motion` 사용자에겐 motion=0.
a11y가 tone을 덮어씀. 반대는 금지.

---

## 4. 로드 라우팅

`isUIWork = true` 이면 단계별 로드:

| 단계 | 로드 파일 | 토큰 | 트리거 |
|---|---|---|---|
| 진입 | `design/gate.md` | ~800 | 항상 |
| Brief | `design/tone-first.md` + `design/variants.md` | ~1500 | 새 UI 생성 시작 시 |
| 구현 | `design/components.md` | ~2000 | 컴포넌트 코드 작성 직전 |
| 검증 | `design/anti-patterns.md` | ~1200 | design-auditor 호출 시 |

**Static detector** (`lib/design-smell-detector.ts`)는 anti-patterns.md의 24 rule 중 deterministic 22개를 AST로 감지 — **토큰 0**. 나머지 2개(tone-fit, 주관적 색상 조화)만 LLM critique.

---

## 5. Circuit Breaker 통합

`lib/design-config.json` → `ADVISOR_TOOL_BREAKER_CONFIG` 동일 패턴:
- 실패율 3회 연속 → open (cooldown 30s)
- design-auditor / designer 모두 같은 breaker 공유
- open 상태 → design 체인 스킵, a11y만 실행

---

## 6. Analytics · Learnings Wiring

- **Analytics**: `event: 'design_audit'` 기록 (score, violations count, project slug)
- **Learnings**: 사용자 override/거부 시 `logDesignOutcome()` → type=`pitfall` 또는 `preference`
- **측정**: 세션별 smell score 추이를 `/prjt` / `/retro`에서 노출

---

## 7. 자동 트리거 포인트 (요약)

| 트리거 | 실행 |
|---|---|
| orchestrator Phase 2.1 라우팅 후 UI 감지 | gate 평가 → designer 에이전트 prepend |
| coder가 `.tsx/*.css` 수정 완료 | PostToolUse → design-auditor 자동 호출 |
| `/qa --design` 명시 호출 | ui-inspector + design-auditor 병렬 |
| `/craft` STEP 3 진입 전 | designer brief 삽입 (tone 미결정 시) |
| PR 생성 전 (`/ship`, `/review`) | design-auditor 최종 게이트 |

사용자가 따로 `/design` 호출할 필요 없음 — 맥락상 자동.
