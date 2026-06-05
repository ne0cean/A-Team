# Design Taste Evaluator — Architecture Design

**ADR-2026-05-24**
**Status**: PROPOSED
**Author**: Architect Agent

---

## 1. 배경 및 문제 정의

현재 A-Team 디자인 모듈은 두 방향에서 작동한다.

- **방어적 게이트** (design-auditor): "나쁜 것 22개"를 잡아낸다. 점수를 낮춘다.
- **방향 결정** (designer): tone 1개를 고른다. `.design-override.md`를 쓴다.

빠진 축: **"왜 이 디자인이 좋은가"를 설명하는 능력**. 현재 designer는 tone을 고르지만, 그 tone이 어떤 레퍼런스의 어떤 원칙을 구현해야 하는지 알려주지 않는다. design-auditor는 anti-pattern 위반만 감지하고 positive quality를 점수화하지 않는다.

결과: coder가 `tone: editorial`을 받아도 Stripe인지 Linear인지 Claude인지 알 수 없다. 각 브랜드의 구체적 디자인 결정(Stripe의 pill 버튼, Linear의 4-step surface ladder, Claude의 terra-cotta 단색)이 구현에 반영되지 않는다.

### 가용 자산 (현재)

| 자산 | 위치 | 형태 |
|------|------|------|
| 10개 상세 레퍼런스 | `governance/design/refs/*.md` | tone + Quantified Constraints YAML |
| 71개 DESIGN.md | `reference/design-md/*/DESIGN.md` | 상세 토큰 + 컴포넌트 + Do/Don't |
| 11개 tone 팔레트 | `governance/design/tone-first.md` | tone 정의 표 |
| 22개 anti-pattern | `governance/design/anti-patterns.md` | 정적 룰 |

71개 DESIGN.md는 **활용되지 않고 있다**. designer는 이를 읽지 않고, design-auditor도 참조하지 않는다.

---

## 2. 요구사항 분석

### 기능적

1. 프로젝트 맥락(도메인, 타겟, 브랜드 톤) 입력 → 71개 중 상위 3-5개 레퍼런스 선별 + 선정 이유
2. UI 결과물 입력 → 6개 축으로 positive quality 평가 + 점수
3. 선별된 레퍼런스 기준으로 "이 디자인은 X처럼 하지만 Y 원칙이 빠졌다" 비교 진단

### 비기능적

1. 토큰 효율: 71개 DESIGN.md 전부 읽으면 너무 많다 → 메타데이터 인덱스 필요
2. 기존 시스템과 통합: designer → taste-evaluator → design-auditor 파이프라인 자연스럽게
3. 독립 실행도 가능: "이 UI 괜찮아?" 단독 질문에 응답

---

## 3. 설계 옵션

### 옵션 A: designer.md에 Step 추가

designer.md에 "Step 3.5: Reference Matching" 단계를 삽입한다. tone 결정 후 71개 인덱스를 조회해 상위 3개 레퍼런스를 `.design-override.md`에 추가 기재한다.

```
pros:
  - 새 에이전트 파일 없음. 기존 파이프라인 유지.
  - 호출 지점이 이미 존재한다 (tone 결정 직후).
cons:
  - designer는 현재 Haiku 모델. taste 추론은 Haiku로 부족하다.
  - designer의 역할이 "tone 결정"인데 "quality 평가"까지 확장하면 단일책임 위반.
  - "이 UI 괜찮아?" 단독 시나리오에서 designer 호출은 어색하다.
complexity: medium
```

### 옵션 B: 별도 에이전트 taste-evaluator.md (권장)

`.claude/agents/taste-evaluator.md`를 신규 생성한다. 두 가지 모드로 동작한다.

- **mode: select** — 프로젝트 맥락 입력 → 레퍼런스 추천
- **mode: evaluate** — UI 파일 + 선택된 레퍼런스 → 6축 평가

인덱스 파일(`reference/design-md/INDEX.md`)을 먼저 읽어 필터링 후 해당 DESIGN.md만 선택적으로 읽는다.

```
pros:
  - 단일책임. designer와 역할 분리.
  - 독립 호출 가능 ("이 UI 괜찮아?" → taste-evaluator만).
  - 모델을 Sonnet으로 설정해 추론 품질 확보.
  - 미래에 더 발전시키기 용이.
cons:
  - 새 파일 2개 (에이전트 + 인덱스).
  - designer에서 taste-evaluator로 핸드오프 로직 필요.
complexity: medium
```

