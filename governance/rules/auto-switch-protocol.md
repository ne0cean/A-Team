# Auto Account Switch Protocol

> **목적**: claude-remote 서버가 활성 계정의 usage 소진 임박을 감지하면 Claude Code 세션에 진행 상황 저장을 요청하고, 완료 확인 후 다른 계정으로 keychain을 swap한다. 이 문서는 Claude 쪽 의무를 정의한다.
> **트리거하는 쪽**: claude-remote `packages/server/src/index.ts` `checkAndAutoSwitch()`
> **트리거 감지하는 쪽**: 현재 활성 Claude Code 세션 (이 프로토콜을 따르는 이 CLAUDE)

---

## 언제 발동되는가

claude-remote 서버가 60초마다 확인. 다음 중 하나라도 참:

1. 활성 계정 `five_hour.utilization ≥ 96%`
2. `modelRateLimitCache`에 active rate-limit 엔트리 존재

AND 다음 조건 모두 충족:
- OAuth 계정 ≥ 2개 등록됨
- 다른 계정 중 usage `< 80%` 후보 존재
- 마지막 auto-switch로부터 **10분** 이상 경과 (쿨다운)

---

## Claude 가 해야 하는 일

세션 stdin으로 다음 프롬프트가 주입되면:

```
[SYSTEM: 토큰 소진 임박으로 곧 다른 계정으로 자동 전환됩니다.
지금 즉시 다음을 순서대로 실행하세요:
1. 현재 진행 중인 작업·미결 TODO·다음 단계를 .context/RESUME.md에 5~15줄로 저장 (mode: auto-switch)
2. 변경사항 git add + commit (메시지: "chore(auto-switch): snapshot before account switch")
3. 마지막 줄에 정확히 이 토큰만 단독 출력: READY_TO_SWITCH
질문 금지, 나레이션 최소화. 3분 내 완료.]
```

### 필수 동작

1. **즉시 RESUME.md 작성** — 현재 진행 중 작업을 stateful하게 저장:
   ```markdown
   ---
   mode: auto-switch
   created_at: <ISO8601>
   reason: token-exhaustion-imminent
   ---

   ## In Progress
   - [ ] <지금 작업 중이던 것 1문장>

   ## Completed This Session (이어받을 때 중복 금지)
   - [x] <이미 끝낸 주요 작업>
   - [x] commit: <sha>

   ## Next Tasks (전환 후 우선순위)
   1. <다음 단계>

   ## Context Snapshot
   <현재 상황을 15줄 이내로 압축 — 새 세션이 재구성 가능하도록>

   ## Resume
   `/pickup` 자동 주입 예정.
   ```

2. **git commit** (uncommitted 변경 있을 때만):
   ```bash
   git add -A
   git commit -m "chore(auto-switch): snapshot before account switch"
   ```

3. **마지막 라인에 마커 출력**:
   ```
   READY_TO_SWITCH
   ```
   - 정확히 이 문자열만 (공백·접두어·따옴표 없이)
   - 한 줄에 단독

### 금지 사항 (이 프롬프트에 한정)

- 질문 금지 — "정말 저장할까요?" 같은 확인 금지
- 나레이션 최소화 — "RESUME.md를 작성하고 있습니다" 같은 진행 상황 보고 금지
- 저장 외 작업 시도 금지 — 토큰 예산이 제한적
- 파일 수정을 필요 이상으로 확장 금지 — RESUME.md + (이미 진행된 변경물만) commit

### 3분 타임아웃

- 서버는 `READY_TO_SWITCH` 마커 또는 5초+ idle을 최대 180초 동안 기다린다
- 타임아웃 시: 서버가 전환을 **생략하고** Telegram으로 긴급 알림
- 즉 3분 내 완료하지 못하면 rate-limit까지 그대로 감

---

## 전환 완료 후 (새 계정으로 keychain swap 된 후)

1. 서버가 1.5초 후 자동으로 `/pickup` 을 세션에 주입
2. Claude는 `/pickup` 스킬을 따라 RESUME.md 읽고 In Progress 섹션부터 이어받기
3. RESUME.md의 `mode: auto-switch`를 감지하면:
   - Completed 섹션의 중복 실행 금지
   - 첫 행동 전에 한 줄 요약만 보고 ("계정 전환 후 재개: <진행 중 작업>")
   - 바로 작업 재개

---

## 서버 측 프로토콜 (참고)

| 단계 | 서버 동작 |
|------|----------|
| 1 | 60s 크론 → usage 임계 감지 |
| 2 | Telegram 선제 알림 ("전환 준비 중, 최대 3분 대기") |
| 3 | 가장 활동적인 세션에 autosave 프롬프트 inject |
| 4 | `READY_TO_SWITCH` 마커 또는 5s+ idle 폴링 (180s timeout) |
| 5 | keychain swap (`performAccountSwitch`) |
| 6 | 1.5s 후 `/pickup` inject |
| 7 | Telegram 완료 알림 + 10분 쿨다운 시작 |

실패 경로:
- autosave timeout → Telegram 긴급 알림, 쿨다운 세팅, 전환 생략 (사용자 수동 개입)
- swap 실패 → Telegram 알림, 로그 기록
- 양 계정 모두 `≥ 80%` → 전환 생략 + Telegram "양 계정 소진, 리셋 대기" 알림

---

## 코드 위치

- **구현**: `claude-remote/packages/server/src/index.ts` — `checkAndAutoSwitch()`, `performAccountSwitch()`, `waitForAutosaveOrIdle()`
- **지원 도구**: `claude-remote/packages/server/src/session.ts` — `isSessionIdle`, `getLastPtyActivity`, `outputContainsMarker`, `writeToSession`, `listSessionIds`
- **테스트**: `claude-remote/packages/server/src/__tests__/auto-switch.test.ts` (31 PASS)

## 관련 규칙

- [pickup 스킬](/Users/noir/.claude/commands/pickup.md) — 재개 로직
- [zzz 스킬](/Users/noir/.claude/commands/zzz.md) — 풀 오토 수면 모드 (장시간 무인 실행)
- [resume 스킬](/Users/noir/.claude/commands/resume.md) — 리셋 후 재개 (시점 무관)
