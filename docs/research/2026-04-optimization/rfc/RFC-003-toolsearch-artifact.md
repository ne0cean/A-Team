# RFC-003 ToolSearch + Artifact Caching

**Status**: Draft (Stage 5) | **P1/P4/P8 강화** | **Effort**: 4–5일 / ~1,270 LOC TDD

## 1. Problem Statement
MCP tool registry **14–16k tok** 매 턴 지출. Playwright MCP full-page stream **114k tok** (B4 UI), 동일 URL/selector/viewport 반복 60%+ redundancy. 단일 원인: **"모든 tool payload 매 turn 재주입"**.

| 병목 | 비용 | 빈도 |
|-----|-----|-----|
| MCP tool registry bloat | 14–16k tok | 100% |
| Playwright full-page | 114k tok | B4 |
| 중복 snapshot | 60%+ | B4 반복 |

단일 후보로는 G5-a 어려움 → control-plane (ToolSearch) + data-plane (Artifact Cache) 번들.

## 2. Strength Claim
- **P1**: ToolSearch가 subagent init ~968 tok → thin-wrapper 원칙 tool layer까지 확장
- **P4**: Artifact Cache가 기존 `hooks/pre-tool-use/*`, `hooks/post-tool-use/*` 재사용
- **P8**: 신규 slash 0개. `.mcp.json` config + `.context/artifacts/` FS만. <350B 제약 무위반
- **Opt-in**: `defer_loading`, `max_size_bytes`로 제어

## 3. Integration Design

### 3.1 ToolSearch (control-plane)
- `.mcp.json` 각 tool `"defer_loading": true` (default false, backward-compat)
- Search tool: `{ "type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex" }` non-deferred
- **Regex variant 선호** (deterministic). BM25 reject (NL 편차).
- Hot tools (non-deferred): `exec`, `read_file`, `search_code` 3개
- Governance: `governance/rules/tool-search.md` (search tool 자체 defer 금지, regex 구체화, description 키워드 의무)
- **Tier-2 Haiku**: tool_search 미지원 → non-deferred catalog fallback

### 3.2 Artifact Cache (data-plane)
- 경로: `.context/artifacts/{projectId}/{resourceType}/{hash}.{ext}` + `.meta.json`
- Ledger: `.context/artifacts/lru-state.json`, 기본 50 MB, TTL 3600s
- Hash: `SHA256(url + selector + viewport).slice(0,8)`
- Hooks:
  - `hooks/pre-tool-use/artifact-cache-check.js` — playwright_* 계열 hash 조회, hit 시 skip + 경로 주입
  - `hooks/post-tool-use/artifact-cache-write.js` — snapshot/screenshot/HTML 디스크 기록 + LRU 업데이트
- 모듈: `lib/artifact-cache/` (LRU 120 LOC + hash 40 + hooks 250 + metadata 80 + eviction 150 + CLI 120)
- `.gitignore .context/artifacts/` 필수

### 3.3 Data Flow
```
Turn N: main = hot tools(3) + tool_search(1) + subagent catalog
  Claude: tool_search_regex("^playwright_") → lazy load
    hook pre-tool: hash(url,sel,vp) → lru-state lookup
      HIT  → read .context/artifacts/.../{hash}.html (2k tok)
      MISS → playwright_snapshot() → hook post-tool writes artifact
```
결합 효과: tool registry 14–16k → ~2k, Playwright 114k → 27k (miss) / 4k (hit).

## 4. Implementation Plan
- **Phase 1 (Day 1–2)**: ToolSearch `.mcp.json` + hot tool 선정 + governance + description audit. TDD RED T1.
- **Phase 2 (Day 3–5)**: Artifact Cache LRU core + hooks + CLI + `.gitignore`. TDD RED T2, T3 → GREEN → REFACTOR.
- **Phase 3 (Day 6)**: B1–B6 × 3 A/B 벤치, σ<mean×0.1, PERFORMANCE_LEDGER 기록, `governance/workflows/artifact-cache.md`.

## 5. Test Plan (3 RED tests)

**T1 ToolSearch regex match** (`tests/tool-search/regex.test.js`):
- GIVEN `.mcp.json` github_* defer_loading=true
- WHEN `tool_search_regex("^github_search$")`
- THEN resolved contains `github_search`, excludes `playwright_*`
- RED: defer_loading 부재 → exclusion fail

**T2 LRU eviction ordering** (`tests/artifact-cache/lru.test.js`):
- GIVEN max 1024B, a(400) b(400) c(400), access a→b→c→a, write d(400)
- THEN evicted=b (LRU), survivors={a,c,d}
- RED: 캐시 미구현 → import fail

**T3 Cache hit/miss hash** (`tests/artifact-cache/hash.test.js`):
- GIVEN url=U sel=S vp=V written B
- WHEN pre-tool hook (U,S,V)
- THEN cache hit → path return, tool 실행 skip. V 변경 → miss
- RED: hook 미구현 → 무조건 실행

## 6. Rollout + Rollback
**Rollout (점진)**:
1. Phase 1 머지 후 `defer_loading` 5개만, 48h 관측
2. 전면 적용
3. Phase 2 Artifact Cache `max_size_bytes=0` no-op 배포 → dial-up

**Rollback (<5분)**:
- ToolSearch: `.mcp.json`에서 `defer_loading` 제거
- Artifact Cache: `rm -rf .context/artifacts/` + `ARTIFACT_CACHE=0`
- 두 후보 decoupled → 독립 rollback 가능

## 7. Success Criteria (G5)

| Metric | Baseline | Target | 근거 |
|--------|---------|--------|------|
| M1 token | 100% | **≤ 85% (−15%)** | ToolSearch 55k→9.2k (−85%) + Artifact Cache B4 −12%, 보수적 −15% |
| M2 time | 100% | ≤ 97% | Tool resolve 상쇄 후 gain |
| M3 tool calls | 100% | ≤ 98% | Cache hit 시 skip |
| **M4 correctness** | ≥ base | **unchanged** | Artifact 동일, regex deterministic |
| M5 regression | ≤ +5% | 유지 | 훅 재사용 |

- G5-a ✅ (M1 −15%)
- G5-b ✅ (all ≤ 5% 악화)
- G5-c ✅ (M4 유지, 경직 준수)
- G5-d ✅ (B1/B3/B4/B5 개선 예상)
- G5-e: Phase 3 실측 확정

## 8. References
- DD-02: `docs/research/2026-04-optimization/round-3/DD-02-toolsearch-artifact.md`
- [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
