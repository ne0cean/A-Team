# A-Team Migration Guide — Phase 14 Optimization (RFC-001 ~ RFC-007)

> Wave 1-3 수용 RFC를 실제로 활성화하고 기존 프로젝트에 마이그레이션하는 가이드. 모든 변경은 **opt-in default OFF** — 기존 동작은 변하지 않음.

---

## 전체 개요

| RFC | 상태 | Opt-in Env Flag | 기대 효과 (추정) |
|-----|-----|----------------|----------------|
| RFC-001 Prompt Caching | Wave 1 구현됨 | `ENABLE_PROMPT_CACHING=true` | M1 -35% (세션 2+) |
| RFC-002 Handoff Compression | Wave 2 구현됨 | `COMPRESSION_MODE=on` | Handoff M1 -74% |
| RFC-003 ToolSearch | Wave 1 템플릿 | `.mcp.json` 프로젝트별 수정 | 시스템 프롬프트 -93% |
| RFC-004 Classical Tools Phase 1 | Wave 1 구현됨 | `A_TEAM_CLASSICAL_TOOLS=1` | Search M1 -20~30% |
| RFC-004 Phase 2 ast-grep | Wave 3 skeleton | + `/review` skill + `ast-grep` 설치 | Refactor M1 -30~50% |
| RFC-005 promptfoo eval | Wave 2 skeleton | `npx promptfoo eval` | M4 gate 활성화 |
| RFC-006 Cascade Routing | Wave 2 구현됨 | `A_TEAM_CASCADE=1` | Cost -32~43% |
| RFC-006 Phase 2 Budget-Aware | Wave 3 구현됨 | `A_TEAM_BUDGET_AWARE=1` | +15~25% |
| RFC-007 Phase S Delimiting | Wave 1 구현됨 | `A_TEAM_SPOTLIGHT=delimiting` | Injection ASR <2% |
| RFC-007 Phase M Datamarking | Wave 2 구현됨 | `A_TEAM_SPOTLIGHT=datamarking` | 동일 (더 강함) |
| RFC-007 Phase L Worktree | Wave 3 script | `bash scripts/worktree-exec.sh <id> -- <cmd>` | 고위험 격리 |

⚠️ **Earned Integration**: 위 기대 효과는 모두 **실측 전 추정**. 실제 수용은 B1-B6 A/B 벤치 + G5+G7 게이트 통과 후.

---

## 단계별 활성화 가이드

### Step 1 — Tools 설치 (로컬 환경 준비)

```bash
# RFC-004 classical tools (rg/fd/jq)
npm run install-classical-tools

# Phase 2 ast-grep 추가
npm run install-classical-tools:with-sg
```

Windows MINGW64: scoop 또는 choco 필요. 자세한 안내는 script 실행 시 출력.

### Step 2 — Baseline 벤치 (dry-run)

```bash
npm run bench:baseline
```

출력: `.bench/v-baseline/results.json` — 3-run synthetic baseline.

### Step 3 — Wave 1 Opt-in (저위험)

```bash
# Prompt Caching (세션 2+에서 효과)
export ENABLE_PROMPT_CACHING=true

# Classical Tools (Grep→rg, Glob→fd 자동)
export A_TEAM_CLASSICAL_TOOLS=1

# Spotlighting (웹/RAG 콘텐츠 wrap)
export A_TEAM_SPOTLIGHT=delimiting
```

### Step 4 — 프로젝트 `.mcp.json` 적용 (RFC-003)

```bash
cp templates/mcp.json.example <your-project>/.mcp.json
# _comment, _note 등 주석 필드 제거
# Hot tools 3-5개 유지, 나머지 defer_loading=true
```

### Step 5 — Wave 2 Opt-in (중위험, Wave 1 안정 후)

```bash
# Handoff Compression
export COMPRESSION_MODE=on
bash scripts/model-exit.sh  # 5-layer 압축 결과 확인

# Cascade Routing (Haiku 60% / Sonnet 30% / Opus 10%)
export A_TEAM_CASCADE=1
export A_TEAM_CONFIDENCE_THRESHOLD=0.85

# Stronger spotlighting
export A_TEAM_SPOTLIGHT=datamarking
```

### Step 6 — promptfoo Eval Gate (RFC-005)

```bash
# 전역 설치 (최초 1회)
npm install -g promptfoo

# 벤치 실행
npx promptfoo eval -c eval/templates/b1-small-fix.yml
npx promptfoo eval -c eval/templates/b2-tdd-feature.yml
npx promptfoo eval -c eval/templates/b6-debug.yml
```

### Step 7 — Wave 3 Opt-in (고위험, Wave 2 안정 후)

