# /marketing-research — 리서치 파이프라인

**용도**: 콘텐츠 제작 전 완전한 시장 리서치 실행. 키워드 분석 → 경쟁사 분석 → 오디언스 인텔리전스 → 트렌드 → 콘텐츠 브리프 생성.

## 플래그

| 플래그 | 설명 | 예시 |
|--------|------|------|
| `--topic` | 리서치할 주제/키워드 (필수) | `--topic "AI 마케팅 자동화"` |
| `--keywords` | 분석할 키워드 목록 (쉼표 구분) | `--keywords "kw1, kw2, kw3"` |
| `--audience` | 타겟 오디언스 힌트 | `--audience "1인 창업자"` |
| `--lang` | 출력 언어 (기본: ko) | `--lang en` |
| `--phase` | 특정 Phase만 실행 (1-6) | `--phase 3` |
| `--output` | 결과 저장 경로 (기본: content/research/) | `--output research/custom/` |
| `--skip-serp` | SERP 분석 스킵 (웹 접근 불가 시) | |
| `--brief-only` | Phase 5 (콘텐츠 브리프)만 생성 | |
| `--use-intel` | `/intel` 커맨드 통합 (Phase 2 자동화) | ✨ **NEW** |

## 실행 흐름

### Phase 0: 사전 준비

```
리서치 세션 초기화:
- 저장 경로: content/research/YYYY-MM-DD-{slug}/
  ├── 00-session-meta.json   (입력값 + 실행 시간)
  ├── 01-intent.json         (Phase 1 결과)
  ├── 02-serp.json           (Phase 2-A 결과)
  ├── 03-pages.json          (Phase 2-B 결과)
  ├── 04-audience.json       (Phase 3 결과)
  ├── 05-trends.json         (Phase 4 결과)
  ├── 06-brief.json          (Phase 5 결과 — 핵심 산출물)
  ├── 07-opportunities.json  (Phase 6 결과)
  └── BRIEF.md               (Phase 5를 사람이 읽기 좋게 포맷)
```

---

### Phase 1: 검색 인텐트 분류

`governance/skills/marketing/prompts/research.md` Phase 1 프롬프트 사용.

입력: `--topic`과 `--keywords`에서 쿼리 목록 추출 (없으면 topic으로 5개 변형 생성)

출력 예시:
```json
[
  {
    "query": "AI 마케팅 자동화",
    "intent": "INFORMATIONAL",
    "confidence": 82,
    "content_type": "how-to guide",
    "buyer_stage": "awareness"
  }
]
```

저장: `01-intent.json`

---

### Phase 2-A: SERP 분석 (경쟁사 구조 파악)

**Intel Integration** (✨ NEW — Phase 2 자동화):
- `--use-intel` 플래그 있을 시:
  1. `/intel competitor {topic에서 추출한 회사}` 실행 → `.intel/competitors/` 자동 저장
  2. `/intel trend {topic}` 실행 → `.intel/trends/` 자동 저장
  3. 결과를 `02-serp.json`에 병합 (경쟁사 pricing/features + 트렌드 rising/stable)
  4. SERP 수동 수집 스킵 (intel 데이터로 대체)

**Graceful Degradation**:
- `--skip-serp` 있음: 스킵 + `02-serp.json`에 `{"skipped": true, "reason": "user_requested"}` 기록
- WebSearch 도구 실패: 자동 스킵 + `{"skipped": true, "reason": "web_unavailable"}` 기록 + 사용자에게 알림
- 수동 URL 입력 가능: `--urls "url1,url2,url3"` 플래그로 SERP 데이터 우회
- 아예 데이터 없음: Phase 2-A 스킵하고 Phase 2-B 수동 URL 역엔지니어링으로 대체

**Legacy Path** (`--use-intel` 없을 시):
웹 검색으로 상위 5-10개 페이지 수집 후 `research.md` Phase 2-A 프롬프트 적용.

**수집 항목**:
- 각 페이지의 제목, URL, 메타 설명
- 추정 단어 수, H2 구조 (가능하면)
- 발행일 또는 최종 수정일

