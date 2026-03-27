# 19. 멀티 에이전트 패턴 단계적 도입 계획

> **생성**: 2026-03-27
> **기반**: 20+ 프레임워크 리서치 (docs/18) + 7차원 평가 (docs/17)
> **원칙**: 구조적 안정성 최우선 — 기존 A-Team 워크플로우 완전 보존

---

## 도입 방향

### 핵심 판단
외부 프레임워크(CrewAI/LangGraph/OpenAI Agents SDK) **직접 의존 없이** 검증된 패턴만 A-Team 네이티브로 통합한다.

근거:
- A-Team은 Claude Code 전용 도구 — Python 프레임워크 런타임 불필요
- 기존 Task tool + 에이전트 파일 구조가 이미 Supervisor 패턴 구현
- 패턴만 차용하면 토큰 오버헤드 없이 동일한 효과

### 3단계 로드맵

```
Phase 1 (즉시, 패턴 도입)
  → orchestrator.md 강화: MixtureOfAgents 모드
  → reviewer.md 강화: 3-tier Guardrail 레이어
  → governance/rules/guardrails.md 신규
  → governance/rules/checkpointing.md 신규

Phase 2 (인프라, 체크포인트)
  → .context/checkpoints/ 디렉토리 규약
  → templates/PARALLEL_PLAN.md 체크포인트 섹션 추가
  → scripts/checkpoint.sh 신규

Phase 3 (선택적 프레임워크 연동, 미래)
  → LangGraph 체크포인팅 MCP 서버 연동 (평가 후 결정)
  → smolagents 코드 액션 패턴 실험
```

---

## 파일별 상세 설계

### 변경 대상 매트릭스

| 파일 | 조치 | 크기 변화 | 기존 기능 영향 |
|------|------|-----------|--------------|
| `.claude/agents/orchestrator.md` | 강화 | +60줄 | 없음 (기존 Supervisor 유지, MoA 옵션 추가) |
| `.claude/agents/reviewer.md` | 강화 | +40줄 | 없음 (2-pass 유지, 3-tier 구조 명확화) |
| `.claude/agents/coder.md` | 강화 | +20줄 | 없음 (기존 패턴 유지, code-first 힌트 추가) |
| `governance/rules/guardrails.md` | **신규** | 80줄 | - |
| `governance/rules/checkpointing.md` | **신규** | 60줄 | - |
| `templates/PARALLEL_PLAN.md` | 강화 | +15줄 | 없음 (체크포인트 섹션 추가) |
| `docs/08-orchestration-patterns.md` | 강화 | +50줄 | 없음 (MoA/SOP 패턴 섹션 추가) |
| `docs/INDEX.md` | 강화 | +1행 | 없음 |

### 삭제/대체 없음
기존 파일 전체 보존. 신규 기능은 추가(additive)만.

---

## Phase 1 상세 설계

### 1. MixtureOfAgents 모드 (orchestrator.md 강화)

**출처**: Swarms 프레임워크의 MixtureOfAgents 패턴
**핵심**: 동일 태스크를 여러 전문 에이전트가 병렬 처리 → aggregator가 최선 합성

```
기존 Supervisor:
  orchestrator → coder (단독 실행)

새 MoA 모드:
  orchestrator → [coder-A, coder-B, researcher] 병렬
              → aggregator (최선 답 선택 + 합성)
```

**적용 조건** (orchestrator가 자동 판단):
- 태스크에 "최선 방안" / "옵션 비교" / "리서치 기반 설계" 포함 시
- 단순 구현 태스크에는 비적용 (기존 Supervisor 유지)

**추가될 PARALLEL_PLAN.md 섹션**:
```markdown
## MoA 실행 설정 (선택)
mode: supervisor | moa
moa_workers: 3
moa_aggregator: architect
moa_trigger: "설계/옵션/최선/비교" 키워드 시
```

---

### 2. 3-tier Guardrail 레이어 (reviewer.md 강화 + guardrails.md 신규)

**출처**: OpenAI Agents SDK의 3단계 가드레일
**기존**: reviewer.md 2-pass (Critical Pass + Informational Pass)
**강화**: 3-tier로 명확화

```
Tier 1 — Input Guardrail (실행 전)
  ├─ 보안 키워드 스캔 (auth/sql/token/password)
  ├─ 파일 소유권 충돌 감지
  └─ 민감 파일 접근 차단 (.env, credentials)

Tier 2 — Tool Guardrail (실행 중, 기존 harness)
  ├─ templates/hooks/pre-bash.sh — 위험 명령 차단
  ├─ templates/hooks/pre-write.sh — 민감 파일 쓰기 차단
  └─ 기존 harness 엔지니어링 (docs/12)과 연계

Tier 3 — Output Guardrail (실행 후)
  ├─ 빌드 검증 (npm run build 또는 CLAUDE.md 빌드 명령)
  ├─ 테스트 통과 확인
  └─ 기존 Critical Pass / Informational Pass
```