### 옵션 C: design-auditor에 Positive Scoring 추가

design-auditor의 점수 계산을 "감점제"에서 "가점 포함"으로 확장한다. 현재 100 - 위반건수×가중치 방식을 유지하되 positive quality 항목에서 가점을 부여한다.

```
pros:
  - 기존 파이프라인 변경 없음.
cons:
  - design-auditor 역할이 "감사"인데 "taste 판단"은 다른 역할이다.
  - 레퍼런스 선별 기능이 없다. 단순 평가만 가능.
  - 가점 기준 정의가 어렵다 (무엇이 "좋은가"를 rule-based로 표현 불가).
complexity: high (개념적 혼란)
```

---

## 4. 결정: 옵션 B 채택

**이유**: designer와 design-auditor 모두 현재 단일책임이 명확하다. taste 판단은 "긍정적 패턴 인식"이라는 세번째 역할이다. 새 에이전트로 분리해야 기존 두 에이전트를 변경하지 않고 기능을 추가할 수 있다. 인덱스 파일이 핵심 설계 포인트다 — 71개 DESIGN.md를 매번 다 읽으면 비용 문제가 생기므로, 인덱스를 통한 선택적 로딩이 필수다.

**수용한 트레이드오프**:

- 에이전트 파일 2개 추가 (복잡도 소폭 증가)
- 인덱스 파일을 수동 유지보수해야 함 (새 레퍼런스 추가 시)

---

## 5. 시스템 아키텍처

### 전체 파이프라인

```
사용자 요청
    │
    ▼
[designer]                   ← 기존. tone 결정.
    │ .design-override.md
    │ (tone, variant, references: [])
    ▼
[taste-evaluator]            ← 신규. mode: select
    │ 1. INDEX.md 읽기 (토큰 저렴)
    │ 2. 필터링 → 상위 5개 후보 선별
    │ 3. 후보 DESIGN.md만 선택적 읽기
    │ 4. 상위 3-5개 + 선정 이유 출력
    │ .design-override.md의 references: 업데이트
    ▼
[coder]                      ← 기존. 구현.
    │
    ▼
[taste-evaluator]            ← 신규. mode: evaluate (선택적)
    │ 6축 평가 + 레퍼런스 대비 점수
    ▼
[design-auditor]             ← 기존. 22개 anti-pattern 감지.
```

### 호출 트리거

| 트리거 | 모드 | 호출 시점 |
|--------|------|----------|
| designer 완료 후 | select | 자동 (orchestrator Phase 2.2 확장) |
| "어떤 디자인 참고?" 질문 | select | 직접 |
| "이 UI 괜찮아?" 질문 | evaluate | 직접 |
| `/design-score` 커맨드 | evaluate | 직접 |
| `/craft` STEP 4 | evaluate | 자동 (선택적) |

---

## 6. INDEX.md 설계

핵심 설계 포인트. 71개 DESIGN.md를 매번 읽는 대신, INDEX.md 하나를 읽어 필터링 후 필요한 DESIGN.md만 읽는다.

**파일 위치**: `/Users/noir/Projects/a-team/reference/design-md/INDEX.md`

### INDEX.md 스키마 (각 레퍼런스 항목)

```yaml
- id: stripe
  path: stripe/DESIGN.md
  tone: editorial
  variant: editorial
  domain: [fintech, developer-tool, api-product, payment]
  target_user: [developer, b2b-buyer]
  brand_archetype: credibility  # credibility | boldness | playfulness | authority | warmth | precision
  canvas: light
  primary_color: "#635BFF"
  typography_style: thin-weight-negative-tracking  # 핵심 타이포 특징 1개
  visual_signature: gradient-mesh-hero             # 가장 강한 시각 시그니처
  density: 5
  motion: 4
  variance: 4
  tags: [no-shadow, border-only, pill-button, tabular-numbers]
```

### 분류 차원 (필터링 키)

