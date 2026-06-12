# governance/events.jsonl — Event Schema

Append-only session event log. OpenHands EventLog 패턴 기반.

## 파일 위치
`governance/events.jsonl` — 줄당 JSON 1개 (JSONL)

## 공통 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | string | 이벤트 종류: `message` \| `action` \| `observation` |
| `ts` | ISO8601 | UTC 타임스탬프 |
| `session_id` | string | `$CLAUDE_SESSION_ID` 또는 `$PPID-$PID` 폴백 |

## 이벤트 종류

### MessageEvent
사용자 메시지 수신 시 기록.

```json
{"type": "message", "ts": "...", "session_id": "...", "content_preview": "first 100 chars"}
```

### ActionEvent
커맨드 실행, 파일 수정 등 Claude 행동 기록.

```json
{"type": "action", "ts": "...", "session_id": "...", "action": "command_start", "name": "tdd", "status": "started"}
{"type": "action", "ts": "...", "session_id": "...", "action": "command_complete", "name": "tdd", "status": "success"}
{"type": "action", "ts": "...", "session_id": "...", "action": "file_edit", "path": "worker/src/index.ts", "lines_changed": 15}
```

### ObservationEvent
테스트 결과, 배포 완료, 에러 등 관찰 결과 기록.

```json
{"type": "observation", "ts": "...", "session_id": "...", "observation": "test_pass", "details": "541 tests passed"}
{"type": "observation", "ts": "...", "session_id": "...", "observation": "deploy_success", "details": "cortex.feat-breeze.workers.dev"}
{"type": "observation", "ts": "...", "session_id": "...", "observation": "error", "details": "SyntaxError in worker/src/index.ts:45"}
{"type": "observation", "ts": "...", "session_id": "...", "observation": "session_end", "details": "claude_stop_hook"}
```

## 로거 사용법

```bash
# action 이벤트
node scripts/log-session-event.mjs action action=command_start name=tdd

# observation 이벤트
node scripts/log-session-event.mjs observation observation=test_pass details="541 tests passed"

# message 이벤트
node scripts/log-session-event.mjs message content_preview="user asked about..."
```

## 로테이션
10,000줄 초과 시 마지막 8,000줄만 보존. 자동 적용.

## Stop 훅 등록
`scripts/hooks/session-event-logger.sh`를 `~/.claude/settings.json`의 `Stop` 훅에 등록.