**중요**: Tier 2는 이미 `governance/rules/` + `templates/hooks/`로 구현됨.
→ **신규 작업**: Tier 1 Input Guardrail만 추가, Tier 3 명시적 구조화.

---

### 3. 체크포인팅 (checkpointing.md 신규 + .context/checkpoints/)

**출처**: LangGraph의 MemorySaver/SQLite 체크포인팅
**A-Team 구현**: 파일 기반 (외부 의존성 없음)

**체크포인트 파일 형식**:
```json
// .context/checkpoints/{task_id}-{timestamp}.json
{
  "task_id": "T-002",
  "agent": "coder",
  "status": "in_progress",
  "completed_steps": ["파일 읽기", "테스트 작성"],
  "remaining_steps": ["구현", "빌드 검증"],
  "files_modified": ["src/auth.ts"],
  "last_build": "failed",
  "resume_prompt": "auth.ts 구현 계속. 테스트는 통과. 빌드 실패 원인: type error line 45"
}
```

**orchestrator가 체크포인트 활용**:
- 에이전트 BLOCKED 반환 시 → 체크포인트 저장
- 재시작 시 → 체크포인트 로드 → `resume_prompt`로 이어받기
- 완료 후 → 체크포인트 아카이브 (`.context/checkpoints/archive/`)

---

### 4. SOP-based Workflow (기존 governance/workflows/ 강화)

**출처**: MetaGPT의 SOP(Standard Operating Procedure) 기반 워크플로우
**현재**: session-start/end, vibe, self-optimization 등 비공식 워크플로우
**강화**: 각 워크플로우에 명시적 입출력 artifact 선언 추가

```markdown
## SOP 강화 원칙 (기존 파일에 섹션 추가)

### Input Artifacts
- CURRENT.md (필수)
- PARALLEL_PLAN.md (있으면)

### Output Artifacts
- CURRENT.md 갱신 (필수)
- 체크포인트 파일 (태스크 중단 시)

### Completion Gate
- 빌드 통과 확인
- status = DONE or DONE_WITH_CONCERNS
```

---

## Phase 2 상세 설계

### scripts/checkpoint.sh (신규)

```bash
#!/bin/bash
# checkpoint.sh — 태스크 체크포인트 저장/로드

CHECKPOINT_DIR=".context/checkpoints"
mkdir -p "$CHECKPOINT_DIR/archive"

case "$1" in
  save)
    # 인수: task_id agent_name status resume_prompt
    echo '{"task_id":"'$2'","agent":"'$3'","status":"'$4'","resume_prompt":"'$5'","timestamp":"'$(date -u +%Y%m%dT%H%M%S)'"}' \
      > "$CHECKPOINT_DIR/$2-$(date +%s).json"
    ;;
  load)
    # 가장 최근 체크포인트 반환
    ls -t "$CHECKPOINT_DIR"/*.json 2>/dev/null | head -1 | xargs cat 2>/dev/null
    ;;
  archive)
    mv "$CHECKPOINT_DIR"/*.json "$CHECKPOINT_DIR/archive/" 2>/dev/null
    ;;
esac
```

---

## 기존 기능 보존 보장

### 깨지면 안 되는 것
1. `/vibe` 세션 시작 흐름
2. orchestrator → coder/researcher/reviewer 기본 Supervisor 흐름
3. PARALLEL_PLAN.md 파일 소유권 시스템
4. `governance/rules/preamble.md` 6가지 원칙
5. `.claude/commands/` 슬래시 커맨드 전체
6. `install-commands.sh` 배포 파이프라인

### 검증 방법
- Phase 1 완료 후 기존 오케스트레이션 패턴 수동 검증
- 신규 섹션은 "## 선택적 강화" 또는 "## 옵션" 태그 아래 배치
- 기존 섹션 수정 없이 새 섹션만 추가(append)

---

## 구현 우선순위

```
P0 (즉시):
  1. governance/rules/guardrails.md — 신규 (80줄, Input Guardrail 정의)
  2. governance/rules/checkpointing.md — 신규 (60줄, 체크포인트 규약)
  3. .claude/agents/orchestrator.md — MoA 모드 섹션 추가
  4. .claude/agents/reviewer.md — 3-tier Guardrail 구조 명확화

P1 (이번 세션):
  5. docs/08-orchestration-patterns.md — MoA/SOP 패턴 섹션 추가
  6. templates/PARALLEL_PLAN.md — 체크포인트 + MoA 섹션 추가

P2 (다음 세션):
  7. scripts/checkpoint.sh — 체크포인트 스크립트
  8. .context/checkpoints/ — 디렉토리 초기화
```

---

## 참조 문서
- `docs/17-integration-evaluation-framework.md` — 7차원 평가 기준
- `docs/18-multi-agent-orchestration-research.md` — 프레임워크 리서치 원본
- `docs/08-orchestration-patterns.md` — 기존 오케스트레이션 이론
- `docs/12-harness-engineering.md` — 기존 Tier 2 Guardrail (hooks)
