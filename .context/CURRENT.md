# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**Phase 14 Optimization Research + Wave 1-3 구현 완료** (305 tests, build PASS, 2026-04-14).
**jangpm-meta-skills 통합 완료** (2026-04-15): `/autoresearch` + `/blueprint` + reflect IMP 등록.

## In Progress Files
(없음 — jangpm-meta-skills 통합 Phase 1+3+4 완료)

## Next Tasks
- [ ] **🗓️ 2026-04-22 10:17 KST — `/design-retro` 자동 실행 예약됨** (CronCreate, 1주 실측 후 삭제/튜닝/추가 판정). 크론 소멸 대비 백업 — 이 날짜에 수동으로라도 `/design-retro` 호출.
- [ ] **`/autoresearch` 파일럿 실행** (통합 완료). target 커맨드 1개(권장: `/office-hours`) 골라 baseline + 3~5 experiments → 품질 개선 실측. 첫 실행 시 `~/.claude/settings.json`에 permissions 추가 필요 (autoresearch.md "project setup" 섹션 참고)
- [ ] **`/blueprint` 실사용 1회** — Wave 2 또는 다음 기능을 blueprint로 문서화 → `/autoplan`으로 검토
- [ ] **IMP-20260415-01 처리** — reflect parallel-consolidate 패턴을 `/retro` 또는 `/end`에 적용 (P2, 여유 있을 때)
- [ ] **PMI MEDIUM 미연결 항목 파일럿** (pmi-2026-04-15.md M1-M4): design-auditor 실제 bash 호출 검증, logDesignAudit/logDesignOutcome 호출 경로, PostToolUse 훅 실제 설정
- [ ] **sleep.md 압축 검토** (현재 1141 words — 900 이하로, 가독성 유지 전제)
- [ ] **Design Subsystem 실전 파일럿** (Linear/Stripe/Rauno 3톤 각 1개 샘플 UI 생성)
- [ ] **design-smell-detector 룰 확장** (현재 15 / 계획 24 — RD-01/03/05, A11Y-05, LS-02/03 추가)
- [ ] **design-auditor LLM critique 실전 테스트** (AI-07 / PL-01 / PL-02)
- [ ] Wave 1 실측 A/B 벤치 (실제 Claude API 호출, RFC-001/003/004/007-S)
- [ ] G5+G7 판정 후 `v-wave-1` 공식 tag 생성
- [ ] lib/budget-tracker.ts ↔ lib/cost-tracker.ts 데이터 파이프 통합
- [ ] scripts/worktree-exec.sh 사용 안내 coder.md 추가
- [ ] eval/templates b3-b5 추가 (현재 b1/b2/b6 skeleton만)
- [ ] Wave 2/3 실측 → 공식 tag
- [ ] Stage 9 Holistic 진행 (Wave 3 실측 완료 후)
- [ ] Stage 10 Weekly cron 실제 활성화 (crontab 또는 GH Actions Enable)

