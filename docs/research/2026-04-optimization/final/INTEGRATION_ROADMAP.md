# A-Team Optimization — Integration Roadmap

**Source RFCs**: RFC-001 ~ RFC-007
**Inputs**: `round-2/shortlist-reviewed.md` (PASS 13 / FAIL 13), `round-2/strength-mapping.md`
**Cadence**: 3 waves over ~5 weeks. Each wave gated by hard exit criteria.

## ⚠️ G7 No Regression Across Versions (2026-04-14 신설)

각 Wave 완료 후:
1. git tag `v-wave-N` 생성
2. `PERFORMANCE_LEDGER.md`에 B1–B6 × all metrics 기록
3. 다음 Wave A/B 벤치 baseline = **가장 최근 v-wave-N tag**
4. G7-a~e 충족 확인 필수 (MANIFEST 참조)

**핵심**: 새 통합이 이전 수용 버전 대비 regression 발견 시 해당 Wave 통합 **즉시 rollback**. 원본 baseline 대비만 측정하는 G5와 별개로 **누적 version 간 성능 유지** 강제.

### Wave별 baseline 적용
- Wave 1 baseline: 원본 (pre-integration) A-Team
- Wave 2 baseline: `v-wave-1` 태그
- Wave 3 baseline: `v-wave-2` 태그
- Stage 9 Holistic baseline: `v-wave-3` 태그

각 단계에서 G5 (vs 원본) + G7 (vs 직전 Wave) **둘 다 통과 시에만** 수용.

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
