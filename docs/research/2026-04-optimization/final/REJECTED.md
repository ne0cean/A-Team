# A-Team Optimization — Rejected Candidates

**Purpose**: preserve context for candidates that failed Round-2 gates so future re-evaluation is cheap. Each entry records the failing criterion and the concrete condition that would reopen review.

**Legend**
- **Stage 2** = license / maturity / dependency filter (`shortlist-reviewed.md`)
- **Stage 3** = strength-mapping (GREEN/YELLOW/RED against P1–P8, M1–M5)
- **Criterion refs**: C1 license (OSI), C2 maturity (≥ v1 + prod users), C3 self-host, C4 dep footprint, C5 strength mapping, C6 arxiv-only exclusion

---

## Rejected — Master Table

| # | Candidate | Rejected at | Failed Criterion | Reason (1–2 lines) | Re-evaluation condition |
|---|-----------|-------------|------------------|---------------------|-------------------------|
| 1 | Agno | Stage 2 | C1 license | MPL-2.0, file-level copyleft incompatible with A-Team's BSD/MIT target. | Relicense to OSI-approved BSD/MIT/Apache-2.0. |
| 2 | Letta / MemGPT | Stage 2 | C4 dep footprint, C5 | Forces P1 memory subsystem replacement; heavy runtime. | Ship lightweight embeddable mode AND drop P1 replacement requirement. |
| 3 | Mem0 | Stage 2 | C3 self-host | Managed-cloud gated features; OSS tier missing parity. | Full self-host parity or community fork reaches v1 with prod users. |
| 4 | Braintrust | Stage 2 | C1, C3 | Proprietary backend, SaaS-only eval store. | Backend open-sourced under OSI license. |
| 5 | LangSmith | Stage 2 | C3 self-host | No self-host; data egress to LangChain cloud. | Official self-host tier released and license-compatible. |
| 6 | Phoenix (Arize) | Stage 2 | C3, C1 | Self-host exists but tracing backend deps conflict with C4; license review pending. | Confirm Apache-2.0 across all required modules + self-host-only deploy path documented. |
| 7 | Helicone | Stage 2 | C3 | Gateway-based, requires routing all traffic through their proxy. | Pure self-host mode without mandatory proxy hop. |
| 8 | Datadog LLM Obs | Stage 2 | C1, C3 | Commercial SaaS; incompatible with A-Team OSS posture. | N/A short-term; revisit only if MIT-licensed OSS edition ships. |
| 9 | Self-Consistency (5–10 samples) | Stage 3 | C5 cost model | 5–10× token cost violates M1 budget; strength overlap with RFC-006. | Variant demonstrating equivalent gain at 1–3 samples. |
| 10 | Tree of Thoughts | Stage 3 | C5, M1 | Search blow-up on context; no compression story. | Combined with context-compression technique (e.g., RFC-002 handoff compress) showing net token reduction. |
| 11 | AutoGen 0.4 | Stage 2 | C2 maturity | Mid-flight merge with AG2 + Semantic Kernel; API unstable. | Post-merge v1.0 release with migration guide + ≥ 2 prod references. |
| 12 | Swarm (OpenAI) | Stage 2 | C1, C2 | Experimental repo, no license clarity, superseded by Agents SDK. | Agents SDK released under OSI license with stable public API. |
| 13 | Pydantic-AI | Stage 3 | C5 strength-fit | Python-only; A-Team runtime is TypeScript. | Spin out as separate RFC if TS port lands or A-Team adopts Python worker tier. |
| 14 | CrewAI (edge case) | Stage 2 | C4 dep footprint | Flows mode pulls heavy deps; Crews-only usable but non-default. | Opt-in Crews-only minimal build documented + packaged. |
| 15 | DSPy (edge case) | Stage 3 | C5 | Strong on P3 PIOP but current adapter surface insufficient. | Explicit P3 PIOP integration guide + A-Team adapter reference. |
| 16 | BMAD (edge case) | Stage 2 | C2 maturity | Discovery via blog only; no canonical repo URL, no prod case studies. | Public GitHub URL published AND ≥ 2 production postmortems available. |
| 17 | MindGuard | Stage 2 | C6 arxiv-only | Paper-stage, no reference implementation. | Production-grade repo appears with reproducible eval. |

---

## Re-evaluation Protocol

1. When a re-evaluation condition triggers (e.g., license change, v1 release), open a short-form note in `research/<date>-reeval/<candidate>.md` citing this table row.
2. Re-run only the failed criterion; do not restart full Stage 2/3 unless the candidate's category (memory, obs, routing, safety) has also shifted.
3. If the candidate now passes, promote to a Round-2 delta review — not directly into an RFC — so cross-RFC integration points are re-examined.

## Do-Not-Revisit (hard filter)

Items 4, 5, 7, 8 share a structural blocker (SaaS-locked data plane). They stay on this list only as a paper trail; no periodic re-check required until a public announcement reverses the deployment model.