출력: 구조적/콘텐츠/신선도 신호 + 상위 3개 갭 → `02-serp.json`

---

### Phase 2-B: 상위 페이지 역엔지니어링

상위 3페이지에 대해 `research.md` Phase 2-B 프롬프트 적용.

각 페이지에서 추출:
- 전체 H1-H2-H3 아웃라인
- 오프닝 훅 전략
- 증거 유형
- CTA 위치
- 약점 (beat 포인트)

저장: `03-pages.json`

---

### Phase 3-A: 오디언스 인텔리전스 (JTBD)

**Intel Integration** (✨ NEW):
- `--use-intel` + `--audience` 있을 시:
  1. `/intel persona {audience}` 실행 → `.intel/personas/` 자동 저장
  2. 결과를 `04-audience.json`에 병합 (JTBD + pain points + confidence)
  3. 커뮤니티 스크래핑 스킵 (intel 데이터로 대체)

**Legacy Path** (`--use-intel` 없을 시):
Reddit, Quora, 네이버 카페, 커뮤니티에서 관련 토론 검색.

**언어별 데이터 소스**:

영어 (`--lang en`):
```
site:reddit.com "{topic}"
site:reddit.com "{topic}" (problem|how|why|best)
site:quora.com "{topic}"
site:news.ycombinator.com "{topic}"
"{topic}" review OR recommendation
```

한국어 (`--lang ko`):
```
site:cafe.naver.com "{topic}"
site:dcinside.com "{topic}"
site:threads.net "{topic}" (한국어)
site:clien.net "{topic}"
"{topic}" 후기 OR 추천 OR 질문
"{topic}" 어려움 OR 문제 OR 단점
```

일본어 (`--lang ja`):
```
site:5ch.net "{topic}"
site:note.com "{topic}"
"{topic}" 評価 OR 比較
```

`research.md` Phase 3-A 프롬프트로 JTBD 분석.

저장: `04-audience.json` (pain points + exact language + unanswered questions)

---

### Phase 3-B: 페르소나 합성

Phase 3-A 데이터로 `research.md` Phase 3-B 프롬프트 실행.

3개 페르소나 생성:
- 각 페르소나: 설명, 핵심 목표, 상위 3 페인, 상위 3 게인, 결정 기준, 콘텐츠 선호도, trigger phrases

`04-audience.json`에 병합.

---

### Phase 4: 트렌드 분석

트렌드 신호 수집:
- Google Trends 데이터 (웹 검색으로 추정)
- 최근 뉴스/블로그 포스트 발행일 분포
- SNS 언급 빈도 (검색 결과 기반 추정)

`research.md` Phase 4 프롬프트 적용 → 상위 3 기회 + 긴급도 플래그.

저장: `05-trends.json`

---

### Phase 5: 콘텐츠 브리프 생성 (핵심 산출물)

Phase 1-4의 모든 데이터를 통합해 `research.md` Phase 5 프롬프트 실행.

생성물:
```json
{
  "title_options": [5개 변형],
  "meta_description": "155자 이하",
  "target_reader": {...},
  "content_structure": {
    "h1": "...",
    "hook": {"strategy": "...", "word_count": 100},
    "sections": [
      {
        "h2": "...",
        "word_count": 500,
        "keyword": "...",
        "purpose": "...",
        "key_points": [...],
        "evidence_needed": [...]
      }
    ],
    "faq": [...],
    "conclusion": {...}
  },
  "seo": {...},
  "unique_angle": "...",
  "quality_bar": {...},
  "cta_strategy": {...}
}
```

저장: `06-brief.json` + `BRIEF.md` (사람이 읽기 좋은 형식)

**스키마 검증 (필수)**:
저장 전 `governance/skills/marketing/schemas/brief.schema.json` 으로 검증.
검증 실패 시 누락 필드 보고 + 자동 수정 시도.
스키마 파일 누락 시 graceful skip + 경고 로그.