```
domain:          SaaS / fintech / crypto / AI-tool / design-tool / developer-tool
                 e-commerce / media / automotive / gaming / productivity / analytics
target_user:     developer / b2b-buyer / consumer / designer / enterprise
brand_archetype: credibility / boldness / playfulness / authority / warmth / precision
canvas:          light / dark / cream / split (dark hero + light body)
density:         1-10
motion:          1-10
variance:        1-10
tone:            11개 (tone-first.md 기준)
tags:            특이 시각 패턴 (pill-button / mascot / product-screenshot / serif-body 등)
```

### 71개 레퍼런스 분류 (설계 단계 전체 매핑)

아래는 읽은 DESIGN.md와 브랜드 지식을 기반으로 한 분류다. 구현 시 이 표를 INDEX.md YAML로 변환한다.

```
ID              tone              domain                    canvas   variance  brand_archetype
──────────────────────────────────────────────────────────────────────────────────────────────
airbnb          editorial         marketplace/e-commerce    light    5         warmth
airtable        soft/pastel       productivity/SaaS         light    4         playfulness
apple           luxury            consumer-tech             light    3         authority
binance         industrial        crypto/fintech            dark     6         precision
bmw             luxury            automotive                dark     3         authority
bmw-m           bold-typographic  automotive                dark     8         boldness
bugatti         luxury            automotive/luxury         dark     2         authority
cal             editorial         productivity/SaaS         light    4         credibility
claude          editorial         AI-tool                   light    3         credibility
clay            bold-typographic  developer-tool/AI         dark     7         precision
clickhouse      industrial        developer-tool/analytics  dark     6         precision
cohere          editorial         AI-tool                   light    4         credibility
coinbase        industrial        fintech/crypto            light    5         credibility
composio        bold-typographic  developer-tool/AI         dark     7         boldness
cursor          industrial        developer-tool/AI         dark     5         precision
elevenlabs      bold-typographic  AI-tool                   dark     8         boldness
expo            editorial         developer-tool            light    4         credibility
ferrari         luxury            automotive                dark     2         authority
figma           playful           design-tool               light    6         playfulness
framer          bold-typographic  design-tool/SaaS          dark     8         boldness
hashicorp       industrial        developer-tool/infra      dark     5         precision
ibm             industrial        enterprise/developer      light    4         authority
intercom        soft/pastel       SaaS/customer-success     light    5         warmth
kraken          industrial        crypto/fintech            dark     6         precision
lamborghini     luxury            automotive                dark     2         authority
linear.app      editorial         developer-tool/SaaS       dark     4         precision
lovable         playful           AI-tool/no-code           light    7         playfulness
mastercard      editorial         fintech/payment           light    4         credibility
meta            editorial         social/consumer-tech      light    4         warmth
minimax         bold-typographic  AI-tool                   dark     7         boldness
mintlify        editorial         developer-tool/docs       light    4         credibility
miro            playful           productivity/design-tool  light    7         playfulness
mistral.ai      editorial         AI-tool                   light    3         credibility
mongodb         industrial        developer-tool/data       dark     5         precision
nike            bold-typographic  consumer/sports           dark     9         boldness
notion          soft/pastel       productivity/SaaS         light    5         warmth
nvidia          bold-typographic  tech/gaming/AI            dark     8         boldness
ollama          industrial        developer-tool/AI         dark     4         precision
opencode.ai     industrial        developer-tool/AI         dark     5         precision
pinterest       editorial         social/e-commerce         light    5         warmth
playstation     bold-typographic  gaming/entertainment      dark     8         boldness
posthog         playful           developer-tool/analytics  cream    5         playfulness
raycast         industrial        developer-tool            dark     5         precision
renault         editorial         automotive                light    5         warmth
replicate       industrial        AI-tool/developer-tool    dark     5         precision
resend          editorial         developer-tool            light    3         credibility
revolut         bold-typographic  fintech/consumer          dark     7         boldness
runwayml        luxury            AI-tool/creative          dark     3         authority
sanity          editorial         developer-tool/CMS        light    4         credibility
sentry          industrial        developer-tool/monitoring dark     5         precision
shopify         editorial         e-commerce/SaaS           split    5         credibility
stripe          editorial         fintech/developer-tool    light    4         credibility
vercel          industrial        developer-tool/infra      dark     5         precision
[...나머지 ~18개 동일 패턴으로 분류]
```

---

## 7. 레퍼런스 선별 로직 (taste-evaluator mode: select)

