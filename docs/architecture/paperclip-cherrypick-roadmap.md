# Paperclip Cherry-pick 도입 로드맵

> ADR-2026-06-01: Paperclip 4개 패턴의 A-Team 네이티브 적용 설계
> 상태: PROPOSED
> 결정자: Architect Agent

---

## 현황 분석

### A-Team 현재 인프라

| 영역 | 현재 상태 | 한계 |
|------|----------|------|
| 이벤트 로깅 | `lib/analytics.ts` + `.context/analytics.jsonl` (JSONL append) | 에이전트별 구분 없음. `skill` 필드로 모듈 구분만 가능. 도구 호출 단위 추적 불가 |
| 비용 추적 | `/end` Step 3.5에서 `session_cost` 이벤트 1건 기록 | 세션 합산만. 에이전트/커맨드별 비용 분해 불가 |
| 실행 추적 | 없음. `session_start`/`session_end` 이벤트만 analytics.jsonl에 기록 | 실행 시간, 종료 사유, 에이전트별 run 이력 전무 |
| 동시성 제어 | cortex-dashboard에 `_version`/409 optimistic locking 구현 완료 | D1 전용. 에이전트 태스크 수준으로 확장 안 됨 |
| 스킬 구조 | `governance/skills/` (14개 디렉토리) + `.claude/commands/` (60+개) + `.claude/agents/` (20+개) | 3곳에 분산. 메타데이터 없음. 검색/발견성 낮음 |

### Paperclip 참조 패턴 (cherry-pick 대상)

| 패턴 | Paperclip 구현 | A-Team 적용 방향 |
|------|---------------|-----------------|
| Activity Log + Cost Event | PostgreSQL `cost_events` 테이블, `activity_log` 테이블. 에이전트/프로젝트/모델별 필터링 | JSONL 확장. DB 추가 없이 파일 기반 유지 |
| Heartbeat Run 추적 | DB-backed run queue. `started_at`, `ended_at`, liveness outcome 7종 | JSONL `runs.jsonl` 신규 파일 |
| Atomic Checkout | `POST /api/issues/{id}/checkout` + execution lock | 파일 기반 lock + cortex-dashboard D1 확장 |
| Skills 디렉토리 | `.agents/skills/`, 에이전트별 스킬 매핑, 메타데이터 | `governance/skills/` 통합 인덱스 + 메타데이터 표준화 |

---

## 의존성 그래프

```
Phase 0 (사전 준비)
    |
    v
Phase 1 (Activity Log + Cost Event)  -----> Phase 2 (Heartbeat Run)
    |                                            |
    v                                            v
Phase 3 (Atomic Checkout)             Phase 4 (Skills 체계화)
```

- Phase 1은 Phase 2의 선행 조건 (이벤트 스키마가 먼저 정의되어야 run 이벤트 통합 가능)
- Phase 3, 4는 독립적이며 병렬 진행 가능
- Phase 3은 Phase 1의 cost_event 패턴에서 동시 쓰기 보호 필요 시 연결

---

## Phase 0: 사전 준비 (1일, small)

### 목표
기존 analytics 인프라의 하위 호환성을 보장하면서 확장 가능한 기반 마련.

### 구현 위치
- `lib/analytics-schema.json` (수정)
- `lib/analytics.ts` (수정)

### 핵심 구현 내용
1. **analytics-schema.json에 신규 이벤트 타입 예약 등록**
   - `event` enum에 추가: `"agent_tool_call"`, `"agent_cost"`, `"run_start"`, `"run_end"`, `"task_checkout"`, `"task_release"`
   - 기존 이벤트 타입 변경 없음 (하위 호환)

2. **AnalyticsEvent 인터페이스에 공통 필드 추가**
   ```
   agentId?: string       // 에이전트 식별 (예: "architect", "coder", "researcher")
   runId?: string         // 실행 ID (Phase 2에서 사용)
   parentRunId?: string   // 부모 실행 ID (서브에이전트 추적)
   costCents?: number     // 개별 비용 (센트 단위, 소수점 허용)
   modelId?: string       // 사용 모델 (예: "opus-4", "sonnet-4")
   ```
   - 모두 optional이므로 기존 코드 영향 없음

