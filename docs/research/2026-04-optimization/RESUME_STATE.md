# RESUME_STATE — SSOT (Wave 1 Implementation 완료)

## Current State
- **Last updated**: 2026-04-14 12:15
- **Current stage**: **Wave 1 구현 완료 (module + infra), 실측 대기**
- **Status**: 4 RFC 모듈 구현 + 258/258 tests pass + bench infra + estimate 완료

---

## Wave 1 구현 상태 (요약)

| RFC | 모듈 | 테스트 | Opt-in Flag | 커밋 |
|-----|-----|--------|-------------|------|
| RFC-001 Prompt Caching | `scripts/prompt-cache.mjs` | 7 pass | `ENABLE_PROMPT_CACHING=true` | 8c83565 |
| RFC-003 ToolSearch | `templates/mcp.json.example` + `governance/rules/tool-search.md` | (docs) | 프로젝트별 `.mcp.json` | 48d8c38 |
| RFC-004 Classical Tools | `scripts/install-classical-tools.sh` + `.claude/agents/coder.md` routing | (script) | `A_TEAM_CLASSICAL_TOOLS=1` | f4694b6, 2bbecd8 |
| RFC-007 Spotlighting Phase S | `scripts/spotlight.mjs` | 14 pass | `A_TEAM_SPOTLIGHT=delimiting` | 2bbecd8 |
| Bench + G7 | `scripts/bench-runner.mjs` + `verify-g7.mjs` + `bench-wave1-candidate.mjs` | (runnable) | — | 0195950 |

**Full test suite: 258/258 pass** (기존 237 + 신규 21 = 7 prompt-cache + 14 spotlight)

---

## Estimate 결과 (⚠️ 실측 아님, Earned Integration 준수)

```
v-baseline dry-run → v-wave-1-estimate (4 RFC opt-in 활성 가정)

B1 Small Fix:         5051 → 3282  (-35.0%)
B2 TDD Feature:      11895 → 6840  (-42.5%)
B3 Multi-File:       24940 → 9041  (-63.7%)
B4 UI Visual:        14565 → 9467  (-35.0%)
B5 Research:         34009 → 19844 (-41.6%)
B6 Debug:            18297 → 8966  (-51.0%)

Total M1 delta:      -48.5% (overlap 15% 할인 후)
G7 verify:           ✓ PASS (회귀 0건)
```

**모든 수치는 추정**. Phase 2 실측 후 v-wave-1 tag 생성 예정.

---

## 다음 단계 (Phase 2 실측)

### Step 1: 실제 Claude 호출 infrastructure
- `scripts/bench-runner.mjs` 의 `runBenchmark()` 함수 실제 Claude API 호출로 확장
- 각 B1-B6 태스크를 실제 task prompt로 구현
- 실측 토큰/시간/tool call 수 집계

### Step 2: Baseline 실측
```bash
node scripts/bench-runner.mjs --tag v-baseline --runs 3
git tag v-baseline-actual
```

### Step 3: 각 RFC 단독 효과 측정
- RFC-001 only: ENABLE_PROMPT_CACHING=true, 나머지 off → v-rfc001-only
- RFC-003 only: ToolSearch 프로젝트 적용 → v-rfc003-only
- RFC-004 only: A_TEAM_CLASSICAL_TOOLS=1 → v-rfc004-only
- RFC-007 only: A_TEAM_SPOTLIGHT=delimiting → v-rfc007-only
- Run 4: 집합 측정 → v-wave-1

이는 F7 (단순 합산 금지) 준수 — 독립 효과 + 집합 효과 분리.

### Step 4: G5 + G7 판정
```bash
node scripts/verify-g7.mjs v-baseline v-wave-1
```
통과 시 `git tag v-wave-1` 공식 생성 + Wave 2 착수.
미달 시 해당 RFC rollback + 분석.

### Step 5: Wave 2 착수 (RFC-002/005/006-P1/007-M)

---

## 사용자 리뷰 대상

### 실제 적용 가능 시점
현재 4 RFC 모두 **opt-in default OFF**. 사용자가 명시적으로 flag 설정 시에만 활성.

### 즉시 사용 가능 (실측 없이도 안전)
- `bash scripts/install-classical-tools.sh` (tools 설치만)
- `cp templates/mcp.json.example <project>/.mcp.json` (프로젝트별 수동 적용)
- `cat governance/rules/tool-search.md` (정책 참고)

### Flag 활성화 시 동작 확인
```bash
# RFC-001 Prompt Caching 활성
export ENABLE_PROMPT_CACHING=true
# Ralph daemon 실행 시 cache_control 주입
# cache_read_input_tokens 로그 확인

# RFC-007 Spotlighting 활성
export A_TEAM_SPOTLIGHT=delimiting
# WebFetch/WebSearch 결과에 delimiter 자동 wrap
```

---

## 커밋 이력 (Wave 1 전체)

```
0195950 bench runner + G7 verifier + Wave 1 estimate (최신)
2bbecd8 RFC-004 coder routing + RFC-007 Spotlighting Phase S + 14 tests
f4694b6 RFC-004 install-classical-tools.sh
48d8c38 RFC-003 mcp.json.example + tool-search.md
8c83565 RFC-001 Prompt Caching module + daemon-utils wiring + 7 tests
cdb990d G7 No Regression Across Versions
34fd527 Adversarial Review 19 findings + HIGH/MED 수정
0bba418 Stage 6-7 Final 4 docs
349f473 Truth Contract
c6e9388 Governance v1 (ateam-first + autonomous-loop)
ee7fd96 7 RFCs
14ffd5a 6 Deep-dives
a772f46 Shortlist + strength mapping
aadf13e Round 1 research
v-baseline tag (pre-integration, ee7fd96 시점)
```

---

## Governance 완성 상태

- `governance/rules/ateam-first.md` — Survey Before Invent
- `governance/rules/autonomous-loop.md` — 자율 루프 계약 (Execute-Before-Describe)
- `governance/rules/truth-contract.md` — 거짓말 영구 금지
- `governance/rules/tool-search.md` — RFC-003 ToolSearch 정책
- `governance/rules/ateam-sovereignty.md` — 제8원칙 Survey Before Invent

전역 메모리:
- `~/.claude/memory/feedback_ateam_survey_first.md`
- `~/.claude/memory/feedback_autonomous_loop_contract.md`
- `~/.claude/memory/feedback_truth_contract.md`

---

## 종합 판정

**구현 완료 (4 RFC 모듈 + 테스트 + 벤치 인프라)**:
- ✅ 258/258 tests pass
- ✅ v-baseline dry-run + v-wave-1-estimate 둘 다 기록
- ✅ G7 verifier 동작 확인
- ✅ 전부 opt-in default OFF — regression 0% 보장

**미완료 (Phase 2 실측)**:
- ❌ 실제 Claude API A/B 벤치
- ❌ v-wave-1 공식 tag (실측 후)
- ❌ RFC-001 daemon-utils 연동 실전 검증 (세션 2+ cache hit 측정)

**Earned Integration 원칙 준수**:
- 추정 수치에 "estimate-only" 표기
- v-wave-1-estimate ≠ v-wave-1 (tag 구분)
- 수용은 실측 후에만

사용자 리뷰 결과에 따라 Phase 2 실측 착수 또는 Wave 2 병행 여부 결정.
