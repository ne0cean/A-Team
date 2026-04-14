# /sleep — 자러 가는 사용자 전용 무정지 자율 모드

> **트리거**: "자러 간다", "잘게", "주무세요", "풀자동 밤새" + 랄프/자율 키워드.
> **약속**: 질문 0, 나레이션 0, 토큰 소진까지 진행. 리셋되면 자동 이어받기. 아침에 결과만 확인.
> **의존성**: `governance/rules/autonomous-loop.md` 강제 조항 1-6 전부 준수.

---

## 자동 트리거 감지

사용자 메시지에 다음 조합 시 **확인 없이 진입**:

| 수면 의도 | 자율 의도 |
|---|---|
| "자러간다" / "자러 갈게" / "잘게" | "랄프 모드" / "자동으로" |
| "주무세요" / "나 잔다" | "묻지 말고" / "풀자동" |
| "컴퓨터 앞에 없을거" | "알아서 해" / "이어서 해" |

→ 양쪽 1개씩 이상 = **sleep mode 진입**.

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

## Step 2 — RESUME.md 작성

`.context/RESUME.md`:
```markdown
---
mode: sleep
entered_at: ISO8601
next_reset_at: ISO8601 (Step 1 결과)
contract: autonomous-loop.md v2026-04-15 (강제 조항 1-6 전부)
narration_budget_bytes: 500
next_wakeup_scheduled: (Step 3 tool call 결과로 채워짐)
---

## Tasks (질문 없이 완료 가능한 것만)
- [ ] ...
- [ ] ...

## Completed (crash-safe)
(비어있음)

## Commits This Cycle
(비어있음)
```

**Task 분류 (meta-dispatcher)**:

| 태스크 유형 | 기준 | 실행 경로 |
|---|---|---|
| **코드 (검증 가능)** | `--check` 명령 있음 (`npm test`, `tsc --noEmit`, grep count 등) | `/ralph start "<task>" --check "<cmd>" --max N --budget $N` (Option A, OS 데몬 = 세션 독립) |
| **리서치 (탐색)** | "조사", "분석", "비교", "트렌드" 키워드 + 웹/코드베이스 탐색 | `/re pipeline "<topic>"` (research-daemon.mjs, 자율 리서치 → 완료 시 Ralph 자동 연결 가능) |
| **리팩토링 (read-only 가이드 있음)** | 기존 PLAN/RFC 존재, 기계 검증 가능 | Ralph Option A |
| **문서화** | README/CURRENT.md/changelog 업데이트 | Ralph Option A (검증: `wc -l < N` 또는 grep presence) |
| **설계 결정 필요** | 옵션 비교, 아키텍처 결론 | **제외** — Next Tasks에 defer |

**동시 실행 가능**:
- 리서치 + Ralph 병행 (research-daemon 결과가 Ralph 프롬프트로 자동 연결)
- 여러 Ralph 인스턴스 (충돌 없는 파일 소유권이면)

**제외**:
- 설계 결정 필요 태스크 (MoA, architect)
- 외부 API 키/승인 필요
- 파괴적 작업 (prod 배포, force push, DB 마이그레이션)
- 디자인/UI 주관 판단 필요 (designer 서브에이전트 호출 불가 — tone 결정이 질문 없이 어려움)

---

## Step 3.5 — 데몬 상태 모니터링

sleep 모드 진입 후 `/sleep`은 **직접 코드를 돌리지 않고** 데몬에 위임. Claude 세션은:
1. 주기적으로 (ScheduleWakeup 30분 간격) `/ralph status` + `/re status` 확인
2. 데몬이 BLOCKED / 에러 시 RESUME.md 기록 + recovery 시도
3. 데몬이 완료 시 다음 Task 디스패치

**세션 기반 wake-up** (ScheduleWakeup) vs **OS 데몬** (Ralph/Research) 역할 분리:
- OS 데몬: 실제 작업 수행 (세션 독립)
- Session wake-up: 디스패처 역할만 (토큰 최소 소비)

---

## Step 3 — 재귀 CronCreate

```
CronCreate(
  cron: "<reset+2min>",
  durable: true,
  recurring: false,
  prompt: "/sleep-resume"  # 아래 Step 5
)
```

tool 출력에서 job ID + 시간 추출 → RESUME.md `next_wakeup_scheduled` 필드 채움.

**백업**: CronCreate durable=true가 세션 종료 시 휘발 가능. 다음도 병행:
1. RESUME.md 디스크 저장 (항상)
2. git commit + push (crash 시 복구점)
3. launchd plist 생성 (Darwin) — OS 레벨 fallback:
```bash
cat > ~/Library/LaunchAgents/com.ateam.sleep-resume.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.ateam.sleep-resume</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>cd PROJECT_ROOT && osascript -e 'display notification "Sleep-mode resume" with title "A-Team"'</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>HH</integer>
    <key>Minute</key><integer>MM</integer>
  </dict>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
PLIST
launchctl load ~/Library/LaunchAgents/com.ateam.sleep-resume.plist
```
이건 notification만 띄움 — Claude를 직접 깨울 수 없음. 사용자가 아침에 볼 때 `/sleep-resume` 수동 호출 유도.

---

## Step 4 — 토큰 소진까지 무정지 진행

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

---

## Step 5 — `/sleep-resume` (크론이 깨운 턴)

```markdown
1. RESUME.md Read
2. mode == 'sleep' 확인
3. 다음 리셋 시각 확인 (5시간 주기 같은 간격이면 자동 재예약)
4. CronCreate 다시 등록 (다음 리셋 +2min)
5. Completed 항목 중복 금지
6. Step 4 로 복귀 (무정지 진행)
```

**종료 조건**:
- Tasks 전부 Completed → RESUME.md `status: done` + 크론 취소 + CURRENT.md 갱신
- 사용자가 대화 재개 ("이제 그만", "수고했어") → 종료

---

## Step 6 — 아침 보고

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

---

## Precedent (왜 이 단일 트리거가 필요한가)

2026-04-14 사건:
- 사용자가 "자러간다" + "랄프 모드" 조합 명시
- Claude가 `/resume-on-reset` 따로 + 나레이션 따로 + RESUME.md 따로 각각 수동 세팅 → 불일치
- 사용자 재차 "묻지 마" 경고 필요
- 근본 원인: **"자러간다 + 랄프"를 하나의 의도로 묶어 처리하는 단일 entry point 부재**

이 스킬로 요소 통합 단일 진입:
- RESUME.md 세션 상태
- CronCreate 리셋 이어받기
- 나레이션 금지 계약
- **Ralph (코드) + Research (리서치) + 재귀 wake-up 디스패칭**

## 관계도

```
/sleep (meta-dispatcher)
├── 코드 태스크 감지 → /ralph start (OS 데몬)
├── 리서치 태스크 감지 → /re pipeline (research-daemon)
├── 둘 다 → 병렬 or 파이프라인 (research → ralph)
├── RESUME.md + CronCreate + 재귀 wake-up (세션 기반)
└── 나레이션 0 계약 (autonomous-loop.md 조항 6)
```

`/ralph` 와 `/re` 는 개별 호출도 가능하지만, **수면 의도가 함께 있을 때**는 `/sleep`이 상위 진입.
