# 06. 멀티에이전트 빌드 & 운영 가이드

어떤 프로젝트에도 적용 가능한 5-Phase 개발 라이프사이클.
**ClawTeam CLI + 파일 기반 조율 + 모델 선택**을 통합한 완전한 운영 가이드.

> ClawTeam은 이 프레임워크의 **CLI 자동화 레이어**다.
> 파일 기반 수동 조율(PARALLEL_PLAN.md + CURRENT.md)로도 동일한 원칙을 적용할 수 있다.
> ClawTeam은 에이전트 수가 3명 이상이거나 장기 프로젝트에서 진가를 발휘한다.

---

## ClawTeam vs 수동 조율 비교

| 항목 | ClawTeam | 수동 (파일 기반) |
|------|----------|-----------------|
| 에이전트 스폰 | `clawteam spawn` 자동 | 수동으로 새 창/세션 열기 |
| 태스크 상태 | DB 자동 추적 | CURRENT.md 수동 갱신 |
| 의존성 | `--blocked-by` 자동 해제 | 직렬 블록 수동 감시 |
| 격리 | worktree 자동 생성 | `git checkout -b` 수동 |
| 모니터링 | `board live` / tmux 타일뷰 | CURRENT.md 주기적 확인 |
| 통신 | inbox 메시지 큐 | CURRENT.md + 구두 |
| 진입 장벽 | pip install + Python 3.10 | 없음 |

**추천**: 에이전트 2명, 단기 스프린트 → 수동 / 에이전트 3명 이상, 장기 프로젝트 → ClawTeam

---

## 전체 흐름

```
Phase 0: Foundation     프로젝트 뼈대 + 도구 세팅
    ↓
Phase 1: Planning       PRD → 태스크 맵 → 의존성 그래프
    ↓
Phase 2: Assembly       팀 구성 + 격리 + 파일 소유권 선언
    ↓
Phase 3: Execution      병렬 스폰 → 실행 → 통신
    ↓
Phase 4: Integration    머지 → 빌드 검증 → 리뷰
    ↓
Phase 5: Close          컨텍스트 갱신 → 커밋 → 레슨 추출
```

---

## Phase 0: Foundation — 프로젝트 초기화

**목표**: 모든 에이전트가 공통으로 쓰는 인프라를 세운다.

### 0-1. 디렉토리 구조

```
{project-root}/
├── CLAUDE.md              # 에이전트 행동 규칙 + 프로젝트 컨벤션
├── PARALLEL_PLAN.md       # 현재 진행 중인 병렬 작업 플랜 (임시)
├── .context/
│   ├── CURRENT.md         # 살아있는 상태 문서 (세션 간 공유)
│   └── SESSIONS.md        # 세션 로그 아카이브
└── .agent/
    └── mcp.json           # MCP 서버 설정 (선택)
```

### 0-2. CURRENT.md 초기 구조

```markdown
# CURRENT — {프로젝트명}

## Goal
[한 문장 목표]

## Status
[현재 상태 한 줄]

## In Progress Files
- (없음)

## Last Completions
- (없음)

## Next Tasks
1. ...

## Blockers
- (없음)
```

### 0-3. MCP 설정 (권장 최소 구성)

`~/.claude.json` 또는 프로젝트 `.mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

→ 전체 MCP 선택지: `docs/05-mcp-servers.md` 참조

### 0-4. ClawTeam 설치 및 초기화

```bash
pip install clawteam          # Python 3.10+, tmux, git 필요
pip install clawteam[p2p]     # ZMQ P2P 트랜스포트 포함

export CLAWTEAM_AGENT_NAME="leader"
export CLAWTEAM_AGENT_TYPE="leader"
clawteam team spawn-team {team-name} -n leader -d "{프로젝트 설명}"
```

---

## Phase 1: Planning — 태스크 맵 수립

**목표**: 사람이 목표만 제시하면 리더 에이전트가 전체 태스크 맵을 설계한다.

### 1-1. 작업 분해 (Task Decomposition)

**황금 법칙**: 태스크 1개 = 에이전트 1명이 독립 완료 가능 = 100~200줄 이하

```
❌ "소셜 로그인 구현"           → 너무 큼, 에이전트가 방향을 잃음
✅ "DB: social_id 컬럼 추가"    → 독립, 명확, 30분 이내
✅ "백엔드: OAuth 콜백 API"     → 독립, 완료 기준 명확
✅ "프론트: 로그인 버튼 컴포넌트" → 독립, 파일 하나
```

### 1-2. 기술 명세

모호한 태스크 = 에이전트가 임의로 결정. 반드시 명세를 붙인다:

```markdown
## Task: 백엔드 OAuth 콜백 API

