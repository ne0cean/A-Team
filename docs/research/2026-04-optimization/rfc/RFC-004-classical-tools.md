# RFC-004 Classical Toolchain (ripgrep + fd + jq + ast-grep)

**Status**: Draft | **P4/P8 강화** | **Benchmark Gate**: G5 M1 ≥ 15%

## 1. Problem Statement
검색/탐색을 LLM token으로 수행 → 불필요한 비용. 측정치:

| 상황 | 현재 | Token |
|-----|-----|-------|
| "함수 호출 위치" | Grep + LLM 후처리 | ~1,200 tok / 0.671s |
| ".rs 파일 나열" | Glob + find | ~2,000 tok / 12.3s |
| API JSON 파싱 | LLM 직접 읽기 | ~2,000 tok |
| 함수 리네임 (multi-file) | Grep + LLM refactor | ~8,000 tok |

근본 원인: **단순 구조 검색(regex/glob/JSON path/AST)을 LLM으로**. Local binary 위임 시 40–160× 절감. Sovereignty 원칙상 네이티브 tool 제거 불가 → **라우팅 계층**으로 접근.

## 2. Strength Claim

| PA | 기존 | 강화 |
|----|-----|------|
| **P4 Hooks** | PreToolUse/PostToolUse + UI Auto-Inspect | PreToolUse.Grep/Glob에 tool detection + rewriting. PostToolUse.*에 ledger 기록 |
| **P8 <350B** | 슬래시 제약 | ast-grep은 `/review` skill 한정 opt-in. coder system prompt +120 words (<2%) |
| **재사용성** | 중복 bash 호출 | `install-classical-tools.sh` 1회 설치 → 전 에이전트 공유 |

P1/P2/P3/P5/P6/P7 무변경. Sovereignty 8조건 전부 충족.

## 3. Integration Design

### 3.1 `.claude/agents/coder.md` — Routing 로직
기존 `Bash` 권한 재사용, 신규 권한 없음. system prompt 하단:

```yaml
## Classical Tools Routing (A6, opt-in)
ENV: A_TEAM_CLASSICAL_TOOLS (default=**0**, opt-in 준수)
— Criterion 8 강제: 기본 비활성, 명시적 활성화 요구.

Grep 호출 시: which rg && flag==1 → Bash("rg --json <pattern> <path>"), else native Grep
Glob 호출 시: which fd && flag==1 → Bash("fd <pattern> <path>"), else native Glob
JSON 파싱: which jq → Bash("jq '<expr>' <file>"), else Read + LLM
/review skill (Phase 2): which sg → ast-grep 구조 패턴, else rg + manual
```

네이티브 tool **제거 안 함** → 자동 fallback 보장.

### 3.2 `scripts/install-classical-tools.sh` — Cross-platform
- **Linux**: static musl → `~/.local/bin/` (sudo 불필요)
- **macOS**: `brew install ripgrep fd jq`
- **Windows (MINGW64)**: `scoop install ripgrep fd jq`, fallback GitHub Releases zip
- **WSL**: Linux 경로
- Phase 2: `./install-classical-tools.sh --with-ast-grep` → `npm i -g @ast-grep/cli`

Exit code: 0=성공, 1=jq만 실패(비치명), 2=rg/fd 실패(치명). `scripts/verify-classical-tools.sh`가 version → `.context/tools-ledger.json`.

### 3.3 `governance/skills/review/SKILL.md` — Phase 2 opt-in
AST 필요 refactor(rename, signature 변경, hook 추출)에서 ast-grep first-class.
Contract: `target_pattern`, `replacement`, `lang` (ts|py|rust|go) → `sg -p` dry-run → 사용자 승인 → `sg -U` apply → PostToolUse 기록.

### 3.4 `.context/tools-ledger.json` Schema

```json
{
  "version": 1,
  "tools": { "rg": {"installed": true, "version": "14.1.0"}, ... },
  "calls": [{ "ts": 1713..., "agent": "coder", "tool": "rg", "native_would_be": "Grep", "tokens_saved_est": 900, "fallback": false }],
  "aggregates": { "total_calls": 142, "savings_estimate_tokens": 45823, "fallbacks": 3 }
}
```

Append-only, `compact-ledger.sh` 주 1회 aggregate.

## 4. Implementation Plan

