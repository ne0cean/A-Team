---
description: /zzz — 풀 오토 수면 모드 (무정지 자율 + 리셋 이어받기 + 야간 작업 큐)
---

# /zzz — 풀 오토 수면 모드

> **트리거**: "자러 간다", "잘게", "주무세요", "풀자동 밤새" + 랄프/자율 키워드. 또는 수동 `/zzz <태스크>`.
> **약속**: 질문 0, 나레이션 0, 토큰 소진까지 진행. 리셋되면 자동 이어받기. 아침에 결과만 확인.
> **의존성**: `governance/rules/autonomous-loop.md` 강제 조항 1-6 전부 준수.

> **참고**: 과거 `/sleep` + `/overnight` 통합 (2026-04-20). 주간 리셋 대비만 필요하면 `/resume` 사용.

---

## 자동 트리거 감지

사용자 메시지에 다음 조합 시 **확인 없이 진입**:

| 수면 의도 | 자율 의도 |
|---|---|
| "자러간다" / "자러 갈게" / "잘게" | "랄프 모드" / "자동으로" |
| "주무세요" / "나 잔다" | "묻지 말고" / "풀자동" |
| "컴퓨터 앞에 없을거" | "알아서 해" / "이어서 해" |

→ 양쪽 1개씩 이상 = **zzz mode 진입**.

## 수동 호출

```
/zzz <자연어 태스크 or 'auto'>
```

**예시**:
- `/zzz CURRENT.md Next Tasks 중 코드 작업만 우선 처리` → 안전 필터 자동
- `/zzz design-smell-detector 남은 3 rule 구현` → 명시 태스크 큐잉
- `/zzz auto` → CURRENT.md 에서 안전 heuristic 맞는 항목 자동 선별

---

## Step 1 — Reset Time 확보 (3단 폴백)

**우선순위 1**: 사용자가 이미 명시 ("3시에 리셋", "새벽 4시")
- 자연어 파싱 → `HH:MM` 추출

**우선순위 2**: 사용자가 `/usage` 출력을 최근 대화에서 붙여넣음
- 텍스트에서 "resets at HH:MM" / "Resets: HH:MM UTC" / "리셋: HH:MM" 패턴 grep
- UTC면 `TZ` 환경변수로 로컬 변환

**우선순위 3**: 기본값
- 무료/Pro: 5시간 후 (`date +%s` + 18000s)
- 무정보 시 사용자 요청의 "오늘 리셋 시간" 힌트 사용

`/usage`를 Claude가 직접 호출 불가 — REPL 명령. 대안으로 Bash로 `claude usage` 시도:
```bash
claude usage 2>/dev/null || echo "RESET_UNKNOWN"
```
실패하면 우선순위 3로 폴백.

---

## Step 2 — 태스크 수집 & 안전 필터

### 2A. auto 모드 (수동 `/zzz auto`)
CURRENT.md `## Next Tasks` 섹션 파싱. 다음 조건 모두 충족하는 항목만:
- 체크되지 않은 `[ ]` 항목
- **안전 키워드** 포함: `rule`, `rule 구현`, `test`, `doc`, `refactor`, `lint`, `cleanup`
- **불안전 키워드** 제외: `prod`, `deploy`, `force`, `drop`, `migrate`, `설계`, `decision`, `선택`, `파일럿`, `실전`, `UI 샘플`
- `--check` 가능한가? (`npm test`, `tsc --noEmit`, `grep count` 가능한가)

### 2B. 명시 태스크
사용자가 자연어로 준 태스크. 그대로 Task 1로 등록.

### 2C. 무인 실행 가능 판정
각 태스크에 대해:
- [ ] 설계 결정 필요? → **제외**
- [ ] 외부 API 키/승인 필요? → **제외**
- [ ] 파괴적 (force push, DB migration, production deploy)? → **제외**
- [ ] 검증 명령 (`--check`) 존재? → **포함**

제외된 태스크는 출력에 "⚠️ skipped: reason"으로 보고.

### 2D. Task 분류 (meta-dispatcher)