**엔드포인트**: POST /auth/google/callback
**Request**: { "code": string, "state": string }
**Response**: { "accessToken": string, "user": { id, email } }
**라이브러리**: passport-google-oauth20, jsonwebtoken
**완료 기준**:
- [ ] curl 정상 플로우 통과
- [ ] 단위 테스트 3개 (정상 / 코드 만료 / DB 오류)
- [ ] npm run build 통과
```

### 1-3. 의존성 그래프

```
DB 마이그레이션 (T1)
    ├──→ 백엔드 API (T2)     blocked-by: T1
    └──→ 프론트 버튼 (T3)    blocked-by: T1
              ↓                        ↓
         백엔드 테스트 (T4)   통합 테스트 (T5)
                              blocked-by: T2, T3
```

**병렬 가능 판정**:
- 같은 파일을 건드리지 않는가? → YES → 병렬
- 한쪽 결과물이 다른 쪽 입력인가? → YES → `blocked-by`

### 1-4. 태스크 등록

#### ClawTeam 사용 시

```bash
# 기본
T1=$(clawteam --json task create {team} "DB: social_id 컬럼 추가" -o worker1 | jq -r '.id')

# 의존성 (T1 완료 후 자동 해제)
T2=$(clawteam --json task create {team} "백엔드: OAuth API" -o worker2 --blocked-by $T1 | jq -r '.id')

# 다중 의존성
clawteam task create {team} "통합 테스트" -o worker4 --blocked-by $T2,$T3

# 태스크 조회
clawteam task list {team}
clawteam task list {team} --status blocked
clawteam task list {team} --owner worker1
```

#### 수동 (파일 기반)

`PARALLEL_PLAN.md`에 수동 기록 → `templates/PARALLEL_PLAN.md` 참조

---

## Phase 2: Assembly — 팀 구성

**목표**: 모델 선택 + 격리 전략 + 파일 소유권을 확정한다.

### 2-1. 역할 배정

| 역할 | 담당 | 모델 | 집중 |
|------|------|------|------|
| Leader | 사람 또는 오케스트레이터 에이전트 | Claude Sonnet+ | 설계, 배분, 통합 |
| Architect | Worker A | Claude Sonnet/Opus | 신규 기능, 시스템 설계 |
| Optimizer | Worker B | Gemini Pro / Claude Haiku | 클린업, 성능, 반복 |
| Researcher | Worker C (선택) | Claude Haiku | 리서치, 문서, 분석 |

→ 상세 배정 기준: `docs/03-model-selection.md` 참조

### 2-2. 격리 전략 선택

| 상황 | 격리 방식 | 방법 |
|------|-----------|------|
| 에이전트 수 ≥ 2, 파일 겹침 가능 | **git worktree** (권장) | `clawteam spawn` 자동 생성 |
| 에이전트 수 = 2, 파일 완전 분리 | **git branch** | 수동 `git checkout -b agent/xxx` |
| 에이전트 수 = 1, 단순 작업 | **없음** | 동일 디렉토리 |

```bash
# ClawTeam worktree 자동 생성
clawteam spawn --team {team} --agent-name worker1 --task "..."
# → .clawteam/teams/{team}/workspaces/worker1/ 에 독립 worktree 생성

# subprocess 백엔드 사용 시
clawteam spawn subprocess claude --team {team} --agent-name worker1 --task "..."

# 격리 없이 (단순 작업)
clawteam spawn --no-workspace --team {team} --agent-name worker1 --task "..."
```

### 2-3. 파일 소유권 선언

PARALLEL_PLAN.md에 명시. 겹치는 파일 = 플랜 수정 또는 직렬 블록으로 격리.

```markdown
### Worker1 파일 소유권
- src/pages/LoginPage.jsx     ← 신규
- src/hooks/useAuth.js        ← 신규

### Worker2 파일 소유권
- server/routes/auth.js       ← 수정
- server/middleware/jwt.js    ← 신규
```

---

## Phase 3: Execution — 병렬 실행

**목표**: 에이전트가 독립적으로 실행되면서 필요한 최소한의 통신만 한다.

### 3-1. 에이전트 스폰

```bash
# ClawTeam (권장 — tmux + worktree 자동)
clawteam spawn --team {team} --agent-name worker1 --task "태스크 설명 + 기술 명세"
clawteam spawn --team {team} --agent-name worker2 --task "태스크 설명 + 기술 명세"

# 수동 (Claude Code 새 창)
# → PARALLEL_PLAN.md를 컨텍스트로 전달
```

### 3-2. 에이전트 내부 작업 순서

각 에이전트는 스폰 후 **이 순서**를 따른다:

```
1. 세션 시작
   → PARALLEL_PLAN.md 정독 (내 역할, 파일 소유권 확인)
   → CURRENT.md 정독 (현재 상태, 다른 에이전트 진행 상황)
   → git log --oneline -5 (최근 변경 이력)

