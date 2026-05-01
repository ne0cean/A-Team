# 시장·사용자 인텔리전스 시스템 설계서

> 작성일: 2026-05-02
> 목적: Claude Code 구현 참조용 계획서
> 소스: Phase 2 `/office-hours` + `/plan-eng` 설계 문서

---

## 1. 작업 컨텍스트

### 배경 및 목적

1인 창업자 또는 소규모 팀이 마케팅/제품 의사결정을 내릴 때 필요한 시장 인텔리전스를 자동화한다. 경쟁사 분석, 트렌드 모니터링, 사용자 페르소나 연구를 수동으로 하면 주당 5-10시간 소요되며, 유료 SaaS($15K+/yr)는 1인 팀에 과도하다.

이 시스템은 Claude WebSearch + researcher 에이전트를 활용해 비용 $0로 경쟁사 가격/기능, Reddit/X 트렌드, JTBD 기반 페르소나를 자동 수집·분석하고, Marketing Module(Phase 3)에 입력 브리프를 제공한다.

### 범위

- **포함**:
  - 경쟁사 공개 정보 (가격, 기능, 포지셔닝) 분석
  - 소셜 미디어 트렌드 (Reddit/X/뉴스) 수집
  - 타겟 세그먼트별 JTBD + Pain Points 추출
  - Marketing Module 브리프 생성
  - Paywalled 콘텐츠 우회 (Archive.org, Google Cache 등)

- **제외**:
  - 실시간 모니터링 (주기적 수동 호출, Visualping으로 보완)
  - 비공개 데이터 (API 키 필요한 소셜 플랫폼)
  - 경쟁사 내부 문서 접근 (법적 경계 존중)
  - 자동 리포트 발행 (Phase 2.1 이후)

### 입출력 정의

| 항목 | 내용 |
|------|------|
| **입력** | `/intel competitor [회사명]` / `/intel trend [키워드]` / `/intel persona [타겟]` / `/intel brief [프로젝트]` — 자연어 인자 1개 |
| **출력** | JSON 파일 (`.intel/{competitors,trends,personas}/YYYY-MM-DD-{slug}.json`) + 터미널 요약 |
| **트리거** | 사용자 수동 호출 (초기), 향후 Visualping 이메일 알림 시 재실행 |

### 제약조건

- **기술 제약**:
  - Claude WebSearch는 미국 지역만 지원 (VPN 고려 필요 시)
  - Paywalled 콘텐츠는 우회 전략 5단계 시도 후에도 실패 가능
  - WebSearch 깊이 제한 (첫 10개 결과)

- **운영 제약**:
  - 실시간 모니터링 없음 (사용자 주기적 호출)
  - Visualping Free tier 제약 (최대 5개 URL)

- **품질 제약**:
  - 경쟁사 분석 정확도: 공개 정보 한정, 추론은 명시
  - 트렌드 분석: 최근 30일 데이터 우선
  - 페르소나: JTBD 프레임워크 기반, 추측 최소화

### 용어 정의

| 용어 | 정의 |
|------|------|
| **JTBD** | Jobs to Be Done — 사용자가 제품을 '고용'해 달성하려는 목표 |
| **Pain Points** | 현재 해결책의 불만족 요소 (시간/비용/복잡도 등) |
| **Positioning** | 경쟁사가 시장에서 차별화하는 메시지/가치 제안 |
| **Paywalled** | 로그인/구독 필요한 콘텐츠 (우회 전략 필요) |
| **Visualping** | URL 변경 모니터링 SaaS (Free tier 활용) |

---

## 2. 워크플로우 정의

### 전체 흐름도

```
[사용자 입력] → [Step 1: 인자 파싱] → [Step 2: intel-analyzer 호출]
                                                      │
                                          ┌───────────┴───────────┐
                                          ▼                       ▼
                                    [Competitor]              [Trend/Persona]
                                          │                       │
                                    [Step 3a: 가격/기능]     [Step 3b: Reddit/X]
                                          │                       │
                                    [Step 4a: 포지셔닝]      [Step 4b: JTBD 추출]
                                          │                       │
                                          └───────────┬───────────┘
                                                      ▼
                                          [Step 5: JSON 저장 + 검증]
                                                      ▼
                                          [Step 6: 터미널 요약 출력]

[/intel brief 경로]
[사용자 입력: 프로젝트명] → [Step 7: .intel/ 집계] → [Step 8: marketing-research 브리프 생성]
```