### 입력

```json
{
  "project_type": "fintech-dashboard",
  "target_user": "b2b-buyer",
  "brand_tone_declared": "editorial",
  "brand_descriptors": ["신뢰", "정교함", "데이터 중심"],
  "canvas_preference": "light",
  "existing_override": ".design-override.md"
}
```

### 선별 알고리즘 (순서대로 적용)

```
Step 1. Tone 필터 (hard filter)
  INDEX.md에서 tone == brand_tone_declared 항목만 남긴다.
  tone이 불명확하면 brand_archetype으로 대체 필터.

Step 2. Domain 필터 (weighted)
  domain 교집합이 클수록 점수 +2/일치항목

Step 3. Target user 필터 (weighted)
  target_user 일치 시 +3

Step 4. Canvas 필터 (soft preference)
  canvas_preference 일치 시 +1

Step 5. Brand archetype 매핑
  brand_descriptors 키워드 → archetype 변환
  - "신뢰" → credibility (+2)
  - "정교함" → precision (+2)
  - "데이터" → precision, industrial tone도 추가 고려

Step 6. 상위 5개 선발 → 각 DESIGN.md의 Overview 섹션만 읽기
  → 최종 3-5개 + 선정 이유 출력
```

### 출력 형식

```json
{
  "selected_references": [
    {
      "id": "stripe",
      "path": "reference/design-md/stripe/DESIGN.md",
      "score": 9,
      "reasons": [
        "Editorial tone + fintech domain 정확히 일치",
        "B2B-buyer 대상 developer credibility 구조",
        "tabular-numbers 패턴이 대시보드 데이터 표현에 직결"
      ],
      "key_principles": [
        "pill 버튼 아님 — tight-radius rectangular (8px max)",
        "shadow 없음, border-only 카드",
        "display 폰트는 thin weight + negative tracking",
        "섹션 여백 96-128px"
      ],
      "what_NOT_to_copy": "mesh gradient hero — 이건 Stripe marketing 전용"
    },
    {
      "id": "linear.app",
      "score": 8,
      "reasons": ["editorial + SaaS + precision archetype", "대시보드 surface ladder 패턴 참고 가능"],
      "key_principles": ["4-step surface ladder (canvas→surface-1→2→3)", "lavender 단일 accent 절제 사용"],
      "what_NOT_to_copy": "dark canvas — 현재 프로젝트 light 선호"
    },
    {
      "id": "coinbase",
      "score": 7,
      "reasons": ["fintech + b2b-buyer + light canvas 일치"],
      "key_principles": ["financial data typography", "institutional credibility"],
      "what_NOT_to_copy": "crypto-native visual idioms"
    }
  ],
  "synthesis": "세 레퍼런스의 공통 원칙: border-only 카드, 섹션 여백 96px+, thin weight display type, 단일 accent 절제 사용. 이것이 이 프로젝트의 taste 기준선이다."
}
```

---

## 8. 6축 평가 시스템 (taste-evaluator mode: evaluate)

### 평가 축 정의

각 축은 0-10 점수 + 판단 근거 + 개선 제안으로 구성된다. 총점은 평균이 아닌 가중 합산.

#### Axis 1: Typography Coherence (가중치 2.0)
**측정 대상**: 서체 조합의 일관성과 의도성

```
평가 항목:
- Display font와 body font가 명확히 구분되는가? (role 분리)
- font-weight 사용이 위계를 만드는가? (3개 이하 weight면 의도적)
- letter-spacing이 사이즈별로 적절히 조정되는가?
- 동일 폰트가 모든 역할에 쓰이지 않는가? (단일 폰트 = AI smell)
- line-height가 role별로 다른가? (display ~1.1, body ~1.5)

감지 가능 패턴 (코드에서):
  GOOD: font-family + fontWeight + letterSpacing의 토큰 체계 존재
  BAD: Inter만 모든 역할에, weight 400 단일 사용
```

#### Axis 2: Color Harmony (가중치 1.5)
**측정 대상**: 색상 체계의 일관성과 절제

