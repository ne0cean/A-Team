# A-Team — Claude Code 전용 오케스트레이션 규칙

> 프로젝트 컨텍스트(레포 구조·작업 원칙·완성 선언·커맨드 목록)는 **AGENTS.md** 참조.
> 이 파일은 Claude Code 전용 자동화·오케스트레이션 규칙만 담는다.

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

사용자 작업 지시에 **시그널 단어**가 포함되면 해당 방법론을 자동 적용한다.
제안이 아니라 **즉시 적용**. 사용자는 시그널 한 마디만 하면 됨.

| 시그널 | 방법론 | Claude 행동 |
|--------|--------|-------------|
| "실패하면 Y여야 해", "X면 에러" | Contract-First | 타입 + 실패 테스트 먼저 → 구현 |
| "확실히 맞아야 해", "절대 깨지면 안 돼" | TDD + Mutation | Red-Green-Refactor + 코드 변형 검증 |
| "이상한 입력도 버텨야 해", "엣지 케이스" | Property-Based | fast-check 랜덤 불변조건 검증 |
| "지금 출력 그대로 유지해", "회귀 방지" | Golden Master | 현재 출력 스냅샷 → 변경 시 diff |
| "보안 중요", "인증", "결제" | Security-First | CSO 사전 스캔 + OWASP 체크 |
| "큰 리팩토링", "전면 교체" | Strangler Fig | 감싸고 점진 이관. 한 번에 안 바꿈 |
| "프로토타입", "빠르게 확인" | Spike & Stabilize | 최소 구현 → 동작 확인 → 테스트 고정 |
| "처음부터", "새 프로젝트" | Walking Skeleton | E2E 파이프라인 먼저 → 살 붙이기 |
| "아직 미완성인데 배포" | Feature Flags | 플래그로 감싸서 안전 배포 |
| "다른 방법은?", "비교해봐" | ADR | 옵션 매트릭스 + 트레이드오프 문서화 |
| "의존성 정리", "결합도" | Fitness Functions | 순환 참조/결합도 자동 측정 |

상세: `governance/rules/quality-pipeline.md`

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

`.context/AUTORESEARCH-PLAN.md`의 `Mode`가 `SHADOW-TRACKING`일 때, Claude는 다음을 **자동 수행**한다.

### Trigger 1: Tracked command 사용 후 로깅
`governance/skills/autoresearch/shadow-evals.yaml`에 정의된 tracked 커맨드(`/office-hours`, `/blueprint`, `/plan-eng`)가 완료되면 **조용히**:
1. `.autoresearch/_shadow/<name>/log.jsonl`에 1줄 append
2. binary_evals self-score 포함
3. 사용자에게 노출하지 않음 (나레이션 금지)

### Trigger 2: 세션 시작 시 집계 + 판정 확인
- ≥ 7일 경과 OR 신규 엔트리 ≥ 10 → 주간 집계
- 3주 경과 AND 누적 runs ≥ 15 → DECISION-REPORT.md + 알림

### Override
`AUTORESEARCH-PLAN.md`의 `Mode`를 `PAUSED`/`DECIDED`/`DISMISSED`로 변경.

파일 위치: `.context/AUTORESEARCH-PLAN.md`, `governance/skills/autoresearch/shadow-evals.yaml`