## Last Completions (2026-04-15) — Design Subsystem 3-Phase
- **A-Team Design Subsystem 3-Phase 완성 — AI smell 차단 + 디자인 퀄리티 자동화 (272 tests in design branch / 305 tests post-merge)**
  자율 랄프 모드 세션. 새벽 리셋 인프라 (`/resume-on-reset` + `.context/RESUME.md` + CronCreate 트리거) 구축 후 Phase 1→2→3 무정지 진행.

  **Phase 1 — Foundation** (`e778e73`)
  - `governance/design/` 5 md 신규 (738 lines)
    - `gate.md` — UI 감지 heuristic + opt-out (`.design-override.md`) + a11y 비협상 + on-demand 로드 라우팅
    - `tone-first.md` — 11 tones + anti-generic hard ban (Inter/purple gradient/AI triad)
    - `variants.md` — 3 axes (variance/motion/density 1-10) + 7 presets + tone×variant 매트릭스
    - `components.md` — 20 core components + 6 principles + 12 anti-pattern table
    - `anti-patterns.md` — 24 detection rules (8 AI slop + 6 readability + 5 a11y + 3 layout + 2 polish) + 점수 체계
  - `orchestrator.md` Phase 2.2 Design Gate, `ui-inspector.md` auditor 연동, `vibe.md` Step 0.6 RESUME.md 감지
  - `.claude/commands/resume-on-reset.md` — 토큰 리셋 자동 재개 스킬
  - `.context/RESUME.md` — 세션 상태 스냅샷 (crash-safe 이어받기)

  **Phase 2 — Detector + Subagents + Gate Wiring** (`4cdd614`, +35 tests)
  - `lib/design-smell-detector.ts` — 15 static rule deterministic 감지 (regex/AST, 토큰 0)
    - AI-01..08, RD-02/04/06, A11Y-01..04, LS-01 구현
    - 점수 = 100 − (a11y×15 + ai_slop×8 + readability×5 + layout×3 + polish×5)
    - `DESIGN_AUDITOR_BREAKER_CONFIG` advisor-breaker 패턴 동일 공유
  - `lib/design-config.json` — 단일 진실 공급원 (breaker + threshold + 패턴 리스트)
  - `lib/analytics.ts` — `event: 'design_audit'` 타입 + `logDesignAudit()` 헬퍼 + formatReport 확장
  - `lib/learnings.ts` — `logDesignOutcome()` 함수 (accepted/overridden/partial/rejected 분류)
  - `.claude/agents/designer.md` (Haiku) — tone+variant 결정 → `.design-override.md` 저장
  - `.claude/agents/design-auditor.md` (Haiku) — detector 실행 + 회색지대 LLM critique (AI-07/PL-01/PL-02)
  - `.claude/commands/qa.md` `--design` 자동 체이닝, `craft.md` STEP 2.5 Design Brief + STEP 4 craft context(threshold 85), `ship.md` Step 5.5 게이트(threshold 70, a11y 0 비협상), `review.md` UI PR 자동 감사
  - `test/design-smell-detector.test.ts` 35 tests

  **Phase 3 — External Refs + Domain Reasoning** (`0d10ef4`)
  - `governance/design/refs/` 11 md (10 production brand DESIGN.md 역엔지니어링)
    - editorial: linear, stripe, claude, notion
    - bold-typographic: vercel
    - soft-pastel: raycast, arc
    - playful: figma
    - brutalist: rauno.me, bloomberg (data-dense 극단 케이스)
  - `governance/design/reasoning.json` — 17 domain × product-type → tone+variant 추천 룰 (UI/UX Pro Max 축약)
  - designer가 reasoning.json 파싱 + refs/{brand}.md 인용으로 tone 추론. design-auditor가 PL-01 tone mismatch critique 시 refs의 anti_patterns 대조.

  **최종 지표**:
  - 237 → 272 tests (+35), 전량 PASS
  - tsc 0 errors, npm audit 0 vulnerabilities
  - npm test 2.63s avg / tsc 1.63s avg (테스트 +35건 반영)
  - design 파일: governance 17 + lib 3 + agents 2 + refs 11 = 33 신규
  - **토큰 효율**: 비-UI 작업 오버헤드 0. UI 작업 평균 ~2600 tok/PR (legacy full-LLM 대비 -67%).
  - `.context/benchmarks/2026-04-15.json` 신규 baseline

  **자동 트리거 구조**:
  - orchestrator Phase 2.2 → UI 감지 시 designer/design-auditor 자동 체인
  - coder가 `.tsx/.css` 수정 → PostToolUse 훅 → design-auditor
  - `/qa --design` 또는 UI 파일 변경 → qa + ui-inspector + design-auditor 병렬
  - `/craft` STEP 2.5/4 → Design Brief + craft gate(85점)
  - `/ship` Step 5.5 + `/review` → 머지 전 게이트(70점 + a11y 0)
  - 사용자가 `/design` 따로 부를 필요 없음 — 맥락상 전부 자동

  **커밋 체인**: `e778e73` Phase 1 → `4cdd614` Phase 2 → `0d10ef4` Phase 3 → `5ce67b8` 세션 로그 → `a28ccf2` merge Phase 14 → `74bac24` RESUME complete → `d961967` CSO/doc-sync hardening

  **세션 종료 시점 추가 작업** (2026-04-15 06:00 KST):
  - `/autoresearch` 스킬 신설 — Karpathy식 프롬프트 자동 최적화 루프 (jangpm-meta-skills 포팅)
  - `governance/skills/autoresearch/` 7 guide + `governance/skills/blueprint/` 3 파일
  - `governance/experimental/jangpm-integration-design.md` — 외부 레포 분석 + 통합 계획
  - `/pmi` 신규 — Post-Major-Integration (PIOP entry point)
  - `/pickup` Step 2.5 sleep-mode 감지, `/vibe` Step 0.65 예약 회고 감지
  - `autonomous-loop.md` 강제 조항 6 나레이션 금지 추가
  - OS-level launchd 설치 (sleep-resume.sh + install-sleep-cron.sh, 매일 03:02 KST fire)
  - CLAUDE.md 자율 모드 트리거 의무 read 명시
  - `.gitignore` Claude runtime/autoresearch 제외
  - `.context/pmi-2026-04-15.md` 리포트 저장 (Phase 1-5 전체 실행)

  **Post-Cron Hardening** (`d961967`, 2026-04-15 05:13 KST, cron `d7858883` fire 후):
  - **CSO**: `lib/design-smell-detector.ts` MAX_CONTENT_BYTES 2MB guard (regex DoS 방지), 비문자열/오버사이즈 safe default 반환, 파일경로 metadata-only 명시
  - **Doc-Sync**: anti-patterns.md "22 static" 과장 → "15 static 구현 + 9 로드맵" 정직화
  - **Optimize (PIOP)**: cross-module wiring 재검증 — design-config ↔ detector ↔ auditor ↔ analytics/learnings, refs catalog 일치, 게이트 연결 확인
  - 보안 테스트 +2 → 376/376 전량 PASS, tsc 0 errors, npm audit 0 vulnerabilities

