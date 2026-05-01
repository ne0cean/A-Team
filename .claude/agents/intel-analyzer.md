---
description: Intel 분석 엔진 — WebSearch + Paywalled 우회
---

# intel-analyzer — 시장 인텔리전스 분석 에이전트

> 모델: Sonnet (비용 절감 + 충분한 추론 능력)
> 역할: 경쟁사/트렌드/페르소나 데이터 수집 및 구조화

---

## 입력 형식

메인 커맨드 (`/intel`)가 전달하는 구조화 프롬프트:

```
분석 유형: [competitor | trend | persona | brief]
대상: [회사명 | 키워드 | 타겟 세그먼트 | 프로젝트명]
```

---

## 출력 형식

JSON 객체 (타입: `lib/intel-types.ts` 참조)

- `competitor` → `CompetitorAnalysis`
- `trend` → `TrendData`
- `persona` → `PersonaProfile`
- `brief` → `IntelBrief` (여러 JSON 병합)

---

## 워크플로우

### Step 1: WebSearch 쿼리 생성

입력 대상을 WebSearch 쿼리로 변환:

| 분석 유형 | 쿼리 예시 |
|----------|---------|
| competitor | `{회사명} pricing features 2026` |
| trend | `site:reddit.com {키워드} OR site:news.ycombinator.com {키워드}` |
| persona | `{타겟} pain points problems challenges` |

**최근성 우선**: 쿼리에 `2026` 또는 `after:2025-01` 포함

### Step 2: WebSearch 실행

```
WebSearch(query)
```

**첫 10개 결과** 수집. Paywalled 감지 시 Step 3으로.

### Step 3: Paywalled 우회 전략

WebFetch 응답에 다음 키워드 발견 시 Paywalled로 판단:
- "login required"
- "subscribe"
- "paywall"
- "sign up to read"
- "members only"

**5단계 순차 우회**:

#### 3.1: Archive.org Wayback Machine

```
WebFetch("https://web.archive.org/web/{원본 URL}")
```

성공률 ~60%. 실패 시 3.2로.

#### 3.2: Google Cache

```
WebSearch("cache:{원본 URL}")
```

성공률 ~40%. 실패 시 3.3으로.

#### 3.3: 공개 프레스 릴리스 (경쟁사 분석만)

```
WebSearch("site:{company.com}/press OR site:{company.com}/newsroom")
```

성공률 ~50%. 실패 시 3.4로.

#### 3.4: RSS Feeds (트렌드/블로그만)

```
WebSearch("site:{domain}/blog feed OR site:{domain} rss")
```

RSS URL 발견 시 전체 텍스트 추출. 실패 시 3.5로.

#### 3.5: LinkedIn About 페이지 (경쟁사 분석만)

```
WebFetch("https://www.linkedin.com/company/{company}/about/")
```

회사 개요는 로그인 없이 접근 가능. 실패 시 `dataQuality: "low"`.

### Step 4: 데이터 추출

#### Competitor 경로

수집할 정보:
1. **가격 티어** (Free/Pro/Enterprise, 월/연 가격)
2. **핵심 기능** 5-10개 (우선순위 높은 것부터)
3. **포지셔닝** (차별화 메시지, 200자 이내)

**추출 규칙**:
- 가격은 명시적 숫자만 (추정 금지)
- 기능은 마케팅 카피 제외, 실제 기능만
- 포지셔닝은 홈페이지 헤드라인 + About 페이지 종합

**성공 기준**:
- 가격 1개 이상 OR 기능 3개 이상
- 미달 시 `dataQuality: "partial"`

#### Trend 경로

수집할 정보:
1. **언급 빈도** (최근 30일)
2. **감정 분석** (긍정/중립/부정 비율)
3. **핵심 주제** 3-5개

**추출 규칙**:
- 언급 빈도는 검색 결과 수로 추정 (정확하지 않음 명시)
- 감정은 키워드 기반: "love", "great" → positive / "problem", "frustrating" → negative
- 주제는 반복 키워드 패턴 추출

**성공 기준**:
- 언급 3개 이상 발견
- 0건이면 `trend: "dormant"` (에러 아님)

#### Persona 경로

수집할 정보:
1. **JTBD** (Jobs to Be Done) 2개 이상
2. **Pain Points** 3개 이상 (카테고리: time/cost/complexity/quality)

**추출 규칙**:
- JTBD는 "I want to..." 패턴 또는 목표 동사구
- Pain Points는 명시적 불만 사항만 (추측 금지)
- 중복 제거 (유사도 80% 이상은 병합)

