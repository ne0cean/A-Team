# /zzz 상세 프로토콜

> 이 파일은 `/zzz` 커맨드의 상세 구현 가이드. 커맨드에서 `Read governance/rules/zzz-detail.md`로 참조.

## Step 0 — CLI Skip-Permissions 검증

권한 시스템 3계층:

| 계층 | 패턴 예시 | 막는 방법 |
|------|-----------|-----------|
| 1. 단일 Bash | `npm test` | `bypassPermissions` 또는 allowlist |
| 2. 복합 Bash | `cmd \| head`, `a && b` | prefix-wildcard `Bash(prefix-text:*)` 또는 CLI `--dangerously-skip-permissions` |
| 3. WebFetch | `https://example.com` | 도메인 정확 매칭 `WebFetch(domain:example.com)`. 와일드카드 미작동. |

### 검증 스크립트

```bash
node scripts/log-event.mjs command_start name=zzz
PID=$$
CLAUDE_ARGS=""
for _ in 1 2 3 4 5 6; do
  PARENT=$(ps -p "$PID" -o ppid= 2>/dev/null | tr -d ' ')
  [ -z "$PARENT" ] || [ "$PARENT" = "0" ] || [ "$PARENT" = "1" ] && break
  ARGS=$(ps -o args= -p "$PARENT" 2>/dev/null)
  if echo "$ARGS" | grep -qE "(^|\/)claude(\s|$)"; then
    CLAUDE_ARGS="$ARGS"
    break
  fi
  PID=$PARENT
done

echo "$CLAUDE_ARGS" | grep -qE -- "--dangerously-skip-permissions|--permission-mode bypassPermissions" || \
  [ "${CLAUDE_CODE_DANGEROUSLY_SKIP_PERMISSIONS:-}" = "1" ]
```

IDE 감지: `echo "$CLAUDE_ARGS" | grep -qE -- "--permission-mode acceptEdits" && IDE_FORCED=1`

### 검증 결과별 분기

**A. CLI 플래그 통과** → Step 1, 풀-오토
**B. acceptEdits + `/zzz --ide`** → 반-자동 (매 복합 명령 사용자 클릭, 나레이션 1500 bytes)
**C. acceptEdits + `/zzz`** → 즉시 종료 + 셸 재진입 안내
**D. 플래그 없음** → 종료 + `claude --dangerously-skip-permissions` 안내

## Step 1 — 인프라 체크

```bash
bash ~/Projects/a-team/scripts/zzz-permission-toggle.sh on
launchctl list | grep com.ateam.sleep-resume || bash scripts/install-sleep-cron.sh install "every 2m"
launchctl list | grep com.ateam.auto-switch || bash scripts/install-auto-switch-cron.sh install
rm -f ~/.ateam-sleep-locks/last-success ~/.ateam-sleep-locks/running.pid
claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3
```

permission toggle: `defaultMode: bypassPermissions` 전환. 원본 `~/.ateam/zzz-permission-backup.json` 보존. Step 9에서 `off` 복원.

## Step 6 — 진행 중 강제 조항

풀-오토:
1. 텍스트 ≤ 500 bytes, 질문/인사 금지
2. 매 commit 후 RESUME.md Completed/Next 갱신
3. 확신 없으면 보수적 선택 + Blockers 기록, 중단 금지

IDE 모드 (`--ide`):
- 나레이션 1500 bytes, 매 task 1줄 의도/결과
- 질문/확인 금지, 막히면 다음 task

## Step 7-8 — 토큰 한계 + 재개

한계 근접 시: commit + push → RESUME.md 최종 업데이트 → 세션 종료 (크론 이어받음).
/pickup이 RESUME.md `mode: zzz` + `status != completed` 감지 → autonomous-loop.md 재확인 → In Progress부터 실행 → CronCreate 재등록.

## 작업 픽업 규칙

현재 작업 완료 후 → 다음 자동 픽업:
1. session_goal 범위 내 다음 sub-step
2. session_goal 완료 → CURRENT.md Next Tasks 안전 항목 픽업
3. 안전 키워드: `rule`, `test`, `doc`, `refactor`, `lint`, `cleanup`
4. 제외: `사용자 결정 대기`, `[HUMAN INSERT]`, `prod`, `deploy`, `force`, `migrate`, `설계 confirm`, OAuth, API 키

유일한 종료 트리거: 사용자 명시 ("이제 그만"/"수고했어"/"아침이야"/"보고해").

## 계정 자동 전환

OAuth ≥ 2개 + `com.ateam.auto-switch` launchd 시 60초마다 감시.
활성 계정 ≥ 96% → 후보 < 80% 확인 → PTY 전환 또는 Telegram 알림.
상세: `governance/rules/auto-switch-protocol.md`

## Circuit Breaker (ralph 흡수)

stuck loop를 체계적으로 감지하고 복구. ralph의 3-threshold + cooldown 패턴 통합.

| 조건 | 임계값 | 동작 |
|------|--------|------|
| **No Progress** | 연속 3 commit에서 테스트/파일 변경 0 | Blockers 기록 + 다음 안전 task 전환 |
| **Same Error** | 동일 에러 메시지 연속 5회 | 해당 task SKIP + RESUME.md에 기록 |
| **Cooldown** | CB 발동 후 | 30분 대기 → 다른 task 시도 → 원래 task 재시도 |

CB 상태는 RESUME.md `circuit_breaker` 섹션에 기록:
```markdown
## Circuit Breaker
- status: open | closed | half-open
- trigger: no_progress | same_error | none
- skipped_tasks: [task1, task2]
- cooldown_until: <ISO>
```

## Dual-Condition Exit (ralph 흡수)

zzz의 기존 원칙 "사용자만 종료" 유지하되, **자율 작업 완료 시그널**을 RESUME.md에 기록:

```markdown
## Completion Signal
- all_tasks_done: true/false
- tests_passing: true/false
- no_remaining_safe_tasks: true/false
- exit_recommended: true/false
```

`exit_recommended: true`가 되어도 **자동 종료하지 않음** — 다음 pickup 시 사용자에게 1줄 보고.
"모든 안전 태스크 완료. 추가 지시 대기 중."

## Git Backup (ralph 흡수)

매 작업 단위(task) 시작 전 자동 백업:

```bash
git stash push -m "zzz-backup-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
# 또는 작업 규모가 큰 경우:
git checkout -b zzz-backup/$(date +%Y%m%d-%H%M%S) 2>/dev/null
git checkout - 2>/dev/null
```

롤백 필요 시: `git stash list | grep zzz-backup` 또는 `git branch | grep zzz-backup`.
backup 브랜치는 아침 보고(Step 9) 시 목록 제시 → 사용자가 정리 결정.

## 실패 모드

| 시나리오 | 처리 |
|---|---|
| 크론 소멸 | `/vibe`에서 RESUME.md 감지 |
| 커밋 실패 | RESUME.md uncommitted 플래그 |
| 작업 에러 | 2회 재시도 → Blockers 기록 + 다음 진행 |
| 2회 연속 진전 없음 | Circuit Breaker 발동 → cooldown + task 전환 |
| 동일 에러 반복 | CB same_error → task SKIP |
| 모든 안전 task 소진 | Dual-condition exit_recommended → 대기 |
| CLI 인증 실패 | `claude login` 안내 |