3. **JSONL 파일 분리 계획 확정**
   - `.context/analytics.jsonl` — 기존 유지 (스킬/훅 이벤트)
   - `.context/runs.jsonl` — Phase 2에서 신규 생성 (실행 추적)
   - `.context/cost-events.jsonl` — Phase 1에서 신규 생성 (세분화 비용)

### 완료 조건
- [ ] 기존 테스트 (`test/anomaly-detect.test.ts`, `test/dashboard-cli.test.ts` 등) 전부 통과
- [ ] `lib/analytics.ts`의 `logEvent()` 가 신규 필드를 수용하되 기존 호출부 변경 불필요
- [ ] schema.json 의 `additionalProperties: true` 유지 확인

### 롤백 방법
- `git revert` 1커밋. 신규 필드는 전부 optional이므로 제거해도 기존 코드 동작에 영향 없음.

---

## Phase 1: Activity Log + Cost Event (3-4일, medium)

### 목표
에이전트별, 도구 호출별, 모델별로 토큰 비용을 세분화 기록. 기존 `session_cost` 합산 이벤트를 대체하지 않고, 세부 이벤트를 추가하여 상향식(bottom-up) 비용 추적 가능하게 만든다.

### 구현 위치
- `lib/cost-tracker.ts` (수정 — 에이전트별 비용 축적 로직 추가)
- `lib/activity-logger.ts` (신규 — 도구 호출 로그 전용 유틸)
- `.context/cost-events.jsonl` (신규 — 세분화 비용 로그)
- `scripts/cost-report.mjs` (신규 — CLI 비용 리포트)
- `.claude/commands/cost.md` (신규 — `/cost` 커맨드)
- `governance/workflows/session-end.md` (수정 — Step 3.5에 cost-events 집계 추가)

### 핵심 구현 내용

#### 1. Cost Event 스키마 (JSONL 레코드)
```json
{
  "event": "agent_cost",
  "ts": "2026-06-01T14:30:00Z",
  "agentId": "coder",
  "modelId": "sonnet-4",
  "repo": "connectome",
  "skill": "implement",
  "costCents": 2.34,
  "inputTokens": 12000,
  "outputTokens": 3500,
  "cacheReadTokens": 8000,
  "toolName": "Edit",
  "runId": "run_abc123"
}
```

#### 2. Activity Log 스키마 (analytics.jsonl 확장)
```json
{
  "event": "agent_tool_call",
  "ts": "2026-06-01T14:30:01Z",
  "agentId": "architect",
  "toolName": "Read",
  "toolArgs": {"file_path": "lib/analytics.ts"},
  "durationMs": 120,
  "success": true,
  "runId": "run_abc123"
}
```
- `toolArgs` 는 PII 마스킹 적용 (`scripts/pii-mask.mjs` 기존 인프라 활용)
- 대용량 방지: `toolArgs` 값은 200자 truncate

#### 3. Cost Report CLI (`/cost` 커맨드)
- 기간별 (7d/30d/all) 에이전트별 비용 요약
- 모델별 분포 (opus vs sonnet vs haiku vs groq-free)
- 일별 추세 (최근 7일)
- 출력 예시:
  ```
  A-Team Cost Report (last 7d)
  ═══════════════════════════════
  Agent        Cost     Calls   Avg$/call
  coder        $1.23    45      $0.027
  architect    $0.89    12      $0.074
  researcher   $0.45    8       $0.056
  (subagent)   $0.12    30      $0.004
  ─────────────────────────────
  Total        $2.69    95

  Model Distribution
  sonnet-4  .... 62%  ($1.67)
  opus-4    .... 28%  ($0.75)
  haiku     ....  7%  ($0.19)
  groq-free ....  3%  ($0.08)
  ```

#### 4. 기존 session_cost와의 관계
- `session_cost` 이벤트는 유지 (하위 호환)
- `/end` Step 3.5에서 `cost-events.jsonl`을 집계하여 `session_cost.totalCostUsd` 와 cross-check 리포트 출력
- 차이 10% 이상이면 경고 (계측 누락 감지)

### 가정
- Claude Code CLI의 `/usage` 출력에서 토큰 수/비용을 파싱할 수 있다 (현재 `scripts/auto-switch/check-usage.mjs` 가 이미 수행 중)
- 서브에이전트 비용은 서브에이전트 종료 시 메인 에이전트가 수집하여 기록

