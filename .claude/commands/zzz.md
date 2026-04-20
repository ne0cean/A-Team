---
description: /zzz — 풀 오토 수면 모드 (하던 작업을 이어서 계속, 토큰 리셋 자동 이어받기)
---

# /zzz — 풀 오토 수면 모드

> **트리거**: "자러 간다", "잘게", "주무세요", "풀자동 밤새" + 랄프/자율 키워드. 또는 수동 `/zzz`.
> **약속**: **지금 진행 중인 작업을 그대로 이어서 계속**. 질문 0, 나레이션 0, 토큰 소진까지 진행. 리셋되면 자동 이어받기. 아침에 결과만 확인.
> **의존성**: `governance/rules/autonomous-loop.md` 강제 조항 1-6 전부 준수.

> **철학**: 사용자는 자러 가고 싶다. **맡겨둘 대상 = 지금까지 하던 그 일**. 새 태스크 큐를 짜는 게 아니라, 진행 중이던 대화·작업을 계속. 토큰 떨어지면 상태 저장하고 리셋 대기.

> **참고**: 과거 `/sleep` + `/overnight` 통합. 이전 버전은 "새 태스크 큐 디스패처"였으나 2026-04-20 "진행 중 작업 이어받기"로 재설계. 주간 리셋 대비만 필요하면 `/resume`.

---

## 자동 트리거 감지

사용자 메시지에 다음 조합 시 **확인 없이 진입**:

| 수면 의도 | 자율 의도 |
|---|---|
| "자러간다" / "자러 갈게" / "잘게" | "랄프 모드" / "자동으로" |
| "주무세요" / "나 잔다" | "묻지 말고" / "풀자동" |
| "컴퓨터 앞에 없을거" | "알아서 해" / "이어서 해" / "맡겨두고" |

→ 양쪽 1개씩 이상 = **zzz mode 진입**.

## 수동 호출

```
/zzz
```

인자 없이 단독 호출. 현재 대화·진행 작업의 **연속**이므로 태스크 명시 불필요. 예외:
- `/zzz --fresh <태스크>` — 현재 대화 상태 무시하고 새 태스크로 시작 (구 모드 호환, 드물게 사용)
- `/zzz --check` — 진입 전 infra (launchd/auth/git) 상태만 점검 후 즉시 종료

---

## 진입 절차 (단순함이 핵심)

### Step 1 — 인프라 체크 (5초 이내, 실패 시 중단)

```bash
# A. launchd job 존재 확인
launchctl list | grep com.ateam.sleep-resume || \
  bash scripts/install-sleep-cron.sh install "every 2m"

# B. Lock 정리
rm -f ~/.ateam-sleep-locks/last-success ~/.ateam-sleep-locks/running.pid

# C. Claude CLI auth (haiku 핑)
claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3
# "hit your limit" / "not authenticated" → 경고 + 중단
```

실패 시 구체 원인 + 복구 명령 1회 출력 후 종료. 계속 진행 강제 금지.

### Step 2 — Reset Time 확보 (3단 폴백)

1. 사용자 명시 ("3시에 리셋") → 자연어 파싱
2. 대화에 `/usage` 출력 패턴 있으면 grep
3. 기본값: 5시간 후

### Step 3 — RESUME.md 작성 (현재 상태 스냅샷)

**핵심: 새 큐가 아니라 "지금 이 대화"의 연속성 보존**.

```markdown
---
mode: zzz
entered_at: <ISO8601>
next_reset_at: <ISO8601>
contract: autonomous-loop.md v2026-04-15 (강제 조항 1-7)
narration_budget_bytes: 500
status: in_progress
session_goal: "<이 대화의 최상위 목표 1-2문장, 사용자가 현재 요청한 작업>"
---

## 이어받기 방식

이전 Claude(=지금 이 세션)가 **하던 작업을 그대로 계속**하는 모드. 새 태스크 큐 아님.

## In Progress
- [ ] <현재 이 대화에서 진행 중이던 것. 예: "x 파일 y 함수 리팩토링 중, 3단계 중 2단계 완료">

## Completed This Session
- [x] <이미 커밋한 것들 SHA + 한 줄>
- [x] <이 세션의 성공 분기들>

## Next Immediate Step
<다음에 바로 해야 할 1개 액션. 파일 경로·명령까지 구체적으로>

## Files Touched
<이 세션에서 건드린 파일 경로 목록>

## Resume
`/pickup` 자동 주입됨. 이 RESUME.md의 In Progress부터 바로 이어서 실행.
```

### Step 4 — 재귀 CronCreate + launchd 백업

```
CronCreate(
  cron: "<reset+2min>",
  durable: true,
  recurring: false,
  prompt: "/pickup"
)
```

OS-level launchd는 이미 Step 1에서 확보. CronCreate는 세션 기반 보조.

### Step 5 — 1회 한 줄 요약 + 즉시 작업 재개

```
🌙 zzz 모드 진입
   다음 리셋: <HH:MM>
   진행: <session_goal>
```

이후 **묻지 말고 하던 작업 계속**. 단 출력은 `narration_budget_bytes: 500` 준수.

---

## 진행 중 동작

### Step 6 — 토큰 소진까지 무정지

**강제 조항** (autonomous-loop.md 조항 6):
1. 모든 사용자 대상 텍스트 ≤ 500 bytes 총량
2. 질문 금지, 경계 선언 금지, 인사 금지
3. 매 commit 직후 RESUME.md `Completed This Session` 갱신
4. `Next Immediate Step` 매번 갱신 (최신 상태 반영)
5. 확신 없는 판단 등장 → 보수적 선택 + RESUME.md의 `Blockers` 섹션에 기록, 전체 중단 금지