### LLM 판단 vs 코드 처리 구분

| LLM이 직접 수행 | 스크립트로 처리 |
|----------------|----------------|
| WebSearch 쿼리 생성 (경쟁사명 → 검색어) | 인자 파싱 (커맨드 라인 → 서브커맨드 분기) |
| Paywalled 감지 (페이지 내용 분석) | JSON 스키마 검증 (필수 필드 확인) |
| 가격/기능 추출 (자연어 → 구조화) | 파일 저장 (.intel/ 디렉토리 관리) |
| JTBD 추론 (사용자 피드백 → Jobs) | Archive.org URL 생성 (문자열 조합) |
| 포지셔닝 분석 (차별화 메시지 추출) | 집계 스크립트 (여러 JSON 파일 병합) |
| 트렌드 우선순위 판단 (언급 빈도 + 감정 분석) | Visualping 이메일 파싱 (향후 자동화) |

### 단계별 상세

#### Step 1: 인자 파싱 및 서브커맨드 라우팅

- **처리 주체**: 스크립트 (`.claude/commands/intel.md` 내 bash 블록)
- **입력**: `/intel <subcommand> <argument>` (예: `/intel competitor stripe`)
- **처리 내용**: 서브커맨드 4종(`competitor`/`trend`/`persona`/`brief`) 판별, 인자 추출 후 intel-analyzer에 프롬프트 전달
- **출력**: 구조화된 프롬프트 문자열 (예: "competitor 분석: Stripe, 가격/기능/포지셔닝 추출")
- **성공 기준**: 유효한 서브커맨드 + 인자 1개 이상
- **검증 방법**: 정규식 매칭 (`^(competitor|trend|persona|brief) .+$`)
- **실패 시 처리**: 즉시 에러 메시지 + 사용 예시 출력, 에이전트 호출 없음

#### Step 2: intel-analyzer 에이전트 호출

- **처리 주체**: Task tool (`subagent_type: "general-purpose"`, model: `sonnet`)
- **입력**: Step 1의 구조화 프롬프트
- **처리 내용**: WebSearch/WebFetch로 데이터 수집, Paywalled 감지 시 우회 전략 5단계 순차 시도
- **출력**: 원시 분석 텍스트 (마크다운 형식)
- **성공 기준**: 최소 1개 이상의 유효한 데이터 소스 확보 (Paywalled 우회 성공 OR 공개 소스)
- **검증 방법**: LLM 자기 검증 (데이터 충분성 체크 프롬프트)
- **실패 시 처리**: 자동 재시도 없음 (비용 절약), 에러 로그 `.intel/errors/YYYY-MM-DD-{slug}.log` 저장 + 사용자 알림

#### Step 3a: 경쟁사 가격/기능 추출 (Competitor 경로)

- **처리 주체**: intel-analyzer 에이전트 (Step 2 내부 스텝)
- **입력**: WebSearch 결과 (가격 페이지, 기능 비교표, 리뷰)
- **처리 내용**:
  1. 가격 티어 추출 (Free/Pro/Enterprise, 월/연 가격)
  2. 핵심 기능 5-10개 리스트업
  3. 차별화 포인트 식별 (타겟층, 특화 기능)
- **출력**: JSON 객체 (`CompetitorAnalysis` 타입)
- **성공 기준**: 가격 1개 이상 OR 기능 3개 이상
- **검증 방법**: 스키마 검증 (`lib/intel-types.ts` 참조)
- **실패 시 처리**: 불완전 데이터는 `null` 필드로 저장 + `dataQuality: "partial"` 플래그

#### Step 3b: Reddit/X 트렌드 수집 (Trend 경로)

- **처리 주체**: intel-analyzer 에이전트 (Step 2 내부 스텝)
- **입력**: WebSearch 결과 (`site:reddit.com [키워드]`, 뉴스 검색)
- **처리 내용**:
  1. 최근 30일 언급 빈도 추정
  2. 긍정/부정/중립 감정 분류
  3. 핵심 논의 주제 3-5개 추출
- **출력**: JSON 객체 (`TrendData` 타입)
- **성공 기준**: 언급 3개 이상 발견
- **검증 방법**: 스키마 검증 + 날짜 범위 체크 (30일 이내)
- **실패 시 처리**: 언급 0건이면 `trend: "dormant"` 플래그 + 에러 아님

#### Step 4a: 포지셔닝 분석 (Competitor 경로)

