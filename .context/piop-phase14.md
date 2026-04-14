═══════════════════════════════════════════════════════
  POST-INTEGRATION OPTIMIZATION REPORT — Phase 14
  2026-04-14 | /optimize 자동 실행
═══════════════════════════════════════════════════════

## Phase 1: Integration Map

### 신규 모듈 인벤토리
| 파일 | 유형 | 상태 |
|------|-----|------|
| lib/cascade-gate.ts | lib 모듈 (RFC-006) | ✅ gate-manager.ts 기반, evaluateCascade export |
| lib/budget-tracker.ts | lib 모듈 (RFC-006 P2) | ⚠️ cost-tracker.ts와 중복 기능 가능 |
| scripts/prompt-cache.mjs | 스크립트 (RFC-001) | ✅ daemon-utils.mjs::callSdkWithAdvisor 연동됨 |
| scripts/spotlight.mjs | 스크립트 (RFC-007) | ✅ researcher.md에 안내 추가 (이번 PIOP) |
| scripts/handoff-compressor.mjs | 스크립트 (RFC-002) | ✅ model-exit.sh 연동됨 |
| scripts/bench-runner.mjs | bench infra | ✅ package.json scripts 노출 |
| scripts/verify-g7.mjs | G7 검증 | ✅ package.json scripts 노출 |
| scripts/bench-wave1-candidate.mjs | 추정기 | ✅ package.json `bench:estimate` |
| scripts/worktree-exec.sh | RFC-007 Phase L | ⚠️ agent routing 연결 없음 (manual 호출만) |
| scripts/install-classical-tools.sh | RFC-004 | ✅ npm run install-classical-tools |
| scripts/weekly-research.sh | Stage 10 | ✅ package.json `research:weekly` |
| templates/hooks/pre-spotlight.sh | hook | ✅ observational, opt-in 시 활성 |
| templates/mcp.json.example | 프로젝트 템플릿 | ✅ MIGRATION.md Step 4 참조 |
| governance/skills/review/SKILL.md | Skill (RFC-004 P2) | ✅ coder.md 이미 언급 |
| governance/rules/ateam-first.md | 규칙 | ✅ sovereignty 제8원칙 연동 |
| governance/rules/autonomous-loop.md | 규칙 | ✅ truth-contract.md 연동 |
| governance/rules/truth-contract.md | 규칙 | ✅ 상위 규칙 |
| governance/rules/tool-search.md | 규칙 (RFC-003) | ✅ templates/mcp.json.example 참조 |

**연결 현황**: 18개 신규 자원 중 **15개 연결 완료 + 3개 경미한 보완 가능** (연결률 83%).

### 미연결 / 보완 항목
1. **lib/budget-tracker.ts ↔ lib/cost-tracker.ts**: 기존 `cost-tracker.ts`는 advisor/model 비용 추적, 신규 `budget-tracker.ts`는 tool call 비용 추정. 기능 분리 유지하되 Phase 2 통합 시 `cost-tracker`가 `budget-tracker` 데이터 consume 권장. **Deferred to Wave 3 실측 단계**.
2. **scripts/worktree-exec.sh ↔ .claude/agents/coder.md**: coder가 고위험 편집 시 worktree-exec 호출 안내 미포함. Wave 3 활성화 시 문서 추가 예정.
3. **lib/cascade-gate.ts ↔ orchestrator.md**: cascade 라우팅이 주로 PIOP + daemon 레벨이라 orchestrator 연결은 불필요 판정.

---

## Phase 2: Cross-Module Wiring

### 연결 추가 (이번 세션)
- `.claude/agents/researcher.md` — RFC-007 Spotlighting 안내 추가 (Import-and-Call 패턴)
- `.claude/agents/coder.md` — RFC-004 Classical Tools routing (이전 커밋)
- `scripts/daemon-utils.mjs` — RFC-001 `cachedMessageCreate` wiring (이전 커밋)
- `scripts/model-exit.sh` — RFC-002 Handoff Compression 분기 (이전 커밋)

### 연결 패턴 분포
- Import-and-Call: 2 (daemon-utils → prompt-cache, model-exit → handoff-compressor)
- Context Injection: 2 (researcher 안내, coder routing)
- Event Trigger: 1 (pre-spotlight.sh hook → log only)
- Feedback Loop: 0 (이번 세션 범위 외)

---

## Phase 3: Trigger Optimization

