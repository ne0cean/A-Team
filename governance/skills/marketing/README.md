# A-Team Marketing Module — Architecture Blueprint

> 1인 + AI 에이전트로 풀 마케팅 회사 수준의 운영을 실현하는 모듈.
> 벤치마크: Tatsuya Mizuno($60-80/월, 40+ 블로그/월), Pieter Levels($3.5M/년, 팀 0명)

---

## 설계 원칙

1. **프롬프트 라이브러리 = 진짜 자산** — 도구보다 정제된 프롬프트가 핵심 IP
2. **1 → 15 콘텐츠 폭발** — 블로그 1개가 15개 포맷으로 자동 변환
3. **AI 80% + 인간 20%** — 완전 자동은 성과 저하. 승인 게이트 필수
4. **MCP-first** — 직접 API 호출보다 MCP 서버 우선 (통합 10배 빠름)
5. **피드백 루프 내장** — 성과 데이터 → 프롬프트 자동 개선

---

## 시스템 아키텍처

```
입력 (토픽/URL/브리프)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                Phase 1: 콘텐츠 파이프라인              │
│                                                     │
│  research → generate → [인간 리뷰 20%] → repurpose → publish
│                                                     │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│            Phase 2: 5-에이전트 마케팅 팀              │
│                                                     │
│  CEO ─┬─ Content Agent                              │
│       ├─ Analytics Agent                            │
│       ├─ Social Agent                               │
│       └─ Funnel Agent                               │
│                                                     │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│            Phase 3: 자가 개선 피드백 루프              │
│                                                     │
│  publish → 성과 수집 → Claude 분석 → 프롬프트 업데이트  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1: 콘텐츠 파이프라인

### 입력 유형
- `--topic "제목"` — 새 콘텐츠 생성
- `--url "https://..."` — 기존 콘텐츠 리퍼포징
- `--brief "파일경로"` — 상세 브리프 파일

### 1-1. Research & Brief (`marketing-research`)
```
Claude + Web Search
  → SEO 키워드 상위 10개 추출
  → 경쟁사 상위 3개 글 분석
  → 타깃 오디언스 질문 10개 수집
  → 콘텐츠 브리프 생성 (outline + angle + tone)
```
**인간 개입**: 브리프 확인 후 승인 (5분)

### 1-2. Generate (`marketing-generate`)
```
프롬프트 라이브러리 [prompts/blog.md] 로드
  → Claude (Sonnet 4.6) 로 3000-5000단어 초안 생성
  → SEO 체크리스트 자동 적용 (H1/H2/메타/링크)
  → 어필리에이트/CTA 자동 삽입 위치 마킹
```
**인간 개입**: 초안 읽고 20% 편집 (필수, 건너뛸 수 없음)

### 1-3. Repurpose (`marketing-repurpose`)
블로그 1개 → 15개 포맷 자동 변환:

| # | 포맷 | 도구 | 예상 시간 |
|---|------|------|---------|
| 1 | Twitter/X 스레드 (5-7트윗) | Claude | 2분 |
| 2 | LinkedIn 롱폼 포스트 | Claude | 2분 |
| 3 | LinkedIn 캐러셀 (6-8슬라이드) | Mirra MCP | 3분 |
| 4 | Instagram 캡션 | Claude | 1분 |
| 5 | Instagram 캐러셀 | Mirra MCP | 3분 |
| 6 | TikTok/Reels 스크립트 | Claude | 2분 |
| 7 | YouTube Shorts 스크립트 | Claude | 2분 |
| 8 | 이메일 뉴스레터 | Claude | 2분 |
| 9 | 이메일 시퀀스 3부작 | Claude | 5분 |
| 10 | Reddit 포스트 | Claude | 2분 |
| 11 | 팟캐스트 쇼노트 | Claude | 2분 |
| 12 | 랜딩페이지 카피 | Claude | 3분 |
| 13 | 광고 카피 3종 (A/B/C) | Claude | 3분 |
| 14 | 인포그래픽 개요 | Claude | 2분 |
| 15 | 이미지 생성 프롬프트 3종 | Claude | 2분 |

**총 소요**: ~35분 (인간 없이 자동)

### 1-4. Publish (`marketing-publish`)
```
Postiz MCP (22+ 플랫폼)
  → 플랫폼별 최적 게시 시간 계산
  → 스케줄 설정 (인간 최종 확인)
  → 배포 실행
  → 배포 완료 리포트 생성