- **처리 주체**: intel-analyzer 에이전트 (Step 2 내부 스텝)
- **입력**: 경쟁사 홈페이지 헤드라인, About 페이지, 프레스 릴리스
- **처리 내용**: 차별화 메시지 추출 ("빠름" vs "심플" vs "엔터프라이즈급" 등)
- **출력**: 텍스트 (200자 이내)
- **성공 기준**: 명사구 3개 이상 포함 (예: "real-time collaboration", "enterprise security")
- **검증 방법**: LLM 자기 검증 (모호성 체크)
- **실패 시 처리**: 근거 불충분 시 `positioning: "unclear"` 저장

#### Step 4b: JTBD 추출 (Persona 경로)

- **처리 주체**: intel-analyzer 에이전트 (Step 2 내부 스텝)
- **입력**: Reddit 사용자 피드백, 리뷰 사이트 불만 사항
- **처리 내용**: "I want to..." 패턴 추출, Pain Points 분류 (시간/비용/복잡도)
- **출력**: JSON 객체 (`PersonaProfile` 타입)
- **성공 기준**: JTBD 2개 이상 + Pain Point 3개 이상
- **검증 방법**: 스키마 검증 + 중복 제거 (유사도 80% 이상은 병합)
- **실패 시 처리**: 데이터 부족 시 `confidence: "low"` 플래그

#### Step 5: JSON 저장 및 검증

- **처리 주체**: 스크립트 (`lib/intel-save.ts`)
- **입력**: Step 3/4 출력 JSON
- **처리 내용**:
  1. 타입스크립트 스키마 검증 (`lib/intel-types.ts`)
  2. 파일명 생성 (`.intel/{competitors,trends,personas}/YYYY-MM-DD-{slug}.json`)
  3. 기존 파일 중복 체크 (같은 날 같은 대상이면 덮어쓰기)
  4. `.intel/.gitignore` 존재 확인 (없으면 생성)
- **출력**: 파일 경로 문자열
- **성공 기준**: 파일 생성 + 스키마 검증 PASS
- **검증 방법**: `JSON.parse()` 성공 + TypeScript 타입 가드
- **실패 시 처리**: 스키마 오류는 콘솔 경고 + 원시 JSON 저장 (`.raw.json` 확장자)

#### Step 6: 터미널 요약 출력

- **처리 주체**: 스크립트 (`.claude/commands/intel.md` 내)
- **입력**: Step 5 파일 경로
- **처리 내용**: JSON 파일 읽어서 3-5줄 요약 생성 (가격 범위, 핵심 기능 top 3, 트렌드 방향)
- **출력**: 터미널 텍스트 (색상 코드 포함)
- **성공 기준**: 요약 출력 완료
- **검증 방법**: 사람 검토 (자동 검증 없음)
- **실패 시 처리**: 요약 생성 실패 시 파일 경로만 출력

#### Step 7: .intel/ 집계 (/intel brief 경로)

- **처리 주체**: 스크립트 (`scripts/intel-aggregate.mjs`)
- **입력**: 프로젝트명 (예: "new-saas-launch")
- **처리 내용**: `.intel/` 전체 JSON 파일 읽어서 프로젝트 관련성 필터링 (파일명/내용 키워드 매칭)
- **출력**: 통합 JSON 객체 (`{ competitors: [...], trends: [...], personas: [...] }`)
- **성공 기준**: 최소 1개 이상의 파일 매칭
- **검증 방법**: 배열 길이 > 0
- **실패 시 처리**: 매칭 0건이면 에러 + "먼저 /intel competitor/trend/persona 실행하세요" 안내

#### Step 8: marketing-research 브리프 생성 (/intel brief 경로)

- **처리 주체**: intel-analyzer 에이전트
- **입력**: Step 7 통합 JSON
- **처리 내용**: Marketing Module 입력 형식으로 변환 (`.context/briefs/YYYY-MM-DD-{project}.md`)
- **출력**: 마크다운 파일 (경쟁사 비교표, 타겟 페르소나 섹션, 트렌드 요약)
- **성공 기준**: 섹션 3개 이상 (competitors/personas/trends)
- **검증 방법**: 마크다운 헤더 파싱 (`## Competitors` 등 존재 확인)
- **실패 시 처리**: 불완전 브리프는 저장 + 경고, `/marketing-research` 수동 수정 필요

### 상태 전이

