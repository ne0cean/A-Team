---
name: analytics-logging
description: Analytics 로깅 패턴 — 슬래시 커맨드 의무 로깅, 이벤트 타입, jsonl vs db
tags: [analytics, logging, events, slash-commands, tracking]
---

# Analytics Logging

## 언제 사용

- 슬래시 커맨드 실행 시 (필수 — 첫 번째 액션)
- 주요 액션 추적 시
- 세션 이벤트 기록 시

## 패턴

### 슬래시 커맨드 의무 로깅

커맨드 파일에 `Analytics:` 라인이 있으면 **무조건 첫 번째 액션**으로 실행:

```bash
# 커맨드 시작
node scripts/log-event.mjs command_start name=<커맨드명>

# 커맨드 종료
node scripts/log-event.mjs command_end name=<커맨드명> success=true duration_sec=45
```

슬래시 커맨드 게이트 hook이 자동 주입하지만, 수동 실행 시에도 스킵 금지.

### log-event.mjs — 커맨드 레벨 이벤트

```bash
# 기본 사용법
node scripts/log-event.mjs <event_type> [key=value ...]

# 이벤트 타입
node scripts/log-event.mjs command_start name=retro
node scripts/log-event.mjs command_end name=ship success=true duration_sec=45
node scripts/log-event.mjs session_start
node scripts/log-event.mjs friction point="hook not installed" workaround="manual"
```

로그 위치: `.context/analytics.jsonl`

### log-session-event.mjs — 세션 레벨 이벤트

```bash
# 이벤트 타입: message | action | observation
node scripts/log-session-event.mjs action action=command_start name=tdd
node scripts/log-session-event.mjs action action=file_edit path=worker/src/index.ts lines_changed=15
node scripts/log-session-event.mjs observation observation=test_pass details="541 tests"
node scripts/log-session-event.mjs observation observation=deploy_success details="cortex.feat-breeze.workers.dev"
node scripts/log-session-event.mjs observation observation=error details="SyntaxError in worker/src/index.ts:45"
```

로그 위치: `governance/events.jsonl`

### analytics.jsonl vs analytics.db 차이

| 파일 | 용도 | 위치 |
|------|------|------|
| `.context/analytics.jsonl` | 커맨드 레벨 이벤트, 실시간 append | `.context/` |
| `governance/events.jsonl` | 세션 액션 상세 추적 | `governance/` |

### Autoresearch shadow 로깅

tracked 커맨드 완료 후 자동:
```
.autoresearch/_shadow/<name>/log.jsonl
```

## 예시

```bash
# /vibe 커맨드 시작 시
node scripts/log-event.mjs command_start name=vibe

# 구현 완료 후
node scripts/log-session-event.mjs observation observation=deploy_success details="skills 10개 파일 생성 완료"

# /end 커맨드 시
node scripts/log-event.mjs command_end name=end success=true
```

## 주의사항

- 슬래시 커맨드 Analytics 로깅 스킵 = CLAUDE.md 의무 위반
- 커맨드 파일의 `Analytics:` 라인 → 무조건 먼저 실행
- log-event.mjs: 커맨드/세션 수준 | log-session-event.mjs: 액션 상세 수준
