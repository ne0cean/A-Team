# Performance Ledger — 버전 간 성능 추적

> Wave별 B1–B6 전체 메트릭 실측치 시계열. G7 (No Regression Across Versions) 검증용 SSOT.

---

## 사용 방법

### Bench 실행 (dry-run 또는 실측)
```bash
# Dry-run (Phase 1, Claude API 호출 없이 synthetic data)
node scripts/bench-runner.mjs --tag v-baseline --runs 3 --dry-run

# 실측 (Phase 2, actual Claude invocation)
node scripts/bench-runner.mjs --tag v-baseline --runs 3
```

### G7 verification
```bash
node scripts/verify-g7.mjs v-baseline v-wave-1
# exit 0: PASS, exit 1: regression detected
```

---

## v-baseline (Dry-Run, 2026-04-14 10:07)

**Mode**: `dry-run` (synthetic, ±10% noise). 실측 전 테스트 인프라 검증용.

| Metric | B1 | B2 | B3 | B4 | B5 | B6 |
|--------|----|----|----|----|----|----|
| **M1 tokens (mean)** | 5051 | 11895 | 24940 | 14565 | 34009 | 18297 |
| M1 cv | 0.03 | 0.02 | 0.03 | 0.01 | 0.02 | 0.02 |
| **M2 time (s)** | 61 | 180 | 368 | 302 | 596 | 240 |
| M3 tool calls | 8 | 15 | 21 | 12 | 6 | 8 |
| **M4 correctness** | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| M5 regressions | 0 | 0 | 0 | 0 | 0 | 0 |

**Notes**: σ/mean (cv) < 0.1 모두 충족 (G5-e). `results.json` 위치: `.bench/v-baseline/results.json`.

---

## v-wave-1-estimate (추정, 2026-04-14 12:12)

**Mode**: `estimate-only`. RFC-001/003/004/007-S 모두 opt-in 활성 **가정** 시 추정치. **실측 아님**.

**⚠️ Earned Integration 원칙**: 이 숫자는 수용 근거가 아님. Phase 2 실측 필요.

### Per-Benchmark Projection

| Bench | Baseline M1 | Candidate M1 | Δ% | Applied RFCs |
|-------|-------------|--------------|-----|---------------|
| B1 | 5051 | 3282 | **-35.0%** | prompt_caching, tool_search, classical_tools |
| B2 | 11895 | 6840 | **-42.5%** | prompt_caching, tool_search |
| B3 | 24940 | 9041 | **-63.7%** | prompt_caching, tool_search, classical_tools |
| B4 | 14565 | 9467 | **-35.0%** | prompt_caching |
| B5 | 34009 | 19844 | **-41.6%** | prompt_caching, tool_search, spotlighting |
| B6 | 18297 | 8966 | **-51.0%** | prompt_caching, classical_tools |

**Total M1 delta: -48.5%** (overlap 15% 할인 반영)

### G7 Check (v-baseline → v-wave-1-estimate)
```
✓ G7 PASS: No regression across versions
- M4 (correctness): 모든 벤치 1.0 유지
- M1~M3/M5: 전부 개선 방향
```
파일: `.bench/v-wave-1-estimate/results.json`

---

## v-wave-1 (실측, 미착수)

**Mode**: _**미착수**_. 실제 Claude API A/B 측정 필요.

### 통과 요구사항
- **G5** (vs v-baseline): M1 ≥ 15% 개선, 모든 메트릭 ≤ 5% 악화, M4 ≥ baseline
- **G7** (vs v-baseline): 모든 메트릭 ≥ baseline (1% 노이즈 허용), M4 절대 하락 금지

### 체크리스트
- [ ] RFC-001 prototype 실측 (ENABLE_PROMPT_CACHING=true × B1-B6)
- [ ] RFC-003 ToolSearch 실측 (.mcp.json 프로젝트 적용 × B1-B6)
- [ ] RFC-004 Classical Tools 실측 (A_TEAM_CLASSICAL_TOOLS=1 × B1-B6)
- [ ] RFC-007 Spotlighting 실측 (A_TEAM_SPOTLIGHT=delimiting × B5)
- [ ] G5 + G7 판정 통과
- [ ] `git tag v-wave-1` 생성

### 실측 시 업데이트 위치
위 table 포맷으로 실측 수치 append.

---

## v-wave-2 (미착수, Wave 1 완료 후)

Planned: RFC-002 Handoff Compression, RFC-005 promptfoo+Langfuse, RFC-006-P1 Cascade, RFC-007-M

**G7 baseline = v-wave-1** (v-baseline 아님).

---

## v-wave-3 (미착수)

Planned: RFC-004-P2 ast-grep, RFC-006-P2 Budget-Aware, RFC-007-L worktree

**G7 baseline = v-wave-2**.

---

## Stage 9 Holistic (미착수)

Planned: Wave 1–3 집합 최적화, cross-RFC wiring, dead code 제거

**G7 baseline = v-wave-3**. 집합 최적화가 **개별 RFC 성능 퇴행**을 일으키면 G7-d 위반으로 rollback.

---

## Regression Detection Automation

**구현 완료**: `scripts/verify-g7.mjs`
- M4 (correctness): 0% 허용 (절대 하락 금지)
- M1/M2/M3/M5: 1% 노이즈 허용
- Exit 0 PASS / 1 FAIL / 2 config error

**CI 통합 (미래)**: GH Actions에서 매 PR 자동 실행 가능.

---

## 파일 구조

```
.bench/
├── v-baseline/
│   └── results.json
├── v-wave-1-estimate/
│   └── results.json
└── v-wave-1/ (실측 후)
    └── results.json
```

---

## 관련
- `BASELINE_SPEC.md` B1–B6 + M1–M5 명세
- `MANIFEST.md` G5 + G7 정의
- `final/INTEGRATION_ROADMAP.md` Wave 순서
- `final/ADVERSARIAL_REVIEW.md` F3 (Earned Integration) + F7 (단순 합산 금지) + F20 (G7)
- `scripts/bench-runner.mjs` 실행기
- `scripts/bench-wave1-candidate.mjs` 추정 시뮬레이터 (Phase 1 only)
- `scripts/verify-g7.mjs` 회귀 자동 감지
