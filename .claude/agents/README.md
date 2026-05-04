# A-Team Agents — Sub-Agent 아키텍처

> **원칙**: Sub-agents는 **역할 분리가 아닌 컨텍스트 관리**를 위한 도구다.

---

## 핵심 원칙

### ❌ 잘못된 사용: 역할 의인화 (Anthropomorphizing Roles)

```
- frontend-agent (프론트엔드 담당)
- backend-agent (백엔드 담당)
- qa-agent (QA 담당)
- data-scientist-agent (데이터 분석 담당)
```

**문제**:
- 에이전트끼리 협업/소통이 필요해짐 → 복잡도 폭증
- 컨텍스트 중복 (같은 코드를 여러 에이전트가 읽음)
- 역할 경계 모호 ("이 파일은 누가 담당?")

---

### ✅ 올바른 사용: 컨텍스트 제어 (Context Control)

```
- research-agent: 긴 탐색 작업 → 간결한 요약만 반환
- search-agent: 파일 찾기 → 파일 경로만 반환
- coder-agent: 구현 (parent의 계획서 받음)
- reviewer-agent: 검증 (coder 결과만 봄)
```

**장점**:
- **독립 컨텍스트**: 각 에이전트가 자기 작업만 집중
- **Smart Zone 유지**: Parent는 압축된 결과만 받음
- **명확한 입출력**: 큐/파일로 통신 (직접 호출 금지)

---

## Sub-Agent 작동 방식

### 1. Research Sub-Agent (예시)

**Parent 요청**:
```
"SCM providers + Jira + Linear 연동이 어떻게 작동하는지 찾아줘"
```

**Sub-Agent 작업** (독립 컨텍스트):
- 10개 파일 읽기
- 5개 함수 추적
- 코드 흐름 분석
- **컨텍스트 사용: 30,000 tokens**

**Parent에 반환** (압축):
```markdown
## SCM Integration Flow

- Entry: `src/integrations/scm-provider.ts:45`
- Jira: `api/jira/webhook.ts:89` → `handleIssueUpdate()`
- Linear: `api/linear/sync.ts:123` → `syncIssues()`
- Dependencies: `types/Integration.ts`, `lib/oauth.ts`
```

**Parent 컨텍스트 사용: 500 tokens**

→ **60x 압축** (30,000 → 500)

---

### 2. Generator-Evaluator 격리 (GAN 원칙)

> **출처**: `orchestrator.md` Phase 2.7

**coder (Generator)**:
- 체크리스트 안 받음
- 태스크 스펙 + 코드만 받음
- 자기검열 편향 방지

**reviewer/qa/design-auditor (Evaluator)**:
- coder 의도 prompt 안 받음
- 결과 코드만 봄
- 독립 판정

**통신**: PARALLEL_PLAN.md / 큐 / 파일 (직접 호출 금지)

---

## A-Team 에이전트 목록

### 분석/리서치
- **insights**: 주간 analytics 집계 + 인사이트 생성
- **intel-analyzer**: 경쟁사/트렌드/페르소나 분석
- **researcher**: 웹 검색 + 문서 조사

### 설계/계획
- **pm**: 요구사항 정의 + 스코프 결정
- **architect**: 시스템 설계 + 기술 스택 선택
- **designer**: UI tone/variant 결정

### 구현
- **coder**: 코드 구현 (PARALLEL_PLAN 파일 소유권 준수)

### 검증
- **reviewer**: Pre-Landing PR 리뷰
- **qa**: QA 테스트 (8 카테고리)
- **design-auditor**: AI smell + a11y + 레이아웃 검증
- **guardrail**: 잔여 디버그 코드 + 품질 위반 감지
- **adversarial**: 적대적 리뷰 (공격자 시각)
- **cso**: 보안 감사 (OWASP/STRIDE)

### 자율/유지보수
- **pre-check**: Skip Gate (이미 구현됨/금지 파일 감지)
- **scope-validator**: 스코프 경계 검증

---

## Sub-Agent 호출 방법

### Task Tool 사용

```typescript
// Parent (orchestrator.md)
await Task({
  subagent_type: "research",
  prompt: "SCM providers 연동 방식 조사",
  description: "Codebase research"
});

// Research agent는 독립 컨텍스트에서 작업
// 결과만 parent에 반환
```

### 직접 호출 금지 (ECS 원칙)

```typescript
// ❌ 금지
coder.call(reviewer);
reviewer.call(coder);

// ✅ 허용
orchestrator.call(coder);
coder.write("output.json");
orchestrator.call(reviewer);
reviewer.read("output.json");
```

---

## Context Engineering 참고

**상세**: `governance/rules/context-engineering.md`

- **Smart Zone**: 0-40% (최적)
- **Dumb Zone**: 40-100% (저하)
- **Compaction**: 40% 초과 시 `/handoff` 자동

---

## References

- `orchestrator.md` Phase 2.7, 2.8
- `governance/rules/context-engineering.md`
- Dex Horthy, "No Vibes Allowed" (2024)
- `.research/notes/2026-05-04-no-vibes-allowed-dex-horthy.md`