```

---

## Phase 2: 5-에이전트 마케팅 팀

### 에이전트 정의 (CrewAI 또는 Claude Code 서브에이전트)

| 에이전트 | 역할 | 사용 모델 | 트리거 |
|---------|------|---------|--------|
| CEO | 전략 오케스트레이션, 우선순위 결정 | Opus 4.7 | 매일 오전 |
| Content | 콘텐츠 생성 + 리퍼포징 | Sonnet 4.6 | CEO 지시 |
| Analytics | 성과 수집 + 인사이트 | Haiku 4.5 | 매일 오전 |
| Social | 스케줄링 + 참여 모니터링 | Haiku 4.5 | 자동 |
| Funnel | 리드 캡처 + 이메일 시퀀스 | Sonnet 4.6 | 트리거 기반 |

### 일일 워크플로우
```
오전 (자동):
  Analytics Agent → 전날 성과 수집
  CEO Agent → 데이터 분석 + 오늘 우선순위 결정
  Content Agent → 콘텐츠 초안 3개 생성

인간 (30분):
  초안 검토 + 20% 편집 + 승인

오후 (자동):
  Social Agent → 스케줄링 + 배포
  Funnel Agent → 이메일 시퀀스 트리거
  Analytics Agent → 실시간 성과 모니터링

야간 (자동):
  Content Agent → 내일 초안 사전 생성
  Analytics Agent → 일간 리포트 작성
```

---

## Phase 3: 자가 개선 피드백 루프

### 주간 루프 (`marketing-loop`)
```
1. 7일치 성과 데이터 수집 (모든 플랫폼)
2. Claude 분석 → 상위 20% 콘텐츠 패턴 추출
3. 하위 20% 콘텐츠 실패 원인 분석
4. prompts/ 디렉토리 업데이트 제안 생성
5. 인간 승인 후 프롬프트 커밋
6. 다음 주 콘텐츠 전략 문서 생성
```

### 프롬프트 버전 관리
- 모든 프롬프트는 `prompts/` 아래 마크다운 파일
- 변경 시 반드시 git commit (히스토리 = 실험 기록)
- 각 파일 상단에 성과 메모 기록 (what worked / what didn't)

---

## 파일 구조

```
governance/skills/marketing/
  README.md                     ← 이 파일 (아키텍처)
  prompts/
    blog.md                     ← 블로그 생성 마스터 프롬프트
    social-twitter.md
    social-linkedin.md
    carousel.md
    email.md
    video-script.md
    ad-copy.md
  agents/
    ceo.md                      ← CEO 에이전트 시스템 프롬프트
    content.md
    analytics.md
    social.md
    funnel.md
  stacks/
    starter.md                  ← $75/월 스택 가이드
    pro.md                      ← $250/월 스택 가이드
    enterprise.md               ← $800/월 스택 가이드

.claude/commands/
  marketing.md                  ← 마스터 진입점 (/marketing)
  marketing-generate.md         ← 콘텐츠 생성
  marketing-repurpose.md        ← 1→15 변환
  marketing-publish.md          ← 멀티플랫폼 배포
  marketing-analytics.md        ← 성과 분석
  marketing-loop.md             ← 주간 피드백 루프
```

---

## 품질 기준 (인간 초월 판단 기준)

| 지표 | 인간 기준 | AI 목표 |
|------|---------|--------|
| 월 블로그 생성량 | 4-5개/인 | 40+개 |
| 일 소셜 포스트 | 3-5개 | 50+개 |
| 콘텐츠 1개당 포맷 수 | 1-2개 | 15개 |
| 성과 분석 빈도 | 주 1회 | 일 1회 |
| A/B 테스트 동시 실행 | 2-3개 | 10+개 |
| 플랫폼 커버리지 | 2-3개 | 22+개 |

**품질 퀄리티 게이트**: AI 단독 콘텐츠는 랭킹 3.1배 불리. 20% 인간 편집 후 2.7배 유리. 따라서 승인 게이트는 옵션이 아니라 필수.

---

## MCP 의존성

| MCP 서버 | 용도 | 설치 |
|---------|------|------|
| Postiz MCP | 22+ 플랫폼 배포 | `npx postiz-mcp` |
| Mirra MCP | 캐러셀/비디오/분석 | mirra.my |
| 1ClickReport MCP | 30+ 통합 분석 | 1clickreport.com |
| Twitter MCP | X 직접 제어 | github.com/EnesCinr/twitter-mcp |
| LinkedIn MCP | LinkedIn 직접 제어 | github.com/stickerdaniel/linkedin-mcp-server |

---

## 구현 로드맵

- [x] 아키텍처 설계 (이 문서)
- [ ] **Phase 1a**: `/marketing-generate` 스킬 + `prompts/blog.md`
- [ ] **Phase 1b**: `/marketing-repurpose` 스킬 (15 포맷)
- [ ] **Phase 1c**: `/marketing-publish` 스킬 (Postiz 연동)
- [ ] **Phase 1d**: `/marketing` 마스터 오케스트레이터
- [ ] **Phase 2**: 5-에이전트 팀 (`agents/` 시스템 프롬프트)
- [ ] **Phase 3**: `/marketing-loop` 자가 개선 루프
- [ ] **배포**: MCP 서버 설정 가이드 (`stacks/`)