| 태스크 유형 | 기준 | 실행 경로 |
|---|---|---|
| **코드 (검증 가능)** | `--check` 명령 있음 (`npm test`, `tsc --noEmit`, grep count 등) | `/ralph start "<task>" --check "<cmd>" --max N --budget $N` (OS 데몬 = 세션 독립) |
| **리서치 (탐색)** | "조사", "분석", "비교", "트렌드" 키워드 + 웹/코드베이스 탐색 | `/re pipeline "<topic>"` (research-daemon.mjs) |
| **리팩토링 (read-only 가이드 있음)** | 기존 PLAN/RFC 존재, 기계 검증 가능 | Ralph |
| **문서화** | README/CURRENT.md/changelog 업데이트 | Ralph (검증: `wc -l < N` 또는 grep presence) |
| **설계 결정 필요** | 옵션 비교, 아키텍처 결론 | **제외** — Next Tasks에 defer |

**동시 실행 가능**: 리서치 + Ralph 병행, 여러 Ralph 인스턴스 (파일 소유권 충돌 없을 때).

**제외**: 설계 결정, 외부 API 키, 파괴적 작업, 디자인/UI 주관 판단.

---

## Step 3 — RESUME.md 작성

`.context/RESUME.md`:
```markdown
---
mode: zzz
entered_at: ISO8601
next_reset_at: ISO8601 (Step 1 결과)
contract: autonomous-loop.md v2026-04-15 (강제 조항 1-6 전부)
narration_budget_bytes: 500
next_wakeup_scheduled: (Step 4 tool call 결과로 채워짐)
status: in_progress
---

## 실행 계약

launchd 가 2분마다 probe. 리셋 감지 시 자동 실행. 다음 **의무**:

1. `governance/rules/autonomous-loop.md` Read (조항 1-7)
2. 질문 금지, 나레이션 금지 (조항 6)
3. 각 태스크 완료 = commit + push + Completed 섹션 update
4. `npm test` + `tsc --noEmit` 미통과 시 revert, 다음 태스크
5. 모든 태스크 완료 시 RESUME.md `status: completed`

## ❌ 금지 사항

- 설계 결정 필요 태스크
- `/zzz.md`, `orchestrator.md` 등 핵심 인프라 수정
- 파괴적 작업 (force push, branch delete, prod deploy)
- `--dangerously-skip-permissions` 플래그 사용 (2026-04-15 사건)
- `/autoresearch` 실행 (사용자 판단)

## ✅ Tasks (질문 없이 완료 가능한 것만)

### T1. <task name>
- **근거**: <CURRENT.md line or 사용자 명시>
- **검증 (--check)**: `<cmd>`
- **완료 기준**: <구체적 목표>

### T2. ...

## Completed (crash-safe, 중복 금지)
(비어있음)

## Commits This Cycle
(비어있음)

## Resume
```
/pickup
```
```

---

## Step 4 — 재귀 CronCreate + OS-level launchd 백업

```
CronCreate(
  cron: "<reset+2min>",
  durable: true,
  recurring: false,
  prompt: "/zzz-resume"  # 아래 Step 6
)
```

tool 출력에서 job ID + 시간 추출 → RESUME.md `next_wakeup_scheduled` 필드 채움.

**백업 (OS-level launchd — 2026-04-15 설치 완료, 세션·노트북 절전 완전 독립)**:
1. RESUME.md 디스크 저장 (항상)
2. git commit + push (crash 시 복구점)
3. launchd plist (Darwin):
   ```bash
   bash scripts/install-sleep-cron.sh install 03:02
   # → ~/Library/LaunchAgents/com.ateam.sleep-resume.plist 설치
   # → 매일 03:02 KST 자동 실행 (RESUME.md status!=completed 일 때만)
   # → claude -p 헤드리스 모드로 자동 재개 (keychain OAuth 사용, API 키 불필요)
   ```
4. 실행 스크립트 `scripts/sleep-resume.sh`:
   - 프로젝트/RESUME.md 존재 확인 + 상태 체크 (completed면 스킵)
   - 동일 날짜 중복 실행 차단 (`~/.ateam-sleep-locks/YYYY-MM-DD` 락)
   - `claude -p --print --dangerously-skip-permissions --model sonnet --max-budget-usd 5.00` 헤드리스 호출
   - 로그 `~/Library/Logs/ateam-sleep-resume.log`
5. 관리 명령:
   - 상태: `bash scripts/install-sleep-cron.sh status`
   - 제거: `bash scripts/install-sleep-cron.sh uninstall`
   - 시간 변경: `bash scripts/install-sleep-cron.sh install HH:MM` (재설치)
