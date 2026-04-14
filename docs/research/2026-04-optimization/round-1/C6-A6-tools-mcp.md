# C6 (MCP/Tool use) + A6 (Non-AI tools) Survey

**Survey Date**: 2026-04-13
**Status**: Round 1 Stage 1 complete

## Executive Summary
- **C6**: MCP 2025-11-25 spec (Streamable HTTP, dynamic tool registry), Claude SDK dynamic tool search, budget-aware routing, Bubblewrap/Firejail sandboxing, git worktree 격리, OpenAI strict schemas.
- **A6**: ripgrep + fd + jq (즉시 적용), ast-grep (Phase 2), LSP/LSAP (Phase 3, 성숙도 대기).
- **주요 근거**: Budget-Aware Tool-Use (arXiv 2511.17006) 33% API 비용 절감 입증, ripgrep vs grep 5–13x 속도, LSP find-refs 600x faster.

## C6 Candidates Table

| 후보 | Purpose | Maturity | A-Team surface | Token 절감 | Risk | Verdict |
|-----|---------|---------|---------------|-----------|------|---------|
| MCP 2025-11-25 Streamable HTTP | Session mgmt, resumable SSE, Origin 검증 | Spec frozen Nov 2025 | `.claude/agents/` 시스템 프롬프트 docs | 0% (transport) | LOW | ✓ ACCEPT Phase 0 |
| Claude SDK Dynamic Tool Registry | tool def withhold, on-demand load | SDK native v0.16+ | orchestrator.md tool search | 5–10% | LOW | ✓ ACCEPT default on |
| Budget-Aware Tool Routing | 저가 tool 먼저 → 실패 시 LLM | Production (Nov 2025 paper) | Tier 2/3 escalation 확장 | 15–33% | MEDIUM (token counter 필요) | ✓ ACCEPT Phase 2 |
| Bubblewrap/Firejail Sandbox | namespace/seccomp 격리 | Production (Flatpak 기반) | `.agent/workflows/sandboxed-exec.md` | 0% (overhead <10ms) | MEDIUM (Linux-only) | ✓ ACCEPT Phase 2 opt-in |
| OpenAI strict schemas | JSON Schema 강제 준수 | Production (2024) | 결정트리 문서화 | 0% (품질) | LOW | ✓ ACCEPT docs only |
| git worktree isolated exec | 투기적 branch 실행, 실패 시 롤백 | Production (git 2.7+) | coder agent 기존 패턴 정식화 | 10–20% (실패 브랜치 컨텍스트 오염 방지) | LOW | ✓ ACCEPT + normalize |

## A6 Candidates Table

| 도구 | 카테고리 | Maturity | Token 절감 | 벤치마크 | A-Team 통합 | Risk | Verdict |
|-----|---------|---------|-----------|---------|-------------|------|---------|
| **ripgrep (rg)** | 텍스트 검색 | 13k⭐ | **20–30%** | 5–13x faster than grep (Linux kernel: 0.082s vs 0.671s) | 모든 Grep tool call default | LOW | ✓ ACCEPT Phase 1 즉시 |
| **fd** | 파일 검색 | 7k⭐ | **10–15%** | 2.46x faster than find | Glob 툴 companion | LOW | ✓ ACCEPT Phase 1 즉시 |
| **ast-grep (sg)** | 문법 인식 검색 | 13.4k⭐ (v0.42.1 2026-04) | **30–50%** (refactor) | 500 tokens (sg) vs 8000 tokens (LLM) for function rename | `/review` 옵션 skill, PATH 없으면 grep fallback | MEDIUM (tree-sitter per lang) | ✓ ACCEPT Phase 2 |
| **jq / yq** | JSON/YAML 파싱 | 15k⭐ / 3k⭐ | **10–20%** | 대형 API 응답: jq 50ms vs LLM 2000 tokens | `.context/` 스키마 추출 도구 | LOW | ✓ ACCEPT Phase 1 문서화 |
| tree-sitter | 파싱 분석 | 5k⭐ (IDE 임베디드) | 40–60% | Go-to-definition 100ms vs regex + 환각 위험 | LSP 레이어 통해서만 | HIGH (lang별 서버) | ⏱ DEFER Phase 3 |
| LSP/LSAP | 언어 지능 | LSAP v0.1 experimental | 50–70% | find-refs 50ms (LSP) vs 30s (grep) = 600x | skill + orchestrator 훅 | HIGH (서버 버저닝) | ⏱ DEFER Phase 3 LSAP 1.0 대기 |

