# A-Team Optimization — Integration Roadmap

**Source RFCs**: RFC-001 ~ RFC-007
**Inputs**: `round-2/shortlist-reviewed.md` (PASS 13 / FAIL 13), `round-2/strength-mapping.md`
**Cadence**: 3 waves over ~5 weeks. Each wave gated by hard exit criteria.

---

## Wave 1 (Week 1–2) — Low Risk, High ROI

Target: token/latency wins with minimal architectural change. All items size S, isolated surface.

| Order | RFC | Effort | Expected | Bench anchor |
|-------|-----|--------|----------|--------------|
| 1 | RFC-001 Prompt Caching | S | M1 -35% | B1, B2 baseline must be re-captured AFTER enable |
| 2 | RFC-003 ToolSearch + Artifact Cache | S/M | -27% tokens | B3 (tool search path), B5 (artifact reuse) |
| 3 | RFC-004 Classical Tools Phase 1 (ripgrep / fd / jq wiring) | S/S/S | -20~30% tokens | B2, B4 |

**Execution rule (TDD RED-first, per RFC):**
1. Author failing contract tests in `tests/integration/rfc-00X/` before any implementation. Run `npx vitest run` — confirm RED.
2. Implement minimum slice; re-run → GREEN.
3. Capture bench snapshot (B1–B6 × 3 runs) AFTER each RFC lands, not batched.

**Why this order**: RFC-001 resets the cost baseline for every subsequent measurement. Running RFC-003/004 first would mask caching wins and double-count savings.

**Wave 1 Gate (must all pass to proceed):**
- B1–B6 executed × 3 consecutive runs, variance < 10%
- G5 quality suite (promptfoo smoke tier) all green
- Cumulative token reduction ≥ 45% vs pre-wave baseline
- Zero P0/P1 regressions in CURRENT.md session log

---

## Wave 2 (Week 3–4) — Medium Effort

Target: handoff compression, observability loop, initial routing + prompt-injection hardening.

| Order | RFC | Effort | Expected | Dependency |
|-------|-----|--------|----------|------------|
| 1 | RFC-005 promptfoo + Langfuse | M | M4 +2–5pp | Enables G5 gate for all downstream RFCs |
| 2 | RFC-002 Handoff Compression | M | -74% handoff tokens | Needs RFC-001 cache metrics to compare |
| 3 | RFC-006 Cascade Routing Phase 1 | S | -20% cost (initial) | Reuses RFC-003 tool search constraints |
| 4 | RFC-007 Spotlighting Phase S + M | S | security +90% | Can run parallel with RFC-006 |

**Why RFC-005 first in Wave 2**: it upgrades the gate itself. Landing observability before routing/compression means Wave 2's own regression signals are trustworthy.

**Wave 2 Gate:**
- All Wave 1 gates still green (re-run B1–B6)
- Langfuse traces present for ≥ 95% of orchestrated runs
- promptfoo red-team suite pass rate ≥ baseline + 10pp
- Cascade routing escalation rate within predicted band (±15%)

---

## Wave 3 (Week 5+) — High Effort / Defer

Only start after Wave 2 gate is stable for 5 working days.

- RFC-004 Phase 2 `ast-grep` structural refactors (M) — expected -30~50% on refactor tasks
- RFC-006 Phase 2 Budget-Aware routing (M) — second-order cost optimization
- RFC-007 Phase L worktree formalization (L) — full isolation tier

**Wave 3 Gate**: full re-bench B1–B6, G1–G5 complete pass, 7-day soak with no rollback events.

---

## Cross-RFC Integration Points

- **RFC-001 Prompt Caching** is the canonical baseline. Every subsequent bench MUST be captured with caching enabled; otherwise savings double-count.
- **RFC-003 ToolSearch** constrains **RFC-006 Cascade Routing**: the router must respect the reduced tool surface and cached artifact manifest, else it re-expands the catalog.
- **RFC-005 promptfoo + Langfuse** is the universal G5 gate. No RFC merges to main without a promptfoo spec + Langfuse trace sample attached to the PR.
- **RFC-007 Spotlighting** interacts with **RFC-002 Handoff Compression**: compression must preserve spotlight delimiters; add a joint contract test.

---

## Rollback / Stop Conditions

- **Per-RFC trigger**: M4 quality drops ≥ 5pp vs pre-RFC baseline → immediate revert, no negotiation.
- **Per-wave trigger**: cumulative regression on any of B1–B6 > 15% → next wave delayed one week, post-mortem required.
- **Security trigger** (RFC-007 scope): any prompt-injection suite failure on previously-passing case → revert that phase only, file incident in `lessons-learned/`.
- **Observability trigger**: Langfuse trace coverage drops below 90% for > 24h → pause new RFC merges until restored.

Rollback artifacts: every wave tags `wave-N-start` and `wave-N-end` git tags so revert is a single `git reset --hard wave-N-start`.