### 트리거 매트릭스
| MODULE | TRIGGER | COST | REQUIRED |
|--------|---------|------|----------|
| prompt-cache | 매 SDK 호출 (flag ON 시) | low | optional |
| handoff-compressor | /handoff 또는 model-exit.sh 실행 시 | low | optional |
| spotlight | WebFetch/WebSearch tool 호출 시 | low | optional |
| classical-tools routing | Grep/Glob tool 호출 시 (flag ON) | low | optional |
| cascade-gate | subagent 호출 시 (flag ON) | low | optional |
| budget-tracker | PreToolUse hook (flag ON) | low | optional |
| worktree-exec | 수동 호출만 (고위험 편집) | medium | optional |
| bench-runner | 수동 또는 CI | high (API call) | optional |
| weekly-research | 매주 월요일 03:00 KST (cron) | high | optional |

### 최적화
- 전부 **opt-in default OFF** → 트리거 과도 유발 방지
- 중복 호출: spotlight + PII masking 순서 정합 (RFC-005 연계, Wave 2)
- Lazy loading: prompt-cache.mjs는 daemon-utils에서 top import로 로드 (매 세션 1회)

---

## Phase 4: Token Cost Optimization

### Agent 프롬프트 크기 감사
```
adversarial.md     327 words   < target 800 ✓
architect.md       407 words   < 1200 ✓
autoplan.md        313 words   ✓
benchmark.md       320 words   ✓
coder.md           663 words   < 1200 ✓ (+120 words from RFC-004 routing, 22% 증가)
cso.md             460 words   ✓
doc-sync.md        274 words   ✓
guardrail.md       347 words   ✓
judge.md           400 words   < 1000 ✓
orchestrator.md  1,139 words   < 2000 ✓
pre-check.md       700 words   ✓
qa.md              393 words   ✓
researcher.md      337 words*  (+spotlight 안내 이번 PIOP)
review-pr.md       426 words   ✓
reviewer.md      1,002 words   < 1500 ✓
tdd.md             302 words   ✓
ui-inspector.md    347 words   ✓
```

**Total**: ~8,500 words — 오버사이즈 에이전트 0건.

### MoA 비용 제어
- RFC-005 promptfoo eval에 Haiku rubric 고정 (낙관 기대 M1 overhead <0.5%)
- RFC-006 Cascade 도입 시 Haiku 60% 분포 → 평균 비용 -33% projection

---

## Phase 5: Validation & Report

### 빌드 검증
- ✅ `npm run build` PASS (tsc --noEmit, 0 errors)
- ✅ `npm test` PASS (305/305 tests)
- ✅ `.claude/commands/` install-commands.sh sync 완료 (30개 커맨드, +3 new)

### Adversarial + Harness 검증
- Harness 성숙도: (이번 세션은 수동 확인 미실행, `/optimize` Phase 5.2 자동 실행 대상)
- Adversarial check: ADVERSARIAL_REVIEW.md 19 findings 이미 반영 (HIGH 3, MED 8, LOW 6, Cross-RFC 4, Meta 2)

### 통합률
- 연결 완료: 15/18 (83%)
- 보완 필요: 3건 (Deferred to Wave 3 실측)
- 차단 이슈: 0

═══════════════════════════════════════════════════════
  PIOP Phase 14 COMPLETE
═══════════════════════════════════════════════════════

### 결론
Phase 14 Optimization Research 세션의 18개 신규 자원이 기존 A-Team 아키텍처에 유기적으로 통합됨. 모든 활성화는 opt-in default OFF이며 기존 기능에 regression 0건. Wave 1 (RFC-001/003/004/007-S) + Wave 2 (RFC-002/005/006/007-M) + Wave 3 skeleton (budget-tracker, worktree-exec) 구현 완료. 실측 (Phase 2) 단계에서 G5+G7 통과 후 공식 수용.

### 다음 TODO (Wave 3 실측 단계에서 해결)
- [ ] lib/budget-tracker.ts ↔ cost-tracker.ts 데이터 파이프 통합
- [ ] scripts/worktree-exec.sh 사용 안내 coder.md 추가
- [ ] B1-B6 실제 Claude API 벤치 실행 (현재 dry-run만)
- [ ] G5+G7 실측 판정 후 v-wave-1 tag 생성
- [ ] eval/templates/b3-b5 추가 (현재 b1/b2/b6 skeleton만)

### 커밋 참조
Phase 14 전체 이력: `docs/HISTORY.md` Phase 14 섹션 (aadf13e ~ 9b60d94)
이번 PIOP 커밋: (다음 커밋 해시에 기록)
