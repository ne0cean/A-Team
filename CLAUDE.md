# A-Team — Claude Code 전용 오케스트레이션 규칙

> 프로젝트 컨텍스트(레포 구조·작업 원칙·완성 선언·커맨드 목록)는 **AGENTS.md** 참조.
> 이 파일은 Claude Code 전용 자동화·오케스트레이션 규칙만 담는다.

## Cortex Ritual Dashboard (SSOT)

개인 운영 시스템. 매일 참조·수정하는 핵심 데이터.

**데이터 경로** (`cortex/areas/life/ritual-routine/`):
| 파일 | 용도 | 보호 |
|------|------|------|
| `YYYY-MM.json` | 월별 일정 (캘린더 데이터) | ⚠️ 덮어쓰기 금지 |
| `standing-orders.json` | 상시/주간/월간반복/연간/공휴일/비전 | ⚠️ 덮어쓰기 금지 |
| `day-frames.json` | Day Type별 프레임 템플릿 (weekday/flow/block) | ⚠️ 덮어쓰기 금지 |
| `vision-roadmap.json` | 5개년 비전 테이블 | ⚠️ 덮어쓰기 금지 |

**접근 방식**: JSON 파일 직접 Read/Edit (SSOT). 서버(localhost:7843)는 UI용.
**절대 금지**: 마이그레이션/구조 재편 시 이 디렉토리 파일 삭제 또는 빈 데이터로 덮어쓰기.
**백업**: 수정 전 `.bak` 생성 필수.
**UI 배포**: `governance/rules/ui-deploy-gate.md` 체크리스트 필수 통과. 미검증 배포 금지.
**SW 캐시**: 개발 중 Service Worker 비활성 유지. 배포 시 캐시 버전 올리기만으론 부족 — 사용자에게 캐시 삭제를 요구하지 않는 구조여야 함.
**UX 명세**: `scripts/cortex-dashboard/UX-SPEC.md`가 구현의 SSOT. 여기 없는 건 만들지 않고, 여기 있는 건 빠뜨리지 않는다.
**alert() 금지**: toast UI 사용. overflow:hidden 금지. hover 레이아웃 밀림 금지.

## 🚀 A-Team Calling Commands (의무)
세션 시작 시 반드시 다음 명령 중 하나를 호출하여 컨텍스트를 로드합니다.

- **/vibe**: **신규 세션 시작**. 전체 컨텍스트 로드, 태스크 계획 및 모델 배정.
- **/pickup**: **중단된 세션 재개**. `RESUME.md`, `git status`, `CURRENT.md`를 분석하여 즉시 이어받기.
- **/zzz**: **수면/자율 모드**. 장시간 자율 작업 진입, 나레이션 금지, 계정 자동 전환 활성화.

### 명령어 별칭 규칙

- 모든 기존 커맨드는 슬래시 유무와 대소문자 차이 없이 인식한다.
- 예: `vibe`, `/vibe`, `VIBE`, `pickup`, `/pickup`, `END`, `/end`
- 세션 계열은 자연어 별칭도 허용한다.

## 🤖 Auto-Invoke Protocol (자동화 로직)
모든 프로젝트는 세션 진입 시 다음 로직을 자동으로 수행해야 합니다:

1. **상태 스캔**: `.context/RESUME.md` 미완료 상태 또는 `git status` dirty 여부 확인.
2. **자동 분기**:
   - **흔적 발견 시** → 즉시 **/pickup** 실행.
   - **흔적 없을 시** → 즉시 **/vibe** 실행.
3. **거버넌스 주입**: `CLAUDE.md` + `AGENTS.md` 규칙을 즉시 로드하고 작업에 반영.

## 모델 적정성 (필수, 매 사용자 메시지 직후 자가평가)

**원칙**: Opus는 진짜 Opus가 필요한 작업에만. 관성으로 메인 세션 모델 유지하지 않는다.

**매 사용자 요청 직후, 첫 도구 호출 전에 반드시 실행**:

### Step 1: Opus 필요 여부 판정
이 작업이 다음 중 하나인가?
- (a) 새 시스템 아키텍처 설계
- (b) 3개 이상 옵션 비교
- (c) 5개 이상 파일 강한 의존성
- (d) MoA 충돌 해소 (judge)

→ **YES**: Opus 유지
→ **NO**: Step 2 진행

### Step 2: 모델 전환 제안 (필수)
응답 **첫 줄**에 명시:
```
이 작업은 [Sonnet/Haiku]으로 충분합니다.
전환할까요? (비용 ~[3-5x/10x] 절약)
```

**사용자 응답 대기** → 승인 시 `/model [모델]` 실행 권장

### Step 3: 예외 처리
- 사용자가 "Opus 유지" 또는 거절 명시 → 한 세션 내 재추천 금지
- 자율 모드(zzz/ralph) → 제안 생략, 서브에이전트 위임으로 대체