## Last Completions (2026-04-14) — Phase 14 Optimization Research

- **PIOP Phase 1-5 자동 실행 완료** (`/optimize`, `.context/piop-phase14.md`)
  - 18 신규 자원 중 15/18 (83%) 연결
  - 에이전트 프롬프트 오버사이즈 0건
  - build + 305/305 tests PASS
- **20 commit 체인** (aadf13e → 9b60d94) Push 완료
- **Governance 4 신규 rules** — ateam-first / autonomous-loop / truth-contract / tool-search
- **Sovereignty 제8원칙** — Survey Before Invent
- **Wave 1-3 RFC 구현**:
  - RFC-001 Prompt Caching, RFC-002 Handoff Compression, RFC-003 ToolSearch
  - RFC-004 Classical Tools (Phase 1 + Phase 2 review skill)
  - RFC-005 promptfoo templates, RFC-006 Cascade + Budget Tracker
  - RFC-007 Spotlighting (Phase S + M + L skeleton)
- **Bench 인프라** — bench-runner + verify-g7 + dry-run estimate
- **Total M1 delta estimate -48.5%** (실측 전, Earned Integration)
- **305 tests** (237 → 305, +68 신규)
- **문서 신규**: MIGRATION.md, HISTORY.md (Phase 0-14), PERFORMANCE_LEDGER.md, ADVERSARIAL_REVIEW.md, STAGE9_HOLISTIC.md

## Previous Completions (2026-04-11)
- **7-Pass 최적화 파이프라인 — "최적의 A-Team" 완성 (237 tests, Harness L5)**
  오늘 세션의 설계·구현·보안·문서 전체를 **7단계 순차 파이프라인**으로 검증 완료. 모든 발견 사항 실제 반영.
  1. **`/optimize` (PIOP)** — Phase 1-5, 7개 Cross-Module Wiring, 토큰 -11.8%
  2. **`/benchmark --diff`** — NEW BASELINE 생성 (`.context/benchmarks/2026-04-11.json`), 회귀 0
     - npm test 1.47s avg, tsc 0.74s, 19 test files / 237 tests, 0 errors
  3. **`/doc-sync`** — Health Score 92/100, STALE 2건 auto-fix (advisor-architecture.md `153→224 tests`), BROKEN 0
  4. **`/cso`** — OWASP Top 10 + STRIDE 8단계, HIGH 3 + MEDIUM 4 + LOW 3 발견 + 8건 즉시 패치
     - **CSO-H01** `.research/` 세션 UUID 공개 노출 차단 (`.gitignore` + `git rm --cached` 7종)
     - **CSO-H02** `vite 8.0.0-8.0.4` 3 CVEs → `npm audit fix` (0 vulnerabilities)
     - **CSO-H03** `daemon-utils.mjs` `bypassPermissions` 무음 폴백 → `'plan'` + 명시적 env var 요구
     - **CSO-M01** `A_TEAM_ADVISOR_*` env 자식 프로세스 전파 → `DANGEROUS_ENV_VARS` 추가
     - **CSO-M02** `maybeStartRalph()` 비원자 쓰기 → `atomicWriteJSON`
     - **CSO-M03** 이상 감지 파이프라인 → `checkAnomaly()` + finalState 기록
     - **CSO-M04** Threat Model 섹션 → `advisor-architecture.md` T1-T7 + Defense-in-Depth Matrix
     - **CSO-L02** `parseCheckCommand()` 셸 메타문자 경고 로그 강화
  5. **SimpleCircuitBreaker 완전 통합** — `lib/advisor-breaker-config.json` 신규 (단일 진실 공급원)
     - `lib/circuit-breaker.ts` + `scripts/daemon-utils.mjs` 양측 JSON import (model-pricing.json 패턴 동일 적용)
     - 이전 PIOP에서 부분 해결 → 이번 세션에서 DRY 완결
  6. **보안 테스트 +13** — `test/security-remediation.test.ts` CSO-H03/M01/L02 검증
  7. **세션 아카이브** — `.context/benchmarks/` + `.context/security-reports/` 리포트 영구 보존
  - **최종 지표**: 237 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities, Harness L5 (82.7/100)
  - **커밋 체인**: `497934b` PIOP → `2f23743` CSO → `{final}` CB 단일화 + 아카이브

