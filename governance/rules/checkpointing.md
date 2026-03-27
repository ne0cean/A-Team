# CHECKPOINTING — 태스크 체크포인트 규약

에이전트 실패/중단 시 처음부터 재실행하지 않고 중단 지점에서 이어받기 위한 파일 기반 체크포인트 시스템.
**출처**: LangGraph MemorySaver/SQLite 체크포인팅 패턴. 외부 의존성 없이 파일로 구현.

---

## 저장 위치

```
.context/
└── checkpoints/
    ├── {task_id}-{timestamp}.json   ← 활성 체크포인트
    └── archive/
        └── {task_id}-{timestamp}.json  ← 완료 후 아카이브
```

---

## 체크포인트 파일 형식

```json
{
  "task_id": "T-002",
  "agent": "coder",
  "session_id": "2026-03-27-abc123",
  "status": "in_progress",
  "completed_steps": [
    "파일 읽기 완료",
    "테스트 작성 완료 (RED)"
  ],
  "remaining_steps": [
    "구현 (GREEN)",
    "리팩토링 (REFACTOR)",
    "빌드 검증"
  ],
  "files_modified": [
    "src/auth/oauth.ts",
    "src/auth/__tests__/oauth.test.ts"
  ],
  "last_build": "not_run",
  "last_error": null,
  "resume_prompt": "oauth.ts 구현 계속. 테스트 파일 작성 완료, RED 확인됨. 다음: GREEN 단계 최소 구현 작성.",
  "timestamp": "2026-03-27T10:30:00Z"
}
```

### 필드 설명
| 필드 | 설명 |
|------|------|
| `task_id` | PARALLEL_PLAN.md의 태스크 ID |
| `agent` | 체크포인트를 생성한 에이전트 이름 |
| `status` | `in_progress` / `blocked` / `completed` |
| `completed_steps` | 이미 완료된 단계 목록 |
| `remaining_steps` | 아직 남은 단계 목록 |
| `files_modified` | 이미 수정된 파일 목록 |
| `last_build` | `passed` / `failed` / `not_run` |
| `last_error` | 마지막 실패 원인 (있으면) |
| `resume_prompt` | 다음 에이전트에게 전달할 이어받기 지시 |

---

## 체크포인트 생성 시점

에이전트는 아래 조건에서 체크포인트를 저장한다:

1. **중단 전** (BLOCKED 반환 직전)
2. **주요 단계 완료 시** (TDD의 RED → GREEN 전환 등)
3. **세션 종료 전** (status = in_progress인 태스크 있을 때)

---

## orchestrator의 체크포인트 활용

### 에이전트 BLOCKED 시
```
1. 에이전트 → orchestrator: status: BLOCKED
2. orchestrator → .context/checkpoints/{task_id}.json 저장
3. 사람 에스컬레이션 또는 다른 에이전트 재배정
```

### 에이전트 재시작 시
```
1. orchestrator → checkpoints/ 확인
2. 해당 task_id의 최신 체크포인트 로드
3. resume_prompt를 태스크 앞에 추가하여 에이전트 재실행
```

### 완료 시 아카이브
```
1. 에이전트 → status: DONE
2. orchestrator → .context/checkpoints/{task_id}.json을 archive/로 이동
```

---

## scripts/checkpoint.sh 사용법

```bash
# 체크포인트 저장
bash scripts/checkpoint.sh save T-002 coder blocked \
  "oauth.ts 구현 계속. 테스트 완료, 빌드 실패 원인 type error line 45"

# 최신 체크포인트 조회
bash scripts/checkpoint.sh load T-002

# 완료 후 아카이브
bash scripts/checkpoint.sh archive T-002
```

---

## 관련 파일
- `scripts/checkpoint.sh` — 체크포인트 저장/로드/아카이브 스크립트
- `docs/13-context-continuity-protocol.md` — CC Mirror 핸드오프 프로토콜
- `governance/rules/preamble.md` — BLOCKED 상태 코드 정의
