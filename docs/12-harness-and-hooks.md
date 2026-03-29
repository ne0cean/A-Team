# 12. 하네스 엔지니어링 & 훅 계층

> "The model contains the intelligence; the harness makes that intelligence useful."

**하네스 엔지니어링 = AI 에이전트를 위한 결정론적 제어 레이어**

Claude Code의 훅 시스템을 활용해 LLM이 *선택*하는 것이 아니라 *항상 보장*되는 동작을 만든다.

---

## Part 1: 아키텍처

```
사용자 요청
    ↓
[UserPromptSubmit Hook]  ← 컨텍스트 주입 (선택)
    ↓
Claude 처리
    ↓
[PreToolUse Hook]        ← 실행 전 검증 (차단/허용/수정)
    ├─ Bash → pre-bash.sh   : 위험 명령 차단
    └─ Write|Edit → pre-write.sh : 민감 파일 보호
    ↓
도구 실행
    ↓
[PostToolUse Hook]       ← 실행 후 반응 (빌드 플래그 등)
    ↓
Claude 완료 신호
    ↓
[Stop Hook]              ← 완료 게이트 (빌드 검증 필수)
    └─ stop-check.sh : npm run build 강제 실행
    ↓
세션 종료
    ↓
[Notification Hook]      ← 감사 로그 (session.log)
```

### 훅 이벤트 전체 목록

| 이벤트 | 타이밍 | 주요 용도 | 차단 가능 |
|--------|--------|-----------|---------|
| `PreToolUse` | 도구 실행 전 | 보안 검사, 파일 소유권 검증 | Yes |
| `PostToolUse` | 도구 실행 후 | 빌드 플래그, 로그 기록 | No |
| `Stop` | 세션 종료 시도 시 | 빌드 검증, 완료 확인 | Yes |
| `SubagentStop` | 서브에이전트 종료 시 | 서브에이전트 DoD 검증 | Yes |
| `Notification` | Claude 알림 시 | 감사 로그 | No |
| `SessionStart` | 세션 시작 시 | 환경 감지, 컨텍스트 로드 | No |
| `UserPromptSubmit` | 사용자 입력 시 | 컨텍스트 주입, 프롬프트 강화 | Yes |
| `PreCompact` | 컨텍스트 압축 전 | 중요 상태 저장 | No |

### 훅 출력 포맷

- **차단 (exit 2):** `printf '{"decision":"block","reason":"설명"}\n' >&2; exit 2`
- **허용 + 메시지 (exit 0):** `printf '{"systemMessage":"메시지"}\n'; exit 0`
- **도구 입력 수정 (PreToolUse):** `printf '{"hookSpecificOutput":{"permissionDecision":"allow","updatedInput":{...}}}\n'; exit 0`

---

## Part 2: 구현된 훅

### 1. pre-bash.sh — 위험 명령 차단 (PreToolUse/Bash)
**차단:** 재귀 삭제(rm -rf), 강제 리셋(git reset --hard), 강제 푸시, DB 삭제(DROP TABLE/DATABASE), 디스크 포맷, Fork 폭탄

**경고 (차단 없이 메시지):** git push, npm publish, vercel deploy, railway up

### 2. pre-write.sh — 민감 파일 보호 (PreToolUse/Write|Edit)
**절대 차단:** .env*, SSH/SSL 키(id_rsa, *.pem), 인증 파일(credentials.json), git 내부 구조

**주의 메시지:** auth*, middleware*, crypto*, jwt*, token* 포함 파일

**PARALLEL_PLAN.md 소유권 검사:** 활성 플랜 존재 시 에이전트 파일 소유권 알림

### 3. stop-check.sh — 빌드 검증 게이트 (Stop)
1. git diff로 변경된 JS/TS/CSS 파일 감지
2. 클라이언트 변경 -> npm run build, 서버 변경 -> node --check server.js
3. 빌드 실패 -> exit 2 -> Claude가 수정 -> 재검증

### 4. notify-log.sh — 감사 로그 (Notification)
모든 알림을 .claude/session.log에 타임스탬프와 함께 기록

---

## Part 3: 훅 계층 구조 (Tier 0~4)

```
Tier 0: 세션 라이프사이클 (완전 자동)
  SessionStart[startup] -> /vibe 자동 실행
  SessionStart[resume]  -> /pickup 자동 실행
  PreCompact[auto]      -> 상태 저장 + 자동 커밋
  Stop[*]               -> 압축 후 자동 재개

Tier 1: 활동 추적 (패시브)
  PostToolUse/Stop -> research-activity-track

Tier 2: 에이전트 내부 자동화 (orchestrator 관할)
  Phase 2.0->패턴선택, 3.5->디스패치, 5->리뷰어, 5.5->머지

Tier 3: 백그라운드 데몬 (독립 프로세스)
  research-daemon.mjs -> 유휴 10분 후 자율 리서치

Tier 4: 수동 커맨드 (사용자 의도 필요)
  /end /ship /review /vibe /re
```

