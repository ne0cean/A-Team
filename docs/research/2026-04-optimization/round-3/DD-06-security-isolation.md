# DD-06 — Spotlighting + Git Worktree Speculative Exec (P4/P5/P6)

## 1. Spotlighting — 3 Modes (Microsoft 2025)

| Mode | 구현 | ASR (Attack Success Rate) | Token Overhead | 권장 |
|------|-----|--------------------------|---------------|------|
| **Delimiting** | 랜덤 delimiter 감싸기 `<<UNTRUSTED_START_xxx>>...<<UNTRUSTED_END_xxx>>` | >50% → ~40% (약함) | <0.5% | MVP only |
| **Datamarking** | special token 균등 주입 (50-char interval) | >50% → **<3%** (GPT-3.5), 0% (Text-003) | <1% | **기본 baseline 권장** |
| **Encoding** | base64/hex 변환 | >50% → **~0%** (near-perfect) | 1–2% | 고위험 파일만 |

### 대상 에이전트 (PreToolUse wrap 지점)

| Agent | 취약 입력 | Mode |
|-------|----------|------|
| Researcher | 웹 검색 결과, RAG, 외부 파일 | **Datamarking** (기본) |
| Coder | 사용자 입력, 웹 스니펫, auto-refactor | **Datamarking + Encoding** for high-risk |
| CSO | 로그, 사용자 리포트, 외부 보안 feed | **Encoding** |
| All sub-agents | 외부 MCP tool output | **Datamarking** default |

**Excluded (trusted)**: system prompt, CURRENT.md, MEMORY.md, governance rules, session chat history.

### PreToolUse Hook Skeleton

```python
def spotlight_untrusted_input(tool_name, params, trust_level="untrusted"):
    if tool_name in ["WebSearch", "RAG", "FileRead"] or trust_level == "untrusted":
        mode = config.SPOTLIGHT_MODE  # env A_TEAM_SPOTLIGHT
        if mode == "delimiting":
            params["content"] = f"<<UNTRUSTED_START_{random_hex(8)}>>{params['content']}<<UNTRUSTED_END_{random_hex(8)}>>"
        elif mode == "datamarking":
            params["content"] = inject_datamark_tokens(params["content"], interval=50)
        elif mode == "encoding" and is_high_risk_content(tool_name, params):
            params["content"] = base64_encode(params["content"])
            params["_encoding"] = "base64"
    return params
```

**Integration location**: `governance/rules/spotlighting.md` + `.agent/hooks/preToolUse-spotlight.js`
**Opt-out**: `A_TEAM_SPOTLIGHT=0` (기본 "datamarking")

## 2. Git Worktree Speculative Exec

### Flow

```
고위험 편집 탐지
  → scripts/worktree-exec.sh --task TASK_ID --branch exp/task-123
  → git worktree add /tmp/wt-exp-task-123 exp/task-123
  → agent가 격리 worktree에서 실행 + diff 생성
  → validation: test suite + 빌드
    ✅ PASS → git merge --squash, worktree remove, CURRENT.md 갱신
    ❌ FAIL → git worktree remove --force, 실패 로그만, main 영향 없음
```

### Script (`scripts/worktree-exec.sh`)

```bash
#!/bin/bash
set -euo pipefail
TASK_ID="$1"
BRANCH="${2:-exp/auto-$(date +%s)}"
WORKTREE_PATH="/tmp/wt-${BRANCH//\//-}"
FAILURE_BRANCH="failed/${BRANCH}"

git show-ref --quiet "refs/heads/${BRANCH}" && git worktree prune
git worktree add "${WORKTREE_PATH}" -b "${BRANCH}" main

trap "git worktree remove --force ${WORKTREE_PATH} 2>/dev/null || true" EXIT INT TERM

cd "${WORKTREE_PATH}"
export WORKTREE_EXEC=1 TASK_ID="${TASK_ID}"
# ... agent 실행 ...

if npm run test && npm run build 2>/dev/null; then
  cd - && git merge --squash "${BRANCH}" && git commit -m "task: ${TASK_ID} (worktree validated)"
  git branch -d "${BRANCH}"
else
  git branch -m "${BRANCH}" "${FAILURE_BRANCH}" 2>/dev/null || true
  echo "! Debug: ${FAILURE_BRANCH}"
fi
git worktree prune --verbose
```

### 고위험 판정 (coder PostToolUse hook)

- 파일 크기 >10KB AND diff >50 라인
- core 파일: `/server/server.js`, `package.json`, `/lib/**`
- breaking refactor: 함수 시그너처 변경, API 계약 변경

```javascript
if (tool === "EditFile" && isHighRisk(filePath, diff)) {
  if (!process.env.WORKTREE_EXEC) {
    return { action: "ask", message: `High-risk edit. Validate in worktree? (y/n)` };
  }
}
```

### 자동 정리 정책

1. 머지된 브랜치 → 즉시 제거
2. Unmerged >24h → `logs/worktree-stale.txt` → cron 인터랙티브 정리
3. Locked → 보존 (휴대기기 대비)
4. 실패 브랜치 → 7일 보존 후 `git worktree prune`

## 3. Role-Based Tool Whitelist (A4 보안)

