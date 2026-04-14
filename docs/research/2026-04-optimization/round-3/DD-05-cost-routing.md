# DD-05 — Cascade Routing + Budget-Aware Tool Routing (P2, P3)

## 1. Cascade Routing (Haiku→Sonnet→Opus)

### Architecture (bkit gate-manager 확장)

```
Input → Gate(confidence ≥0.85, validation pass, depth ≤3)
  ├─ YES → Haiku (60% 분포)
  └─ NO  → Sonnet (30%)
          ├─ Still fail → Opus (10%, final judge)
```

### Escalation Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Low confidence | self-assess <0.85 | → Sonnet |
| Output validation fail | malformed JSON, schema miss | → Sonnet |
| Multi-hop reasoning | tool chain >3 steps | → Sonnet + pre-check |
| Tool exec fail | timeout/error | Retry Sonnet |
| Production/sensitive | release-blocking | → Opus (judge) |

### Model Distribution + Cost (2026-04)

| Model | 분포 | Input/M | Output/M | Use |
|------|-----|---------|----------|-----|
| Haiku 4.5 | **60%** | $1 | $5 | 라우팅/분류/추출/포맷 |
| Sonnet 4.6 | **30%** | $3.75 | $18.75 | 기본 coding/분석 |
| Opus 4.6 | **10%** | $15 | $75 | 심층 추론/final review |

**비용 projection (1B tokens/month)**:
- Baseline all-Sonnet: $22,500
- Cascade 60/30/10: $18,788 (**16.5% 절감**)
- Optimal 70/25/5: $15,113 (**33% 절감**, arXiv 2511.17006)

## 2. Budget-Aware Tool Routing (arXiv 2511.17006)

### Flow

```
Session start: budget = $5.00
  ↓ PreToolUse hook
  ↓ estimateToolCost(tool, budget) — ripgrep $0.001 vs LLM $0.05
  ↓ Gate: budget.remaining > cost? proceed
  ↓ PostToolUse: record actual cost
  ↓ Feedback: "deeper" vs "pivot" decision
```

### Cheap-tool-first 계층

1. **ripgrep** $0.0001–0.0005 (pre-computed)
2. **fd** $0.0002–0.001
3. **jq/yq** $0.001–0.01 (40x faster than LLM parse)
4. **ast-grep** $0.01–0.05 (94% 절감, opt-in `/review`)
5. **LLM analysis** $0.05–0.5 (high uncertainty only)

### Decision Rule

```typescript
if (budget.remaining > 0.01 && tool_cost < llm_cost * 0.1) {
  use_cheap_tool();
} else if (budget.remaining > 0.05 && confidence < 0.7) {
  escalate_to_llm_analysis();
} else if (budget.remaining < 0.01) {
  halt_or_use_cached_knowledge();
}
```

### PIOP + Budget Protocol

```json
{
  "phase": "exec",
  "budget": {
    "total_usd": 5.0, "remaining_usd": 4.22,
    "spent_by_phase": { "pre_check": 0.10, "exec": 0.68 },
    "cost_per_tool": { "ripgrep": 0.001, "llm": 0.15 }
  },
  "decision": "deeper_or_pivot",
  "reasoning": "60% confident, budget allows 28 more LLM calls → deeper"
}
```

## 3. Integration with bkit Gate-Manager (P2)

```typescript
export interface CascadeGateMetrics extends GateMetrics {
  confidence: number;
  output_validation_pass: number;
  tool_call_depth: number;
  budget_remaining_usd: number;
  previous_model_used: 'haiku' | 'sonnet' | 'opus';
  escalation_count: number;
}

const CASCADE_GATE: GateDefinition = {
  pass: [
    { metric: 'confidence', op: '>=', value: 0.85 },
    { metric: 'output_validation_pass', op: '===', value: 1 },
    { metric: 'tool_call_depth', op: '<=', value: 3 }
  ],
  retry: [
    { metric: 'confidence', op: '<', value: 0.70 },
    { metric: 'budget_remaining_usd', op: '<', value: 0.01 }
  ],
  fail: [
    { metric: 'escalation_count', op: '>', value: 5 },
    { metric: 'budget_remaining_usd', op: '<=', value: 0 }
  ]
};
```

## 4. Per-Subagent Frontmatter Hints (opt-in)

```yaml
---
name: researcher
preferred_model: sonnet
model_cascade: true
budget_limit_usd: 2.50
---
```

## 5. Token Metering