6. 수동 테스트: `launchctl start com.ateam.sleep-resume` 후 로그 tail
7. CronCreate는 **세션 기반 보조** — 세션 살아있으면 5분 더 빠른 반응, 죽으면 launchd가 받음

---

## Step 4.5 — Infra 검증 (수동 호출 시)

### A. launchd 상태
```bash
launchctl list | grep com.ateam.sleep-resume || {
  echo "⚠️ launchd not loaded. Installing..."
  bash scripts/install-sleep-cron.sh install "every 2m"
}
```

### B. Lock 파일 정리
```bash
rm -f ~/.ateam-sleep-locks/last-success ~/.ateam-sleep-locks/running.pid
```

### C. Claude CLI 인증 확인
```bash
claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3
# 기대: "Hello" 또는 "ok" 응답
# 실패: "hit your limit" / "not authenticated" → 경고 출력
```

### D. Git 상태
```bash
git status --short
[ -z "$(git status --short)" ] || echo "⚠️ Uncommitted changes. zzz 세션이 이들을 덮어쓸 수 있음."
```

---

## Step 5 — 토큰 소진까지 무정지 진행

**강제 조항** (autonomous-loop.md 강제 조항 6 준수):
1. 모든 사용자 대상 텍스트 ≤ 500 bytes 총량
2. 질문 금지, 경계 선언 금지, 인사 금지
3. 매 commit 직후 RESUME.md 의 `Completed` 섹션 업데이트
4. 각 task 완료 → 커밋 → push → 다음 task
5. Next Tasks 순회 중 확신 없는 항목 등장 → **스킵하고 다음**, RESUME.md에 `deferred` 표시

**토큰 한계 근접 감지** (휴리스틱):
- Bash `date +%s` vs `entered_at` 차이
- 커밋 횟수
- 마지막 대응 길이 (context 압박 신호)
- 근접 감지 시: 즉시 commit/push → RESUME.md 최종 업데이트 → 종료 (크론이 이어받음)

**데몬 상태 모니터링**:
zzz 모드 진입 후 Claude 세션은 **직접 코드를 돌리지 않고** 데몬에 위임:
1. 주기적으로 (ScheduleWakeup 30분 간격) `/ralph status` + `/re status` 확인
2. 데몬이 BLOCKED / 에러 시 RESUME.md 기록 + recovery 시도
3. 데몬이 완료 시 다음 Task 디스패치

**세션 기반 wake-up** (ScheduleWakeup) vs **OS 데몬** (Ralph/Research):
- OS 데몬: 실제 작업 수행 (세션 독립)
- Session wake-up: 디스패처 역할만 (토큰 최소 소비)

---

## Step 6 — `/zzz-resume` (크론이 깨운 턴)

```markdown
1. RESUME.md Read
2. mode == 'zzz' 확인 (legacy 'sleep'도 허용)
3. 다음 리셋 시각 확인 (5시간 주기 같은 간격이면 자동 재예약)
4. CronCreate 다시 등록 (다음 리셋 +2min)
5. Completed 항목 중복 금지
6. Step 5 로 복귀 (무정지 진행)
```

**종료 조건**:
- Tasks 전부 Completed → RESUME.md `status: done` + 크론 취소 + CURRENT.md 갱신
- 사용자가 대화 재개 ("이제 그만", "수고했어") → 종료

---

## Step 7 — 요약 출력 (수동 호출 시)

```
🌙 zzz 세팅 완료 (2026-04-15 22:30 KST)

📋 큐잉된 태스크: N건
   T1. <summary>
   T2. <summary>
   ...
   ⚠️ Skipped: M건 (설계 결정 필요 X건, prod 변경 Y건 등)

🔧 Infra:
   ✅ launchd loaded (매 2분 probe)
   ✅ Lock 정리됨
   ✅ Claude CLI 인증 OK
   [⚠️] Uncommitted changes (있으면)

⏰ 예상 동작:
   - 토큰 리셋 2분 이내 자동 감지
   - 각 태스크 완료마다 commit+push
   - 실패 2회 연속 시 자동 중단 (조항 5, 7)

🌅 아침에 돌아오면:
   - /vibe (Step 0.6 이 RESUME.md 감지)
   - git log --oneline <last-commit>..HEAD
   - tail ~/Library/Logs/ateam-sleep-resume.log

안전히 다녀오세요. 🌙
```

