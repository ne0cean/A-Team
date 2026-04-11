# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.

## In Progress Files
(없음)

## Last Completions (2026-04-11)
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
- [ ] **Advisor tool 라이브 API 테스트** (useSdkPath=true + ANTHROPIC_API_KEY → ralph --once 단일 iteration 검증)
- [ ] **Phase 1.5 Skip Gate 실제 Haiku 호출 구현체** (orchestrator 에이전트 런타임 로직)
- [ ] **eval-store A/B 수집 개시** (advisor-on/off 50 샘플 → harness-score 비교)
- [ ] **토큰 기반 비용 추정** (SDK 경로 `costUsd` 필드 채우기 → cost-tracker 완결)
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
