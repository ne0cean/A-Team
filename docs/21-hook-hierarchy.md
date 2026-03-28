# 21. 훅 계층 구조 & 자동화 아키텍처

> 모든 자동 트리거의 계위, 실행 시점, 의존성을 정의합니다.
> Hook 동작 이상 시 이 문서를 먼저 확인하세요.

---

## 전체 자동화 계층도

```
┌─────────────────────────────────────────────────────┐
│  Tier 0: 세션 라이프사이클 (완전 자동)                  │
│  ┌─────────────────────────────────────────────────┐ │
│  │ SessionStart[startup] → /vibe 자동 실행          │ │
│  │ SessionStart[resume]  → /pickup 자동 실행        │ │
│  │ PreCompact[auto]      → 상태 저장 + 자동 커밋     │ │
│  │ Stop[*]               → 압축 후 자동 재개         │ │
│  └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Tier 1: 활동 추적 (패시브)                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │ PostToolUse[*] → research-activity-track         │ │
│  │ Stop[*]        → research-activity-track         │ │
│  └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Tier 2: 에이전트 내부 자동화 (orchestrator 관할)       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Phase 2.0  → 패턴 자동 선택 (❶~❻)               │ │
│  │ Phase 3.5  → 디스패치 프롬프트 생성                │ │
│  │ Phase 5    → reviewer 자동 호출 조건 감지          │ │
│  │ Phase 5.5  → 디스패치 머지                        │ │
│  └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Tier 3: 백그라운드 데몬 (독립 프로세스)                │
│  ┌─────────────────────────────────────────────────┐ │
│  │ research-daemon.mjs → 유휴 10분 후 자율 리서치    │ │
│  │   ← last-activity.txt (Tier 1이 갱신)            │ │
│  └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Tier 4: 수동 커맨드 (사용자 의도 필요)                 │
│  ┌─────────────────────────────────────────────────┐ │
│  │ /end    → 세션 정리 + push (의식적 종료)          │ │
│  │ /ship   → PR 생성 + 배포 (배포 결정)              │ │
│  │ /review → 코드 리뷰 (수동 트리거)                  │ │
│  │ /vibe   → 컨텍스트 강제 리로드 (재분류 필요 시)      │ │
│  │ /re     → 리서치 데몬 제어                        │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Tier 0: 세션 라이프사이클 (완전 자동)

### SessionStart[startup] — 새 세션 시작
| 항목 | 값 |
|------|-----|
| **파일** | `~/.claude/hooks/auto-session-start.sh` |
| **시점** | 새 Claude Code 세션이 시작될 때 |
| **동작** | CURRENT.md + DECISIONS.md + git status + 리서치 노트 → 컨텍스트 주입 |
| **대체** | `/vibe` Step 0~3 자동화 |
| **출력** | stdout → Claude 컨텍스트에 삽입 (태스크 분류 + 실행 모드 판단 지시 포함) |

### SessionStart[resume] — 세션 재개
| 항목 | 값 |
|------|-----|
| **파일** | `~/.claude/hooks/auto-session-start.sh` |
| **시점** | 토큰 소진 후 같은 세션 재개 시 |
| **동작** | CURRENT.md + compact-state.json → 중단 지점 복원 |
| **대체** | `/pickup` 전체 자동화 |

### PreCompact[auto] — 컨텍스트 압축 전
| 항목 | 값 |
|------|-----|
| **파일** | `~/.claude/hooks/auto-commit-on-compact.sh` |
| **시점** | 자동 컨텍스트 압축 직전 |
| **동작** | ① 수정 중 파일 스냅샷(.compact-state.json) ② git add + commit ③ resume 파일 저장 |
| **의존** | → Stop 훅에서 resume 파일 사용, → SessionStart[resume]에서 compact-state 사용 |

### Stop[*] — Claude 응답 종료 후
| 항목 | 값 |
|------|-----|
| **파일** | `~/.claude/hooks/auto-resume-after-compact.sh` |
| **시점** | Claude가 응답을 마칠 때마다 (압축 후 포함) |
| **동작** | resume 파일 존재 시 → CURRENT.md + compact-state 읽어 `decision: block`으로 자동 재개 |
| **조건** | resume 파일 없으면 스킵 (일반 Stop은 통과) |

---

## Tier 1: 활동 추적 (패시브)

### PostToolUse[*] + Stop[*] — 리서치 데몬용 활동 추적
| 항목 | 값 |
|------|-----|
| **파일** | `~/.claude/hooks/research-activity-track.sh` |
| **시점** | 매 도구 사용 후 + 세션 종료 시 |
| **동작** | `.research/last-activity.txt`에 현재 타임스탬프(epoch) 기록 |
| **소비자** | research-daemon.mjs가 폴링하여 유휴 시간 계산 |

---

## Tier 2: 에이전트 내부 자동화

orchestrator가 Phase 실행 중 자동으로 트리거하는 행동들:

| Phase | 트리거 조건 | 동작 |
|-------|-----------|------|
| **2.0** | 태스크 분석 완료 | 에이전트 수 + 작업 유형 → 패턴 ❶~❻ 자동 선택 |
| **3.5** | ❸/❹ 패턴 선택 시 | dispatch 프롬프트 생성 + dispatch.sh 실행 |
| **5** (reviewer) | 10개+ 파일 변경 / 보안 키워드 / 빌드 2회 실패 | reviewer 에이전트 자동 호출 |
| **5.5** | ❸/❹ 패턴 디스패치 완료 | merge-dispatch.sh로 브랜치 머지 |

---

## Tier 3: 백그라운드 데몬

### research-daemon.mjs
| 항목 | 값 |
|------|-----|
| **시작** | `/re start` (수동) |
| **폴링** | 60초마다 `last-activity.txt` 확인 |
| **활성화** | 유휴 10분 이상 감지 시 |
| **동작** | 7개 카테고리 순환 리서치 → `.research/notes/` 저장 |
| **예산** | $0.50/사이클, $3.50/세션 |
| **쿨다운** | 사이클 완료 후 25분 |

---

## 이벤트 흐름도

```
═══ 새 세션 시작 ═══
SessionStart[startup]
    → auto-session-start.sh
    → CURRENT.md + git status + 리서치 노트 주입
    → Claude가 태스크 분류 + 실행 모드 판단 후 즉시 시작

