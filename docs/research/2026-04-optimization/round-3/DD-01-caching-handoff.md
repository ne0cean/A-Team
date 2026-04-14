# DD-01 — Prompt Caching + Handoff Compression (P5)

## Candidate 1: Prompt Caching (Anthropic native, 2026-02+)

**Integration surface**: `scripts/daemon-utils.mjs` `callSdkWithAdvisor()` L45-70 — 신규 `cachedMessageCreate()` wrapper에서 `system` 배열에 `cache_control` 주입. CLAUDE.md = 1h TTL, CURRENT.md = 5min TTL (1h 블록이 5min 앞에 배치 필수).

**Porting**: **S**, 120–180 LOC total (wrapper 45–60, SDK mutation 15–20, `.mcp.json` workspace ID 8–12, `.context/CACHE_MANIFEST.md` audit 40–60).

**Performance predict**:
| Metric | Baseline | With Cache | Δ |
|--------|---------|-----------|---|
| M1 Token/task | 150k | 98k | **−35%** |
| M2 Wall-clock (Session 2+) | 45s | 22s | **−51%** |
| M4 Correctness | 0.95 | 0.96 | +1pp |
| M5 Regression | 0 | 0 | 0 |

G5-a PASS (35% > 15%), G5-b PASS, G5-c PASS.

**Risks / mitigation**:
- Workspace isolation cross-org cache 미공유 (MEDIUM) → `.mcp.json` workspace ID, `governance/rules/prompt-caching.md` 문서화
- Cache breakpoint 순서 (1h before 5m) 강제 → wrapper unit test
- TTL 불일치 → CACHE_MANIFEST 추적, cache miss >10% 알람
- 5min window 내 eviction → SDK 자동 fallback (graceful)

**Prototype**:
```javascript
// scripts/daemon-utils.mjs — cachedMessageCreate()
export async function cachedMessageCreate(client, model, systemPrompt, documents, messages, maxTokens) {
  const cacheableSystem = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral", ttl: "1h" } },
    { type: "text", text: documents, cache_control: { type: "ephemeral" } }
  ];
  const resp = await client.messages.create({ model, max_tokens: maxTokens, system: cacheableSystem, messages });
  const cacheHit = resp.usage.cache_read_input_tokens > 0;
  logAnalytics({ event: 'cache_hit', cacheHit, readTokens: resp.usage.cache_read_input_tokens });
  return resp;
}
```

**Rollback**: `ENABLE_PROMPT_CACHING=false` env flag → `legacyMessageCreate()` fallback. Git revert `daemon-utils.mjs` 가능.

---

## Candidate 2: Handoff Compression 5-layer

**Integration surface**: `lib/handoff-compressor.ts` (신규) + `scripts/model-exit.sh` (기존 /handoff) L20-45 수정. 출력: `.context/HANDOFF_PROMPT.txt`.

**Porting**: **M**, 280–350 LOC total (compressor 120–150, model-exit 25–35, governance 80–100, tests 55–65).

**Performance predict**:
| Metric | Baseline (raw CURRENT) | With Compression | Δ |
|--------|----------------------|------------------|---|
| M1 Token/handoff | 8k | 2.1k | **−74%** |
| M2 Next session parse | 45s | 12s | −73% |
| M4 State loss | 0 | 0 | 0 |
| M5 Edge miss | 0 | 2–3% | ≤5% tolerable |

G5-a PASS (74% > 15%), G5-c PASS.

**Risks / mitigation**:
- Low-priority 세부 손실 → CAUTION layer 명시 capture, `.context/archive/CURRENT-{session_id}.md` 전체 아카이브
- 5-layer 경계 모호 → governance 예시 4–5개, unit test (Facts는 timing/path만)
- 너무 짧음 → 최소 1.2k tokens floor, `--full-handoff` 플래그
- 압축 runtime 비용 → Haiku 사용, 비동기 (오프라인 post-session)

**Prototype**:
```typescript
// lib/handoff-compressor.ts
export function compress5Layer(currentMd: string): Handoff5Layer {
  return {
    facts: extractFacts(currentMd),        // timestamps, repos, commits
    story: extractStory(currentMd),        // Last Completions → narrative
    reasoning: extractReasoning(currentMd), // Status section
    action: extractAction(currentMd),      // Next Tasks
    caution: extractCaution(currentMd)     // Blockers
  };
}
```

**Rollback**: `COMPRESSION_MODE=off` → `cp CURRENT.md HANDOFF_PROMPT.txt` 직접 복사.

---

## Cross-candidate Synergy (Stage 9)

- Session 1 cold: CURRENT.md 8k → no cache. Compress to 2.1k.
- Session 2 warm: HANDOFF_PROMPT 2.1k + 1h cached → 210 tok read (0.1×). Net 8k → ~250 tok (**97% 절감**).
- B3 (multi-file refactor): Cache + Handoff 합산 → M1 −97% 가능.

## Implementation Order (Stage 5.5)
1. **Prompt Caching**: 2–3일 → B1–B3 A/B
2. **Handoff Compression**: 3–4일 → B4, B5 A/B
3. **Holistic Integration**: 1–2일 → B6 combined

## Sources
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic Prompt Caching News](https://www.anthropic.com/news/prompt-caching)
- [Context Compaction in Codex/Claude Code/OpenCode](https://justin3go.com/en/posts/2026/04/09-context-compaction-in-codex-claude-code-and-opencode)