### Step 4: 5턴 자가점검
매 5턴마다:
- 지난 5턴이 전부 단순 작업(파일 수정/문서/구현)이었나?
- YES → 다음 응답 첫 줄: "지난 작업이 단순했습니다. Sonnet 전환 검토 권장"

상세: [governance/rules/model-allocation.md](governance/rules/model-allocation.md)

**위임 우선 원칙**: 메인이 Opus여도 작업 80%+를 Sonnet/Haiku 서브에이전트에 위임. 메인은 분배 + 통합 + 대화만.

**Agent Teams**: teammate간 토론/반박/크로스레이어 작업 시 사용. 기존 subagent 정의를 teammate type으로 재사용. 단순 위임은 기존 subagent 유지. 라우팅: orchestrator Phase 2.07.

### Step 5: 로컬/무료 모델 라우팅 (필수)

서브태스크가 다음에 해당하면 **Anthropic 에이전트 대신** `mcp__llm__ask` 사용:

| 작업 유형 | 호출 방식 | 비용 |
|-----------|----------|------|
| 요약, 번역, 포맷 변환 | `Bash: llm "프롬프트"` (groq-free 70B) | 무료 |
| 로그/에러 해석, 간단 질의 | `Bash: llm "프롬프트"` (groq-free 70B) | 무료 |
| JSON/YAML 생성/변환 | `Bash: llm -m groq-fast "프롬프트"` (8B) | 무료 |
| 코드 구현/리팩토링 | `Agent(model=sonnet)` | $$ |
| 설계/아키텍처/판단 | `Agent(model=opus)` 또는 메인 직접 | $$$ |

**사용법**: `llm "질문"` — Groq 70B 무료. `llm -m groq-fast "질문"` — 8B 초고속.
**파이프**: `cat file.txt | llm "요약해"` — stdin 파이프 지원.
**성능 보호**: 코드 생성, 보안 검토, 아키텍처 결정은 **절대 로컬 모델로 보내지 않음**.

## 커맨드 자동 제안 (세션 중 실시간)

작업 중 다음 패턴을 감지하면 **즉시 1줄로 커맨드 제안**. 사용자가 무시하면 반복 안 함.

### 기획/설계
| 감지 패턴 | 제안 |
|-----------|------|
| 아이디어/제품/기능 논의 | → `/office-hours` |
| "PRD", "기획", "만들고 싶어" | → `/prd` (자동 트리거) |
| 복잡한 멀티파일 구현 전 | → `/blueprint` |
| 전략적 결정, 방향 고민 | → `/plan-ceo` |
| 아키텍처/스택/설계 선택 | → `/plan-eng` |
| 기능 우선순위 고민 | → `/prioritize` |
| 경쟁사/시장/트렌드 언급 | → `/intel` |
| 아이디어 논의 후 레지스트리 미갱신 | → `/idea` |
| "MECE", "빠진 거 없나", "갭 분석" | → `/mece-gap` |

### 구현/품질
| 감지 패턴 | 제안 |
|-----------|------|
| 같은 파일 3회+ 수정 | → `/tdd` |
| 디버깅 3턴+ | → `/investigate` |
| 보안 민감 코드 (auth/crypto/token/payment) | → `/cso` |
| 5+ 파일 변경 완료 | → `/pmi` |
| push 전 리뷰 없음 | → `/review` 또는 `/ship` |
| UI/CSS/컴포넌트 수정 | → `/design-audit` (자동 훅) |
| PPT 생성 완료 직후 | → `/design-score` |
| UI 빌드 후 "이거 괜찮아?", "디자인 평가" | → `/design-score` |
| 성능 의문, "느려" | → `/benchmark` |

### 방법론 시그널 (자동 전환, 명시 호출 불필요)

시그널 단어 포함 시 해당 방법론 즉시 적용. "확실히" → TDD+Mutation, "엣지 케이스" → Property-Based, "큰 리팩토링" → Strangler Fig, "보안 중요" → Security-First 등 11개.
상세 테이블: `governance/rules/quality-pipeline.md` "개발 방법론 시그널 사전"

### 마케팅/콘텐츠
| 감지 패턴 | 제안 |
|-----------|------|
| 블로그/콘텐츠 작성 | → `/marketing-generate` |
| SNS/트위터/링크드인 언급 | → `/marketing-social` |
| 콘텐츠 발행/배포 | → `/marketing-publish` |
| 1개 콘텐츠 → 여러 포맷 | → `/marketing-repurpose` |
| 인스타그램/카드뉴스 | → `/card-news` |
| YouTube 영상 분석 | → `/yt` |

### 운영/관리
| 감지 패턴 | 제안 |
|-----------|------|
| 목표/KPI/분기 계획 | → `/okr` |
| 장애/에러/서비스 다운 | → `/incident` |
| 프로젝트 현황 파악 | → `/prjt` |
| 주간 리포트/인사이트 | → `/insights` |
| 법률/라이선스/컴플라이언스 | → `/legal-check` |
| 회고/개선점 정리 | → `/retro` |
| 월간 전략 점검 | → `/board` |
| 세션 시작 + 오늘 브리핑 없음 | → `/daily-brief` |
| "트렌드", "경쟁사", "뭘 해야 하지" | → `/daily-brief` |
| "성장", "발전", "수용", "최신" | → `/daily-brief` |