---

## Step 8 — 아침 보고

사용자 재개 감지 시 **최종 1회 요약**:
- N cycle 실행, M commit push
- Completed Tasks 리스트
- Deferred Tasks (스킵 사유 포함)
- 실패/블로커 있으면 최상단
- ≤ 10줄

---

## 실패 모드

| 시나리오 | 처리 |
|---|---|
| 크론 소멸 + 사용자 아침 귀환 없음 | 다음 `/vibe` 에서 RESUME.md 감지 → 제안 |
| 토큰 한계 직전 커밋 실패 | RESUME.md에 uncommitted 플래그 → 크론이 복구 |
| Task 실행 중 에러 | 2회 재시도 → 실패 시 `deferred`로 이동, 다음 Task |
| 2회 연속 wake에서 진전 없음 | 자동 종료 + 사용자 보고 대기 |
| launchd 설치 실패 | 수동 `bash scripts/install-sleep-cron.sh install "every 2m"` 안내 |
| Claude CLI 인증 실패 | `/web-setup` 또는 `claude login` 안내 후 세팅 중단 |
| RESUME.md 이미 status=in_progress | "이미 진행 중. 덮어쓸까요? /zzz --force" |
| 태스크 0건 (auto 모드) | "큐잉할 안전한 태스크가 없습니다. 명시 태스크로 `/zzz <설명>` 또는 CURRENT.md에 추가 후 재시도" |

---

## 통합 포인트

### /vibe Step 0.6
RESUME.md `mode: zzz` (또는 legacy `sleep`) + `status != completed` 감지 → `/pickup` 제안

### /end Step 3.7
세션 종료 시 uncommitted + `/zzz` 미실행 → "자러 간다면 `/zzz` 실행?" 제안

### /pickup
launchd 또는 사용자가 재개 시점에 RESUME.md 읽고 순차 실행

### /resume 관계
- `/resume` = 리셋 후 재개만 (시점 무관, 주간/단기)
- `/zzz` = 풀 오토 (수면 + 자율 + 리셋 대비 포괄)

---

## 원칙

1. **자동 안전 필터**: 위험한 태스크 실수 주입 시 대부분 걸러짐
2. **실행 계약 강제 주입**: autonomous-loop.md 조항 1-7 매번 복붙
3. **단일 진입**: 한 줄로 전부. RESUME.md 수동 편집 불필요
4. **검증 우선**: infra 문제 있으면 세팅 자체 중단 (false reassurance 방지)
5. **솔직한 한계**: launchd catch-up은 laptop awake 기준. 장기 shutdown 대비 안내

---

## Precedent (왜 단일 진입이 필요한가)

2026-04-14 사건:
- 사용자가 "자러간다" + "랄프 모드" 조합 명시
- Claude가 리셋 예약 / 나레이션 / RESUME.md 각각 수동 세팅 → 불일치
- 사용자 재차 "묻지 마" 경고 필요
- 근본 원인: **"자러간다 + 랄프"를 하나의 의도로 묶어 처리하는 단일 entry point 부재**

이 스킬로 요소 통합:
- RESUME.md 세션 상태
- CronCreate + launchd 리셋 이어받기
- 나레이션 금지 계약
- **Ralph (코드) + Research (리서치) + 재귀 wake-up 디스패칭**

## 관계도

```
/zzz (meta-dispatcher, 풀 오토)
├── 코드 태스크 감지 → /ralph start (OS 데몬)
├── 리서치 태스크 감지 → /re pipeline (research-daemon)
├── 둘 다 → 병렬 or 파이프라인 (research → ralph)
├── RESUME.md + CronCreate + launchd + 재귀 wake-up
└── 나레이션 0 계약 (autonomous-loop.md 조항 6)

/resume (리셋 재개만)
└── CronCreate + RESUME.md, 자율 작업 없음

/pickup (재개 실행)
└── RESUME.md 읽고 In Progress 부터 즉시 실행
```

`/ralph` 와 `/re` 는 개별 호출 가능. **수면 의도가 함께** 있을 때는 `/zzz`가 상위 진입.