| 상태 | 전이 조건 | 다음 상태 |
|------|----------|----------|
| `idle` | 사용자 `/intel` 호출 | `parsing` |
| `parsing` | 인자 유효 | `analyzing` |
| `parsing` | 인자 무효 | `error` → `idle` |
| `analyzing` | WebSearch 성공 | `extracting` |
| `analyzing` | Paywalled 감지 | `bypassing` |
| `bypassing` | 우회 성공 (5단계 중 1개) | `extracting` |
| `bypassing` | 우회 전부 실패 | `partial_data` → `saving` |
| `extracting` | 스키마 검증 PASS | `saving` |
| `extracting` | 스키마 검증 FAIL | `fixing` → `saving` (raw) |
| `saving` | 파일 저장 성공 | `complete` → `idle` |
| `saving` | 파일 저장 실패 | `error` → `idle` |

---

## 3. 구현 스펙

### 폴더 구조

```
/a-team (프로젝트 루트)
  ├── .claude/
  │   ├── commands/
  │   │   └── intel.md                 # 메인 커맨드 (4 서브커맨드 라우팅)
  │   └── agents/
  │       └── intel-analyzer.md         # Sonnet 분석 에이전트
  ├── lib/
  │   ├── intel-types.ts                # TypeScript 타입 정의
  │   └── intel-save.ts                 # JSON 저장 + 검증 헬퍼
  ├── scripts/
  │   └── intel-aggregate.mjs           # /intel brief 집계 스크립트
  ├── test/
  │   ├── intel.test.ts                 # 단위 테스트
  │   └── intel-integration.test.ts     # 통합 테스트
  ├── .intel/                           # 인텔리전스 데이터 저장소 (gitignored)
  │   ├── competitors/
  │   ├── trends/
  │   ├── personas/
  │   ├── errors/                       # 실패 로그
  │   └── .gitkeep
  └── .context/
      └── briefs/                       # /intel brief 산출물
```

### 에이전트 구조

**구조 선택**: 단일 메인 에이전트 (`.claude/commands/intel.md`) + 1개 서브에이전트 (`intel-analyzer.md`)

**선택 근거**:
- 라우팅 로직은 단순 (bash if-else) → 메인 커맨드에서 처리
- 분석 로직(WebSearch/추론/우회)은 복잡 + 컨텍스트 길이 → 서브에이전트 분리
- 4개 서브커맨드가 모두 intel-analyzer를 재사용 (DRY 원칙)

#### 메인 에이전트 (intel.md)

- **역할**: 사용자 진입점, 인자 파싱, 서브커맨드 분기, 결과 출력
- **담당 단계**: Step 1 (인자 파싱), Step 6 (요약 출력)
- **모델**: 없음 (순수 bash 스크립트)

#### 서브에이전트: intel-analyzer

| 이름 | 역할 | 트리거 조건 | 입력 | 출력 | 모델 |
|------|------|-----------|------|------|------|
| intel-analyzer | WebSearch 수행 + Paywalled 우회 + 데이터 추출 | 메인 커맨드 Task tool 호출 | 구조화 프롬프트 (서브커맨드 + 인자) | JSON 객체 (CompetitorAnalysis / TrendData / PersonaProfile) | Sonnet |

### 스킬/스크립트 목록

| 이름 | 유형 | 역할 | 트리거 조건 |
|------|------|------|-----------|
| intel.md | 커맨드 | 4 서브커맨드 라우팅 + 결과 출력 | 사용자 `/intel` 호출 |
| intel-analyzer.md | 서브에이전트 | WebSearch + 추론 + 우회 전략 | intel.md의 Task tool 호출 |
| intel-save.ts | 스크립트 | JSON 검증 + 파일 저장 | intel-analyzer 완료 후 |
| intel-aggregate.mjs | 스크립트 | 여러 JSON 병합 + 필터링 | `/intel brief` 호출 |

### A-Team 표준 커맨드 규칙

> 이 설계서에 정의된 모든 커맨드는 A-Team 표준 형식으로 작성할 것.

A-Team 표준 커맨드 규격:
1. 파일 위치: `.claude/commands/intel.md` (슬래시 커맨드) / `.claude/agents/intel-analyzer.md` (서브에이전트)
2. frontmatter: `description:` 1줄 필수 — Claude Code `Skill` tool 자동 등록
   - intel.md: `description: 시장·사용자 인텔리전스 수집 (경쟁사/트렌드/페르소나)`
   - intel-analyzer.md: `description: Intel 분석 엔진 — WebSearch + Paywalled 우회`
