# DD-03 — ripgrep + fd + jq + ast-grep (A6 toolchain)

## Integration Surface (4 hooks)

| Hook | Tool | Mechanism |
|------|-----|-----------|
| PreToolUse.Grep (NEW) | rg (default) | `which rg` → success → `system("rg ...")` wrapper. Absent → grep fallback |
| PreToolUse.Glob (EXTEND) | fd (default) | `fd <pattern>` wrapper, find fallback |
| PreToolUse.Bash | rg/fd/jq | Env check, 없으면 stderr 경고 |
| PostToolUse.* | 전체 | `.context/tools-ledger.json`에 tool call + 절감 토큰 기록 |

## Coder Agent System Prompt Snippet (`.claude/agents/coder.md`)

```yaml
---
name: coder
description: |
  코드 구현 전문. Phase 1–2 classical tools (rg/fd/jq/sg) default.
  ENV A_TEAM_CLASSICAL_TOOLS=1 시 자동 라우팅, 회귀 호환 보장.
tools: Read, Edit, Write, Bash, Glob, Grep
model: sonnet
---

## Classical Tools Routing (A6)

### Grep tool call:
1. `which rg` + A_TEAM_CLASSICAL_TOOLS=1 → `rg --type ts --json <pattern> <path>`
2. 없으면 native Grep

### Glob tool call:
1. `which fd` + flag ON → `fd <pattern>`
2. 없으면 native Glob (find fallback)

### /review (Phase 2, opt-in):
- AST-aware refactor: `sg -p 'function $NAME(...) { ... }' --lang typescript src/`
- grep + manual regex fallback if sg absent
```

## Binary Distribution (`scripts/install-classical-tools.sh`)

```bash
#!/bin/bash
OS=$(uname -s)
case "$OS" in
  Linux)
    command -v rg &>/dev/null || curl -sL https://github.com/BurntSushi/ripgrep/releases/download/13.0.0/ripgrep-$(uname -m)-linux-musl.tar.gz | tar xz -C /tmp && mv /tmp/rg ~/.local/bin/
    command -v fd &>/dev/null || curl -sL .../fd-v9.0.0-$(uname -m)-linux.tar.gz | tar xz && mv fd ~/.local/bin/
    ;;
  Darwin) brew install ripgrep fd jq ;;
  MINGW64_NT*) echo "scoop install ripgrep fd jq" ;;
esac
command -v jq &>/dev/null || curl -sL https://github.com/stedolan/jq/releases/download/jq-1.7.1/jq-$OS -o ~/.local/bin/jq && chmod +x ~/.local/bin/jq
[ "$1" = "1" ] && npm install -g @ast-grep/cli  # Phase 2 opt-in
```

## Fallback Chain

```
A_TEAM_CLASSICAL_TOOLS=1 (default)
  ↓ which rg
  ├─ FOUND → bash wrapper
  └─ NOT FOUND → native Grep (LLM token)

A_TEAM_CLASSICAL_TOOLS=0 (disable)
  ↓ all → native
```

## Porting Difficulty

| Tool | Effort | Time | LOC |
|-----|-------|------|-----|
| ripgrep | S | 2–3h | ~50 (wrapper) |
| fd | S | 1.5–2h | ~50 |
| jq | S | 1–2h | ~30 (docs) |
| ast-grep | M | 8–12h | ~200 + `/review` skill |

**Phase 1 total**: 4.5–7h. **Phase 2**: +8–12h.

## Performance (Linux kernel, 5.8GB, 70k files)

| Task | Baseline | Tool | Speedup | Token 절감 |
|------|---------|-----|---------|-----------|
| Find fn calls | grep 0.671s / 1200 tok | **rg** 0.082s / 300 tok | **8.2x** | −75% |
| Find .rs files | find 12.3s / 2000 tok | **fd** 5.0s / 500 tok | **2.46x** | −75% |
| Parse API JSON | ~2000 tok manual | **jq `.data[]`** 50 tok | — | **40x** |
| Function rename | ~8000 tok grep+LLM | **ast-grep** 500 tok | — | **16x** |

**Phase 1 누적 토큰 절감**: **20–30%** (rg+fd+jq).
**Phase 2 추가**: **30–50%** (ast-grep refactor 집약 작업).

## ast-grep Language Coverage Priority

| Lang | Status | A-Team priority |
|-----|-------|-----------------|
| TypeScript | Stable v0.20+ | **P0** (TS-heavy) |
| Python | Stable | P1 (researcher/eval) |
| Rust | Stable | P1 |
| Go | Stable | P1 |
| Java/C++/C# | Beta | P2 defer |

Bootstrap: `AST_GREP_LANGUAGES="typescript,python"` env.

## Rollback

```bash
export A_TEAM_CLASSICAL_TOOLS=0
# 모든 Grep/Glob → native, /review skill 비활성, tools-ledger silent
```

## Tools Ledger Schema (`.context/tools-ledger.json`)

```json
{
  "fallbacks": [{ "timestamp": 1713..., "tool": "rg", "reason": "tool_missing" }],
  "savings_estimate_tokens": 45823,
  "total_calls": 142
}
```

## P4/P8 강화
- P4: PreToolUse/PostToolUse logging + auto-fallback
- P8: bash wrapper → native tool count 증가 없음, `<350B` 유지

## Decision Gate
- B1–B6 ≥ 15% M1 개선 필수
- 2회 이상 fallback/session 시 경고
- sys prompt bloat > 2% 시 FAIL

## Sources
- [ripgrep](https://github.com/BurntSushi/ripgrep), [fd](https://github.com/sharkdp/fd), [ast-grep](https://github.com/ast-grep/ast-grep)
- [Ripgrep for AI Agents](https://www.codeant.ai/blogs/why-coding-agents-should-use-ripgrep)
- [Budget-Aware Tool-Use arXiv 2511.17006](https://arxiv.org/abs/2511.17006)