## Key Findings

### 1. Budget-Aware Tool-Use (arXiv 2511.17006)
- Budget Tracker: 지속적 잔여 예산 피드백 vs 무인식 대비 33% 비용 절감 유지 (Success >90%, FCR >85%)
- BATS: 남은 예산 따라 "deeper" vs "pivot" 자동 결정
- **A-Team 매핑**: PIOP + Ralph Loop에 budget tracker 삽입 가능 (P3 강화, 대체 아님)

### 2. 비-LLM 도구의 토큰 절감 계층
1. **ripgrep + fd** (Phase 1): 전체 20–30%
2. **jq/yq** (Phase 1): 구조화 데이터 10–20%
3. **ast-grep** (Phase 2): 리팩터 30–50%
4. **LSP/LSAP** (Phase 3, 성숙도 대기): 리포 단위 50–70%

### 3. MCP 2026 spec 정리
- Streamable HTTP가 HTTP+SSE 대체 (2026-06 deprecation)
- Resource/Prompt providers: Tool 외에 docs 의미 검색, 사전 작성 프롬프트
- Session-Id + Last-Event-ID 기반 재연결

## Selection Criteria 전체 PASS
- Criteria 1 (maturity): rg/ast-grep 13k⭐, LSP 프로덕션 ✓
- Criteria 2 (compat): hooks 기반, P1–P8 비침습 ✓
- Criteria 3 (context cost): rg/fd/jq 0 오버헤드; ast-grep ~2% 시스템 프롬프트 ✓
- Criteria 4 (license): MIT/Apache ✓
- Criteria 5 (verification): B1–B6 측정 가능 ✓
- Criteria 6 (강화): P2(gate), P4(hooks), P5(sync) 보강 ✓
- Criteria 7 (no replacement): tool coexist, LLM fallback ✓
- Criteria 8 (opt-in): 전부 feature flag ✓

## P1–P8 Risk Summary
- **P8 (350B slash cmd)**: tool registry 비대화 리스크 → Claude SDK native dynamic loading으로 해결
- **Ripgrep 의존성**: 최소 시스템에서 grep fallback 필요
- **LSP 복잡도**: 언어별 서버 버저닝 — opt-in per language
- **Windows Bubblewrap**: Linux 전용 → OS 체크 gate
- **Budget 훅 오버헤드**: tool call당 50–100ms (tiktoken/Anthropic usage API 필요)

## Recommendations (phased)

### Phase 1 (Week 1–2) — low risk
1. 모든 Grep tool 호출 ripgrep default (grep backwards compat)
2. fd를 Glob 툴 companion으로
3. jq/yq 에이전트 워크플로우 문서화
4. MCP 2025-11-25 spec 반영 docs
5. git worktree 투기적 실행 정식화

### Phase 2 (Week 2–4) — medium risk
1. ast-grep optional `/review` skill
2. Bubblewrap sandbox 훅 (opt-in)
3. Budget-aware routing (PIOP 확장, tracker hook)
4. Dynamic tool registry 문서화

### Phase 3 (Week 4–6) — higher overhead, LSAP 1.0 대기
1. LSP/LSAP integration skill (Python/TS 우선)
2. tree-sitter 직접 통합 (LSAP 경유)
3. OpenAI strict schema 결정트리

**Gate**: 각 phase에서 B1–B6 ≥ 15% 토큰 절감 입증 시만 진행.

## Sources
- [MCP 2025-11-25 Spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Claude Agent SDK MCP](https://platform.claude.com/docs/en/agent-sdk/mcp)
- [ast-grep GitHub](https://github.com/ast-grep/ast-grep)
- [Budget-Aware Tool-Use (arXiv 2511.17006)](https://arxiv.org/abs/2511.17006)
- [Ripgrep CLI Performance](https://medium.com/@abhishekuniyal/i-cut-agent-dev-loops-by-2-3x-with-a-better-cli-stack-4e4ed013cfb6)
- [LSP for Coding Agents](https://medium.com/@dconsonni/using-coding-agents-with-language-server-protocols-on-large-codebases-24334bfff834)
- [Bubblewrap](https://github.com/containers/bubblewrap)
