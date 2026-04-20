---
description: /resume — 리셋 후 작업 재개 (시점 무관, 주간/단기 중단 대비)
---

# /resume — 리셋 시점 자동 재개

> **목적**: 작업 도중 토큰 소진으로 중단될 경우, 리셋 시점에 자동으로 깨어나 이어받기.
> **구성**: `.context/RESUME.md` (상태 스냅샷) + `CronCreate` (리셋 시점 트리거) + `/pickup` (재개 로직).
> **참고**: 과거 `/resume-on-reset` 리네임 (2026-04-20). 풀 오토 (수면+자율)는 `/zzz` 사용.

---

## 사용 시나리오

1. 긴 작업 시작 시 **선제적 예약** (Phase 체인, 대규모 리팩토링)
2. 작업 중 토큰 임계 감지 시 **중단 직전 예약**
3. 사용자가 "리셋되면 이어서 해" 같이 명시 요청 시
4. 수면/야간 아닌 **주간 작업** — 회의 중 소진 대비, 낮에 짧은 휴식 중 리셋 등

**`/zzz`와 차이**: `/resume`은 **재개만**. 자율 태스크 큐 없음, launchd 없음, Ralph/Research 디스패칭 없음.

---

## 사용법

### A. 수동 호출
```
/resume [HH:MM | +Nh]
```
- `/resume 03:00` — 오늘(또는 다음) 03:00에 재개
- `/resume +5h` — 5시간 뒤 재개
- 인자 없음 → `/usage` 출력 파싱해 자동 결정 (미지원 시 수동 HH:MM 요청)

### B. 자동 예약 (권장)
`orchestrator`가 Phase 4 진입 직후 자동으로:
1. `.context/RESUME.md` 작성 (현재 todos + 완료 커밋 + 다음 파일)
2. `/usage` 로 다음 리셋 시점 확인 (불가 시 기본 03:00)
3. `CronCreate(durable: true, recurring: false)` 예약

---

## 실행 프로토콜

### STEP 1 — 현재 상태 스냅샷 (`.context/RESUME.md`)

```markdown
---
created_at: ISO8601
reason: token-exhaustion | user-request | proactive
next_reset_at: ISO8601
session_goal: "1-2 문장 요약"
mode: resume
---

## Completed (이어받을 때 중복 금지)
- [x] Phase 1a governance/design/ 5개 md
- [x] commit: <sha>

## In Progress
- [ ] Phase 1b orchestrator.md Design Brief phase 추가

## Next Tasks (우선순위 순)
1. ...
2. ...

## Files Touched This Session
- path1
- path2

## Resume Command
다음 턴 첫 줄에 실행:
  /pickup

추가 컨텍스트: (특별한 주의사항이 있으면 여기)
```

### STEP 2 — Cron 예약

```
CronCreate(
  cron: "M H D M *",   # 리셋 시점 + 2~3분 버퍼 (한국 기준 "2 3 15 4 *" = 4월 15일 03:02)
  durable: true,        # 세션 종료 후에도 유지
  recurring: false,     # 1회 fire 후 자동 삭제
  prompt: "/pickup  # auto-resume from .context/RESUME.md (created_at: <ts>). 이전 세션 중단 지점부터 이어받아라. RESUME.md 읽고 Completed 중복 금지, In Progress 부터 시작."
)
```

### STEP 3 — 사용자 통지

```
⏰ 재개 예약 완료
   리셋 시점: 2026-04-15 03:02 KST
   재개 방법: 자동 (크론 트리거) 또는 수동 `/pickup`
   상태 파일: .context/RESUME.md
```

---

## RESUME.md 업데이트 규칙

- **매 Phase 완료 시** orchestrator가 자동 갱신
- **매 커밋 직후** 해당 커밋 SHA 추가
- 이어받기 시 RESUME.md의 `Completed` 섹션 먼저 체크 — 이미 끝난 작업 재실행 금지

---

## 실패 모드 & 폴백

| 시나리오 | 폴백 |
|---|---|
| CronCreate 실패 / MCP 미사용 | RESUME.md만 작성, 사용자 복귀 시 수동 `/pickup` 안내 |
| RESUME.md 없음 | `/pickup`이 `.context/CURRENT.md` 로 폴백 |
| 크론이 기대 시점에 안 firing | 다음 세션 시작 시 `/vibe` 가 RESUME.md 감지 → 자동 제안 |
| durable 미지원 환경 | `.claude/scheduled_tasks.json` 확인 후 fallback |

---

## 통합 지점

### vibe.md Step 0.6
세션 시작 시 `.context/RESUME.md` 존재 + `created_at` 24h 이내 확인:
- 존재 시: "🔄 이전 중단 세션 감지. `/pickup` 권장."
- 부재 시: 기본 vibe 흐름

### orchestrator Phase 4 시작 직후
장시간 작업(5+ steps) 판정 시 자동으로 `/resume` 호출 (선제 예약).

### end.md 세션 종료 시
RESUME.md의 `Completed` 기준으로 CURRENT.md 갱신.

### /zzz 관계
- `/resume` = 재개만 (시점 무관, 자율 작업 없음)
- `/zzz` = 재개 + 자율 태스크 큐 + launchd (수면/야간)

---

## 예시

```bash
# 사용자 요청: "리셋되면 이어서 해"
# 현재 시각: 2026-04-14 14:00 KST (주간)

/resume 18:00
# → CronCreate(cron: "0 18 14 4 *", durable: true, recurring: false, prompt: "/pickup ...")
# → RESUME.md 작성
# → ⏰ 재개 예약 완료 메시지
```

사용자 복귀 시점에 자동 재개. 복귀 없이 크론만 fire하면 다음 세션에서 CURRENT.md 로 결과 확인 가능.