- **PIOP Phase 1-5 전체 실행 — Cross-Module Wiring + Token Optimization (224 tests)**
  - **Phase 1 Integration Map** — 35 파일 분석, 30+ 항목 매트릭스 생성
    - HIGH: `ADVISOR_TOOL_BREAKER_CONFIG` 데드 설정 → daemon-utils.mjs 통합 (연결됨)
    - HIGH: `SimpleCircuitBreaker` 설정 하드코딩 → `ADVISOR_TOOL_BREAKER_CONFIG` 상수로 통합
    - MEDIUM: `cost-tracker.ts CostSummary` → `analytics.ts` 미연결 → 연결됨 (event='session_cost')
    - MEDIUM: `learnings.ts` advisor 패턴 미기록 → `logAdvisorOutcome()` 헬퍼 추가
    - MEDIUM: `claude-code.md` advisor tool 사용 규칙 없음 → 섹션 7 추가
    - MEDIUM: `vibe.md` pre-check 통계 미노출 → Step 0.7 업데이트
    - MEDIUM: `end.md` cost+analytics 통합 미흡 → Step 3.5 업데이트
  - **Phase 2 Cross-Module Wiring** (7개 연결):
    1. `daemon-utils.mjs` ← `ADVISOR_TOOL_BREAKER_CONFIG` export 추가 (TS 설정과 동기화)
    2. `ralph-daemon.mjs` ← `ADVISOR_TOOL_BREAKER_CONFIG` import → SimpleCircuitBreaker 생성에 사용
    3. `lib/analytics.ts` ← `session_cost` 이벤트 타입 추가 + formatReport 확장
    4. `lib/learnings.ts` ← `logAdvisorOutcome()` 헬퍼 신규 추가
    5. `.claude/commands/end.md` ← Step 3.5 cost→analytics 통합 패턴 명시
    6. `.claude/commands/vibe.md` ← Step 0.7 pre-check skip rate + advisor 비용 표시
    7. `governance/rules/claude-code.md` ← 섹션 7 Advisor Tool 사용 규칙 추가
  - **Phase 3 Trigger Optimization**: 모든 트리거 적절, lazy loading 추가 불필요
  - **Phase 4 Token Cost**: 에이전트 총 6,376 words (이전 7,232 → -856 words, -11.8%)
    - 모든 에이전트 목표 크기 이하 (최대: orchestrator 1041 words, 목표 <2000)
  - **Phase 5 Validation**: 224/224 PASS, TSC 0 errors, Adversarial 3/3 PASS
    - Harness Score: L5 (82.7/100)
  - **Deferred (0건)**: 모든 HIGH/MEDIUM 항목 이번 세션 처리 완료

