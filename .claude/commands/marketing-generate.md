# /marketing-generate — 콘텐츠 생성

**용도**: 블로그/아티클 생성. 리서치 → 초안 → 인간 리뷰 게이트.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /marketing-generate --topic "주제"
  /marketing-generate --topic "주제" --audience "타깃" --keywords "kw1,kw2" --words 3000
  /marketing-generate --brief path/to/brief.md
  /marketing-generate --url "https://..." (리퍼포징용 원문)
  /marketing-generate --topic "주제" --research content/research/DATE-SLUG/06-brief.json

플래그:
  --topic       생성할 토픽 (필수, --url 없을 시)
  --url         기존 콘텐츠 URL (리퍼포징 시)
  --research    /marketing-research가 생성한 브리프 JSON 경로 (Step 2 스킵)
  --intel-brief `/intel brief` 결과 경로 (✨ NEW — 경쟁사+트렌드+페르소나 통합)
  --audience    타깃 오디언스 (기본: 결정하기 위한 질문 1개 함)
  --keywords    콤마 구분 키워드 리스트
  --tone        콘텐츠 톤 (기본: authoritative)
  --words       목표 단어 수 (기본: 3000, --research 있으면 브리프 값 우선)
  --lang        언어 (기본: ko, 옵션: en)
  --no-review   인간 리뷰 건너뜀 (비권장 — 품질 저하 경고)
```

### Step 1: 브리프 미입력 시 최소 인터뷰

타깃 오디언스가 불명확하면 **단 1개** 질문:
```
이 콘텐츠의 주요 독자는 누구입니까? (예: "AI 도구를 쓰는 스타트업 창업자")
```

### Step 2: Research

**`--intel-brief` 플래그 있을 시** (✨ NEW — Phase 2 통합):
- `/intel brief` 결과 (`IntelBrief` 타입) 로드
- 경쟁사 pricing/features, 트렌드 rising/stable, 페르소나 JTBD/pain points 추출
- 콘텐츠 초안에 자동 인용:
  - "경쟁사 X는 $Y/월, 우리는 이렇게 다름" (CompetitorAnalysis 활용)
  - "{트렌드}는 {rising/declining} 중입니다" (TrendData 활용)
  - "타깃 독자는 '{pain}' 문제로 고민 중" (PersonaProfile 활용)
- Step 2 자체 리서치 스킵 → Step 3으로

**`--research` 플래그 있을 시** (기존 경로):
- 지정된 `06-brief.json` 로드
- 브리프의 H1-H3 구조, word counts, [HUMAN INSERT] 마커, unique_angle 추출
- Step 2 자체 리서치 완전 스킵 → Step 3으로 바로 이동

**둘 다 없을 시** (인라인 리서치):
`governance/skills/marketing/prompts/blog.md`의 Research Prompt 실행:
- 경쟁 상위 3개 글 분석 (갭 파악)
- 오디언스 질문 Top 10 추출
- 데이터 포인트 5-7개 수집
- 최강 앵글 도출

결과를 **콘텐츠 브리프**로 출력:
```markdown
## 콘텐츠 브리프
- 토픽: ...
- 타깃: ...
- 주요 키워드: ...
- 경쟁사 갭: ...
- 추천 앵글: ...
- 핵심 데이터 포인트:
  1. ...
  2. ...
```

### Step 3: 초안 생성

`governance/skills/marketing/prompts/blog.md`의 Content Generation Prompt 실행.

생성 후 출력:
- 전체 초안
- AFFILIATE INSERT POINTS
- CTA LOCATIONS
- REPURPOSE ANGLES (다음 단계 힌트)

### Step 4: 인간 리뷰 게이트 (--no-review 없을 시)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✋ 인간 리뷰 필요 — 퀄리티 게이트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 초안을 검토하고 20% 이상 편집하세요.
체크리스트 (governance/skills/marketing/prompts/blog.md 참고):
  □ 개인 관찰/경험 2-3개 추가 ([HUMAN INSERT] 위치에)
  □ AI 냄새 표현 제거
  □ 데이터 정확성 확인
  □ 브랜드 음성 조정

편집 완료 후: /marketing-repurpose 로 15개 포맷 변환
           또는: /marketing-publish 로 바로 발행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: 파일 저장

```
content/drafts/YYYY-MM-DD-{slug}.md 에 자동 저장
(content/ 디렉토리 없으면 생성)

파일 상단 프론트매터:
---
title: ...
date: YYYY-MM-DD
status: draft  # → reviewed → published
keywords: [...]
platform: blog
word_count: N
repurposed: false
---
```

## 오류 처리

- 웹 검색 실패 → 리서치 단계 스킵, 사용자에게 알림 후 진행
- 단어 수 미달 (<2500) → 자동으로 확장 섹션 추가 요청
- `--no-review` 사용 시 → "경고: 인간 리뷰 없이 생성된 콘텐츠는 품질 저하 가능" 명시

## Analytics 로깅 (필수)

초안 저장 직후 `.context/analytics.jsonl` 에 이벤트 1건 append:

```typescript
import { logMarketingEvent } from './lib/analytics';

logMarketingEvent('marketing_generate', {
  repo: '<현재 프로젝트명>',
  marketingTopic: '<슬러그>',
  marketingPlatform: '<blog|twitter|linkedin|instagram|tiktok|email>',
  marketingMode: '<blog-first|social-first|dry-run>',
  marketingArtifactPath: 'content/drafts/<날짜-슬러그>.md',
  marketingHumanInsertCount: <[HUMAN INSERT] 마커 수>,
}, '.context/analytics.jsonl');
```

실패 시 graceful (로깅 실패가 생성 결과를 막지 않음).