2. 실행
   → 담당 태스크만 처리
   → 다른 에이전트 파일 영역 터치 금지
   → 태스크 완료 시 CURRENT.md 갱신

3. 완료 신호
   → CURRENT.md "Last Completions"에 추가
   → ClawTeam: clawteam task update {team} $TASK_ID --status completed
   → git commit + push (자기 브랜치)
```

#### ClawTeam 환경에서 에이전트 시작 루틴

ClawTeam이 스폰하면 에이전트 컨텍스트에 자동 주입되는 환경변수:

```bash
CLAWTEAM_AGENT_ID="worker1-abc123"
CLAWTEAM_AGENT_NAME="worker1"
CLAWTEAM_AGENT_TYPE="worker"
CLAWTEAM_TEAM_NAME="my-team"
```

에이전트 CLAUDE.md에 이 패턴을 세션 시작 루틴으로 포함시킨다:

```markdown
## 세션 시작 시 (ClawTeam 환경)
1. `clawteam inbox receive {CLAWTEAM_TEAM_NAME} --agent {CLAWTEAM_AGENT_NAME}` — 메시지 확인
2. `clawteam task list {CLAWTEAM_TEAM_NAME} --owner {CLAWTEAM_AGENT_NAME}` — 내 태스크 확인
3. CURRENT.md 정독
4. 담당 태스크 착수 후: `clawteam task update ... --status in_progress`
```

### 3-3. 통신 채널

| 채널 | 방법 | 용도 |
|------|------|------|
| **상태 공유** | CURRENT.md | 완료 항목, 블로커 선언 |
| **메시지** (ClawTeam) | `clawteam inbox send` | 일회성 신호, 명세 변경 통보 |
| **계획 승인** (ClawTeam) | `clawteam plan submit/approve` | 복잡한 작업 전 리더 검토 |

```bash
# 1:1 메시지
clawteam inbox send {team} leader "worker1 완료: 인증 모듈, 테스트 통과"
clawteam inbox send {team} worker2 "API 스펙 변경됨, inbox 확인"

# 전체 브로드캐스트
clawteam inbox broadcast {team} "공유 인터페이스 업데이트됨"

# 메시지 수신 (소비/삭제)
clawteam inbox receive {team} --agent leader

# 메시지 엿보기 (비소비)
clawteam inbox peek {team} --agent leader

# 실시간 감시
clawteam inbox watch {team} --agent leader
```

#### 계획 승인 워크플로우

```bash
# 워커: 작업 전 계획 제출 (복잡한 태스크)
clawteam plan submit {team} worker1 "DB 스키마 변경 예정: users 테이블에 social_id 추가"

# 리더: 승인
clawteam plan approve {team} worker1

# 리더: 거절 + 피드백
clawteam plan reject {team} worker1 "social_id 대신 provider_accounts 별도 테이블로"
```

### 3-4. 블로커 처리

```markdown
# CURRENT.md 블로커 기록 형식
## Blockers
- [Worker2] T3 대기 중 — worker1의 DB 마이그레이션(T1) 완료 필요
```

ClawTeam의 `blocked-by`가 설정된 경우 T1 완료 시 T3 자동 잠금 해제.

### 3-5. 모니터링

```bash
clawteam board show {team}              # 현재 칸반
clawteam board live {team}              # 실시간 갱신 (3초)
clawteam board attach {team}            # tmux 타일뷰 (권장)
clawteam board overview                 # 전체 팀 개요
clawteam board serve --port 8080        # 웹 대시보드

# 파일 기반만 사용 시: CURRENT.md 직접 확인
```

### 3-6. Transport 레이어

| 방식 | 환경변수 | 적합 |
|------|----------|------|
| FileTransport (기본) | `CLAWTEAM_TRANSPORT=file` | 단일 머신, 공유 드라이브 |
| P2PTransport (ZMQ) | `CLAWTEAM_TRANSPORT=p2p` | 실시간 저지연, 멀티 머신 |

```bash
# 크로스 머신 공유 스토리지
export CLAWTEAM_DATA_DIR=/mnt/shared/clawteam

# 머신 B에서 팀 참여
clawteam team request-join {team} --agent worker-b
# 머신 A에서 승인
clawteam team approve-join {team} worker-b
```

### 3-7. JSON 스크립팅

```bash
# 태스크 생성 후 ID 추출
TASK_ID=$(clawteam --json task create {team} "작업명" | jq -r '.id')

# 팀 상태 파싱
clawteam --json board show {team} | jq '.taskSummary'
# { "total": 6, "pending": 2, "in_progress": 3, "completed": 1, "blocked": 0 }

