# Auto Account Switch Protocol

> **아키텍처**: 결정 엔진은 a-team 글로벌(`scripts/auto-switch/`), PTY 어댑터는 claude-remote 서버.
> **두 환경 지원**: claude-remote 서버가 떠있으면 PTY 기반 실시간 전환, 없으면 Telegram 수동 알림.
> **트리거하는 쪽**: a-team `scripts/auto-switch/trigger.mjs` (launchd 60초 크론)
> **응답하는 쪽**: 현재 활성 Claude Code 세션 (이 문서를 따르는 Claude)

---

## 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  a-team (글로벌 단일 엔진)                                │
│  scripts/auto-switch/                                     │
│  ├─ accounts-state.mjs  (~/.ateam/accounts.json)         │
│  ├─ check-usage.mjs     (Anthropic usage API + 캐시)     │
│  ├─ swap-keychain.mjs   (macOS keychain swap)            │
│  └─ trigger.mjs         (60s 크론 진입점, 분기 로직)     │
│                                                            │
│  launchd: com.ateam.auto-switch (60s)                     │
└──────────────────┬────────────────────────────────────────┘
                   │
        ┌──────────┴───────────┐
        │  서버 떠있나?         │
        └─┬──────────────────┬─┘
          │ YES              │ NO
          ▼                  ▼
┌──────────────────────┐  ┌────────────────────┐
│ claude-remote server │  │ Telegram 알림만     │
│ POST /internal/      │  │ (사용자 수동 전환)  │
│   auto-switch        │  └────────────────────┘
│                      │
│ PTY 주입 → 마커 대기 │
│ → keychain swap      │
│ → /pickup 주입       │
└──────────────────────┘
```

---

## 언제 발동되는가 (a-team 엔진 측)

`trigger.mjs`가 60초마다 확인. 모두 충족:

1. `~/.ateam/accounts.json` OAuth 계정 ≥ 2개 (token 보유)
2. 마지막 auto-switch로부터 10분 이상 경과 (쿨다운)
3. 활성 계정 `five_hour.utilization ≥ 96%`
4. 전환 후보(다른 OAuth 계정 중 가장 낮은 usage) `< 80%`

모두 충족 시 다음 분기:
- `GET http://localhost:3001/health` 성공 → claude-remote로 위임
- 실패 → Telegram 알림 ("수동 전환 필요")

양 계정 모두 `≥ 80%` → Telegram 알림 ("양 계정 소진, 리셋 대기"), 쿨다운 세팅 후 생략.

---

## claude-remote 측 동작 (PTY 어댑터)

**엔드포인트**: `POST /internal/auto-switch`

**요청 payload**:
```json
{
  "outgoingAccountId": "...",
  "incomingAccountId": "...",
  "outgoingLabel": "account-A",
  "incomingLabel": "account-B",
  "outgoingUtil": 97.5,
  "incomingUtil": 42.0
}
```

**서버 동작 (자동)**:
1. 가장 최근 PTY 활동 세션 선정 (`getLastPtyActivity` 최대값)
2. Telegram: "🔄 계정 자동 전환 준비" 알림
3. PTY stdin에 autosave 프롬프트 주입 (아래 템플릿)
4. `READY_TO_SWITCH` 마커 또는 5초+ idle 폴링 (최대 180초)
5. keychain swap (`performAccountSwitch`)
6. 1.5초 후 `/pickup` 자동 주입
7. Telegram: "✅ 계정 자동 전환 완료" 알림

**실패 처리**:
- 활성 세션 없음 → 409 반환 → 엔진이 Telegram fallback 결정
- 180초 타임아웃 → 408 반환, Telegram "세션 컨텍스트 보호 위해 전환 생략" 알림
- keychain swap 실패 → 500 반환, Telegram 긴급 알림

---

## Claude가 받는 프롬프트 (autosave 요청)

서버가 세션 stdin에 다음을 주입:

```
[SYSTEM: 토큰 소진 임박으로 곧 다른 계정으로 자동 전환됩니다.
지금 즉시 다음을 순서대로 실행하세요:
1. 현재 진행 중인 작업·미결 TODO·다음 단계를 .context/RESUME.md에 5~15줄로 저장 (mode: auto-switch)
2. 변경사항 git add + commit (메시지: "chore(auto-switch): snapshot before account switch")
3. 마지막 줄에 정확히 이 토큰만 단독 출력: READY_TO_SWITCH
질문 금지, 나레이션 최소화. 3분 내 완료.]
```

### Claude의 의무

1. **즉시 RESUME.md 작성**:
   ```markdown
   ---
   mode: auto-switch
   created_at: <ISO8601>
   reason: token-exhaustion-imminent
   ---

   ## In Progress
   - [ ] <지금 작업 중이던 것 1문장>

   ## Completed This Session
   - [x] <이미 커밋한 것들 SHA + 한 줄>

   ## Next Immediate Step
   <다음에 바로 해야 할 1개 액션, 파일 경로·명령까지 구체적으로>

   ## Context Snapshot
   <현재 상황 15줄 이내 압축>
   ```