### Phase 1 (Week 1–2) — rg + fd + jq + routing
- `install-classical-tools.sh`, `verify-classical-tools.sh`
- `.claude/agents/coder.md` +120 words
- `.claude/hooks/pre-tool-use.sh` Grep/Glob detect + rewrite
- `.claude/hooks/post-tool-use.sh` ledger append
- 3 RED tests
- **Exit**: B1/B3/B6 M1 −20~30%, M4 퇴행 0, σ<10%

### Phase 2 (Week 2–4) — ast-grep `/review` skill
- SKILL.md + `patterns/{typescript,python}/*.yml`
- TS/Python 우선 (MANIFEST P0/P1)
- Rust/Go 수동 호출
- **Exit**: B3에서 추가 M1 −30~50%

### Phase 3 (Week 4+) — LSP/LSAP defer
RFC-005 외부로 분리 (Stage 9 이후).

## 5. Test Plan (3 RED tests, `governance/tests/classical-tools/`)

1. **`tool-absent-fallback.test.ts`**: PATH에서 rg 제거 → coder Grep → native Grep 라우팅 + ledger `fallback: true`. 정확성 동일.
2. **`rg-to-grep-graceful.test.ts`**: rg 존재 but `A_TEAM_CLASSICAL_TOOLS=0` → 모든 Grep native, ledger rg 호출 0건, 동일 결과.
3. **`sg-ast-match.test.ts`** (Phase 2): TS 샘플 `sg -p 'function $NAME($_) { $$$ }'` → tree-sitter ground truth 일치. sg 부재 → rg fallback + 경고.

RED → 구현 → GREEN → REFACTOR 순서 (CLAUDE.md TDD 규칙).

## 6. Rollout + Rollback

**Rollout**:
1. Week 1 dogfooding (flag ON, 3 sessions)
2. Week 2 Stage 5.6 A/B (baseline vs Phase 1) — G5 판정
3. Pass → Phase 2. Fail → `REJECTED.md`

**Default 상태**: `A_TEAM_CLASSICAL_TOOLS` 미설정 또는 `=0` → 전체 네이티브. 사용자가 명시적으로 `=1` 설정 시에만 활성화.

**Rollback** (<5초):
```bash
unset A_TEAM_CLASSICAL_TOOLS   # 또는
export A_TEAM_CLASSICAL_TOOLS=0
```
모든 Grep/Glob → native, `/review` 비활성, ledger silent. 바이너리 제거 불필요. P6 "Opt-in 가능" 조건 핵심.

**활성화** (Wave 1 적용 후):
```bash
export A_TEAM_CLASSICAL_TOOLS=1   # 명시적 opt-in
```

## 7. Success Criteria — G5

| Gate | 목표 | 측정 |
|------|-----|------|
| G5-a (≥15%) | Phase 1: M1 −20~30% / Phase 2: +30~50% | B1/B3/B6 3회 평균 |
| G5-b (≤5% 악화) | M2 wall-clock (bash overhead), M3 tool-calls | hook timing log |
| G5-c (M4 유지) | rg/fd 결과 == grep/find (snapshot diff) | assertion |
| G5-d (≥4/6) | B1, B3, B6 확실 + B2/B5 부수 | Stage 5.6 리포트 |
| G5-e (σ<m×0.1) | 3회 반복 | BASELINE_SPEC |

**추가 지표**:
- `savings_estimate / total_calls ≥ 300` (Phase 1)
- `fallback_rate ≤ 5%`
- coder system prompt 증가 ≤ 2% (P8)

## 8. Risks

| Risk | 확률 | 영향 | 완화 |
|------|-----|-----|------|
| Windows scoop 부재 | M | M | GitHub Releases zip fallback + PATH 안내 |
| rg `--json` 파싱 오류 → M4 저하 | L | H | Phase 1 RED #2 + M4 gate |
| ast-grep Java/C# 커버리지 | M | L | MANIFEST P2 defer 명시 |
| bash wrapper M2 악화 | L | M | wrapper ≤20ms, G5-b 감지 |
| ledger 비대화 | M | L | `compact-ledger.sh` 주 1회 |

## 9. Decision
**ACCEPT for Stage 5.5**, Phase 1 Gate G5 통과 조건. Phase 2 별도 승인.

## References
- DD-03: `docs/research/2026-04-optimization/round-3/DD-03-classical-tools.md`
- [ripgrep](https://github.com/BurntSushi/ripgrep), [fd](https://github.com/sharkdp/fd), [ast-grep](https://github.com/ast-grep/ast-grep)
- [Budget-Aware Tool-Use arXiv 2511.17006](https://arxiv.org/abs/2511.17006)