| Agent | 허용 | 거부 | 근거 |
|-------|-----|-----|-----|
| **CSO** (audit) | Grep/Read/WebSearch/ReportGen | EditFile, Bash, MCP write | 기밀 보존, 우발 수정 방지 |
| **Researcher** | Grep/Read/WebSearch/Glob/RAG | EditFile, Bash | 검색 결과 코드 injection 차단 |
| **Coder** | All read/Bash | **sandboxed write only** (worktree context만) | spec verification 강제 |
| **Architect** | Grep/Read/Draw/RAG | EditFile, Bash | 설계 분리 |

**Location**: `governance/rules/tool-whitelist.md` + `.agent/agents/*.json` tool array 제약

## 4. Porting Difficulty (phased)

| Phase | Feature | Effort | Risk |
|-------|---------|--------|------|
| **S** | Spotlighting delimiting | 4일 | LOW |
| **M** | Datamarking + role whitelist | 2주 | MEDIUM |
| **L** | Encoding + worktree 정식화 | 3주 | MEDIUM-HIGH |
| **XL** | Bubblewrap + budget-aware escalation | 4–6주 | HIGH (Stage 9 defer) |

**권장**: S+M+L = 6주 production-ready baseline. XL defer.

## 5. Performance Impact

| Component | Overhead |
|-----------|----------|
| Spotlighting datamarking | <1% token |
| Spotlighting encoding | 1–2% token |
| Git worktree exec | **0%** (non-used 상태), one-time I/O on add/remove |
| Role whitelist | <0.5% (~100–200μs decision) |
| Hooks 전체 | ~50–100ms/call (tool exec 대비 무시 가능) |

**Total**: <<2% target. 성능 게이트 위반 없음.

## 6. Security Metrics

**Baseline (방어 없음)**:
- Direct injection 89.6% (roleplay)
- Indirect injection >50% (RAG/웹)
- Log-to-leak MCP 12 jailbreak 패턴

**With Spotlighting datamarking + encoding**:
- Indirect injection **>50% → <2%** (Microsoft 2025)
- Multi-model ensemble for high-risk: <0.5%
- MindGuard 통합(미래): +1–2pp correctness

### Lethal Trifecta Human Confirmation
특권 접근 + 무신뢰 입력 + exfil 능력 3가지 결합 시 **사람 승인 필수** gate.

## 7. Rollback

```bash
export A_TEAM_SPOTLIGHT=0  # 전체 비활성
# worktree는 항상 on (미사용 시 0 cost)
```

- Git tag: `A-Team/v{pre-spotlight}` 보존
- Migration doc: `governance/rules/spotlighting-disable.md`
- Zero breaking: 모든 기능 feature flag opt-in
- 스크립트 실패 시 main branch 진행 (경고만)
- Daily cron: `git worktree prune` (idempotent)

## 8. P1–P8 Impact

| Asset | Status | 비고 |
|-------|--------|------|
| P1 thin-wrapper | ✅ 무관 | 외부 훅 레이어 |
| P2 bkit | ✅ 강화 | gate-manager + budget tracker (L phase) |
| P3 PIOP | ✅ 강화 | Ralph Loop provenance tracking (context injection 탐지) |
| P4 hooks | ✅ **강화** | PreToolUse spotlight + PostToolUse validation |
| P5 CURRENT.md | ✅ **강화** | provenance tracking (source + injection time + validation state) |
| P6 Sovereignty | ✅ **강화** | OWASP ASI Top 10 2026 + tool whitelist |
| P7 TDD | ✅ 유지 | worktree validation이 테스트 커버리지 강제 |
| P8 slash <350B | ✅ 유지 | dynamic tool registry |

## 9. Stage 5 Checklist

**Spotlighting**:
- [ ] 무신뢰 tool 리스트 정의
- [ ] 3 mode functions 구현 + unit tests
- [ ] `governance/rules/spotlighting.md`
- [ ] `A_TEAM_SPOTLIGHT` flag (default: datamarking)
- [ ] `lib/hooks/preToolUse.ts` 통합

**Git worktree**:
- [ ] `scripts/worktree-exec.sh` Bash/PowerShell cross-platform
- [ ] 고위험 탐지 휴리스틱 PostToolUse hook
- [ ] `governance/workflows/worktree-safety.md`
- [ ] `logs/worktree-*.log` JSON schema

**Role whitelist**:
- [ ] `governance/rules/tool-whitelist.md`
- [ ] `agents/*.json` auto-generation from policy
- [ ] PreToolUse gate-check

**Stage 5.6 Benchmark**:
- [ ] M1: baseline vs datamarking vs encoding
- [ ] M4: injection ASR <2% 확인
- [ ] worktree: wall-clock, cleanup success rate
- [ ] P1–P8 regression test

## Sources
- [Microsoft Spotlighting (2025)](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
- [arXiv 2403.14720 Defending Against Indirect Prompt Injection](https://ceur-ws.org/Vol-3920/paper03.pdf)
- [Claude Agent SDK Hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)
- [Git Worktree Docs](https://git-scm.com/docs/git-worktree)
- [OWASP Agentic Top 10 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [Prompt Armor via Claude Code Hooks](https://www.promptarmor.com/resources/hijacking-claude-code-via-injected-marketplace-plugins)