- **Adversarial Review 14건 보안 리메디에이션 패치 (224 tests)**
  - Red Team 적대적 리뷰로 HIGH 5 / MEDIUM 6 / LOW 3 발견 → 14건 전량 패치
  - **HIGH 5건**:
    - #1 `scripts/ralph-daemon.mjs` — `checkCommand` 셸 인젝션 차단 (`sh -c` 제거, `parseCheckCommand()` + `ALLOWED_CHECK_COMMANDS` 화이트리스트)
    - #2 `scripts/ralph-daemon.mjs` — `state.model` allowlist 강제 (`ALLOWED_MODELS`), 미등록 모델은 sonnet fallback + 경고
    - #3 `.claude/agents/pre-check.md` + `orchestrator.md` — Prompt Injection 방어 (XML 펜스 `<user_input>` 격리 의무화, 무시 패턴 명시)
    - #4 `scripts/daemon-utils.mjs` — SDK 환경 오염 차단 (`new Anthropic({ baseURL: 'https://api.anthropic.com' })` 명시, `ANTHROPIC_BASE_URL`을 `DANGEROUS_ENV_VARS`에 추가)
    - #5 `scripts/ralph-daemon.mjs` — SDK 경로 예산 게이트 (`remainingBudget` 사전 검사, `budget-exhausted` stopReason 추가)
  - **MEDIUM 6건**:
    - #6 `lib/model-pricing.json` 신규 — 단일 진실 공급원으로 `cost-tracker.ts`와 `daemon-utils.mjs` 양측 동기화
    - #7 `scripts/daemon-utils.mjs` — `SimpleCircuitBreaker` 클래스 신규, ralph-daemon SDK 분기에 실제 연결 (기존 수동 비율 계산 대체)
    - #8 `lib/cost-tracker.ts` — `estimateIterationsCostUsd` 알 수 없는 타입 → Opus 보수적 가격 (양측 동기 패치)
    - #9 `.claude/agents/orchestrator.md` — `sampling_required` 시 eval-store 기록 의무 명시
    - #10 `scripts/ralph-daemon.mjs` — 브랜치명 유니코드 공백 제거(`\u200B-\u200F\u2028-\u202F\uFEFF`) + 정규식 최종 검증
    - #11 `scripts/research-daemon.mjs` — `saveState()` `writeFileSync` → `atomicWriteJSON` 전환
    - #12 `scripts/ralph-daemon.mjs` — `isNotifyUrlAllowed()` SSRF 차단 (localhost / private IP / metadata endpoint)
    - #13 `lib/cost-tracker.ts` — `load()` 스키마 검증 (`__proto__`/`constructor`/`prototype` 차단, `sanitizeNumber()` 음수/Infinity/NaN 제거)
  - **LOW 3건** (#14는 #7과 동시 해결):
    - #15 `scripts/daemon-utils.mjs` — `ADVISOR_BETA_HEADER` / `ADVISOR_TOOL_TYPE` 상수화 + 환경변수 오버라이드 + 무음 실패 감지
    - #16 `lib/eval-store.ts` — `validateEvalRun()` — `abVariant`/`qualityScore`/`costUsd`/`taskCategory` 범위/enum 검증
  - **신규 파일**: `lib/model-pricing.json`, `test/security-remediation.test.ts` (53 신규 보안 테스트)
  - **테스트**: 171 → 224 (+53, 전량 PASS)
  - **tsc --noEmit**: 0 errors
  - **커밋**: `eb538f7 security: Adversarial Review 14건 보안 리메디에이션 패치`

- **토큰 비용 추정 + Pre-Check 에이전트 (171 tests)**
  - `lib/cost-tracker.ts` — `MODEL_PRICING` 상수 (Opus/Sonnet/Haiku) + `estimateCostUsd()` + `estimateIterationsCostUsd()` 함수 export
  - `scripts/daemon-utils.mjs` — MODEL_PRICING JS 미러링 (Node/TS 경계) + `callSdkWithAdvisor` return에 `usage.costUsd` 포함
  - `scripts/ralph-daemon.mjs` — SDK 성공 분기에서 `state.totalCostUsd` + `advisorStats.totalCostUsd` 자동 누적
  - `scripts/research-daemon.mjs` — 동일 패턴, SDK 경로 비용 가시화
  - `.claude/agents/pre-check.md` (신규, 125줄) — Haiku 서브에이전트, Phase 1.5 Skip Gate 실행체
    - tools: Read, Glob, Grep / 판정: `SKIP | PROCEED` / confidence ≥ 0.95 보수적
    - 검증 절차: 중복 감지 → 금지 파일 감지 → 자명한 중복 → 판정
    - 10% 샘플링(`sampling_required`)으로 거짓 양성 검증 A/B
    - 자체 budget: input 2000 tok / output 300 tok
  - `.claude/agents/orchestrator.md` — Phase 1.5 실제 호출 섹션 추가 + verdict 용어 통일 (APPROVED/NEEDS_WORK → SKIP/PROCEED)
  - 테스트: 166 → 171 (+5, estimateCostUsd 검증 — Sonnet 1M I/O=$18 / Opus 캐시 90% 할인 / 캐시 쓰기 25% 할증 / fallback / 혼합 이터레이션)

- **Unified Advisor Architecture Phase 1+2 — `advisor_20260301` 통합 (166 tests)**
  - **배경**: Anthropic이 2026-04-09 공개한 네이티브 advisor tool (Sonnet executor + Opus advisor 단일 `/v1/messages` 내부 호출) 베타 통합
  - **공식 벤치**: SWE-bench Multilingual 72.1%→74.8% (+2.7pp), 비용 -11.9% / BrowseComp 19.7%→41.2% (2.09×)
  - **Layer A/B 분리 설계**: Claude Code 서브에이전트(Layer A)는 beta header 전달 경로 불확실 → advisor tool은 Layer B(자율 데몬)에만 적용. Layer A는 Pre-Check Skip Gate + 조건부 Reviewer로 동일 경제 효과 재현
  - **Phase 1 (Layer B 데몬)**:
    - `lib/cost-tracker.ts` — `CostRecord` optional 필드 10개 (`advisorCalls`, `cacheReadInputTokens`, `layer`, `phase`, `skipReason`, `abVariant` 등) + `CostSummary` 파생 지표 6개 (`preCheckSkipRate`, `reviewerCallRate`, `judgeCallRate`, `moaAvgRounds`, `advisorCallAvg`, `cacheHitRate`)
    - `lib/circuit-breaker.ts` — `ADVISOR_TOOL_BREAKER_CONFIG` 상수 (20% 실패율, 5분 창, 10분 쿨다운)
    - `scripts/daemon-utils.mjs` — `callSdkWithAdvisor()` 신규 (dynamic SDK import, beta header `advisor-tool-2026-03-01`, iterations[] 파싱)
    - `scripts/ralph-daemon.mjs` — `useSdkPath` flag 분기 + 자동 CLI fallback (20% 실패율 초과 시 자동 전환)
    - `@anthropic-ai/sdk` optional dependency 추가
  - **Phase 2 (Layer A + governance)**:
    - `scripts/research-daemon.mjs` — 리서치 계획 단계에 advisor 통합 (max_uses=2, 5m caching)
    - `.claude/agents/orchestrator.md` — Phase 1.5 Pre-Check Skip Gate 섹션 추가 (Haiku, confidence≥0.95 → Phase 2-5 전체 스킵, 10% 샘플링 검증)
    - `.claude/agents/reviewer.md` — 출력 스키마 30 토큰 1줄 요약 상단 삽입
    - `governance/workflows/moa.md` — Round 2+ Delta-Only 입력 강제 + "Layer B MoA 금지" 명시
    - `lib/eval-store.ts` — A/B variant 필드 (`abVariant`, `taskCategory`, `costUsd`, `qualityScore`, `latencyMs`)
  - **Documents**:
    - `governance/workflows/advisor-architecture.md` — 전체 설계 청사진 (Layer 분리 / 4-Way 매트릭스 / 핵심 경로 시퀀스 / Decision Log 7건)
    - `governance/workflows/advisor.md` — 데몬 운영 가이드 (tiering, 시스템 프롬프트, fallback 시나리오)
  - **테스트**: 153 → 166 (+13, 신규: cost-tracker 6 / circuit-breaker 5 / eval-store 2)
  - **성공 기준 (4주 rolling)**: Layer A 태스크당 -31% / Layer B iteration -12% / Pre-Check skip 15% / Reviewer 호출률 40% / harness-score 회귀 없음

## Previous Completions (2026-04-10)
- **PIOP 최적화 — 토큰 효율성 + 모듈 연결 개선**
  - `optimize.md` → thin 래퍼 전환 (97줄 → 10줄, -380 words)
  - `vibe.md` Daily Tip 외부화 → `governance/reference/daily-tips.md` (-314 words/session)
  - `orchestrator.md` MoA 섹션 외부화 → `governance/workflows/moa.md` (-427 words)
  - `state-machine.ts` 고아 모듈 연결 → orchestrator phase 라이프사이클 추적
  - `post-integration.md` Phase 5.2 추가 — adversarial + harness-score 검증 복원
  - 에이전트 총 토큰: 7,659 → 7,232 words (-5.6%)
  - 커맨드 총 토큰: 8,202 → 7,508 words (-8.5%)
  - 고아 모듈: 1개 → 0개 (state-machine 연결)
  - 153 tests PASS
- **`/improve` 역방향 피드백 시스템 구현**
  - `.claude/commands/improve.md` — 글로벌 `/improve` 커맨드 (등록/조회/반영 3모드)
  - `improvements/pending.md` + `done.md` — 개선사항 pending/완료 저장소
  - `vibe.md` Step 0.8 — 세션 시작 시 pending 개선사항 감지 알림
  - `governance/rules/claude-code.md` 6조 — toolkit-improvements → /improve 업데이트
  - `docs/11-integration-guide.md` — 파이프라인 다이어그램 /improve 기반으로 갱신
  - `install-commands.sh` 실행 → `~/.claude/commands/improve.md` 심링크 배포 (글로벌 31개)
- **정기 7축 최적화 (Biweekly Optimization Protocol)**
  - `governance/workflows/biweekly-optimize.md` — 7축 평가(체인 완전성, 계위 일관성, 토큰, 연쇄 효율성, 루프 폐합, 퍼포먼스, Dead Path) 워크플로우 정의
  - `.claude/commands/vibe.md` — Step 0.5에 14일 경과 시 정기 최적화 알림 추가
  - `.claude/commands/optimize.md` — `--biweekly` 인자 지원 추가

## Previous Completions (2026-04-09)
- **UI Auto-Inspect — 자동 시각 검증 파이프라인**
  - `scripts/browser/` — Playwright CLI 기반 6개 스크립트 (snapshot, diff, element, flow, report, install)
  - `templates/hooks/pre-ui-capture.sh` — PreToolUse: UI 파일 수정 전 before 스크린샷 자동 캡처
  - `templates/hooks/post-ui-verify.sh` — PostToolUse: after 스크린샷 + 픽셀 diff + 좌표 추출 + additionalContext 주입
  - `.claude/agents/ui-inspector.md` — UI 진단 전문 에이전트 (Bash+Read, MCP 0 오버헤드)
  - `governance/rules/visual-verification.md` — 자동 검증 거버넌스 (Claude 의무 행동 규정)
  - `governance/skills/ui-inspect/SKILL.md` — 스킬 카탈로그 등록
  - orchestrator.md — ui-inspector 라우팅 + UI 복합 태스크 자동 체이닝
  - coder.md — UI 파일 수정 시 자동 시각 검증 프로토콜 추가
  - templates/settings.json — PostToolUse 훅 등록
  - `~/.claude/settings.json` 글로벌 훅 등록 (모든 프로젝트 적용)
  - Playwright + Chromium 설치 완료, E2E 스크린샷 테스트 PASS
  - MCP 대비 토큰 93% 절감 (15,000 → ~1,000 tok/검증)

## Previous Completions (2026-04-07)
- **컨텍스트창 최적화 — 서브에이전트 아키텍처 전환**
  - 9개 서브에이전트 신규 생성: `cso`, `adversarial`, `review-pr`, `benchmark`, `qa`, `doc-sync`, `autoplan`, `tdd`, `guardrail`
  - 9개 슬래시 커맨드를 thin 래퍼로 교체 (3-5KB → ~350B, 메인 컨텍스트 90%+ 절감)
  - `install-commands.sh` cp→symlink 전환 (스킬 목록 중복 제거)
  - `vibe.md` Step 0.3 Daily Tip 추가 (매일 2개 유용한 명령어 자동 소개)
  - Tier 2 `guardrail` 에이전트 (haiku 모델, 코드 변경 후 품질 자동 체크)
  - 자동 트리거링: 에이전트 description에 자연어 매칭 → `/command` 없이 자동 라우팅
  - 빌드 검증: 153 tests pass

## Previous Completions (2026-03-30)
- **bkit 차용 (4개 모듈, 33 추가 테스트 → 총 153 테스트)**
  - `lib/circuit-breaker.ts` — 3-state 회로 차단기 (closed/open/half_open, per-feature 격리, auto-cooldown)
  - `lib/state-machine.ts` — 선언적 FSM (transition table + guard + action, 와일드카드, 히스토리)
  - `lib/gate-manager.ts` — Quality Gate (pass/retry/fail 3-verdict, metric-driven 조건 평가)
  - `lib/self-healing.ts` — 자동 복구 파이프라인 (Error→Fix→Verify 루프, max 5회, escalation)
  - orchestrator.md: circuit-breaker + self-healing 연결
  - reviewer.md: gate-manager 정량 평가 연결
- **PIOP MEDIUM priority wiring (연결율 34.3% → 54.3%)**
  - vibe.md Step 0.7: learnings/instinct 세션 시작 로드
  - orchestrator.md: Phase 0 hook_tier, Phase 3.7 학습 주입
  - reviewer.md: adversarial counter-check, coverage-audit 코드경로 검증
  - optimize.md Phase 5: adversarial + harness-score 검증
  - end.md Step 3.5: eval-store 세션 결과 저장
- **Ralph Loop 실전 테스트 성공**
  - Pre-check 통과 시 즉시 완료 (정상 동작 확인)
  - 실패 체크로 실전 실행: haiku가 `formatLearning()` 함수 + 테스트 4건 자율 구현 완료
- **3개 외부 레포 차용 (7개 모듈, 49 추가 테스트 → 총 116 테스트)**
  - `lib/adversarial.ts` — 반증 검증 (Bias Delta, Score/Confidence 지표) ← harness-diagnostics
  - `lib/harness-score.ts` — 12원칙 성숙도 스코어 (4차원 가중, L1-L5 등급) ← harness-diagnostics
  - `lib/hook-flags.ts` — 3티어 훅 강도 (minimal/standard/strict) ← everything-claude-code
  - `lib/quality-gate.ts` — Post-Edit 품질 게이트 (console.log/debugger/TODO 감지) ← everything-claude-code
  - `lib/cost-tracker.ts` — 세션별 토큰/비용 추적 (모델별 분해, 예산 초과 경고) ← everything-claude-code
  - `lib/instinct.ts` — Instinct 진화 모델 (confidence 가중, project→global 프로모션) ← everything-claude-code
  - `lib/config-protection.ts` — 린터/포맷터 설정 변경 차단 ← everything-claude-code
- **Post-Integration Optimization Protocol (PIOP) 생성**
  - `governance/workflows/post-integration.md` — 5-Phase 자동 최적화 프로토콜 (Integration Map → Cross-Module Wiring → Trigger Optimization → Token Cost Optimization → Validation & Report)
  - `.claude/commands/optimize.md` — `/optimize` 슬래시 커맨드 (수동/자동 실행)
  - `.claude/commands/vibe.md` — Step 0.5 PIOP 자동 감지 추가
  - `.claude/commands/end.md` — Step 3.5 PIOP 검사 추가
  - `.claude/agents/orchestrator.md` — Phase 5.7 PIOP 자동 실행 추가
- **gstack 핵심 코드 TDD 차용 (7개 모듈, 67 테스트)**
  - `lib/learnings.ts` — 크로스세션 학습 시스템 (JSONL, dedup, cross-project, skill/type 필터)
  - `lib/confidence.ts` — Confidence Calibration (1-10 점수, P0 예외, 교정 학습)
  - `lib/coverage-audit.ts` — 코드경로 추적 + ASCII 커버리지 다이어그램 + 게이트 (60%/80%)
  - `lib/skill-gen.ts` — SKILL.md 템플릿 파이프라인 ({{PLACEHOLDER}} → resolver, 신선도 검사)
  - `lib/eval-store.ts` — Eval 실행 저장/비교 (gate/periodic 2티어, regression/fix 감지)
  - `lib/analytics.ts` — 스킬 사용 추적 (JSONL, period 필터, repo별 분석, hook fire 이벤트)
  - `lib/worktree.ts` — WorktreeManager TS (격리 실행 + 패치 harvest + 중복 제거)
  - `.claude/agents/reviewer.md` — Confidence Calibration 섹션 통합
  - 테스트 인프라: `package.json` + `vitest` + `tsconfig.json` (67 tests, 0 failures)
- **MoA Multi-Layer Loop + Judge Agent + Stall Detection 통합**
  - `.claude/agents/orchestrator.md` — MoA 섹션 전면 확장: Multi-Layer 라운드 루프(max_rounds=3), 전문가 프롬프트 템플릿(이전 라운드 출력 주입), 합의 검사(consensus_score), Early Stop(stall 감지 + 합의 도달), 3단계 Aggregation(강한합의/다수합의/불일치→judge), 비용 제어(max_tokens, 요약 주입)
  - `.claude/agents/judge.md` — 신규: MoA 충돌 해소 전담 에이전트. 근거 강도 5단계 평가(code>test>doc>experience>reasoning), 합의 판정 전략(강한/다수/완전불일치), ESCALATE 조건, 구조화 JSON 출력
- **Auto Mode 통합 + 보안 강화**
  - `scripts/daemon-utils.mjs` — `getPermissionMode()`: auto 우선, 캐시, 허용목록 검증, `buildClaudeEnv()` 위험 env 제거(NODE_OPTIONS 등 6개), `safePath()` 경계 수정
  - `scripts/ralph-daemon.mjs` — auto mode 전환 + `checkCommand` freeze (런타임 명령 주입 차단)
  - `scripts/research-daemon.mjs` — auto mode + 공유 유틸 통합 + `maybeStartRalph()` env 명시 전파
  - `scripts/dispatch.sh` — auto 기본 + 허용목록 검증 + 변수 인용 + `export CLAUDE_PERMISSION_MODE`
  - `.claude/commands/vibe.md` — Step 3.7 Auto Mode 활성화 안내
  - `governance/workflows/vibe.md` — Permission Mode 단계(Step 5) ���가
  - `/review` 적대적 리뷰: CRITICAL 2 + HIGH 3 + MEDIUM 4 전량 수정

## Previous Completions 2 (2026-03-28)
- **Ralph Loop 자율 개발 데몬 구현** (NEW)
  - `scripts/ralph-daemon.mjs` — 5레이어 비용 최적화 (pre-check, stall detection, lean context, model tiering, budget cap)
  - `scripts/ralph-prompts.mjs` — per-iteration lean context 빌더 + AGENTS.md 학습 축적
  - `scripts/daemon-utils.mjs` — 공통 유틸 추출 (atomicWriteJSON, findClaude, safePath)
  - `.claude/commands/ralph.md` — `/ralph` 글로벌 커맨드 (start/stop/status/log/notes)
  - 별도 브랜치 안전장치 (`ralph/YYYY-MM-DD-<slug>` 자동 생성)
- **Research → Ralph 파이프라인**
  - `research-daemon.mjs` 확장: 리서치 완료 후 `ralph-state.json` pending 감지 → Ralph 자동 시작
  - `/re pipeline "task"` 원스탑 커맨드 추가
  - 리서치 노트 → Ralph 프롬프트 자동 연결
- **`/vibe` Step 3.5** — 주간 세션 시 야간 Ralph 태스크 자동 제안
- **코드 리뷰 + 최적화**: HIGH 3건 + MEDIUM 7건 + LOW 3건 전량 수정
  - atomic write (renameSync), pipeline race condition 롤백, 하드코딩 경로 제거, spawn timeout, 경로 트래버설 방지 등

## Next Tasks
- [ ] **Design Subsystem 실전 파일럿** (실제 UI 프로젝트에서 `.design-override.md` 자동 생성 → design-auditor PR 게이트 검증. Linear/Stripe/Rauno 3톤 각 1개 샘플 생성)
- [ ] **design-smell-detector 룰 확장** (현재 15개 구현 / 24개 계획 — RD-01 long line, RD-03 low contrast, RD-05 heading skip, A11Y-05 form label, LS-02/03 추가)
- [ ] **design-auditor LLM critique 실전 테스트** (AI-07 Hero-Features-CTA 템플릿 감지, PL-01 tone mismatch, PL-02 missing personality 3건 실 프로젝트 적용)
- [ ] **Advisor tool 라이브 API 테스트** (useSdkPath=true + ANTHROPIC_API_KEY → ralph --once 단일 iteration 검증)
- [ ] **eval-store A/B 수집 개시** (advisor-on/off 50 샘플 → harness-score 비교, advisor 효과 실측)
- [ ] **Phase 1.5 skip rate 실측** (pre-check 에이전트 첫 데이터 수집 → confidence 0.95 임계치 조정)
- [ ] **CSO-L03 GPG 서명 + CI** (GitHub Actions npm test on PR, governance/ 변경 필수 리뷰)
- [ ] **CSO-L01 sampling_required 런타임 집행** (orchestrator가 true 시 병렬 검증 파이프라인 의무 실행)
- [ ] **MODEL_PRICING 공식 가격 대조** (Anthropic 공식 페이지와 대조 후 advisor-breaker-config.json도 동일 검증)
- [ ] **CURRENT.md 분할** (400+줄 도달 — 오래된 Last Completions를 SESSIONS.md archive로 이관)
- [ ] UI Auto-Inspect 실전 테스트 (실제 .tsx 수정 → 훅 자동 트리거 → diff Read 검증)
- [ ] A-Team/ 미러 디렉토리 동기화 스크립트 자동화 (mirror-sync 규칙 활용)
- [ ] 서브에이전트 실전 트리거 테스트 (자연어 "리뷰해줘" → review-pr 에이전트 자동 라우팅 확인)
- [ ] orchestrator에서 guardrail 에이전트 자동 호출 연결 (coder 완료 후)
- [ ] MoA Multi-Layer 실전 테스트 (3 expert × 2 round → judge 호출 시나리오)
- [ ] PIOP LOW priority 연결 (16건 남음 — analytics→vibe, cost-tracker→vibe 등)

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