### 완료 조건
- [ ] `cost-events.jsonl`에 에이전트별 비용 이벤트가 기록됨
- [ ] `/cost` 커맨드로 기간별 리포트 출력 가능
- [ ] 기존 `analytics.jsonl` 의 `session_cost` 이벤트와 공존 (깨지지 않음)
- [ ] `scripts/cost-report.mjs` 에 대한 기본 테스트 1개 이상

### 롤백 방법
- `cost-events.jsonl` 삭제 + `lib/activity-logger.ts` 제거 + `/end` 워크플로우 revert
- 기존 `session_cost` 경로가 그대로 동작하므로 데이터 손실 없음

---

## Phase 2: Heartbeat Run 추적 (3-4일, medium)

### 목표
에이전트 실행 단위(run)를 명시적으로 추적. 시작/종료 시각, 소요 토큰, 종료 사유를 기록하여 "어떤 에이전트가 언제, 얼마나, 왜 멈췄는가"를 사후 분석 가능하게 한다.

### 구현 위치
- `lib/run-tracker.ts` (신규)
- `.context/runs.jsonl` (신규)
- `scripts/run-report.mjs` (신규 — CLI 실행 리포트)
- `.claude/commands/runs.md` (신규 — `/runs` 커맨드)
- `governance/workflows/session-end.md` (수정 — run 종료 기록 추가)
- `.claude/commands/vibe.md` (수정 — 세션 시작 시 run_start 발행)
- `.claude/commands/end.md` (수정 — 세션 종료 시 run_end 발행)

### 핵심 구현 내용

#### 1. Run 레코드 스키마
```json
{
  "runId": "run_20260601_143000_architect",
  "agentId": "architect",
  "startedAt": "2026-06-01T14:30:00Z",
  "endedAt": "2026-06-01T15:45:00Z",
  "durationMin": 75,
  "exitReason": "completed",
  "tokenCostCents": 89,
  "inputTokens": 120000,
  "outputTokens": 35000,
  "toolCalls": 42,
  "repo": "connectome",
  "triggerCommand": "/vibe",
  "parentRunId": null,
  "childRunIds": ["run_20260601_144500_coder"],
  "accountId": "account-1"
}
```

#### 2. Exit Reason 분류 (Paperclip 7종 적응)
| exit_reason | 설명 | A-Team 대응 |
|-------------|------|------------|
| `completed` | 정상 완료 | `/end` 정상 종료 |
| `blocked` | 작업 차단 | CURRENT.md에 BLOCK 기록 후 종료 |
| `budget_exceeded` | 토큰/비용 한도 초과 | auto-switch 발동 또는 수동 정지 |
| `timeout` | 시간 초과 | zzz 모드 만료 |
| `user_interrupt` | 사용자 중단 | Ctrl+C 또는 수동 정지 |
| `error` | 에러 발생 | 예외 발생으로 비정상 종료 |
| `handoff` | 계정 전환 | auto-switch 계정 핸드오프 |

#### 3. Run ID 생성 규칙
- 형식: `run_{YYYYMMDD}_{HHMMSS}_{agentId}`
- 충돌 방지: 같은 초에 동일 에이전트 실행 시 `_2` 접미사
- 서브에이전트는 `parentRunId` 필드로 부모와 연결

#### 4. Run 생명주기 주입 지점
| 시점 | 위치 | 동작 |
|------|------|------|
| 세션 시작 | `/vibe`, `/pickup` 커맨드 | `run_start` 이벤트 발행 + runId 생성 |
| 서브에이전트 시작 | Agent tool 호출 시 | 자식 `run_start` + parentRunId 설정 |
| 세션 종료 | `/end` Step 3.5 이후 | `run_end` 이벤트 발행 + 비용 집계 |
| 비정상 종료 | auto-switch, timeout | `run_end` + exitReason 기록 |

#### 5. /runs 커맨드 출력 예시
```
Recent Runs (last 7d)
═════════════════════
ID                              Agent       Duration  Cost    Exit
run_20260601_143000_architect    architect   75m       $0.89   completed
run_20260601_144500_coder        coder       45m       $0.45   completed
  └─ run_20260601_150000_tdd     tdd         12m       $0.08   completed
run_20260531_220000_zzz          zzz         5h 30m    $2.10   timeout
  └─ run_20260531_230000_coder   coder       2h 15m    $1.20   handoff
```

### 의존성
- Phase 1의 `agentId`, `runId`, `costCents` 필드를 사용