### Step 7 — 토큰 한계 근접 감지

휴리스틱: Bash `date +%s` vs `entered_at` 차이, 커밋 횟수, 마지막 응답 길이.

근접 시:
1. 현재 진행 중 작업 결과물 commit + push
2. RESUME.md 최종 업데이트 (마지막 상태)
3. 세션 종료 (크론이 이어받음)

### Step 8 — `/pickup` (크론 또는 launchd가 깨움)

1. RESUME.md Read → `mode: zzz` + `status != completed` 확인
2. `governance/rules/autonomous-loop.md` 재확인 (Read)
3. `Completed This Session` 중복 실행 금지
4. `In Progress` 또는 `Next Immediate Step`부터 바로 실행
5. 다음 리셋 +2min에 CronCreate 재등록
6. Step 6으로 복귀

**종료 조건**:
- `session_goal` 달성 → `status: completed` + 크론 취소 + CURRENT.md 갱신
- 사용자 재개 ("이제 그만", "수고했어") → 정리 종료

---

## Step 9 — 아침 보고 (사용자 재개 시)

**최종 1회 요약, ≤ 10줄**:
- 경과 시간, cycle 수, commit 수
- 완료된 것 (session_goal 진행률)
- 차단된 것 있으면 최상단
- 다음에 뭘 하면 되는지 1줄

---

## 계정 자동 전환 (a-team 글로벌 엔진)

OAuth 계정 ≥ 2개 등록되어 있고 `com.ateam.auto-switch` launchd job이 설치된 경우, zzz 모드와 **독립적으로** 60초마다 감시. 활성 계정 usage ≥ 96% 도달 시:

1. a-team 엔진이 전환 후보 판정 (다른 계정 usage < 80% 확인)
2. claude-remote 서버 살아있으면 PTY 기반 실시간 전환, 없으면 Telegram 수동 알림
3. 서버 경로: autosave 프롬프트 주입 → `READY_TO_SWITCH` 마커 대기 (180s) → keychain swap → `/pickup` 주입
4. zzz 모드는 전환 과정 동안 `mode: zzz` 유지, pickup 시 이어서 진행

zzz 모드에서 autosave 프롬프트 수신 시 Claude는:
- RESUME.md에 현재 상태 저장 (In Progress + Next Immediate Step)
- `git add -A && git commit -m "chore(auto-switch): snapshot before account switch"`
- 마지막 줄 단독 `READY_TO_SWITCH` 출력

자세한 계약: `governance/rules/auto-switch-protocol.md`

설치: `bash scripts/install-auto-switch-cron.sh install`

---

## 실패 모드

| 시나리오 | 처리 |
|---|---|
| 크론 소멸 + 사용자 아침 귀환 없음 | 다음 `/vibe` 에서 RESUME.md 감지 → 제안 |
| 토큰 한계 직전 커밋 실패 | RESUME.md에 uncommitted 플래그 → 크론이 복구 |
| 작업 중 에러 | 2회 재시도 → 실패 시 RESUME.md `Blockers` 기록 + 다음 안전 단계 진행 |
| 2회 연속 wake에서 진전 없음 | 자동 종료 + 사용자 보고 대기 |
| launchd 설치 실패 | 수동 `bash scripts/install-sleep-cron.sh install "every 2m"` 안내 |
| Claude CLI 인증 실패 | `claude login` 또는 `/web-setup` 안내, 세팅 중단 |
| RESUME.md 이미 `status: in_progress` | "진행 중 세션 존재. 이어받을까요? `/zzz --continue` 또는 `/zzz --force`" |

---

## 원칙

1. **연속성 우선**: 사용자가 "맡겨두고 잘게"라 했을 때 맡기는 대상 = 지금 하던 일. 새 큐 아님.
2. **실행 계약 강제 주입**: autonomous-loop.md 조항 매번 재확인
3. **단일 진입**: `/zzz` 한 줄. 태스크 명시 불필요
4. **검증 우선**: infra 문제 시 세팅 중단 (false reassurance 방지)
5. **솔직한 한계**: laptop sleep 중엔 launchd catch-up 보장 안 됨. 사용자에게 미리 안내

---

## `/zzz --fresh` 모드 (예외)

현재 대화와 **무관한** 태스크로 시작해야 할 때만 사용. 구 `/overnight`의 "auto 모드" 포팅:

```
/zzz --fresh CURRENT.md Next Tasks 중 안전한 것만 처리
```

CURRENT.md Next Tasks 파싱 → 안전 키워드 필터 → Ralph/Research 데몬 디스패치. 기본 `/zzz`와 달리 현재 대화 컨텍스트를 버리고 새 큐 실행. 이 경로는 세션 상태가 비어있거나 명시적 새 작업이 필요할 때만.

안전 키워드: `rule`, `test`, `doc`, `refactor`, `lint`, `cleanup`
불안전 제외: `prod`, `deploy`, `force`, `drop`, `migrate`, `설계`, `선택`

---

## 관계도

```
/zzz (기본: 하던 거 이어서 계속)
├── RESUME.md 현재 대화 스냅샷
├── CronCreate + launchd 재개 설정
├── 나레이션 0 계약 (autonomous-loop.md 조항 6)
└── 토큰 소진 → 자동 저장 → 리셋 대기 → /pickup 자동

/zzz --fresh (예외: 새 태스크 큐)
└── Ralph/Research 데몬 디스패치

/resume (리셋 재개만, 주간/단기)
└── CronCreate + RESUME.md, 자율 작업 없음

/pickup (재개 실행, 모든 경로 공통)
└── RESUME.md 읽고 In Progress부터 즉시 실행
```

**수면 의도가 있을 때 `/zzz`가 상위 진입**. 없으면 `/resume`로 충분.
