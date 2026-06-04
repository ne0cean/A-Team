# Supervisor Pattern — Multi-Agent Governance

> **출처**: AutoGen supervisor/worker hierarchy, LangGraph human-in-the-loop checkpoint, CrewAI guardrail_max_retries
> **A-Team 적용**: orchestrator(supervisor) ↔ coder/reviewer(worker) 관계 명문화

---

## 핵심 원칙

### 1. Generator-Evaluator 격리 (aider Architect/Editor 패턴)

```
Generator (coder)  →  산출물  →  Evaluator (reviewer/vigil)
     ↑                                    |
     |         피드백 (must_fix 목록)      |
     └────────────────────────────────────┘
```

- Generator는 Evaluator의 체크리스트를 보지 않음 (자기검열 방지)
- Evaluator는 Generator의 의도 프롬프트를 보지 않음 (독립 판정)
- 피드백 루프는 orchestrator가 중재 (직접 에이전트 간 호출 금지)

### 2. Human-in-the-Loop 자동 트리거 (LangGraph interrupt 패턴)

다음 조건 중 하나라도 해당하면 자동으로 사용자 확인 요청:

| 조건 | 트리거 기준 |
|------|-----------|
| Risk tier CRITICAL | impact-analysis 결과 10개+ 파일 영향 |
| Reviewer REJECTED 2회 | guardrail_max_retries 소진 |
| 보안 패턴 감지 | auth/crypto/token/sql/password 키워드 |
| 되돌릴 수 없는 변경 | DB 스키마 변경, public API 제거 |
| 컨텍스트 > 60% | Dumb Zone 진입 후 전략 전환 필요 |

### 3. Retry + Escalation (CrewAI guardrail_max_retries 패턴)

```
worker 완료 선언
  → vigil 검증
    → VERIFIED: 계속
    → PARTIAL/FAILED: feedback 주입 후 재디스패치 (retry_count++)
      → retry_count >= 2: 사용자 에스컬레이션 (무한 재시도 금지)
```

**Reviewer retry 에스컬레이션 조건:**
```
if reviewer.verdict == "REJECTED" && reviewer.retry_count >= 2:
    → 에스컬레이션: 사용자에게 REJECTED 이유 + 선택지 제시
    → 선택지: [수정 계속 / 현 상태 수락 / 태스크 재정의]
```

### 4. Phase 체크포인트 저장 (LangGraph checkpoint resume 패턴)

각 Phase 완료 시 `.context/checkpoints/{task-id}-phase{N}.json` 저장:

```json
{
  "task_id": "...",
  "phase": 3,
  "completed_at": "ISO8601",
  "artifacts": ["파일경로1", "파일경로2"],
  "next_phase": 4,
  "resume_from": "Phase 4 에이전트 실행"
}
```

중간 실패 시 마지막 성공 체크포인트부터 재개. Phase 0부터 재시작 금지.

---

## 에이전트 출력 status 표준 필드

모든 worker 에이전트는 다음 표준 필드로 응답해야 한다:

```json
{
  "status": "DONE | PARTIAL | BLOCKED | FAILED",
  "changed_files": ["목록"],
  "summary": "1줄 요약",
  "must_fix": ["미완료 항목 (PARTIAL/FAILED 시)"],
  "retry_count": 0,
  "escalate": false
}
```

orchestrator Phase 5는 이 필드를 기반으로 Vigil 호출 여부 자동 결정:
- `status == "DONE"` && `changed_files.length >= 2` → Vigil 자동 호출
- `status == "BLOCKED"` && `retry_count >= 2` → 사용자 에스컬레이션
- `escalate == true` → 즉시 사용자 에스컬레이션

---

## Supervisor ↔ Worker 관계도

```
Orchestrator (Supervisor)
├── Phase 1.5: Pre-Check (Haiku) — Skip Gate
├── Phase 2.07: PM Gate (Sonnet) — Scope 검증
├── Phase 4: Workers
│   ├── coder (Generator, Sonnet) — 구현
│   ├── researcher (Haiku) — 조사
│   └── architect (Opus) — 설계
├── Phase 5: Vigil (Evaluator) — 완료 검증
│   └── retry_count >= 2 → 사용자 에스컬레이션
└── Phase 5.7: PIOP — Post-Integration Optimization
```

**핵심**: orchestrator는 메인 루프만 담당. 에이전트 간 직접 통신 금지.

---

## A-Team 구현 현황

| 패턴 | 상태 | 위치 |
|------|------|------|
| Generator-Evaluator 격리 | 구현 | orchestrator.md Phase 2.7 |
| Vigil (완료 검증) | 구현 | .claude/agents/vigil.md |
| retry + escalation | 구현 | orchestrator.md Phase 5 |
| Human-in-the-loop | 부분 구현 | risk-tier.md |
| Phase 체크포인트 | 구현 | .context/checkpoints/ (subagent-stop.js 자동 저장) |
| SubagentStop hook | 구현 | ~/.claude/hooks/subagent-stop.js |

---

**연관**: `orchestrator.md`, `vigil.md`, `risk-tier.md`, `impact-analysis.md`
**Last updated**: 2026-06-04