2. **git commit** (uncommitted 있을 때만):
   ```bash
   git add -A
   git commit -m "chore(auto-switch): snapshot before account switch"
   ```

3. **마지막 라인 단독 출력**:
   ```
   READY_TO_SWITCH
   ```
   공백·접두어·따옴표 없이 정확히 이 문자열만.

### 금지

- 질문 금지
- 나레이션 최소화 (진행 보고 없이 즉시 실행)
- 저장 외 작업 금지 (토큰 예산 제한)
- 불필요한 파일 수정 금지

### 180초 초과 시

- 서버가 전환 생략 + Telegram 긴급 알림
- 그대로 rate-limit 맞을 때까지 진행
- 다음 60초 크론에서 재시도 (하지만 이미 rate-limit 가능)

---

## 전환 후 (새 계정 keychain swap 된 직후)

1. 서버가 1.5초 후 `/pickup` 주입
2. Claude는 `/pickup` 스킬로 RESUME.md 읽기
3. `mode: auto-switch` 감지 시:
   - Completed 중복 실행 금지
   - 첫 행동 전 한 줄 요약 ("계정 전환 후 재개: <작업>")
   - 바로 작업 재개

---

## zzz 모드와의 상호작용

zzz 모드 진입 즉시 auto-switch도 활성 (a-team 엔진은 zzz와 독립적으로 60초 크론).

- zzz 모드는 RESUME.md를 지속 갱신 → autosave 프롬프트 수신 시 빠르게 완료 가능
- 전환 후 `/pickup`이 `mode: auto-switch` 감지 → zzz 루프 이어서 진행
- `mode: zzz` 는 유지, `auto-switch`는 1회 스냅샷 이벤트

---

## Telegram 메시지 종류

| 상황 | 메시지 |
|---|---|
| 전환 준비 | 🔄 계정 자동 전환 준비 (outgoing → incoming) |
| 전환 완료 | ✅ 계정 자동 전환 완료 (/pickup 주입됨) |
| autosave 타임아웃 | ❌ 자동 전환 중단 (3분 내 저장 실패) |
| keychain swap 실패 | ❌ 자동 전환 실패 (로그 확인 필요) |
| 양 계정 소진 | ⚠️ 계정 자동 전환 실패 (양 계정 모두 소진) |
| 서버 없음 (Telegram fallback) | 🔔 계정 전환 필요 (수동) |

---

## 설정 파일 위치

| 파일 | 용도 |
|---|---|
| `~/.ateam/accounts.json` | OAuth 계정 레지스트리 (claude-remote도 참조) |
| `~/.ateam/usage-cache.json` | 계정별 usage 캐시 (60s TTL) |
| `~/.ateam/auto-switch-state.json` | 마지막 전환 시각 + 쿨다운 상태 |
| `~/.claude-remote/accounts.json.superseded` | 마이그레이션 백업 (90일 후 자동 삭제) |

---

## 코드 위치

### a-team (엔진, 유일한 정본)
- `scripts/auto-switch/accounts-state.mjs` — 계정 레지스트리
- `scripts/auto-switch/check-usage.mjs` — Anthropic API 폴링
- `scripts/auto-switch/swap-keychain.mjs` — keychain swap
- `scripts/auto-switch/trigger.mjs` — 60s 진입점
- `scripts/install-auto-switch-cron.sh` — launchd 설치

### claude-remote (얇은 PTY 어댑터)
- `packages/server/src/index.ts` — `POST /internal/auto-switch` 엔드포인트
- `packages/server/src/session.ts` — `isSessionIdle`, `getLastPtyActivity`, `outputContainsMarker`, `writeToSession`, `listSessionIds`
- `packages/server/src/accounts.ts` — `~/.ateam/accounts.json` 참조 (legacy 마이그레이션 포함)

---

## 설치

```bash
# a-team launchd 설치 (맥 상시 실행, 60초 간격)
bash ~/Projects/a-team/scripts/install-auto-switch-cron.sh install

# 상태 확인
bash ~/Projects/a-team/scripts/install-auto-switch-cron.sh status

# 수동 1회 실행 (테스트)
bash ~/Projects/a-team/scripts/install-auto-switch-cron.sh run-once

# 제거
bash ~/Projects/a-team/scripts/install-auto-switch-cron.sh uninstall
```

---

## 관련 규칙

- [pickup 스킬](/Users/noir/.claude/commands/pickup.md) — 재개 로직
- [zzz 스킬](/Users/noir/.claude/commands/zzz.md) — 풀 오토 수면 모드
- [resume 스킬](/Users/noir/.claude/commands/resume.md) — 리셋 후 재개만
- [ateam-sovereignty](./ateam-sovereignty.md) — 제2원칙 (a-team이 정본)

---

**Last updated**: 2026-04-20 — 결정 엔진 a-team 이식, claude-remote 얇은 어댑터화