```
평가 항목:
- Primary accent가 1-2개로 절제되는가?
- Surface 단계 (canvas → surface-1 → surface-2)가 체계적인가?
- 텍스트 색상 위계 (ink → ink-muted → ink-subtle)가 있는가?
- Brand_archetype에 맞는 팔레트인가?
  (credibility: 네이비/slate, precision: dark canvas, warmth: cream/orange)
- forbidden 색상 사용 여부 (tone별 금지 색)

레퍼런스 대비:
  선택된 reference의 primary color 계열과 유사성 측정
  "stripe처럼 indigo accent + white surface" vs "revolut처럼 black canvas + white pill"
```

#### Axis 3: Spacing Rhythm (가중치 1.5)
**측정 대상**: 여백 리듬의 일관성

```
평가 항목:
- 8px grid 준수율 (LS-01과 중복이지만 positive angle로 접근)
- 섹션 간 여백이 일관된 스케일을 따르는가?
- Card 내부 padding이 동일한 토큰을 쓰는가?
- 위계별 여백 차이가 있는가? (section > card > inline)

레퍼런스 대비:
  stripe: section 96-128px / stripe card 32px
  linear: section 96px / card 24px
  posthog: section 80px / card 24px
```

#### Axis 4: Component Consistency (가중치 1.5)
**측정 대상**: 컴포넌트 일관성

```
평가 항목:
- 버튼 radius가 일관된가? (pill vs rect vs 8px — 하나만)
- Card 처리 방식이 일관된가? (shadow vs border vs flat)
- 인터랙티브 요소의 focus state가 일관된가?
- 동일 역할의 컴포넌트가 다른 스타일을 쓰지 않는가?

레퍼런스 대비:
  "stripe는 모든 버튼이 pill, 카드는 항상 border-only"
  "linear는 모든 버튼이 8px rect, 카드는 12px + hairline"
```

#### Axis 5: Visual Hierarchy (가중치 2.0)
**측정 대상**: 시각적 위계 명확성

```
평가 항목:
- 첫눈에 가장 중요한 요소가 구별되는가?
- CTA가 1개로 절제되는가? (페이지당 primary CTA 최대 2개)
- Section 간 위계 차이가 있는가? (hero > feature > cta 크기 차이)
- 동일한 크기의 카드가 반복되지 않는가? (PL-02와 연결)

감지 패턴:
  BAD: 모든 섹션 같은 h2 크기, 모든 카드 같은 padding
  GOOD: hero 80px display → section 40px → card 22px card-title
```

#### Axis 6: Brand Differentiation (가중치 1.5)
**측정 대상**: 브랜드 차별성 — "이 디자인이 누구 것인지 알 수 있는가"

```
평가 항목:
- Visual signature가 존재하는가?
  (stripe: mesh gradient + thin weight | linear: lavender accent + dark canvas |
   posthog: hedgehog + cream canvas | claude: terra-cotta + serif body)
- AI smell 0개 (design-auditor와 연계)
- 선택된 레퍼런스와 구별되면서 영향을 받는가?
  ("stripe처럼 credible하지만 stripe와 다르다"가 이상적)
- placeholder 데이터 없음 (AI-13, AI-15 연계)

이 축은 LLM critique 필수 (정적 감지 불가)
```

### 점수 계산

```
raw_score = (
  typo_coherence × 2.0 +
  color_harmony × 1.5 +
  spacing_rhythm × 1.5 +
  component_consistency × 1.5 +
  visual_hierarchy × 2.0 +
  brand_differentiation × 1.5
) / 10.0

total: 0-10 스케일
```

### 평가 출력 형식

```json
{
  "taste_score": 7.2,
  "reference_comparison": "stripe 기준 8/10과 비교: typography 일치, spacing 근접, brand differentiation 부족",
  "axes": {
    "typography_coherence": { "score": 8, "reason": "display/body 분리됨, weight 위계 명확" },
    "color_harmony": { "score": 7, "reason": "accent 1개 절제, surface ladder 존재, 단 ink 색상 3개 중 muted 미사용" },
    "spacing_rhythm": { "score": 6, "reason": "8px grid 준수, 섹션 여백이 48-64px — stripe 96px 기준 미달" },
    "component_consistency": { "score": 9, "reason": "버튼 모두 8px radius, 카드 모두 border-only" },
    "visual_hierarchy": { "score": 7, "reason": "hero 크기 명확, 단 3개 섹션이 동일 h2 weight" },
    "brand_differentiation": { "score": 6, "reason": "visual signature 미약. stripe와 구별되는 1개 요소 부재" }
  },
  "top_improvements": [
    "섹션 여백을 48px → 96px로. stripe의 breathing room이 신뢰감을 만든다.",
    "Brand signature 1개 추가: primary color를 brand-specific hue로 (현재 generic blue)",
    "h2 weight를 500 → 300으로. thin weight display가 editorial의 핵심"
  ],
  "reference_specific_gaps": {
    "vs_stripe": "tabular-numbers 미사용 (금융 데이터에 필수), pill button 사용 중 (stripe는 rect 8px)",
    "vs_linear": "surface ladder 없음 (canvas 1개뿐), lavender accent 과다 사용"
  }
}
```

