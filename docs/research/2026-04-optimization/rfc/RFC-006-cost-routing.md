# RFC-006 Cascade + Budget-Aware Routing

**Status**: Proposed | **Protected**: P2 강화, P3 확장, P4 확장 | **Untouched**: P1/P5/P6/P7/P8

## ⚠️ Adversarial Review 반영

**F5 (MED, RFC-003과 충돌)**: Haiku 60% 분포 목표 + **Haiku는 tool_search(RFC-003) 미지원**.

**정합 policy**:
1. Haiku tier-2: ToolSearch 우회, non-deferred catalog 사용
2. Sonnet/Opus tier: ToolSearch 적용, ToolSearch 효과 취함
3. Stage 5.6에서 Haiku 경로와 Sonnet+ 경로 독립 측정
4. Cascade 분포 실측 후 Haiku 비율 조정 가능

**F9 (LOW, M4 가드레일)**: "red-team test set"이 본문에 명시되지만 구체 dataset 없음.

**해결**: `tests/red-team/cascade-correctness/` 신설, 최소 30 케이스:
- multi-hop reasoning (>3 추론 단계)
- ambiguous spec (여러 해석 가능)
- counter-intuitive logic (Haiku가 속기 쉬운 패턴)
- edge cases from B1-B6 실제 실패 기록

G5-c (M4 ≥ baseline) 판정은 이 dataset으로만 검증.

**F16 (LOW, tiktoken Node.js)**: A-Team TS 스택에 Python tiktoken 불가.

**의존성 옵션 2개**:
- (a) `@anthropic-ai/tokenizer` (Anthropic 공식, 권장)
- (b) `tiktoken-node` fallback (OpenAI 호환 추정, ±5% 오차)

Phase 2 착수 시 (a) 우선, 없으면 (b).

**Earned Integration**: M1 -32~43% 는 실측 전 추정. arXiv 2511.17006의 33% 재현 검증 필수.

---


## 1. Problem Statement
9개 subagent 전부 `model: sonnet` (Sonnet 4.6). 그러나 상당수 호출이 **저복잡 작업** (researcher URL 수집, planner TodoWrite 분기, reviewer diff 포맷팅) — Haiku 4.5로 충분.

**비용 (1B tokens/월 가정)**:
- Baseline all-Sonnet: **$22,500/월**
- 60/30/10 분포: $18,788 (**−16.5%**)
- Optimal 70/25/5 (arXiv 2511.17006): $15,113 (**−33%**)

추가: 모든 tool use가 LLM 1회+ 호출, ripgrep/fd/jq는 40–500× 저렴. Budget-Aware Tool Routing → cheap-first 라우팅으로 +15–25% 절감 증명.

**문제**: (a) 복잡도 대비 model tier 과적합, (b) cheap tool 우선 사용 부재, (c) 세션 budget 가드 부재 → **Pareto 열위**.

## 2. Strength Claim (대체 아닌 강화)

- **P2 bkit gate-manager 강화**: 기존 `GateDefinition`에 `CascadeGateMetrics` **extends** 추가. circuit-breaker/state-machine/self-healing 무변경. opt-in 등록.
- **P3 PIOP 강화**: phase/decision/reasoning schema에 `budget` 필드 **추가** (optional). Ralph Loop 연동 무변경.
- **P4 Hooks 강화**: Pre/PostToolUse hook signatures에 `estimateCost`/`recordCost` 콜백 추가. 기존 훅 no-op.

P1/P5/P6/P7/P8 무침해.

## 3. Integration Design

### 3.1 `lib/gate-manager.ts`
```typescript
export interface CascadeGateMetrics extends GateMetrics {
  confidence: number;                // 0..1
  output_validation_pass: 0 | 1;
  tool_call_depth: number;
  budget_remaining_usd: number;
  previous_model_used: 'haiku' | 'sonnet' | 'opus';
  escalation_count: number;
}

export const CASCADE_GATE: GateDefinition = {
  pass:  [
    { metric: 'confidence', op: '>=', value: 0.85 },
    { metric: 'output_validation_pass', op: '===', value: 1 },
    { metric: 'tool_call_depth', op: '<=', value: 3 }
  ],
  retry: [
    { metric: 'confidence', op: '<', value: 0.70 },
    { metric: 'budget_remaining_usd', op: '<', value: 0.01 }
  ],
  fail:  [
    { metric: 'escalation_count', op: '>', value: 5 },
    { metric: 'budget_remaining_usd', op: '<=', value: 0 }
  ]
};
```

### 3.2 `lib/cost-tracker.ts` Hook Signatures
```typescript
export interface PreToolUseContext {
  tool: string;
  estimatedTokens: number;
  estimatedCostUsd: number;
  budgetRemainingUsd: number;
  cascadeModel: 'haiku' | 'sonnet' | 'opus';
}
export type PreToolUseHook = (ctx: PreToolUseContext) => 'proceed' | 'cheaper' | 'halt';
export type PostToolUseHook = (ctx: PreToolUseContext & { actualCostUsd: number }) => void;
```

### 3.3 `.claude/agents/*.md` Frontmatter
```yaml
---
name: researcher
model: sonnet                 # 기존 유지 (fallback)
preferred_model: haiku        # NEW
model_cascade: true           # NEW
budget_limit_usd: 2.50        # NEW
---
```
미지정 agent → 기존 동작 (cascade 비활성).

### 3.4 PIOP Schema Extension
```json
{
  "phase": "exec",
  "budget": {
    "total_usd": 5.0, "remaining_usd": 4.22,
    "spent_by_phase": { "pre_check": 0.10, "exec": 0.68 },
    "cost_per_tool": { "ripgrep": 0.001, "llm": 0.15 }
  },
  "decision": "deeper_or_pivot",
  "reasoning": "confidence 0.60, budget allows 28 LLM calls → deeper"
}
```

