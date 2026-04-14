# Autonomous Loop — 자율 모드 실행 계약

> **자율 루프 모드는 대화 턴이 아니다. 체크포인트 기반 무한 진행 계약이다.**

---

## 적용 시점

사용자가 아래 표현을 사용하면 자율 모드 진입:
- "자동으로 실행해", "풀자동", "명령 없이"
- "밤새 ~해", "자는 동안", "주무세요"
- "랄프 모드로", "/ralph"
- "알아서 해", "알아서 반복"

## Step 0 — 메커니즘 선택 (의무)

자율 모드 진입 시 **반드시 먼저 선택**:

### Option A: `/ralph` 데몬 (OS 레벨, 1순위 권장)
**조건**: 태스크에 기계 검증 가능한 `--check` 명령이 존재
- 예: `npm test`, `npx tsc --noEmit`, `grep -c ... >= N`
- `ralph-daemon.mjs`가 백그라운드 독립 실행 → 세션 종료 영향 없음

```bash
/ralph start "<task>" --check "<cmd>" --max N --budget $N
```

### Option B: ScheduleWakeup + Checkpoint (주관적 태스크용)
**조건**: `--check` 명령 불가능 (리서치/설계/문서 작업)
- 세션 기반이라 턴 경계 관리 필수 (아래 계약 준수)
- `RESUME_STATE.md`를 SSOT로 사용

### Option C: 거부
**조건**: 태스크가 위험/비가역적 (프로덕션 배포, 결제, 외부 API 대량 호출)
→ 자율 모드 거부하고 사용자 확인 요청

---

## Option B 실행 계약 (ScheduleWakeup 사용 시)

### 강제 조항 1: Execute-Before-Describe
Tool call이 필요한 action은 **summary 서술 이전에 실행**.

❌ 금지:
> "commit/push 완료 + wakeup 예약" (말로만)

✅ 필수:
> (Bash commit 실행 → 결과 출력 확인 → ScheduleWakeup 실행 → 결과 출력 확인 → 그 후 요약)

### 강제 조항 2: 턴 시작부 Wakeup 선-예약
매 wake-up 진입 시 **작업 전에 다음 wakeup 먼저 예약**. 턴 중간/끝에 잊는 패턴 차단.

```
Turn N 시작
  1. RESUME_STATE 읽기
  2. ScheduleWakeup +Nmin 즉시 예약 (안전망)
  3. 본 작업 수행
  4. 체크포인트 (commit/push + RESUME_STATE 갱신)
  5. 필요 시 wakeup 재예약 (더 짧게 or 더 길게)
```

### 강제 조항 3: 금기 단어
아래 단어는 **tool call 성공 직후에만** 사용 가능:
- "완료", "pushed", "예약됨", "commit됨"
- "실행했습니다", "적용됐습니다"

동일 턴 안에서 tool call 출력으로 확인된 후에만.

### 강제 조항 4: 턴 종료 전 체크리스트
턴 닫기 전 반드시 확인:
- [ ] 이번 턴에 `commit/push` 필요했는가? → 했는가?
- [ ] 다음 iteration `ScheduleWakeup` 예약됐는가?
- [ ] `RESUME_STATE.md` 갱신됐는가?
- [ ] TodoWrite 상태 정확한가?

하나라도 미완 → **턴을 닫지 말고 해당 tool call 먼저 실행**.

### 강제 조항 5: 실패 시 recovery
자율 루프가 끊긴 것이 감지되면 (RESUME_STATE.md의 `Last updated`가 예상 간격보다 길게 뒤처짐):
1. 즉시 복구 commit
2. 사용자에게 **정직하게 끊김 보고** (숨기지 말 것)
3. 원인 분석 후 계약 강화

---

## Option A (`/ralph`) 실행 시

### 적합성 체크
```bash
# 태스크가 기계 검증 가능한가?
echo "이 태스크의 완료는 어떤 명령 exit 0으로 판정 가능한가?"
```

가능하면:
```bash
/ralph start "<task>" --check "<verification-cmd>" --max 20 --budget 5.00
/ralph status   # 모니터링
/ralph log      # 로그
/ralph notes    # 진행 기록
```

불가능하면 Option B로 전환 (근거 명시 사용자에게 보고).

---

## 기록 (Session Log)

자율 모드 진입 시 `RESUME_STATE.md`에 필수 필드:
- `mode`: `ralph-daemon` | `schedule-wakeup` | `hybrid`
- `entered_at`: 진입 시각
- `contract_version`: 이 문서 버전
- `next_wakeup_scheduled`: 실제 예약된 wakeup 시각 (tool call 출력에서 복사)
- `last_checkpoint_pushed`: 마지막 git push commit hash

---

## 위반 시

1. RESUME_STATE에 `violation_log` 섹션 append
2. 다음 iteration에서 복구 우선
3. 누적 위반 3회 시 자율 모드 자동 중단, 사용자 확인 요청
4. 이 문서를 다음 iteration에서 재읽기

---

## 근거 (Why)

이 문서는 2026-04-14 사건 이후 신설:
- 사용자가 "풀자동으로해 나 잘거야" 명시
- Claude가 "이 시점부터 완전 자율 진행입니다" 확약
- 7개 RFC 저장 후 **commit/push/wakeup 예약을 말로만 예고하고 tool call 안 함**
- 자율 루프 끊김, 사용자가 아침에 재가동 수동 명령 필요
- **근본 원인**: 대화 턴 종료 습관이 자율 모드 계약을 override

이 문서의 강제 조항들은 Claude의 기억/주의력에 의존하지 않고 **기계적으로 강제**되도록 설계됨.

---

**Last updated**: 2026-04-14
**Related**: `ateam-first.md`, `ateam-sovereignty.md` 제8원칙, `scripts/session-preflight.sh`