---

## 9. 에이전트 파일 명세

**파일 위치**: `/Users/noir/Projects/a-team/.claude/agents/taste-evaluator.md`

### 에이전트 헤더

```yaml
---
name: taste-evaluator
description: >
  디자인 taste 평가 에이전트. 두 모드 동작:
  (1) mode:select — 프로젝트 맥락으로 71개 레퍼런스 중 상위 3-5개 선별 + 이유
  (2) mode:evaluate — UI 파일 + 선택 레퍼런스 기준 6축 품질 평가
  "어떤 디자인 참고하면 좋아?", "이 UI 괜찮아?", "/design-score" 호출 시 트리거.
  designer 완료 후 references 필드가 비어있으면 자동 호출.
tools: Read, Glob, Grep
model: sonnet
---
```

### 실행 프로토콜 요약

**mode: select**
1. `reference/design-md/INDEX.md` Read (토큰 소량)
2. 입력 맥락 기반 필터링 (위 Section 7 알고리즘)
3. 상위 5개 후보의 DESIGN.md `## Overview` 섹션만 Read (limit: 30)
4. 최종 3-5개 + 선정 이유 + key_principles + what_NOT_to_copy 출력
5. `.design-override.md` references 필드 업데이트

**mode: evaluate**
1. `.design-override.md` Read → 선택된 references 확인
2. 해당 references DESIGN.md Read (Quantified Constraints + Components 섹션)
3. 평가 대상 파일들 Read (tsx, css)
4. 6축 평가 실행 (Axis 1-5: 패턴 감지 / Axis 6: LLM critique 필수)
5. 구조화 출력

### 원칙

- INDEX.md가 없으면 → "INDEX.md 없음. 먼저 인덱스 구축 필요" 반환 (직접 71개 순회 금지)
- evaluate 시 design-auditor 점수와 통합 보고: taste_score + audit_score 둘 다 표시
- 레퍼런스 대비 평가는 선택된 레퍼런스 기준으로만 — 선택 안 된 레퍼런스와 비교하지 않음

---

## 10. INDEX.md 구축 전략

INDEX.md는 **수동 작성 + 점진적 확장** 방식을 채택한다.

이유: 71개 DESIGN.md를 자동 파싱해 인덱스를 만들면 초기 구축 비용이 크다. 대신 지금 당장 필요한 20-30개를 먼저 인덱싱하고, 사용하면서 점진적으로 확장한다.

### 초기 구축 우선순위 (Phase 1 — 30개)

실제 프로젝트에서 자주 참조될 가능성이 높은 브랜드 우선:

```
1순위 (필수 10개, 모든 주요 도메인 커버):
  stripe, linear.app, revolut, notion, figma,
  posthog, vercel, claude, shopify, apple

2순위 (domain 보완 10개):
  airbnb, intercom, coinbase, cursor, framer,
  raycast, resend, sentry, mintlify, mistral.ai

3순위 (차별화 레퍼런스 10개):
  nike, ferrari, ibm, nvidia, elevenlabs,
  runwayml, clay, composio, lovable, mongodb
```

나머지 41개는 taste-evaluator가 unknown으로 처리하며 사용자에게 명시한다.

---

## 11. 구현 가이드 (Phases)

### Phase 1: INDEX.md 구축

**담당**: coder
**산출물**: `reference/design-md/INDEX.md`
**작업**: Section 9의 30개 우선순위 레퍼런스를 DESIGN.md에서 메타데이터 추출해 YAML 작성