3. 배포: `bash scripts/install-commands.sh` 실행으로 `~/.claude/commands/`에 symlink
4. Progressive disclosure: 커맨드 본문 500줄 이내, Paywalled 우회 전략 상세는 `governance/skills/intel/paywall-bypass.md`로 분리 (on-demand 로드)
5. 자율 루프 미포함 (수동 호출 전용)

### 주요 산출물 파일

| 파일 | 형식 | 생성 단계 | 용도 |
|------|------|----------|------|
| `.intel/competitors/YYYY-MM-DD-{company}.json` | JSON | Step 5 | 경쟁사 분석 결과 저장 |
| `.intel/trends/YYYY-MM-DD-{keyword}.json` | JSON | Step 5 | 트렌드 데이터 저장 |
| `.intel/personas/YYYY-MM-DD-{segment}.json` | JSON | Step 5 | 페르소나 프로필 저장 |
| `.context/briefs/YYYY-MM-DD-{project}.md` | Markdown | Step 8 | Marketing Module 입력 브리프 |
| `.intel/errors/YYYY-MM-DD-{slug}.log` | 텍스트 | Step 2 실패 시 | 디버깅용 에러 로그 |

---

## 4. 데이터 스키마

### CompetitorAnalysis (lib/intel-types.ts)

```typescript
interface CompetitorAnalysis {
  company: string;
  analyzedAt: string; // ISO 8601
  pricing: {
    tiers: Array<{
      name: string; // "Free" / "Pro" / "Enterprise"
      price: number | null; // 월 USD, null이면 contact sales
      billingCycle: "monthly" | "annual";
    }>;
  };
  features: string[]; // 핵심 기능 5-10개
  positioning: string; // 차별화 메시지 200자 이내
  sources: string[]; // URL 목록
  dataQuality: "complete" | "partial" | "low"; // 데이터 충분성
}
```

### TrendData (lib/intel-types.ts)

```typescript
interface TrendData {
  keyword: string;
  analyzedAt: string;
  mentions: number; // 최근 30일 추정치
  sentiment: {
    positive: number; // 0-1
    neutral: number;
    negative: number;
  };
  topics: string[]; // 핵심 논의 3-5개
  trend: "rising" | "stable" | "declining" | "dormant";
  sources: string[];
}
```

### PersonaProfile (lib/intel-types.ts)

```typescript
interface PersonaProfile {
  segment: string; // "solo founders" / "marketing agencies"
  analyzedAt: string;
  jtbd: Array<{
    job: string; // "automate social media posting"
    context: string; // "while focusing on product development"
  }>;
  painPoints: Array<{
    pain: string;
    category: "time" | "cost" | "complexity" | "quality";
  }>;
  confidence: "high" | "medium" | "low"; // 데이터 신뢰도
  sources: string[];
}
```

---

## 5. Paywalled 우회 전략 (상세)

intel-analyzer 에이전트가 Paywalled 콘텐츠 감지 시 아래 순서로 자동 시도:

### 1단계: Archive.org Wayback Machine

- **조건**: WebFetch 응답에 "login required", "subscribe", "paywall" 키워드 포함
- **구현**: `https://web.archive.org/web/{원본 URL}` 재요청
- **성공률**: ~60% (자주 크롤링되는 블로그/뉴스)
- **실패 시**: 2단계 진행

### 2단계: Google Cache

- **조건**: 1단계 실패
- **구현**: WebSearch 쿼리 `cache:{원본 URL}` 실행
- **성공률**: ~40% (Google 캐시 존재 시)
- **실패 시**: 3단계 진행

### 3단계: 공개 프레스 릴리스

- **조건**: 2단계 실패 + 대상이 회사명
- **구현**: WebSearch `site:{company.com}/press` 또는 `site:{company.com}/newsroom`
- **성공률**: ~50% (공식 발표는 무료 공개 관례)
- **실패 시**: 4단계 진행

### 4단계: RSS Feeds

- **조건**: 3단계 실패 + 대상이 블로그
- **구현**: WebSearch `site:{domain}/blog feed` → RSS URL 파싱 → 전체 텍스트 추출
- **성공률**: ~30% (RSS가 요약만 제공할 수도 있음)
- **실패 시**: 5단계 진행

### 5단계: LinkedIn "About" 페이지