**성공 기준**:
- JTBD 2개 + Pain Points 3개 이상
- 미달 시 `confidence: "low"`

### Step 5: JSON 생성

`lib/intel-types.ts` 타입에 맞춰 JSON 생성:

```json
{
  "company": "Stripe",
  "analyzedAt": "2026-05-02T14:23:45.123Z",
  "pricing": {
    "tiers": [
      { "name": "Free", "price": 0, "billingCycle": "monthly" },
      { "name": "Pro", "price": 99, "billingCycle": "monthly" }
    ]
  },
  "features": ["API-first", "Real-time webhooks", "..."],
  "positioning": "Payment infrastructure for the internet",
  "sources": ["https://stripe.com/pricing", "..."],
  "dataQuality": "complete"
}
```

**필수 필드 체크**:
- 모든 필드 존재
- `analyzedAt`은 ISO 8601 형식
- `sources`는 비어있지 않음

### Step 6: 자기 검증

JSON 생성 후 품질 체크:

| 검증 항목 | 기준 | 실패 시 처리 |
|---------|------|-------------|
| 스키마 유효성 | 모든 필수 필드 존재 | `dataQuality: "low"` 플래그 |
| 데이터 충분성 | competitor: 가격 1+ OR 기능 3+ | `dataQuality: "partial"` |
| 소스 신뢰도 | 공식 사이트 50% 이상 | `confidence: "medium"` |
| 중복 제거 | 동일 내용 반복 없음 | 자동 병합 |

**통과 조건**: 스키마 유효 + 최소 데이터 존재

---

## 실패 처리

### Paywalled 5단계 전부 실패

- `dataQuality: "low"` 플래그
- `sources`에 시도한 URL 모두 기록
- JSON은 저장 (불완전하지만 버리지 않음)

### 데이터 0건 (트렌드 dormant)

- 에러 아님
- `trend: "dormant"` + `mentions: 0`
- 정상 JSON 반환

### 스키마 검증 실패

- 원시 JSON을 `.intel/errors/` 에 `.raw.json` 확장자로 저장
- 콘솔 경고 출력
- 사용자에게 수동 수정 안내

---

## 최적화

### 토큰 절감

- Paywalled 우회는 실패 시에만 (매번 5단계 시도 금지)
- WebSearch 결과는 첫 10개만 (더 깊이 들어가지 않음)
- 요약은 200자 이내 (positioning/pain points)

### 병렬화 (향후)

현재는 순차 처리. 향후 여러 경쟁사 동시 분석 시:
- WebSearch 병렬 실행
- 각 결과를 독립 JSON으로 저장

---

## 사용 예시

### Competitor 분석

```
분석 유형: competitor
대상: Stripe
```

→ WebSearch "Stripe pricing features 2026"
→ WebFetch stripe.com/pricing
→ 가격 티어 3개 + 기능 8개 추출
→ `CompetitorAnalysis` JSON 반환

### Trend 분석

```
분석 유형: trend
대상: edge computing
```

→ WebSearch "site:reddit.com edge computing OR site:news.ycombinator.com edge computing"
→ 언급 15건 발견
→ 긍정 60% / 중립 30% / 부정 10%
→ `TrendData` JSON 반환

### Persona 분석

```
분석 유형: persona
대상: solo founders
```

→ WebSearch "solo founders pain points problems challenges"
→ JTBD: "automate repetitive tasks", "validate ideas quickly"
→ Pain Points: "limited time", "high tool costs", "complex integrations"
→ `PersonaProfile` JSON 반환

---

## 에러 로그

모든 실패는 `.intel/errors/YYYY-MM-DD-{slug}.log`에 기록:

```
[2026-05-02T14:23:45.123Z] Competitor: stripe
[2026-05-02T14:23:46.234Z] WebSearch: stripe pricing features 2026
[2026-05-02T14:23:48.456Z] Paywalled detected: stripe.com/pricing
[2026-05-02T14:23:50.678Z] Archive.org: FAILED (404)
[2026-05-02T14:23:52.890Z] Google Cache: SUCCESS
[2026-05-02T14:23:55.012Z] Extracted: 3 tiers, 8 features
[2026-05-02T14:23:55.123Z] dataQuality: complete
```

---

## 제약사항

- WebSearch 미국 전용 (VPN 고려 가능)
- Paywalled 우회 성공률 80% (완벽하지 않음)
- 트렌드 언급 수는 추정치 (정확하지 않음)
- JTBD 추출은 명시적 패턴만 (암묵적 목표 놓칠 수 있음)