```bash
# Budget-aware routing
export A_TEAM_BUDGET_AWARE=1
export A_TEAM_BUDGET_TOTAL_USD=5.0

# High-risk edit 격리 실행
bash scripts/worktree-exec.sh my-task -- npm test
```

### Step 8 — Weekly Auto-Research 활성 (Stage 10)

**로컬 cron**:
```bash
crontab -e
# 추가:
0 3 * * 1 bash ~/tools/A-Team/scripts/weekly-research.sh
```

**GitHub Actions**:
`.github/workflows/weekly-research.yml` 이미 존재. 리포지토리 Settings → Actions → Enable으로 활성.

---

## 롤백 가이드

### 단일 RFC 비활성화
각 env flag를 `=0` 또는 `unset`:
```bash
unset ENABLE_PROMPT_CACHING
unset A_TEAM_CLASSICAL_TOOLS
unset A_TEAM_SPOTLIGHT
unset COMPRESSION_MODE
unset A_TEAM_CASCADE
unset A_TEAM_BUDGET_AWARE
```

### 전체 Wave rollback (git tag 기반)
```bash
# Wave 1 이전 상태로
git checkout v-baseline

# Wave 2 이전 상태로
git checkout v-wave-1  # (실측 완료 후 태그 생성)
```

### G7 regression 감지 시
```bash
npm run verify-g7 -- v-wave-1 v-wave-2
# exit 1 → 자동 rollback 안내
```

---

## 검증 체크리스트 (활성화 후)

### Wave 1 후
- [ ] `npm test` — 전체 pass (회귀 0)
- [ ] `npm run bench:baseline` 실행 가능
- [ ] 각 opt-in flag toggle 확인 (env set/unset으로 동작 변화)
- [ ] `.context/CURRENT.md` 없어도 crash 안 남

### Wave 2 후
- [ ] `COMPRESSION_MODE=on bash scripts/model-exit.sh` → `.context/HANDOFF_PROMPT.txt`에 5-layer 구조 확인
- [ ] `A_TEAM_CASCADE=1` 설정 시 모델 선택 로그 확인
- [ ] `A_TEAM_SPOTLIGHT=datamarking`로 `<<DATAMARKED>>` 래퍼 출력 확인

### Wave 3 후
- [ ] `npm run verify-g7 -- v-wave-1 v-wave-2` 통과
- [ ] `bash scripts/worktree-exec.sh test-id -- echo hello` 정상 작동
- [ ] 설치된 `sg` 버전 확인 (`sg --version`)

### Stage 9 이후
- [ ] `final/CALL_GRAPH_v2.md` 생성
- [ ] Dead code 감사 통과
- [ ] `final/PERFORMANCE_LEDGER.md`에 실측 수치 기록

### Stage 10 이후
- [ ] Weekly cron 1회 실행 로그 확인 (`.research/weekly-*.log`)
- [ ] 자동 PR 생성 확인 (GH Actions 활성 시)

---

## 알려진 제한사항

### Cross-RFC 충돌
- **RFC-003 + RFC-006**: Haiku tier-2는 tool_search 미지원. Cascade 활성 시 Haiku는 자동 non-deferred fallback. 정책: `governance/rules/tool-search.md` §6.
- **RFC-005 + RFC-007**: Langfuse trace에 spotlighted content 들어갈 때 PII 마스킹 순서 = `PII mask → spotlight → trace`. 미구현.
- **RFC-001 + RFC-002**: Handoff 결과를 cache할 때 invalidation. mtime 기반 version hash. 미완성.

### 플랫폼 제약
- **Windows**: ast-grep, bubblewrap 미지원. Linux/macOS/WSL 권장.
- **Node.js ESM**: package.json `type: module` 필요 (이미 설정됨).

### 비용
- `A_TEAM_CASCADE=1` 시 Haiku 호출 증가 → Sonnet-only 대비 총 호출 수 증가 가능 (대신 토큰 절감).
- promptfoo eval은 실제 Claude API 호출 → 실행 시 비용 발생. `PROMPTFOO_SKIP=1` 로 CI에서 스킵.

---

## 지원 / 문제 보고

- RFC 상세: `docs/research/2026-04-optimization/rfc/RFC-00[1-7].md`
- 설계 리뷰: `docs/research/2026-04-optimization/final/ADVERSARIAL_REVIEW.md`
- 히스토리: `docs/HISTORY.md`
- GitHub Issues: https://github.com/ne0cean/A-Team/issues

---

**Last updated**: 2026-04-14 (Wave 3 skeleton + Stage 10 scripts 반영)
