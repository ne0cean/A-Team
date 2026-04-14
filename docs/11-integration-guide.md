# A-Team + Vibe-Toolkit 통합 가이드

## ⚡ 최우선 원칙 — On-Demand Context Loading (Phase 14, 2026-04-14)

> **매 세션 전체 docs/rules 로드 금지. 트리거 기반 필요 시 grep → 해당 본문만 Read.**
> 토큰 효율성은 A-Team 통합의 핵심 지표이며 모든 문서 설계/추가 시 반드시 검토.

### 3-Tier Context 계층
| Tier | 로드 방식 | 대상 |
|------|----------|------|
| **Tier 0 (항상)** | 자동 주입, ~200 lines 상한 | `CLAUDE.md` (25줄) + `.context/CURRENT.md` + `TRIGGER-INDEX.md` (인덱스만) |
| **Tier 1 (상시 준수, 요약만)** | 1-line summary via memory feedback | `truth-contract`, `sovereignty`, `coding-safety` |
| **Tier 2 (조건부 Read)** | 키워드 grep → 해당 rule 본문만 | 나머지 12+ governance rules, docs/*, rfc/* |

### 새 문서/rule 추가 시 체크리스트 (필수)
- [ ] `governance/rules/TRIGGER-INDEX.md`에 1줄 등록 (trigger 조건 + 키워드)
- [ ] 본문 100 lines 초과 시 1줄 요약 버전 별도 제공
- [ ] 매 세션 자동 로드 필요성 재검토 (기본: NO)
- [ ] 상시 적용 필요 rule은 `~/.claude/memory/feedback_*.md`로 분리하여 1줄만 유지

### 금지 패턴
- ❌ CLAUDE.md에 큰 문서 `cat` 삽입 (예: MIGRATION.md 전체)
- ❌ 새 rule 추가하며 index 등록 누락
- ❌ 트리거 조건 없는 "어디선가 필요할 것 같은" 로드
- ❌ 1205 lines의 governance/rules/ 전체를 세션 시작에 주입

### 권장 패턴
- ✅ 사용자 메시지에 키워드 감지 → `grep -i "키워드" ~/tools/A-Team/governance/rules/TRIGGER-INDEX.md` → 매칭된 rule만 Read
- ✅ 큰 Research 문서 (rfc/, final/)는 **이름만** 인덱스에 등록, 실제 로드는 작업 시
- ✅ Rule 본문 Read 후 요약 1-2줄 기억 → 재로드 금지 (No Redundant Reads)

### 추후 감사
매 Phase 종료 후 `scripts/inspect-integration.mjs`에 토큰 효율 메트릭 추가:
- 세션 시작 자동 로드 라인 수 측정
- 상한: 300 lines (Tier 0 대상 범위)
- 초과 시 경고 + 재분류 강제

---

## 핵심 개념

**A-Team = 실행 엔진** / **Vibe-Toolkit = 운영 원칙**

두 시스템은 역할이 다르다. A-Team은 "누가 무엇을 어떻게 병렬로 실행하는가"를 담당하고, Vibe-Toolkit은 "어떤 원칙으로 일하는가"를 담당한다. 통합의 핵심은 **orchestrator가 거버넌스 규칙을 로드해 모든 서브에이전트에 주입**하는 것이다.

---

## 통합 스택 구조

```
[사용자 요청]
      ↓
[CLAUDE.md] ← 세션 시작 시 자동 로드
      ↓
[/vibe 또는 직접 요청]
      ↓
┌─────────────────────────────────────────────┐
│  orchestrator (.claude/agents/)             │
│                                             │
│  Phase 0: .agent/rules/ 로드               │
│    coding-safety + sync-and-commit +        │
│    turbo-auto → governance 객체 생성        │
│                                             │
│  Phase 1: .context/CURRENT.md 읽기         │
│  Phase 2: 태스크 분해 + 파일 소유권 배정   │
│  Phase 3: PARALLEL_PLAN.md 작성            │
│  Phase 4: 에이전트 스폰 (governance 포함)  │
│  Phase 5: 결과 취합 + CURRENT.md 갱신      │
└──────────┬──────────────────────────────────┘
           │ task JSON + governance 객체
    ┌──────┼──────────────────┐
    ↓      ↓                  ↓
[researcher] [coder]      [reviewer]
(Haiku)    (Sonnet)       (Sonnet)
           + governance    + governance
           규칙 준수:       규칙 준수:
           - 파일 전체 읽기  - CRITICAL/HIGH 분류
           - build 검증     - 보안 취약점 탐지
           - commit 포맷    - 빌드 통과 확인
                ↓
         [architect] (Opus) — 설계 필요 시
      ↓
[.context/CURRENT.md 갱신]
      ↓
[/end — vibe 커밋 포맷으로 완료]
```

---

## 레이어 구성

| 레이어 | 파일 위치 | 역할 | 누가 읽는가 |
|--------|----------|------|------------|
| **진입점** | `CLAUDE.md` | 세션 시작 시 전체 규칙 요약 | Claude (자동) |
| **거버넌스** | `.agent/rules/` | 코딩 안전, 커밋 형식, 자율 실행 | orchestrator → 서브에이전트 |
| **워크플로우** | `.agent/workflows/` | 세션 시작/종료, 모델 전환 | /vibe, /end 스킬 |
| **실행 에이전트** | `.claude/agents/` | 5개 전문 에이전트 | Claude (서브에이전트 호출 시) |
| **살아있는 컨텍스트** | `.context/` | 현재 상태 + 결정 로그 | orchestrator + 에이전트 |
| **장기 메모리** | `memory/` | 세션 간 연속성 | 세션 시작 시 |

---

## 신규 프로젝트 셋업 (단 1개 명령)

```bash
# A-Team이 서브모듈로 있는 경우
bash A-Team/templates/init.sh [프로젝트명] ./A-Team

# vibe-toolkit도 별도로 있는 경우 (규칙 파일 자동 복사)
bash A-Team/templates/init.sh [프로젝트명] ./A-Team /path/to/vibe-toolkit
```

**생성되는 구조:**
```
.context/CURRENT.md        ← 살아있는 상태 문서
.context/SESSIONS.md       ← 세션 로그
.context/DECISIONS.md      ← 의사결정 로그
memory/MEMORY.md           ← 장기 메모리
.agent/rules/              ← 거버넌스 규칙 3종
.agent/workflows/          ← 세션 워크플로우
.claude/agents/            ← A-Team 에이전트 5종
PARALLEL_PLAN.md           ← 오케스트레이션 플랜 템플릿
CLAUDE.md                  ← 통합 진입점
```

---

## 사용 패턴

### 패턴 1: 복잡한 멀티파일 작업
```
"이 기능을 A-Team으로 구현해줘"
→ orchestrator 자동 호출
→ Phase 0: governance 로드
→ PARALLEL_PLAN.md 작성
→ researcher + coder(들) + reviewer 병렬 실행
→ CURRENT.md 갱신 + 커밋 준비
```

### 패턴 2: 단순 작업
```
"이 버그 고쳐줘"
→ 에이전트 불필요 — 직접 수행
→ coding-safety 규칙은 직접 적용
```

### 패턴 3: 리서치 후 구현
```
"이 기술 조사하고 구현해줘"
→ orchestrator → T1: researcher (조사) → T2: coder (blocked-by T1)
→ 결과 취합 후 CURRENT.md 갱신
```

### 패턴 4: 아키텍처 결정
```
"이 시스템 어떻게 설계해야 해?"
→ architect 단독 호출 (Opus)
→ 설계 JSON 출력 → DECISIONS.md 기록
```

---

## 에이전트 선택 기준

```
요청 받음
    ↓
단순 작업? (파일 1-2개, 명확한 지시)
    ├─ YES → 직접 수행 (에이전트 불필요)
    └─ NO
         ↓
    리서치 필요?
    ├─ YES → researcher 먼저 (Haiku)
    └─ NO
         ↓
    설계/아키텍처 필요?
    ├─ YES → architect (Opus)
    └─ NO
         ↓
    구현 → coder (Sonnet)
    보안/10개↑파일 → reviewer 필수
    복잡 조합 → orchestrator → PARALLEL_PLAN.md
```

---

## governance 객체 — 핵심 연결고리

orchestrator가 Phase 0에서 `.agent/rules/`를 읽고 생성해 모든 서브에이전트 task JSON에 포함하는 객체:

```json
{
  "governance": {
    "read_full_file_before_edit": true,
    "build_required_after_change": true,
    "build_command": "npm run build",
    "max_retry_before_escalate": 2,
    "commit_format": "[type]: 요약\n\nNOW: ...\nNEXT: ...\nBLOCK: ...\nFILE: ...",
    "security_review_triggers": ["auth", "crypto", "input", "sql", "token", "password"],
    "visual_verify_required": true
  }
}
```

이 객체가 없으면 서브에이전트는 vibe 규칙 없이 실행된다.

---

## 개선사항 기록 파이프라인

```
개별 프로젝트에서 개선 아이디어 발견
         ↓
/improve [내용]  (글로벌 커맨드, 어디서든 실행)
         ↓
A-Team/improvements/pending.md에 자동 어펜드
  (날짜, 출처 프로젝트, 카테고리, 우선순위 자동 분류)
         ↓
A-Team 세션 /vibe 시작 시 "📬 대기 중 N건" 알림
         ↓
/improve apply  (A-Team에서 실행)
         ↓
반영 → done.md로 이동 → install-commands.sh → 모든 프로젝트 적용
```