# 완료된 태스크만 추출
clawteam --json task list {team} | jq '[.[] | select(.status == "completed") | .subject]'
```

---

## Phase 4: Integration — 통합 및 검증

**목표**: 에이전트 결과물을 하나로 합치고 빌드를 통과시킨다.

### 4-1. 머지 순서

```bash
# 1. 먼저 완료된 에이전트 브랜치
git checkout main
git merge agent/worker1

# 2. 두 번째 에이전트 (파일 소유권 기준으로 conflict 해결)
git merge agent/worker2
# conflict 발생 시:
git diff --name-only --diff-filter=U
git checkout --theirs src/pages/auth-page.jsx  # worker2 소유 → worker2 버전 우선
git add src/pages/auth-page.jsx

# 3. ClawTeam worktree 사용 시
clawteam task wait {team} --timeout 3600
# 각 워커 worktree에서 수동 cherry-pick 또는 merge
```

### 4-2. 빌드 검증 체크리스트

```bash
# 1. 타입/문법 오류
npm run type-check   # TypeScript 사용 시
npm run lint

# 2. 테스트
npm run test

# 3. 빌드
npm run build

# 4. 스모크 테스트 (선택)
npm run dev &
curl http://localhost:3000/health
```

→ 빌드 실패 시: 담당 파일 소유 에이전트에게 수정 요청 후 재머지.

### 4-3. 종료 워크플로우 (ClawTeam)

```bash
clawteam task list {team} --status pending      # 빈 목록이어야 함
clawteam task list {team} --status in_progress  # 빈 목록이어야 함

clawteam lifecycle request-shutdown {team} worker1
clawteam lifecycle approve-shutdown {team} worker1
clawteam team cleanup {team}
```

---

## Phase 5: Close — 세션 마무리

**목표**: 다음 에이전트(또는 다음 세션)가 즉시 작업 재개 가능한 상태로 정돈.

### 5-1. CURRENT.md 갱신

```markdown
## In Progress Files
- (없음)

## Last Completions
- **[Auth] 소셜 로그인** (YYYY-MM-DD)
  - 영향 파일: server/routes/auth.js, src/hooks/useAuth.js
  - 빌드: ✓
  - 참고: passport.js 사용, /api/v1/auth 경로

## Next Tasks
1. [ ] 프로필 수정 기능
2. [ ] 이메일 인증 추가
```

### 5-2. SESSIONS.md 로그

```markdown
## [YYYY-MM-DD] 세션명

**완료**: 소셜 로그인 (DB + 백엔드 API + 프론트 버튼 + 통합 테스트)
**에이전트**: Worker1 (Claude Sonnet, 백엔드) / Worker2 (Gemini Pro, 프론트)
**이슈**: T3가 T1 완료 대기로 1시간 블로킹 → 다음엔 T1 작업 시간 단축 필요
**빌드**: ✅ 통과
```

### 5-3. 커밋 형식

```
[type]: 요약

NOW: 완료한 것
NEXT: 다음 할 일
BLOCK: 없음

Co-Authored-By: {에이전트명} <noreply@anthropic.com>
```

### 5-4. 레슨 추출 → 툴킷 역업로드

발견한 패턴/안티패턴은 이 레포 `docs/` 또는 `examples/`에 즉시 기록.

```
좋은 기록 대상:
- 이 프로젝트 타입에서 통한 에이전트 수/역할 배분
- 예상치 못한 파일 충돌 패턴
- 어떤 태스크 크기가 적절했는지
- ClawTeam vs 수동 조율 중 더 나은 것
```

---

## 빠른 의사결정 트리

```
에이전트 몇 명?
├── 1명 → 일반 세션, 이 가이드 불필요
└── 2명 이상 →
    파일 겹침 가능성?
    ├── 없음 → branch 격리 + PARALLEL_PLAN.md
    └── 있음 →
        ClawTeam 설치 가능?
        ├── 가능 → clawteam spawn (worktree 자동)
        └── 불가 → 수동 git worktree + 엄격한 파일 소유권 선언

태스크 의존성?
├── 없음 → 전체 병렬 시작
└── 있음 → blocked-by 또는 직렬 처리 블록 명시
```

---

## 안티패턴

| 패턴 | 결과 | 해결 |
|------|------|------|
| 파일 소유권 미선언 | 덮어쓰기, 재작업 | PARALLEL_PLAN.md 작성 필수 |
| 태스크가 너무 큼 | 에이전트가 방향을 잃음 | 100줄 이하로 분해 |
| 완료 기준(DoD) 없음 | 언제 멈춰야 할지 모름 | 체크리스트 3개 이상 |
| 에이전트 수 과다 | 조율 오버헤드 > 병렬 이득 | 태스크 수 ÷ 2~3 명이 적정 |
| 의존성 미파악 | 인터페이스 불일치, 재작업 | Phase 1에서 그래프 필수 |
| CURRENT.md 미갱신 | 다음 에이전트가 맥락 없음 | 태스크 완료마다 즉시 갱신 |