═══ 작업 중 ═══
PostToolUse → research-activity-track.sh → last-activity.txt 갱신
    (10분 유휴 시 → research-daemon 활성화)

═══ 컨텍스트 압축 ═══
PreCompact[auto]
    → auto-commit-on-compact.sh
    → ① .compact-state.json 저장
    → ② git add -A && commit
    → ③ resume-{SESSION_ID}.txt 저장
    ↓
[압축 실행]
    ↓
Stop
    → auto-resume-after-compact.sh
    → resume 파일 + compact-state.json 읽기
    → decision: block → Claude 자동 재개

═══ 토큰 소진 후 재개 ═══
SessionStart[resume]
    → auto-session-start.sh (resume 모드)
    → CURRENT.md + compact-state.json → 중단 지점 복원

═══ 의식적 세션 종료 ═══
사용자: /end
    → CURRENT.md 갱신 + SESSIONS.md + 빌드 검증 + 커밋 + push
```

---

## 훅 설정 위치

| 파일 | 역할 |
|------|------|
| `~/.claude/settings.json` (hooks 섹션) | 이벤트 → 훅 매핑 |
| `~/.claude/hooks/auto-session-start.sh` | SessionStart 핸들러 |
| `~/.claude/hooks/auto-commit-on-compact.sh` | PreCompact 핸들러 |
| `~/.claude/hooks/auto-resume-after-compact.sh` | Stop 핸들러 (압축 재개) |
| `~/.claude/hooks/research-activity-track.sh` | PostToolUse/Stop 핸들러 |

---

## 수동 → 자동 전환 맵

| 이전 (수동) | 이후 (자동) | 수동 잔존 용도 |
|------------|-----------|--------------|
| `/vibe` | SessionStart[startup] | 컨텍스트 강제 리로드 |
| `/pickup` | SessionStart[resume] | 자동 재개 실패 시 수동 복구 |
| git commit (수동) | PreCompact[auto] | 의식적 커밋은 `/end` 사용 |
| 컨텍스트 복원 (수동) | Stop[auto-resume] | — |

---

## 확장 가능한 훅 이벤트 (미사용)

향후 필요 시 활성화할 수 있는 이벤트:

| 이벤트 | 용도 | 우선순위 |
|--------|------|---------|
| `PreToolUse[Bash]` | 위험 명령 사전 차단 | MEDIUM |
| `SubagentStop` | 서브에이전트 완료 시 자동 결과 취합 | LOW |
| `Notification` | 데스크톱 알림 (Claude 대기 중) | LOW |
| `FileChanged` | .envrc 변경 감지 → 환경 자동 리로드 | LOW |
| `PostCompact` | 압축 후 핵심 거버넌스 재주입 | MEDIUM |