### 완료 조건
- [ ] `/vibe` 또는 `/pickup` 시 `runs.jsonl`에 `run_start` 이벤트 기록
- [ ] `/end` 시 `runs.jsonl`에 `run_end` 이벤트 기록 (duration, exitReason 포함)
- [ ] `/runs` 커맨드로 최근 실행 이력 조회 가능
- [ ] 서브에이전트의 parentRunId 연결 동작 확인

### 롤백 방법
- `runs.jsonl` 삭제 + `lib/run-tracker.ts` 제거
- `/vibe`, `/pickup`, `/end`에서 run 관련 코드 revert
- 기존 `session_start`/`session_end` 이벤트는 변경 없으므로 안전

---

## Phase 3: Atomic Checkout 확장 (2-3일, medium)

### 목표
cortex-dashboard의 `_version`/409 optimistic locking 패턴을 에이전트 태스크 수준으로 확장. "한 번에 하나의 에이전트만 특정 태스크를 작업 중"임을 보장한다.

### 설계 옵션 검토

#### 옵션 A: 파일 기반 락 (lockfile)
- 방법: `.context/locks/{task-id}.lock` 파일 생성/삭제
- 장점: DB 불필요, 단순, 디버깅 쉬움
- 단점: 프로세스 크래시 시 stale lock, 분산 환경 미지원
- 복잡도: low

#### 옵션 B: D1 테이블 확장
- 방법: cortex-dashboard D1에 `task_locks` 테이블 추가
- 장점: atomic UPDATE + WHERE 조건으로 진짜 atomic, 원격 접근 가능
- 단점: cortex-dashboard 배포 필요, 네트워크 의존
- 복잡도: medium

#### 옵션 C: 하이브리드 (로컬 lockfile + D1 동기화)
- 방법: 로컬 작업은 lockfile, 원격 확인은 D1
- 장점: 오프라인 동작 + 분산 보장
- 단점: 두 시스템 동기화 복잡도
- 복잡도: high

#### 권장: 옵션 A (파일 기반 락)
**이유**: A-Team은 1인 운영이며 동시 에이전트 실행은 같은 머신 내에서만 발생한다. 파일 시스템 락으로 충분하며, 복잡한 인프라 추가는 YAGNI 원칙에 위배된다. stale lock은 TTL(30분) + 프로세스 ID 확인으로 해결 가능하다.

### 구현 위치
- `lib/task-lock.ts` (신규)
- `.context/locks/` (신규 디렉토리, gitignored)
- `governance/workflows/todo.md` (수정 — 태스크 체크아웃 시 lock 획득)
- `.gitignore` (수정 — `.context/locks/` 추가)

### 핵심 구현 내용

#### 1. Lock 파일 형식
```json
// .context/locks/task-implement-auth.lock
{
  "taskId": "implement-auth",
  "agentId": "coder",
  "runId": "run_20260601_143000_coder",
  "lockedAt": "2026-06-01T14:30:00Z",
  "pid": 12345,
  "ttlMinutes": 30
}
```

#### 2. API (lib/task-lock.ts)
```
checkout(taskId, agentId, runId) -> { ok: true } | { ok: false, holder: string }
release(taskId, agentId) -> void
isLocked(taskId) -> { locked: boolean, holder?: string }
forceRelease(taskId) -> void  // stale lock 정리용
cleanupStale() -> string[]    // TTL 초과 lock 전부 정리, 정리된 taskId 반환
```

#### 3. 체크아웃 프로토콜
```
1. checkout("task-X", "coder", "run_abc") 호출
2. .context/locks/task-X.lock 존재 확인
   a. 없으면 → lock 파일 생성, OK 반환
   b. 있으면 → TTL 확인
      - 만료됨 → stale lock 삭제, 새 lock 생성, OK 반환
      - 유효함 → pid로 프로세스 생존 확인
        - 프로세스 죽음 → stale lock 삭제, 새 lock 생성, OK 반환
        - 프로세스 살아있음 → REJECT 반환 (holder 정보 포함)
3. 작업 완료/종료 시 release() 호출
```

#### 4. cortex-dashboard D1 기존 패턴과의 관계
- cortex-dashboard의 `_version`/409 패턴은 그대로 유지 (standing-orders, frames 전용)
- 에이전트 태스크 lock은 별도 파일 기반 시스템
- 향후 D1 확장이 필요해지면 옵션 B로 마이그레이션 가능 (task-lock.ts의 인터페이스가 추상화 역할)