```typescript
// Anthropic official (ground truth)
const countResp = await client.messages.countTokens({
  model: 'claude-sonnet-4-6',
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }]
});
// Fallback: tiktoken p50k_base (±5% error)
```

## 6. Porting Difficulty

| Scope | Effort | Timeline |
|-------|-------|----------|
| **S** (4–6h) | Cascade gate + cost-tracker hook signatures + docs | 1 sprint |
| **M** (12–16h, 권장) | ripgrep fallback + Pre/PostToolUse hooks + cost validation | 2 sprints |
| **L** (24–32h) | PIOP budget extension + MCP 2025-11-25 + ast-grep + per-subagent hints | 4 sprints |
| **XL** (40h+) | LSP/LSAP + Bubblewrap + real-time alerts + cross-agent budget | 6+ sprints |

**권장**: **M** (Stage 5.5–5.7) → gate + hooks + ripgrep priority. XL defer to Stage 9.

## 7. Performance Projection (B1–B6)

| Benchmark | Metric | Baseline | Cascade | Budget-Aware | Combined |
|-----------|--------|---------|---------|--------------|----------|
| B1 fix ≤50 LOC | M1 | 5K | 4.2K (-16%) | 4.8K (-4%) | 3.8K (**-24%**) |
| B2 TDD feature | M1 | 12K | 9.6K (-20%) | 8.5K | 6.8K (**-43%**) |
| B3 refactor | M1/M3 | 25K/12 | 18K/9 | 15K/7 | 11K/5 (**-56%**) |
| B4 UI+visual | M2 | 180s | 160s | 155s | 140s (-22%) |
| B5 research | M1/M2 | 35K/240s | 24K/190s | 20K/160s | 14K/120s (**-60%**) |
| B6 debug | M1/M4 | 18K/0.95 | 14K/0.96 | 12K/0.97 | 9K/0.98 (**-50%**) |

**집합**: B1–B6 평균 **32–43% M1 절감**, arXiv 수치와 정합.

## 8. Risk / Mitigation

| Risk | Severity | Mitigation |
|------|---------|-----------|
| Haiku over-confidence | HIGH | Threshold 0.85→0.80 if escalation >30%. Validation layer (schema+semantic). Red-team tests. |
| Budget estimate drift | MEDIUM | SDK countTokens() before each call. Delta log. Weekly drift report. |
| Cascading failures | MEDIUM | Circuit-breaker (P2). Max 2 escalations/task. Timeout per tier. |
| Budget exhaustion | LOW | Hard cap per subagent. PreToolUse gate rejection. 80% alert, 100% halt. |
| Windows rg 부재 | LOW | Graceful grep fallback. Pre-flight check. |

### M4 Correctness 가드레일
- Pre-prod: 저 confidence OR multi-step → 항상 escalate
- Validation layer: schema + semantic sanity check (3 LLM tok vs 10K tok cost)
- Ensemble for critical: 2+ model agreement
- B1–B6 M4 ≥ baseline 필수

## 9. Rollback

```bash
export A_TEAM_CASCADE=0
# → 전체 Sonnet 4.6 fallback, 기존 동작 유지

export A_TEAM_HAIKU_PCT=70  # 분포 조정
export A_TEAM_CONFIDENCE_THRESHOLD=0.80
export A_TEAM_BUDGET_AWARE=1
export A_TEAM_BUDGET_TOTAL_USD=10.0
```

퍼포먼스 5%+ 퇴행 시: 즉시 `A_TEAM_CASCADE=0` → gate-manager 변경 git revert → 분석 → 재활성.

## 10. Implementation Checklist

- [ ] `lib/gate-manager.ts` — CascadeGateMetrics + CASCADE_GATE
- [ ] `lib/cost-tracker.ts` — Pre/PostToolUse hook signatures, cascade_model 필드
- [ ] PIOP budget-aware message schema
- [ ] Frontmatter parser (preferred_model, model_cascade, budget_limit_usd)
- [ ] ripgrep fallback docs + Windows grep test
- [ ] TDD 3 RED tests (confidence<0.85, validation fail, depth>3)
- [ ] `governance/cost-routing.md`
- [ ] `.claude/settings.json` env flags 추가
- [ ] Baseline B1–B6 × 3 runs 기록

## Sources
- [Budget-Aware Tool-Use arXiv 2511.17006](https://arxiv.org/abs/2511.17006)
- [RouteLLM](https://github.com/lm-sys/RouteLLM)
- [Token Counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Anthropic Cascade Strategy](https://www.mindstudio.ai/blog/anthropic-advisor-strategy-cut-ai-agent-costs)
