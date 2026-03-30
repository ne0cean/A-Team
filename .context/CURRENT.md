# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.

## In Progress Files
(없음)

## Last Completions (2026-03-30)
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

## Previous Completions (2026-03-28)
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
- [ ] MoA Multi-Layer 실전 테스트 (3 expert × 2 round → judge 호출 시나리오)
- [ ] MoA Early Stop 검증 (Round 1에서 합의 도달 시 Round 2 스킵 확인)
- [ ] State Machine을 orchestrator에 실제 적용 (마크다운 산문 → 선언적 FSM 전환)
- [ ] PIOP LOW priority 연결 (16건 남음 — analytics→vibe, cost-tracker→vibe 등)
- [ ] Research → Ralph 파이프라인 e2e 테스트
- [ ] 멀티터미널 디스패치 실전 테스트 (2-agent dispatch → merge e2e)
- [ ] scripts/checkpoint.sh 실전 테스트 (BLOCKED 시나리오)

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