- **조건**: 4단계 실패 + 경쟁사 분석
- **구현**: WebFetch `https://www.linkedin.com/company/{company}/about/` (로그인 없이 접근 가능)
- **성공률**: ~80% (회사 개요는 공개)
- **실패 시**: `dataQuality: "low"` 플래그 + 공개 소스만으로 분석

---

## 6. 테스트 계획

### 단위 테스트 (test/intel.test.ts)

| 테스트 케이스 | 검증 대상 | 예상 결과 |
|-------------|----------|----------|
| 인자 파싱 성공 | `/intel competitor stripe` → `{subcommand: "competitor", arg: "stripe"}` | PASS |
| 인자 파싱 실패 | `/intel invalid` → 에러 메시지 | PASS |
| JSON 스키마 검증 | `CompetitorAnalysis` 필수 필드 누락 → 에러 | PASS |
| 파일 저장 중복 | 같은 날 같은 회사명 → 덮어쓰기 | PASS |
| 집계 스크립트 | 키워드 "saas" → 관련 파일 3개 필터링 | PASS |

### 통합 테스트 (test/intel-integration.test.ts)

| 테스트 케이스 | 시나리오 | 검증 |
|-------------|---------|------|
| E2E: competitor | `/intel competitor stripe` 전체 실행 → JSON 파일 생성 | 파일 존재 + 스키마 유효 |
| E2E: Paywalled 우회 | Mock WebFetch "paywall" 응답 → Archive.org fallback 호출 확인 | Archive URL 로그 발견 |
| E2E: brief 생성 | 기존 3개 JSON 파일 → `/intel brief test-project` → 마크다운 생성 | 섹션 3개 존재 |

---

## 7. Phase 2 Gate 달성 경로

> **Gate**: 마케팅 콘텐츠 1편이 인텔리전스 데이터 인용해 작성됨

### 파일럿 시나리오

1. **경쟁사 분석**: `/intel competitor vercel` 실행 → `.intel/competitors/2026-05-02-vercel.json` 생성
2. **트렌드 수집**: `/intel trend "edge computing"` → `.intel/trends/2026-05-02-edge-computing.json` 생성
3. **페르소나 정의**: `/intel persona "indie hackers"` → `.intel/personas/2026-05-02-indie-hackers.json` 생성
4. **브리프 생성**: `/intel brief edge-saas-launch` → `.context/briefs/2026-05-02-edge-saas-launch.md` 생성
5. **마케팅 실행**: `/marketing-generate --input .context/briefs/2026-05-02-edge-saas-launch.md --format blog` → 블로그 초안에 Vercel 비교표 인용
6. **검증**: 블로그에 "According to our competitive analysis..." 문구 + Vercel 데이터 포함 확인
7. **이벤트 로그**: `analytics.jsonl`에 `{event: "marketing_content_generated", intel_used: true, sources: ["vercel.json", "edge-computing.json"]}` 기록

---

## 8. 향후 확장 (Phase 2.1+)

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **24h 캐싱** | 같은 대상 재호출 시 24시간 이내면 캐시 반환 | HIGH |
| **자동 리포트** | 주간 트렌드 변화 자동 요약 → 이메일 발송 | MEDIUM |
| **Visualping 통합** | 이메일 파싱 → `/intel competitor` 자동 실행 | MEDIUM |
| **API 키 옵션** | X API / Reddit API 선택적 추가 (유료) | LOW |
| **시계열 분석** | 같은 경쟁사 여러 날짜 비교 → 가격 변화 추적 | LOW |

---

## 부록: 설계 결정 요약

### 핵심 트레이드오프

1. **실시간 모니터링 포기 vs 비용 $0**
   - 결정: Visualping Free tier + 수동 호출로 충분 (창업 초기 빈도 낮음)

2. **Paywalled 우회 복잡도 vs 데이터 접근성**
   - 결정: 5단계 우회 전략 구현 (실패율 낮춤)

3. **단일 에이전트 vs 멀티 에이전트**
   - 결정: 라우팅(bash) + 분석(intel-analyzer) 2계층 (컨텍스트 최적화)

4. **API 직접 통합 vs WebSearch**
   - 결정: WebSearch (X API $200/mo 절약, 유지보수 간소)

### 리스크 완화

- **WebSearch 미국 전용**: VPN 고려 안내 (문서화)
- **토큰 비용 불확실**: 파일럿 첫 실행으로 실측 후 RTK 적용
- **Paywalled 전부 실패**: `dataQuality: "low"` 명시 + 사용자 수동 보완 안내
