# DD-02 — ToolSearch + Artifact Caching (P1/P4/P8)

## Candidate 1: ToolSearch (deferred MCP tool loading)

**Integration surface**: `.mcp.json` per-tool `"defer_loading": true` (Anthropic Feb 2026 spec). `.claude/agents/{agent}.md` per-subagent 카탈로그. `governance/rules/tool-search.md` (신규) naming convention.

**Config pattern**:
```json
{ "type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex" },
{ "name": "github_search", "description": "...", "defer_loading": true }
```

**Porting**: **S**, 50–80 LOC (config only, zero runtime change). Tool naming audit M-effort.

**Performance**:
- M1: −15% (50% credit, combined −27% with caching)
- M2: −3%
- M4: 0 (mechanical)
- 실전: 55k → 9.2k tokens 관측 (−85%)

**Variant 선택**: **Regex preferred** (Claude가 패턴 결정 → deterministic) vs BM25 (NL query).

**Prerequisites**: Haiku 미지원 → tier-2 Haiku agent는 non-deferred catalog만 fallback. Tier-2 Sonnet 업그레이드 고려.

**Risks / mitigation**:
- 패턴 mismatch → tool description에 키워드 추가 (`"Search GitHub repos and PRs"` → BM25 find)
- search tool 자체에 defer_loading 실수 → linter rule in governance
- Cache prefix 오염 → API 자동 dedup, 수동 expansion 불필요
- 너무 넓은 regex → governance: 구체 패턴 (`"^github_"`)

**Always-loaded (non-deferred)**: `exec`, `read_file`, `search_code` 3–5개 hot tools

**Rollback**: `.mcp.json`에서 `defer_loading` 제거 → <5분. Backward compat 완전.

---

## Candidate 2: Artifact Caching (file-based LRU)

**Integration surface**:
- Root: `.context/artifacts/{projectId}/{resourceType}/{hash}.{ext}` + `.meta.json`
- LRU ledger: `.context/artifacts/lru-state.json` (50 MB default)
- Hash: `SHA256(url + selector + viewport).slice(0,8)`
- Hook: PreToolUse (cache check), PostToolUse (cache write)

**Playwright CLI migration**: 기존 MCP stream (114k tokens 전체 page) → `snapshot.js` disk + selective read (27k tokens) = **4× 절감**.

**Porting**: **M**, 800–1100 LOC total (LRU tracker 120–180, hash derivation 40, hooks 200–300, metadata 80, eviction 150, CLI wrapper 120, tests 200–500).

**Performance**:
- M1: −12% (B4 UI: −50~65% specific)
- M2: −4%
- M3: −2%
- M4: 0 (artifact content 동일)
- Cache hit rate 60%+ in UI automation

**Prototype (LRU core)**:
```typescript
export class ArtifactCache {
  async get(projectId, type, hash): Promise<Buffer | null> {
    const meta = await loadMeta(projectId, type, hash);
    if (!meta || this.isExpired(meta)) return null;
    meta.access_count++; meta.last_accessed = Date.now();
    await this.updateLRU(projectId, hash);
    return await fs.readFile(dataPath);
  }
  async set(projectId, type, hash, data, meta) {
    await this.evictIfNeeded(data.length);
    await fs.writeFile(dataPath, data);
    await fs.writeFile(metaPath, JSON.stringify(meta));
  }
}
```

**Risks / mitigation**:
- Stale screenshot (UI 변경) → TTL 1h default, `/refresh-cache` 수동 무효화
- Hash collision → selector + viewport 포함 preimage
- 디스크 bloat → 50 MB LRU 기본, config 조정 가능
- Parallel race → append-only ledger + 시간 merge
- 민감 데이터 노출 → `.gitignore .context/artifacts/`, SOC 2 검토

**Rollback**: `rm -rf .context/artifacts/` 또는 config `max_size_bytes=0`. <5분.

---

## P1/P4/P8 강화
- **P1 thin-wrapper**: ToolSearch가 968 tok init → 16k 대비 lean
- **P4 hooks**: Artifact Cache가 PreToolUse/PostToolUse 활용 (기존 P4 확장)
- **P8 thin commands**: Config-only, 신규 slash 없음, `<350B` 유지

## 총 effort: 4–5일 (1,270 LOC TDD 병렬)

## Sources
- [Tool search tool - Anthropic Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- [Playwright CLI](https://github.com/microsoft/playwright-cli)