---

### Phase 6: 기회 스코어링

`--keywords`로 여러 키워드를 넣은 경우, `research.md` Phase 6 프롬프트로 ROI 우선순위 계산.

가중 복합 점수:
```
(demand×2 + gap×2 + fit×1.5 + trend×1 + authority×1 + conversion×1.5) / 9
```

출력:
- DO NOW (8+): 즉시 작성
- SCHEDULE (6-7.9): 큐에 추가
- MONITOR (4-5.9): 관찰 유지
- SKIP (<4): 건너뜀

저장: `07-opportunities.json`

---

### 완료 리포트

```
## 리서치 완료 — {TOPIC}

저장 위치: content/research/{DATE}-{SLUG}/

### 핵심 발견
- 검색 인텐트: {INTENT} (신뢰도 {N}%)
- 경쟁 강도: {LEVEL}
- 최대 기회: {TOP_GAP}
- 추천 각도: {UNIQUE_ANGLE}

### 콘텐츠 브리프
- 추천 제목: "{BEST_TITLE}"
- 목표 단어 수: {WORD_COUNT}
- 최소 섹션: {N}개 H2
- [HUMAN INSERT] 필수 구간: {N}개

### 다음 단계
브리프를 바탕으로 콘텐츠 초안 생성:
  /marketing-generate --topic "{TOPIC}" --research content/research/{SLUG}/06-brief.json

### 기회 순위 (복수 키워드인 경우)
1. "{KW}" — 점수 {N}/10 — DO NOW
2. "{KW}" — 점수 {N}/10 — SCHEDULE
```

---

## 사용 예시

```bash
# 기본 — 전체 파이프라인
/marketing-research --topic "AI 마케팅 자동화 도구"

# 복수 키워드 — 기회 스코어링 포함
/marketing-research --keywords "마케팅 자동화, SNS 자동화, 콘텐츠 마케팅 AI"

# 영어 콘텐츠 리서치
/marketing-research --topic "AI marketing automation" --lang en

# SERP 없이 빠른 리서치 (오프라인/API 한계 시)
/marketing-research --topic "뉴스레터 작성법" --skip-serp

# 브리프만 빠르게 생성
/marketing-research --topic "인스타그램 마케팅" --brief-only

# 특정 Phase만 (예: 오디언스 분석만)
/marketing-research --topic "이커머스 자동화" --phase 3
```

---

## marketing-generate 연동

리서치 완료 후 브리프를 바로 콘텐츠 생성에 전달:

```bash
/marketing-generate \
  --topic "AI 마케팅 자동화 도구" \
  --research content/research/2026-04-18-ai-marketing-automation/06-brief.json
```

`marketing-generate`는 `--research` 플래그 수신 시:
1. 자체 리서치 Phase 스킵 (이미 완료)
2. 브리프의 구조를 그대로 사용 (H1-H3 + word counts)
3. `[HUMAN INSERT]` 마커를 브리프에서 가져옴
4. unique_angle을 반드시 반영

---

## Analytics 로깅 (필수)

Phase 6 (브리프 저장) 완료 직후 `.context/analytics.jsonl` 에 이벤트 1건 append:

```typescript
import { logMarketingEvent } from './lib/analytics';

logMarketingEvent('marketing_research', {
  repo: '<현재 프로젝트명>',
  marketingTopic: '<슬러그>',
  marketingArtifactPath: 'content/research/<날짜-슬러그>/06-brief.json',
  marketingMode: 'dry-run',
}, '.context/analytics.jsonl');
```

토픽/플랫폼/브리프 경로 필수. 실패 시 graceful (로깅 실패가 리서치 결과를 막지 않음).

---

## 변경 이력

| 날짜 | 변경 내용 | 근거 |
|------|---------|------|
| 2026-04-18 | v1.0 초기 버전 | research.md 6-Phase 파이프라인 오케스트레이터 |
| 2026-04-21 | Analytics 로깅 섹션 추가 | Phase 0 실 호출 경로 완성 |