### 완료 조건
- [ ] `checkout()` → `release()` happy path 동작
- [ ] 동시 checkout 시도 시 두 번째 호출이 거부됨
- [ ] TTL 만료 lock이 자동 정리됨
- [ ] `/end` 시 해당 runId의 모든 lock 자동 해제
- [ ] `.context/locks/` 가 `.gitignore`에 포함

### 롤백 방법
- `.context/locks/` 디렉토리 삭제 + `lib/task-lock.ts` 제거
- todo.md 워크플로우에서 lock 관련 코드 revert
- 기존 워크플로우에 영향 없음 (lock은 신규 추가 기능)

---

## Phase 4: Skills 디렉토리 구조 체계화 (2일, small)

### 목표
3곳에 분산된 에이전트 가이드 문서(`.claude/commands/`, `.claude/agents/`, `governance/skills/`)에 통합 인덱스와 표준 메타데이터를 부여하여 검색/발견성을 높인다.

### 설계 옵션 검토

#### 옵션 A: 물리적 디렉토리 통합 (전부 governance/skills/로 이동)
- 장점: 단일 위치
- 단점: Claude Code CLI가 `.claude/commands/`를 기대함. 대규모 마이그레이션 위험
- 복잡도: high

#### 옵션 B: 인덱스 파일 + 메타데이터 표준화 (물리 위치 유지)
- 장점: 기존 구조 변경 없음, 점진적 적용 가능
- 단점: 인덱스 파일 동기화 필요
- 복잡도: low

#### 옵션 C: 자동 생성 인덱스 스크립트
- 장점: 수동 동기화 불필요
- 단점: 스크립트 유지보수 비용
- 복잡도: medium

#### 권장: 옵션 B + C 혼합
**이유**: 물리적 이동은 Claude Code CLI 호환성 파괴 위험이 크다. 인덱스 파일을 수동 관리하되, `/end` 또는 `/pmi` 시 자동 검증 스크립트로 drift를 감지한다.

### 구현 위치
- `governance/skills/SKILL-INDEX.md` (신규 — 통합 인덱스)
- `governance/skills/SKILL-SCHEMA.md` (신규 — 메타데이터 표준 정의)
- `.claude/agents/README.md` (수정 — 인덱스 참조 추가)
- `scripts/verify-skill-index.mjs` (신규 — 인덱스 정합성 검증)

### 핵심 구현 내용

#### 1. 스킬 메타데이터 표준 (SKILL-SCHEMA.md)
모든 SKILL.md 파일의 frontmatter 표준:
```yaml
---
name: "Add Provider"                    # 필수
description: "새 AI 서비스 프로바이더 추가"  # 필수
category: "engineering"                  # 필수: engineering | operations | marketing | design | intelligence
agent: "coder"                          # 연결된 에이전트 (없으면 "any")
trigger: "/add-provider"                 # CLI 트리거 (없으면 수동)
complexity: "medium"                     # low | medium | high
dependencies: ["e2e-test"]              # 선행 스킬 (없으면 빈 배열)
last_verified: "2026-05-15"             # 마지막 검증일
---
```

#### 2. 통합 인덱스 (SKILL-INDEX.md)
```markdown
# A-Team Skill Index

> 자동 검증: `node scripts/verify-skill-index.mjs`
> 마지막 검증: 2026-06-01

## Engineering
| Skill | Location | Agent | Trigger | Complexity |
|-------|----------|-------|---------|------------|
| Add Provider | governance/skills/add-provider/ | coder | manual | medium |
| E2E Test | governance/skills/e2e-test/ | qa | /benchmark | medium |
| TDD | .claude/agents/tdd.md | tdd | /tdd | medium |
| ...

## Operations
| Skill | Location | Agent | Trigger | Complexity |
| Auto-Sync | governance/skills/auto-sync/ | daemon | auto | low |
| ...

## Marketing
...

## Design
...

## Intelligence
...
```

#### 3. 검증 스크립트 (verify-skill-index.mjs)
기능:
- `governance/skills/*/SKILL.md`, `.claude/agents/*.md`, `.claude/commands/*.md` 전체 스캔
- frontmatter 파싱하여 필수 필드 존재 확인
- SKILL-INDEX.md와 대조하여 누락/불일치 보고
- 신규 파일 감지 시 인덱스 추가 제안 출력