**학습**: `/end` Step 6.8에서 놓친 커맨드를 기록. 같은 패턴이 3회 반복되면 제안 강도를 높임 (1줄 → AskUserQuestion).

## 빌드 완료 시 자동 품질 게이트 (Quality Pipeline Layer 2)

구현 완료 → `/end` 이전에 자동 실행. 변경 3+ 파일 시 Haiku adversarial, 보안 패턴 감지 시 CSO mini-scan, 새 export 시 테스트 존재 확인. `/end`는 리뷰 끝난 상태에서 종료+교훈 저장만.

상세: `governance/rules/quality-pipeline.md`

## 자율 모드 진입 시 (의무)
사용자가 "랄프 모드", "자동으로", "자는 동안", "풀자동", "알아서 해" 등 트리거 사용 시:
1. **반드시 `governance/rules/autonomous-loop.md` 먼저 Read** (6개 강제 조항)
2. 특히 **강제 조항 6 (나레이션 금지)** — 질문뿐 아니라 상태 요약·인사·경계 선언 등 모든 사용자 대상 텍스트 최소화
3. 위반 시 자율 모드 자동 중단, 다음 iteration에서 이 문서 재독

## Auto-Pilot (자율주행, 다단계 워크플로우)
사용자 "auto-pilot/자율주행/쭉 진행/승인 없이/끝까지 알아서" 표현 시:
1. **즉시 [governance/rules/auto-pilot.md](governance/rules/auto-pilot.md) Read** (130 lines)
2. STOP 조건 4가지(완료/차단/위험/예산) 첫 turn에 명시
3. 단계별 commit + push + AUTO-PILOT-LOG.md
4. 사용자 confirm 요청은 STOP 조건에서만

`/ralph`(단일 검증태스크)와 `/zzz`(수면)와 다른 차원: **다단계 워크플로우 자율**.

## Zzz 모드 (수면 + 자율 조합)
사용자 메시지에 **수면 의도** ("자러간다", "잘게", "주무세요", "맡겨두고") + **자율 의도** ("랄프 모드", "자동으로", "묻지 마") **둘 다** 포함 시:
1. **즉시 `/zzz` 스킬 호출** (`.claude/commands/zzz.md`)
2. **핵심 의도**: "맡겨두고 잘게" = **지금 하던 작업을 그대로 이어서 계속**
3. 단일 진입으로 RESUME.md + CronCreate + launchd + 나레이션 금지 + 계정 자동 전환 통합
4. `/usage` 파싱 시도 → 실패 시 사용자 명시 시간 → 실패 시 5시간 기본
5. 재귀 wake-up 자동 예약, 토큰 한계 직전 commit/push 후 대기
6. 아침에 1회 ≤10줄 요약만 허용

**구분**:
- `/zzz` — 풀 오토 (하던 작업 이어서 + 수면 + 리셋 자동 이어받기 + 계정 자동 전환)
- `/zzz --fresh` — 예외: 새 태스크 큐 디스패치
- `/resume` — 리셋 후 재개만. 자율 작업 없음
- `/pickup` — 재개 실행 로직 (RESUME.md 읽고 이어받기)

## 계정 자동 전환 (a-team 글로벌 엔진)
엔진: `scripts/auto-switch/trigger.mjs` (launchd 60초 크론). claude-remote 서버 떠있으면 PTY 기반 실시간 전환, 없으면 Telegram 수동 알림. 상세: `governance/rules/auto-switch-protocol.md`.

발동: OAuth 계정 ≥ 2개 + 활성 계정 ≥ 96% + 후보 계정 < 80% + 10분 쿨다운 경과. 서버가 autosave 프롬프트 주입 시 Claude는:
1. RESUME.md에 현재 상태 저장 + git commit
2. 마지막 줄에 `READY_TO_SWITCH` 단독 출력
3. 서버가 keychain swap → `/pickup` 자동 주입
4. zzz 모드 유지하며 새 계정에서 이어서 진행

타임아웃 180s, 쿨다운 10분. 설치: `bash scripts/install-auto-switch-cron.sh install`.

## Autoresearch Shadow Mode (의무 자동 트리거)

`AUTORESEARCH-PLAN.md` Mode=`SHADOW-TRACKING` 시, tracked 커맨드(`/office-hours`, `/blueprint`, `/plan-eng`) 완료 후 `.autoresearch/_shadow/<name>/log.jsonl`에 조용히 로깅. 7일/10엔트리 → 주간 집계, 3주+15runs → DECISION-REPORT.md. Override: Mode를 `PAUSED`/`DECIDED`/`DISMISSED`로 변경.