```
- 각 DESIGN.md의 frontmatter + description 읽기
- Section 6 스키마에 맞춰 YAML 항목 생성
- 나머지 41개는 status: pending으로 stub 추가
```

**검증**: taste-evaluator가 INDEX.md를 읽어 "stripe" 검색 시 올바른 항목 반환

### Phase 2: taste-evaluator 에이전트 파일

**담당**: coder
**산출물**: `.claude/agents/taste-evaluator.md`
**작업**: Section 9 명세를 기반으로 에이전트 파일 작성

- mode: select 프로토콜 (Section 7)
- mode: evaluate 프로토콜 (Section 8)
- 입출력 JSON 스키마
- 기존 designer/design-auditor와 통합 지점 명시

### Phase 3: designer.md 연결

**담당**: coder
**산출물**: `.claude/agents/designer.md` 수정
**작업**: Step 4 (구조화 출력) 이후 taste-evaluator 호출 조건 추가

```
Step 4 출력 후:
- references 필드가 비어있고 INDEX.md 존재하면:
  → orchestrator에 taste-evaluator(mode:select) 호출 요청
- 이미 references 있으면: 그대로 진행
```

**수정 범위**: designer.md Step 5 (구조화 출력) JSON에 `taste_evaluation_needed: true` 필드 추가

### Phase 4: orchestrator 연결 (선택적)

**담당**: coder
**산출물**: orchestrator.md 또는 관련 파이프라인 파일 수정
**작업**: `/design-score` 커맨드를 taste-evaluator(mode:evaluate)로 라우팅

---

## 12. 리스크

1. **INDEX.md 드리프트**: 새 레퍼런스 추가 시 INDEX.md 업데이트를 빠뜨리면 선별 정확도 저하. 완화: INDEX.md에 `last_updated` + `coverage` 필드 기재. taste-evaluator가 coverage 낮으면 경고 출력.

2. **evaluate 정확도 한계**: 6축 중 Axis 6 (Brand Differentiation)은 LLM이 코드만 보고 판단하기 어렵다. 스크린샷 없이는 "visual signature"를 코드에서 추론해야 한다. 완화: Axis 6을 "LLM critique 필수 + 낮은 확신도 명시" 처리.

3. **레퍼런스 편향**: INDEX.md에 포함된 30개 브랜드 편향. B2B SaaS / developer-tool에 치우쳐 있어 이커머스, 미디어, 자동차 도메인 프로젝트에서 추천 품질 저하. 완화: 도메인별 최소 커버리지 보장 (3순위 확장 시 반영).

4. **기존 designer 파이프라인 간섭**: designer가 taste-evaluator 결과를 기다리면 전체 파이프라인 지연. 완화: taste-evaluator는 비동기 보조 에이전트로 설계. designer는 `.design-override.md` 쓰고 즉시 종료. orchestrator가 별도로 taste-evaluator 호출.

---

## 13. 성공 기준

1. "핀테크 대시보드 만들건데 어떤 디자인 참고하면 좋아?" → 3초 이내 3-5개 추천 + 각 이유 반환
2. UI 파일 입력 시 6축 점수 + 선택 레퍼런스 대비 구체적 gap 반환
3. taste_score와 design-auditor audit_score가 함께 보고되는 통합 리포트
4. INDEX.md 30개 완성 후 주요 도메인(fintech/SaaS/AI-tool/e-commerce) 쿼리 정확도 80%+
5. designer 완료 후 taste-evaluator references 자동 채워짐 (orchestrator 연결 후)

---

## 14. 파일 영향 범위 요약

| 파일 | 액션 | 담당 |
|------|------|------|
| `reference/design-md/INDEX.md` | 신규 생성 | coder |
| `.claude/agents/taste-evaluator.md` | 신규 생성 | coder |
| `.claude/agents/designer.md` | Step 5 JSON에 필드 추가 (5줄 미만) | coder |
| `.claude/agents/design-auditor.md` | 변경 없음 | — |
| `.claude/agents/orchestrator.md` | `/design-score` 라우팅 추가 (선택적) | coder |
| `governance/design/anti-patterns.md` | 변경 없음 | — |
| `governance/design/tone-first.md` | 변경 없음 | — |
| `governance/design/refs/*.md` | 변경 없음 (INDEX.md로 흡수) | — |