실행 시점:
- `/end` Step 3.7 (Post-Integration 검사) 에서 자동 호출
- `/pmi` 커맨드에서 호출

#### 4. 기존 파일 마이그레이션 계획
- Phase 4 초기: `governance/skills/` 내 기존 6개 SKILL.md에 frontmatter 추가
- Phase 4 완료 후: `.claude/agents/` 내 주요 에이전트 10개에 frontmatter 추가 (점진적)
- `.claude/commands/`는 Claude Code CLI 구조 유지 (frontmatter 추가만)

### 완료 조건
- [ ] SKILL-INDEX.md 생성, 기존 스킬 전부 등록
- [ ] `governance/skills/` 내 모든 SKILL.md에 표준 frontmatter 적용
- [ ] `verify-skill-index.mjs` 실행 시 0 errors
- [ ] `/end` Step 3.7에서 스킬 인덱스 검증 자동 호출

### 롤백 방법
- SKILL-INDEX.md, SKILL-SCHEMA.md, verify-skill-index.mjs 삭제
- 기존 SKILL.md의 frontmatter는 제거해도 되고 남겨도 무해 (단순 메타데이터)
- `/end` 워크플로우 수정 revert

---

## 전체 타임라인 요약

```
Week 1:  Phase 0 (1d) → Phase 1 시작 (3-4d)
Week 2:  Phase 1 완료 → Phase 2 시작 (3-4d)
         Phase 4 병렬 시작 (2d)  ← Phase 1/2와 독립
Week 3:  Phase 2 완료 → Phase 3 시작 (2-3d)
         Phase 4 완료
Week 3~4: Phase 3 완료 → 전체 통합 테스트
```

총 예상 기간: **10-14일** (1인 운영 기준, 병렬 진행 시)

## 리스크

| 리스크 | 심각도 | 완화 전략 |
|--------|--------|----------|
| JSONL 파일 크기 증가 (agent_tool_call 이벤트 대량) | 중 | 30일 이상 로그 자동 아카이브 (`scripts/log-rotate.mjs` 신규) |
| `/usage` 파싱 의존 — Claude Code CLI 출력 형식 변경 시 비용 추적 불가 | 중 | 파싱 실패 시 graceful degrade (비용 0으로 기록 + 경고) |
| 기존 워크플로우 (60+ 커맨드) 수정 누락 | 저 | Phase별 영향받는 커맨드 목록 명시, `/pmi`로 사후 검증 |
| stale lockfile 축적 | 저 | `/vibe` 세션 시작 시 `cleanupStale()` 자동 호출 |
| SKILL-INDEX.md가 outdated 되는 drift | 저 | `/end`에서 자동 검증, drift 감지 시 경고 출력 |

## 성공 기준 (전체 로드맵 완료 시)

1. **비용 가시성**: `/cost 7d` 실행 시 에이전트별/모델별 비용 분포를 즉시 확인 가능
2. **실행 추적**: `/runs` 실행 시 최근 7일 에이전트 실행 이력 (시작/종료/비용/사유) 조회 가능
3. **동시성 보호**: 동일 태스크에 2개 에이전트 동시 작업 시도 시 두 번째가 명시적 거부당함
4. **스킬 발견성**: SKILL-INDEX.md에서 카테고리별 전체 스킬 조회 가능, 검증 스크립트 0 errors
5. **하위 호환성**: 기존 `analytics.jsonl`, `session_cost`, cortex-dashboard 패턴 전부 깨지지 않음
6. **롤백 용이성**: 각 Phase를 독립적으로 revert 가능 (Phase 간 의존성은 additive only)

---

## 참조

- Paperclip 저장소: [github.com/paperclipai/paperclip](https://github.com/paperclipai/paperclip)
- Paperclip Heartbeat Protocol: [heartbeat-protocol.md](https://github.com/paperclipai/paperclip/blob/master/docs/guides/agent-developer/heartbeat-protocol.md)
- Paperclip PRODUCT.md: [PRODUCT.md](https://github.com/paperclipai/paperclip/blob/master/doc/PRODUCT.md)
- A-Team 기존 analytics: `lib/analytics.ts`, `lib/analytics-schema.json`
- A-Team cortex-dashboard optimistic locking: `scripts/cortex-dashboard/worker/src/index.js` (L359-402)
