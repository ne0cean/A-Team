# /pmi — Post-Major-Integration (PIOP 자동 실행)

> **용도**: 메이저 통합(새 서브시스템, 대규모 리팩토링, governance/규칙 대폭 수정) 직후 실행하는 5-Phase 최적화 파이프라인.
> **관계**: `governance/workflows/post-integration.md` (PIOP)의 짧은 별칭 + 실행 entry point. `/optimize` 와 동일한 workflow를 가리키지만 **메이저 통합 트리거용 전용 이름**.
> **자동 호출 지점**: orchestrator Phase 5.7, vibe Step 0.5, end.md. 명시 호출은 `/pmi` 또는 `/optimize`.

---

## 왜 별도 명칭

- `/optimize` 는 광범위 (biweekly, dead path, token, ...)
- `/pmi` 는 **메이저 통합 이후** 맥락에 집중:
  1. 신규 자원이 기존과 제대로 연결됐나? (Integration Map)
  2. Cross-module wiring 누락 없나?
  3. 새 trigger가 적절한가?
  4. 에이전트 프롬프트 오버사이즈 안 됐나? (token cost)
  5. 회귀 없나? (validation)

단일 명칭으로 **어제 밤 Design Subsystem 같은 대규모 변경 뒤 "`/pmi` 돌려"** 한 마디로 정식 프로토콜 트리거.

---

## 실행 프로토콜

`governance/workflows/post-integration.md` 의 Phase 1-5 를 그대로 수행:

### Phase 1 — Integration Map (신규 자원 ↔ 기존 코드 매트릭스)
```bash
# 이번 통합 범위 감지 (사용자가 base 커밋 명시 or 자동 추론)
BASE="${PMI_BASE:-$(git log --oneline -20 | grep -m1 'chore: 세션' | awk '{print $1}')}"
git diff --name-status "$BASE"..HEAD -- '.claude/**' 'lib/**' 'governance/**' 'scripts/**' 'CLAUDE.md' 'test/**'
```
- 신규 파일(A) + 수정 파일(M) 전수
- 각 자원별 다음 3개 확인:
  1. 어디서 **읽는가** (consumer)
  2. 어디서 **호출/참조하는가** (trigger)
  3. 어느 **테스트가 커버**하는가
- 미연결 항목 HIGH/MEDIUM/LOW 분류

### Phase 2 — Cross-Module Wiring (연결 자동 수행)
Phase 1 HIGH 항목부터 실제 코드 수정으로 연결:
- 신규 lib 함수를 호출하는 에이전트/스킬 연결
- 신규 agent를 호출하는 orchestrator/command 업데이트
- 신규 governance rule 을 CLAUDE.md 자동 로드 목록에 추가
- 단일 진실 공급원(JSON config 등) 여러 곳 import 확인

### Phase 3 — Trigger Optimization
- 새 커맨드 trigger 키워드 명확한가
- CLAUDE.md 자동 로드 조건 정확한가 (false positive 없는가)
- PostToolUse / SessionStart 훅 필요한 곳 누락 없는가
- Circuit breaker / analytics / learnings 연동 누락 확인

### Phase 4 — Token Cost (에이전트 사이즈 측정)
```bash
wc -w .claude/agents/*.md .claude/commands/*.md | sort -n | tail -20
```
- 에이전트 프롬프트 > 1500 words 시 축약 검토 (orchestrator 예외)
- 커맨드 프롬프트 > 1200 words 시 on-demand 로드 구조 검토
- 최근 크기 추이를 `.context/benchmarks/` 에 기록

### Phase 5 — Validation
```bash
npm test 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
npm audit --omit=dev 2>&1 | tail -3
```
- 테스트 수 증감 기록 (이전 baseline 대비)
- 에러 0, 취약점 0 필수
- 선택: adversarial 서브에이전트 호출로 red team 1회

---

## 산출물

`.context/pmi-{YYYY-MM-DD}.md`:
```markdown
---
date: ISO
base_commit: HASH
head_commit: HASH
session_summary: "한 줄"
---

## Phase 1 — Integration Map
- 신규 자원 N개, 수정 M개
- HIGH 미연결: [list]
- MEDIUM: [list]
- LOW: [list]

## Phase 2 — Wiring 수행
- 연결된 항목: [list with commits]
- Deferred: [list with reason]

## Phase 3 — Trigger Audit
- 적절: [list]
- 추가/수정 필요: [list]

## Phase 4 — Token Cost
- 에이전트 top 5 size
- 오버사이즈 flag: [list]
- Delta from last baseline

## Phase 5 — Validation
- Tests: before → after
- Tsc: errors
- Audit: vulns
- Adversarial: PASS/FINDINGS

## Next Actions
- 즉시 수정 가능: [list]
- Next session defer: [list]
```

---

## 자동 트리거 규칙 (vibe.md Step 0.5 와 동일)

다음 중 하나 이상이면 `/pmi` 자동 실행 제안:
1. 직전 커밋들이 `lib/*.ts`, `.claude/agents/*.md`, `governance/**`, `scripts/*.mjs` 중 3개 이상 카테고리를 touch
2. 1일 내 신규 파일 10개 이상
3. `governance/rules/*` 신규/수정
4. 사용자가 명시 호출 (`/pmi`, `/optimize`)

`vibe.md` Step 0.5 와 `orchestrator.md` Phase 5.7 에서 감지 후 제안.

---

## 실행 방식

이 스킬은 **Claude가 순차 수행** (서브에이전트 아님 — 전체 레포 컨텍스트 필요).
단, Phase 2 개별 수정은 `coder` 서브에이전트 위임 가능.

---

## 관계도

```
/pmi ─┬─→ governance/workflows/post-integration.md (정식 프로토콜)
      ├─→ vibe.md Step 0.5 (세션 시작 자동 감지)
      ├─→ orchestrator.md Phase 5.7 (서브에이전트 완료 후 자동)
      ├─→ end.md Step 3 (세션 종료 시 Phase 1 약식)
      └─→ 별칭: /optimize --piop (동일 workflow)
```

`/pmi` 는 **이름만 다른 entry point** — 실제 로직은 post-integration.md 가 SSOT.