## 4. Implementation Plan

### Phase 1 — Sprint 1 (4–6h, S)
- `gate-manager.ts`에 `CascadeGateMetrics` + `CASCADE_GATE` 추가 (extends only)
- `cost-tracker.ts`에 Pre/PostToolUse signatures export
- `governance/cost-routing.md` (결정 + env flag 명세)
- `.claude/settings.json` env flag 기본값 (`A_TEAM_CASCADE=0`)

### Phase 2 — Sprint 2 (12–16h, M, **권장**)
- ripgrep/fd/jq wrapper + Windows grep pre-flight
- PreToolUse 실제 구현 (tool cost estimator table)
- PostToolUse delta log
- `.claude/agents/*.md` frontmatter parser
- PIOP budget schema validation

### Phase 3 — Stage 9 Defer (L/XL)
LSP/LSAP, Bubblewrap, cross-agent budget, real-time alerts.

## 5. Test Plan (3 RED, `npm run test` RED 확인 필수)

**RED-1 Confidence Escalation**:
- GIVEN Haiku confidence=0.70, validation=1, depth=2
- WHEN `evaluate(CASCADE_GATE, metrics)`
- THEN `retry` + escalation_count+ + next=Sonnet

**RED-2 Validation Fail Retry**:
- GIVEN malformed JSON (output_validation_pass=0)
- THEN `retry` → Sonnet 1회 → Opus 또는 fail

**RED-3 Budget Halt**:
- GIVEN `budget_remaining_usd=0.008`
- WHEN PreToolUse hook
- THEN `halt` + tool 차단 + PIOP `decision: "halt_budget_exhausted"`

파일: `lib/__tests__/cascade-gate.test.ts`, `lib/__tests__/cost-tracker.test.ts`.

## 6. Rollout + Rollback

### Env Flags (default = safe)
```bash
A_TEAM_CASCADE=0                   # OFF default → Sonnet only
A_TEAM_HAIKU_PCT=70
A_TEAM_CONFIDENCE_THRESHOLD=0.80
A_TEAM_BUDGET_AWARE=1
A_TEAM_BUDGET_TOTAL_USD=10.0
```

### Rollout
1. Phase 1 머지 → `A_TEAM_CASCADE=0` no-op 검증 (regression 0%)
2. Phase 2 머지 → dev에서 ON, B1–B6 × 3 runs
3. G5 통과 → main flag ON 기본값 전환
4. 주간 drift 리포트 (Stage 10 연동) Haiku over-confidence 모니터링

### Rollback
- 5%+ 퇴행 시: `A_TEAM_CASCADE=0` → gate-manager diff `git revert` → 분석 → 재활성
- Frontmatter default `model_cascade: false` → 자동 비활성
- PIOP `budget` optional → 기존 소비자 무영향

## 7. Success Criteria (G5)

| Gate | 목표 |
|------|-----|
| G5-a (≥15% 1 metric) | **M1 −32~43%** B1–B6 평균 (DD-05 §7) |
| G5-b (≤5% 악화 all) | M2/M3/M4/M5 충족 |
| G5-c (**M4 ≥ base**) | validation layer + ensemble 가드레일 |
| G5-d (≥4/6) | DD-05 projection 6/6 |
| G5-e (σ<m×0.1) | 3회 평균 |

**검증 표적 (DD-05 §7)**:
- B1 M1 **−24%**, B2 **−43%**, B3 **−56%**, B5 **−60%**, B6 **−50%** + M4 0.95→0.98 (개선)
- arXiv 2511.17006의 33% reduction 재현

## 8. Risks

| Risk | Sev | Mitigation |
|------|-----|-----------|
| Haiku over-confidence | HIGH | threshold 0.85→0.80 auto-tune, validation layer, red-team set |
| Budget drift | MED | SDK `countTokens()` ground truth + weekly report |
| 무한 escalation | MED | bkit circuit-breaker + max 2/task |
| Windows rg | LOW | pre-flight + graceful grep fallback |
| Budget 고갈 무응답 | LOW | PreToolUse halt + cached knowledge fallback |

**M4 가드레일**: pre-prod/release-blocking은 confidence 무관 **항상 Sonnet+**. B6 critical은 2+ model ensemble.

## 9. Open Questions
1. `countTokens()` 자체 비용 (무료 tier) — budget에서 초기 **제외**
2. Per-agent vs session budget — Phase 2에서 frontmatter opt-in
3. 60/30/10 → 70/25/5 전환: 1차 보수, 2주 drift 안정 후 optimal

## 10. Deliverables
- [ ] `lib/gate-manager.ts` CascadeGateMetrics + CASCADE_GATE
- [ ] `lib/cost-tracker.ts` hook signatures + cascade_model
- [ ] `lib/__tests__/cascade-gate.test.ts` (RED-1, RED-2)
- [ ] `lib/__tests__/cost-tracker.test.ts` (RED-3)
- [ ] `.claude/agents/*.md` frontmatter (pilot: researcher/planner/reviewer)
- [ ] PIOP schema budget 필드
- [ ] `governance/cost-routing.md`
- [ ] `.claude/settings.json` flags
- [ ] Windows grep pre-flight doc
- [ ] Baseline B1–B6 × 3 runs
- [ ] Post-rollout PERFORMANCE_LEDGER

## References
- DD-05: `docs/research/2026-04-optimization/round-3/DD-05-cost-routing.md`
- [arXiv 2511.17006](https://arxiv.org/abs/2511.17006), [Token Counting](https://platform.claude.com/docs/en/build-with-claude/token-counting), [RouteLLM](https://github.com/lm-sys/RouteLLM)
