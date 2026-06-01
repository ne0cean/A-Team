---
description: /zzz — 풀 오토 수면 모드 (하던 작업을 이어서 계속, 토큰 리셋 자동 이어받기)
---

# /zzz — 풀 오토 수면 모드

> **약속**: 지금 하던 작업을 그대로 이어서 계속. 질문 0, 나레이션 0, 토큰 소진까지 진행. 리셋되면 자동 이어받기.
> **의존**: `governance/rules/autonomous-loop.md` 강제 조항 1-9 준수 (조항 9: Circuit Breaker + AGENT_STATUS 블록).
> **상세**: `Read governance/rules/zzz-detail.md` (CLI 검증, 권한 3계층, IDE 모드, Circuit Breaker, Dual-Exit, Git Backup 등)
> **통합**: ralph(frankbria/ralph-claude-code)의 CB/dual-exit/backup 흡수 완료. `/ralph`는 레거시.

---

## 자동 트리거
수면 의도 ("자러간다"/"잘게") + 자율 의도 ("랄프 모드"/"알아서 해") 양쪽 1개씩 → 확인 없이 진입.

## 수동 호출
- `/zzz` — 하던 작업 이어서 풀-오토
- `/zzz --ide` — IDE 반-자동 (사용자 클릭 진행)
- `/zzz --fresh <태스크>` — 새 태스크 큐 (예외)
- `/zzz --check` — infra 점검만

---

## 진입 절차

### Step 0 — CLI 검증 (필수 게이트)
`Read governance/rules/zzz-detail.md` Step 0 참조. CLI `--dangerously-skip-permissions` 필수. IDE는 `--ide`만 허용.

### Step 1 — 인프라 체크 (5초)
```bash
bash ~/Projects/a-team/scripts/zzz-permission-toggle.sh on
launchctl list | grep com.ateam.sleep-resume || bash scripts/install-sleep-cron.sh install "every 2m"
launchctl list | grep com.ateam.auto-switch || bash scripts/install-auto-switch-cron.sh install
rm -f ~/.ateam-sleep-locks/last-success ~/.ateam-sleep-locks/running.pid
claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3
```

### Step 2 — Reset Time (3단 폴백)
사용자 명시 → `/usage` 패턴 → 기본 5시간

### Step 3 — RESUME.md 작성
```markdown
---
mode: zzz
entered_at: <ISO>
next_reset_at: <ISO>
contract: autonomous-loop.md
status: in_progress
session_goal: "<현재 작업 1-2문장>"
---
## In Progress
- [ ] <진행 중이던 것>
## Completed This Session
- [x] <커밋한 것들>
## Next Immediate Step
<바로 해야 할 1개 액션>
## Files Touched
<파일 경로>
```

### Step 4 — CronCreate + launchd
```
CronCreate(cron: "<reset+2min>", durable: true, recurring: false, prompt: "/pickup")
```

### Step 5 — 1줄 요약 + 즉시 작업 재개
```
🌙 zzz 모드 진입 | 리셋: <HH:MM> | 진행: <session_goal>
```
이후 묻지 말고 계속. 나레이션 500 bytes 이내.

---

## 진행 중 동작

- 토큰 소진까지 무정지. 매 commit 후 RESUME.md 갱신.
- **Git Backup**: 매 task 시작 전 자동 stash/branch 백업.
- **Circuit Breaker**: no-progress 3회 → task 전환, same-error 5회 → task SKIP + cooldown 30분.
- 현재 작업 완료 → 다음 자동 픽업 (CURRENT.md Next Tasks 안전 항목).
- **Growth Engine**: 모든 명시 태스크 소진 후, `/daily-brief` (scan+apply) 자동 실행. 의장이 자는 동안에도 A-Team이 성장.
- **Dual-Exit**: 모든 안전 task 소진 시 `exit_recommended: true` → 자동 종료 안 함, 다음 pickup에서 보고.
- 토큰 한계 → commit + push + RESUME.md 저장 → 크론 이어받음.
- 상세 규칙: `governance/rules/zzz-detail.md` Step 6-8 + CB/Dual-Exit/Backup

## 아침 보고 (Step 9)
≤ 10줄: 경과/cycle/commit 수 + 완료/차단 + 다음 1줄.
```bash
bash ~/Projects/a-team/scripts/zzz-permission-toggle.sh off
```

---

## 관계도
```
/zzz → 하던 거 이어서 (RESUME.md + CronCreate + autonomous-loop 계약)
/zzz --fresh → 새 태스크 큐 (예외)
/zzz --ide → IDE 반-자동
/resume → 리셋 재개만 (자율 없음)
/pickup → 재개 실행 (공통)
```