### Tier 0: 세션 라이프사이클

| 훅 | 파일 | 동작 |
|----|------|------|
| SessionStart[startup] | auto-session-start.sh | CURRENT.md + git status + 리서치 노트 -> 컨텍스트 주입 |
| SessionStart[resume] | auto-session-start.sh | CURRENT.md + compact-state.json -> 중단 지점 복원 |
| PreCompact[auto] | auto-commit-on-compact.sh | .compact-state.json 저장 + git commit + resume 파일 |
| Stop[*] | auto-resume-after-compact.sh | resume 파일 존재 시 -> decision: block -> 자동 재개 |

### Tier 1: 활동 추적

| 훅 | 파일 | 동작 |
|----|------|------|
| PostToolUse + Stop | research-activity-track.sh | .research/last-activity.txt에 타임스탬프 기록 |

### Tier 2: 에이전트 내부 자동화

| Phase | 트리거 | 동작 |
|-------|--------|------|
| 2.0 | 태스크 분석 완료 | 패턴 1~6 자동 선택 |
| 3.5 | 배치/팀 패턴 선택 시 | dispatch 프롬프트 생성 + dispatch.sh |
| 5 | 10개+ 파일/보안/빌드 2회 실패 | reviewer 자동 호출 |
| 5.5 | 배치/팀 디스패치 완료 | merge-dispatch.sh 머지 |

### Tier 3: 백그라운드 데몬

| 항목 | 값 |
|------|-----|
| 시작 | /re start |
| 폴링 | 60초마다 last-activity.txt |
| 활성화 | 유휴 10분+ |
| 동작 | 7개 카테고리 순환 리서치 -> .research/notes/ |
| 예산 | $0.50/사이클, $3.50/세션 |

---

## Part 4: 이벤트 흐름도

```
=== 새 세션 ===
SessionStart[startup] -> 컨텍스트 주입 -> 즉시 시작

=== 작업 중 ===
PostToolUse -> activity-track -> last-activity.txt
    (10분 유휴 -> research-daemon 활성화)

=== 컨텍스트 압축 ===
PreCompact -> compact-state + git commit + resume 파일
    |
Stop -> resume 파일 감지 -> decision: block -> 자동 재개

=== 토큰 소진 재개 ===
SessionStart[resume] -> compact-state -> 중단 지점 복원

=== 의식적 종료 ===
/end -> CURRENT.md 갱신 + 빌드 검증 + 커밋 + push
```

---

## Part 5: 설정 및 확장

### 훅 설정 위치

| 파일 | 역할 |
|------|------|
| ~/.claude/settings.json (hooks) | 이벤트 -> 훅 매핑 |
| ~/.claude/hooks/auto-session-start.sh | SessionStart |
| ~/.claude/hooks/auto-commit-on-compact.sh | PreCompact |
| ~/.claude/hooks/auto-resume-after-compact.sh | Stop (재개) |
| ~/.claude/hooks/research-activity-track.sh | PostToolUse/Stop |

### 수동에서 자동 전환 맵

| 이전 (수동) | 이후 (자동) | 수동 잔존 용도 |
|------------|-----------|--------------|
| /vibe | SessionStart[startup] | 컨텍스트 강제 리로드 |
| /pickup | SessionStart[resume] | 자동 재개 실패 시 수동 복구 |
| git commit | PreCompact[auto] | 의식적 커밋은 /end |
| 컨텍스트 복원 | Stop[auto-resume] | -- |

### 확장 가능한 훅 (미사용)

| 이벤트 | 용도 | 우선순위 |
|--------|------|---------|
| SubagentStop | 서브에이전트 결과 자동 취합 | LOW |
| PostCompact | 압축 후 핵심 거버넌스 재주입 | MEDIUM |

### 신규 프로젝트 적용

```
bash A-Team/templates/init.sh my-project ./A-Team
```

---

## 레퍼런스

| 소스 | 설명 |
|------|------|
| Anthropic 공식 가이드 | Effective Harnesses for Long-Running Agents |
| disler/claude-code-hooks-mastery | 실전 훅 패턴 모음 |
| coleam00/your-claude-engineer | 완전한 소프트웨어 엔지니어 하네스 |
| hesreallyhim/awesome-claude-code | 훅/스킬/에이전트 큐레이션 |
