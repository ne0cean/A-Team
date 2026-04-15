# SESSIONS — A-Team 세션 로그

---

## [2026-04-15 저녁] Sleep 버그 수정 + /end 자동 repo 생성 + /absorb 역류 시스템

**컨텍스트**: 외출 14시간 후 복귀. 자율 모드 0건 진행 발견 → 근본 원인 분석 → 버그 수정 + 인프라 확장 + 다른 프로젝트 개선사항 역류 흡수 시스템 구축.

**완료** (392 tests, 빌드 PASS):

### 1. Sleep 버그 수정 (3개)
- `claude -p --dangerously-skip-permissions <prompt>` 플래그 파싱 버그 → `--permission-mode bypassPermissions` 교체 (근본 원인)
- Rate-limit regex 확장 ("hit your limit", "resets 9am", "5-hour limit" 등 Claude Code 실제 메시지)
- `gtimeout 2700` (45분) + `trap EXIT` final 로깅 + plist `AbandonProcessGroup=true` + `ThrottleInterval=30`
- 격리 테스트로 `claude -p --permission-mode bypassPermissions --model haiku "Print DONE"` → "DONE" 정상 반환 확인

### 2. End-to-End 검증 강제 조항 신설 (재발 방지)
- `autonomous-loop.md` 강제 조항 7: 자율 루프 인프라 설치 후 실 본작업 1 cycle 성공 관찰 없이 외출 허락 금지
- 2026-04-15 새벽 사건 재발 방지 목적

### 3. T1-T6 static rule 직접 구현 (대면 세션)
- RESUME.md 큐잉된 6 rule: RD-01/05, A11Y-05, LS-02/03, AI-07 signal
- 376 → 392 tests (+16), tsc 0 errors
- Static rule 15/24 → 21/24 (87.5%)
- 남은 3: RD-03 WCAG color calc + PL-01/02 LLM critique

### 4. /end 근본 버그 수정 + 자동 repo 생성
- `git push origin main` 하드코딩 → `git branch --show-current` 로 자동 감지
- 다른 컴퓨터에서 /end 실행 시 push 실패하고 성공 처리된 사건 근본 원인
- Remote 미설정 시 `gh repo create <dirname> --private --source=. --remote=origin --push` 자동
- "Repository not found" 에러 감지 시 계정/이름 파싱해 자동 생성
- Non-fast-forward 시 `pull --rebase` 후 재시도
- 실패 시 `exit 1` 강제 (**절대 성공 처리 금지**)

### 5. /vibe Step 0.2 A-Team 자동 sync
- FETCH_HEAD mtime 6h 초과 시 `git pull --rebase --autostash origin master` 자동
- Symlink 구조 (`~/.claude/commands/end.md → ~/Projects/a-team/...`) 라 pull만으로 전체 반영
- 복사본 감지 시 `install-commands.sh` 재실행 안내
- 경로 탐색: `~/Projects/a-team` → `~/tools/A-Team` → `~/A-Team`

### 6. /absorb 역류 시스템 (다른 프로젝트 → master)
- **순수 bash 스캐너** (`scripts/absorb-scan.sh`): regex heuristic 분류 (LOCAL/GLOBAL/UNCLEAR). 비용 $0, 5초.
- **주간 launchd** (`scripts/install-absorb-cron.sh`): 매주 일요일 11:07 KST fire. `com.ateam.absorb-weekly` 등록 완료.
- **첫 실전 스캔**: 12 프로젝트 → NEW 23 + DIFF 9 = 32 파일 → `improvements/pending.md` 에 30건 등록 (IMP-20260415-01 ~ 30)
- Top GLOBAL 후보: `connectome/ateam.md`, `connectome/vibe.md` DIFF 213 lines, `do-better-workspace/create-command.md`

**이슈**:
- 다른 컴퓨터 로컬 커밋 push 필요 (수동 `git push origin master`)
- sleep.md 1141 words 압축 후보 (Next Tasks)
- CURRENT.md `## Next Tasks` 섹션 2개 (Phase 14 merge 잔재, 향후 정리)

**빌드**: ✅ 392/392 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities

**커밋 체인** (10건): `b5529fe` → `7072d24` → `8df9bbc` → `8d2e7bd` → `9e71590` → `236de1e` → `40db289` → `a24dc68` → `1542c1e` → `136dbdd`

**Next 우선순위**:
- 사용자가 `improvements/pending.md` 30건 검토 → GLOBAL 4건부터 `/improve apply`
- 남은 3 static rule (RD-03 WCAG + PL-01/02 LLM critique)
- Design Subsystem 실전 파일럿 (Linear/Stripe/Rauno 3톤)

---

## [2026-04-15] 세션 종결 — /pmi + /autoresearch + jangpm 통합 설계 + 나레이션 금지

**완료** (06:00 KST, 376 tests, 빌드 PASS):
- `/pmi` skill 신규 — Post-Major-Integration entry point (post-integration.md 의 별칭)
- PIOP 5-Phase 정식 실행 — 이번 세션 통합을 Integration Map → Wiring → Trigger → Token → Validation 으로 검증
  - HIGH 3건 즉시 수정: /pickup sleep-mode 감지, /vibe 예약 회고 감지, /pmi entry point
  - MEDIUM 4건은 Next Tasks (실 파일럿 필요)
- `autonomous-loop.md` 강제 조항 6 신설 — 나레이션 금지 (2026-04-14 새벽 사건 재발 방지)
- CLAUDE.md 자율 모드 트리거 의무 read 명시
- `/sleep` 메타 디스패처 + OS-level launchd 설치 (매일 03:02 KST fire, RESUME.md 기반 자동 재개)
  - `scripts/sleep-resume.sh` + `scripts/install-sleep-cron.sh` 신규
  - `~/Library/LaunchAgents/com.ateam.sleep-resume.plist` 설치·검증 완료
- `/design-retro` skill + 2026-04-22 CronCreate — Design Subsystem 1주 회고 예약
- `/autoresearch` skill (jangpm-meta-skills 포팅) + blueprint + jangpm-integration-design.md — 외부 레포 통합 설계
- `.gitignore` Claude runtime + autoresearch 아티팩트 제외

**이슈**:
- CronCreate `durable: true` 세션-only 휘발 확인 → launchd로 대체
- sleep.md 1141 words (상한 근접) — 압축 Next Tasks 등록
- CURRENT.md "## Next Tasks" 섹션 2개 존재 (Phase 14 merge 잔재) — 향후 정리 필요

**빌드**: ✅ 376/376 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities

**커밋 체인**: `d961967` → `57fbcb2` → `5d3da8c` → `97b9d8b` → `f8a245e` → `65ee236` → `eef29cd` → `17d3f84` → `2371fed`

---

## [2026-04-15] 세션 연장 — jangpm 통합 Phase 3+4 실행

**컨텍스트**: 앞선 /end 이후 사용자 "설계부터 완벽하게해" → 설계서 작성 → "착수해" → 실행.

**완료** (06:05 KST, 376 tests, 빌드 PASS):
- `/blueprint` skill 정식 배포 — jangpm-meta-skills 포팅 (`.claude/commands/blueprint.md`)
  - skill-creator 의존성 제거 → "A-Team 표준 커맨드 규칙"으로 교체
  - `governance/skills/blueprint/design-principles.md` + `document-template.md` + `example-blueprint.md` 3개 참조
  - `scripts/validate-blueprint.py` 구조 validator (jangpm validator L108 패치)
- `/office-hours → /blueprint → /autoplan → /ralph → /autoresearch` 흐름 정식화
- IMP-20260415-01 등록 (P2) — reflect parallel-consolidate 패턴 /retro/end 적용 검토
- `install-commands.sh` 실행 → `~/.claude/commands/{autoresearch,blueprint}.md` symlink 배포

**판정 근거** (jangpm-meta-skills 4 스킬 분석):
- autoresearch: ADOPT (Karpathy 프롬프트 최적화 — A-Team 동등물 없음)
- blueprint: MERGE (validator + design-principles 가치)
- reflect: LEARN (4 parallel → dedup 패턴만)
- deep-dive: SKIP (office-hours/plan-eng/autoplan 중복)

**이슈**: 없음

**빌드**: ✅ 376/376 tests PASS

**커밋 체인**: `c6885ed` (auto-commit hook, Phase 1+설계서) → `2297f39` (Phase 3+4)

**Next**: `/autoresearch` 파일럿 (target 후보 `/office-hours`), `/blueprint` 실사용 1회

---

## [2026-04-15] Design Subsystem 3-Phase — AI Smell 차단 인프라 (랄프 모드 자율)

**컨텍스트**: 사용자 페인포인트 — A-Team으로 만든 앱들이 AI 냄새 심하고 디자인 퀄리티 낮음. 광범위 리서치 후 Phase 1→2→3 무정지 진행 지시 ("랄프 모드"). 오늘 새벽 3시 토큰 리셋 대비 자동 재개 인프라도 함께 구축 요청.

**완료**:
- **광범위 리서치 2차** — AI 에이전트 전용 디자인 리소스 Top 10 심층 분석
  - Taste-Skill, UI Design Brain, Anthropic Frontend Design, Awesome Design MD, Impeccable, UI/UX Pro Max, UX Designer Skill, Figma MCP, Design Arena, Frontend Design Toolkit
  - `.research/notes/2026-04-14-design-subsystem-deep-dive.md` 900+ lines 리포트

- **페인포인트 → 설계 원칙 매핑 (7개 누락 보완)**
  - UI 프로젝트 자동 감지 gate (비-UI 작업 오버헤드 0)
  - Static-first 2-tier (AST/regex 22 rule 토큰 0, LLM critique 2 rule만)
  - Opt-out (`.design-override.md` `design: off`)
  - Circuit breaker 통합 (`advisor-breaker` 패턴 공유)
  - Learning loop wiring (`logDesignOutcome()` false-positive 학습)
  - Analytics observability (`event: 'design_audit'`)
  - A11y tone과 독립 (WCAG AA 비협상)

- **Phase 1 — Foundation** (커밋 `e778e73`)
  - `governance/design/` 5 md: gate + tone-first + variants + components + anti-patterns (738 lines)
  - orchestrator Phase 2.2 Design Gate, ui-inspector auditor 연동, vibe Step 0.6 RESUME 감지
  - `/resume-on-reset` 스킬 + `.context/RESUME.md` (crash-safe 이어받기 infra)

- **Phase 2 — Detector + Subagents + Gate Wiring** (커밋 `4cdd614`, +35 tests)
  - `lib/design-smell-detector.ts` 15 static rule deterministic 감지 (토큰 0)
  - `lib/design-config.json` 단일 진실 공급원 + breaker config
  - `analytics.ts` design_audit 이벤트 타입 + helper, `learnings.ts` logDesignOutcome()
  - `designer.md` / `design-auditor.md` 서브에이전트 (Haiku)
  - `/qa --design` + `/craft` STEP 2.5/4 + `/ship` Step 5.5 + `/review` 자동 게이트 연동
  - `test/design-smell-detector.test.ts` 35 tests 전량 PASS

- **Phase 3 — External Refs + Domain Reasoning** (커밋 `0d10ef4`)
  - `governance/design/refs/` 10 production brand DESIGN.md (Linear/Stripe/Claude/Vercel/Raycast/Arc/Notion/Figma/Rauno/Bloomberg)
  - `reasoning.json` 17 domain × product-type → tone 추천 룰
  - designer가 도메인 추론 + refs 인용, auditor가 PL-01 critique 시 anti_patterns 대조

- **인프라 — `/resume-on-reset` + CronCreate**
  - 사용자 취침 중 토큰 리셋 대응: CronCreate `d7858883` 2026-04-15 03:02 KST fire
  - `.context/RESUME.md` 자동 상태 스냅샷 (Completed/In Progress/Next Tasks)
  - 실패 모드: 세션 종료 시 cron 휘발 → OS-level 대안은 Ralph 데몬 병행 가능
  - `/pickup` 수동 백업 경로 유지

**최종 지표**:
- 237 → 272 tests (+35, 전량 PASS)
- tsc 0 errors, npm audit 0 vulnerabilities
- npm test 2.63s avg / tsc 1.63s avg (benchmarks/2026-04-15.json 신규 baseline)
- 신규 파일 33개 (governance 17 + lib 3 + agents 2 + refs 11)
- **토큰 효율**: 비-UI 오버헤드 0. UI PR 평균 ~2600 tok (legacy full-LLM 대비 -67% 추정)
- **자동 트리거**: orchestrator Phase 2.2 + PostToolUse 훅 + `/qa --design` + `/craft` + `/ship` + `/review` — 사용자 수동 호출 불필요

**커밋 체인**: `e778e73` Phase 1 → `4cdd614` Phase 2 → `0d10ef4` Phase 3

**Next 세션 우선순위**:
- Design Subsystem 실전 파일럿 (Linear/Stripe/Rauno 3톤 각 1개 샘플)
- 나머지 9 static rule 구현 (RD-01/03/05, A11Y-05, LS-02/03 등)
- design-auditor LLM critique 실전 테스트

---

## [2026-04-14] Phase 14 Optimization Research + Wave 1-3 + PIOP

**완료** (305 tests, build PASS, 20 commits):
- Research: 14 범주 × ~100 후보 → 7 RFC + Adversarial 19 findings + G7 gate 신설
- Governance 4 신규 rules (ateam-first, autonomous-loop, truth-contract, tool-search) + Sovereignty 제8원칙
- Wave 1: RFC-001/003/004/007-S 구현 (7+14 tests)
- Wave 2: RFC-002/005/006/007-M 구현 (12+18+4 tests)
- Wave 3 skeleton: `/review` skill + worktree-exec.sh + budget-tracker (13 tests)
- Bench 인프라: bench-runner + verify-g7 + dry-run estimate (-48.5% 추정, 실측 전)
- HISTORY.md Phase 0-14 전체 망라
- MIGRATION.md 8-step 가이드 + README 네비게이션
- install-commands.sh sync (30 commands global)
- PIOP Phase 1-5 자동 실행 → `.context/piop-phase14.md` (15/18 연결률 83%)

**구조적 교훈 (2건 사건 영구 박음)**:
1. Ralph 모드 오해석 → ateam-first.md (Survey Before Invent)
2. 자율 루프 끊김 (말 vs 실행 괴리) → truth-contract.md + autonomous-loop.md

**전부 opt-in default OFF** (Criterion 8 엄수). Regression 0건.

**Earned Integration**: 모든 수치 실측 전 추정. v-wave-N 공식 tag는 Phase 2 실측 후.

**다음 TODO**: Wave 1 실측 A/B 벤치, v-wave-1 tag, b3-b5 templates, cost-tracker 통합.

**커밋**: `aadf13e` → ... → `9b60d94` (20 commits 전체 `docs/HISTORY.md` Phase 14)

---

## [2026-04-11] Unified Advisor Architecture + 7-Pass 최적화 파이프라인

**완료**:
- **Unified Advisor Architecture Phase 1+2 — `advisor_20260301` 베타 통합**
  - Anthropic 2026-04-09 공개 advisor tool을 A-Team에 통합
  - Layer A/B 분리 설계 (Claude Code subagents vs 자율 데몬)
  - `lib/cost-tracker.ts` CostRecord 확장 (advisor 필드 10개 + 파생 지표 6개)
  - `lib/circuit-breaker.ts` ADVISOR_TOOL_BREAKER_CONFIG 상수
  - `scripts/daemon-utils.mjs` `callSdkWithAdvisor()` + beta header 주입
  - `scripts/ralph-daemon.mjs` + `research-daemon.mjs` SDK 경로 opt-in
  - `@anthropic-ai/sdk` optional dependency

- **토큰 비용 추정 + Pre-Check Skip Gate 실행체**
  - `lib/model-pricing.json` 신규 (Opus/Sonnet/Haiku 가격, 단일 진실 공급원)
  - `estimateCostUsd()` + `estimateIterationsCostUsd()` — 혼합 이터레이션 합산
  - `.claude/agents/pre-check.md` 신규 (Haiku, SKIP|PROCEED 보수적 판정)
  - orchestrator Phase 1.5 XML 펜스 격리 의무화

- **Adversarial Review 14건 보안 리메디에이션**
  - Red Team 리뷰 HIGH 5 + MEDIUM 6 + LOW 3 전량 패치
  - checkCommand 셸 인젝션, Prompt Injection, SDK 환경 오염, SSRF, prototype pollution 등

- **PIOP Phase 1-5 전체 실행**
  - 7 Cross-Module Wiring (ADVISOR_TOOL_BREAKER_CONFIG 통합, session_cost 이벤트, logAdvisorOutcome 등)
  - 에이전트 토큰 -11.8% (7232 → 6376 words)
  - Harness Score L5 (82.7/100)

- **7-Pass 최적화 파이프라인 실행**
  1. `/optimize` (PIOP) — 7 연결, deferred 0
  2. `/benchmark --diff` — NEW BASELINE (npm test 1.47s, tsc 0.74s, 0 regression)
  3. `/doc-sync` — Health 92/100, STALE 2 auto-fix
  4. `/cso` — OWASP + STRIDE, HIGH 3 + MEDIUM 4 + LOW 3 → 8건 패치
     - CSO-H01 `.research/` 세션 UUID 공개 노출 차단 (`git rm --cached` 7종 + .gitignore)
     - CSO-H02 vite 3 CVEs → `npm audit fix` (0 vulnerabilities)
     - CSO-H03 bypassPermissions 무음 폴백 → `'plan'` + 명시적 env var 요구
     - CSO-M04 Threat Model 섹션 추가 (Defense-in-Depth Matrix T1-T7)
  5. SimpleCircuitBreaker 완전 통합 — `lib/advisor-breaker-config.json` 단일 진실 공급원
  6. 신규 보안 테스트 +13 (`test/security-remediation.test.ts`)
  7. 세션 아카이브 (`.context/benchmarks/` + `.context/security-reports/`)

**지표**:
- Tests: 153 → **237 PASS** (+84, 19 test files)
- npm audit: 1 HIGH → **0 vulnerabilities**
- Harness Score: **L5 (82.7/100)**
- Doc Health: **92/100**
- Agent tokens: ~6376 words → 7376 words (pre-check 신규 +638, 정상 증가)
- 보안 발견: Adversarial 14 + CSO 10 = **22건 / 22건 해결**
- Defense-in-Depth: 5/10
- 단일 진실 공급원 2건 (model-pricing.json, advisor-breaker-config.json)

**이슈**: 없음

**빌드**: ✅ (237/237 tests pass, tsc --noEmit 0 errors, npm audit 0 vulnerabilities)

**커밋 체인** (6건, remote 동기화 완료):
```
2284276 refactor: advisor-breaker-config.json 단일화 + 세션 아카이브 (237 tests)
2f23743 security: CSO audit remediation — H01/H02/H03 + M01/M02/M03/M04 + L02
497934b feat: PIOP Phase 1-5 — Cross-Module Wiring + Advisor Config Unification
248949b docs: CURRENT.md 갱신 — 보안 리메디에이션 14건 기록
eb538f7 security: Adversarial Review 14건 보안 리메디에이션 패치
de9c77d [feat]: 토큰 비용 추정 + Pre-Check Skip Gate 실행체 (171 tests)
7eb08fc [feat]: Unified Advisor Architecture Phase 1+2 — advisor_20260301 통합 (166 tests)
```

---

## [2026-04-10] A-Team PIOP 최적화 및 격주 유지보수 구조 구현

**완료**:
- **최근 3건 통합 분석 후 4건 PIOP 최적화 시행**
  - `optimize.md` → thin 래퍼 전환 (-380 words)
  - `vibe.md` Daily Tip 외부화 (-314 words/session)
  - `orchestrator.md` MoA 가이드 외부화 (-427 words)
  - `state-machine.ts` 고아 모듈 orchestrator 라이프사이클에 연결
  - 컨텍스트 효율 향상 (커맨드 -8.5%, 에이전트 -5.6%)
- **역방향 피드백 시스템(`/improve`) 구현**
  - 글로벌 커맨드 `improve.md` 생성 개별 프로젝트의 변경사항을 A-Team으로 롤업
  - `improvements/pending.md` + `done.md` 인프라 구축
- **정기 7축 최적화 (Biweekly Optimization Protocol)**
  - `vibe.md` 시작 시 14일 경과 감지 자동 알림 로직 주입
  - `governance/workflows/biweekly-optimize.md` 제정 (체인, 계위, 토큰, 연쇄, 루프폐합, 성능, Dead Path)
  - `optimize.md` 내 `--biweekly` 스위치 연동

**이슈**: 없음
**빌드**: ✅ (153/153 tests pass)

---

## [2026-04-09] UI Auto-Inspect 파이프라인 구현

**완료**:
- UI 자동 시각 검증 시스템 전체 구현 (14파일, 1,470줄)
- Playwright CLI 기반 스크린샷/diff/좌표 추출 스크립트 6개
- PreToolUse/PostToolUse 훅으로 UI 파일 수정 시 자동 트리거
- additionalContext로 Claude 컨텍스트에 검증 결과 자동 주입
- ui-inspector 에이전트 + 거버넌스 규칙 + orchestrator/coder 연동
- `~/.claude/settings.json` 글로벌 훅 등록 (모든 프로젝트 적용)
- Playwright + Chromium 설치, E2E 스크린샷 테스트 PASS

**이슈**: A-Team/ 미러 디렉토리가 .gitignore 되어 있어 루트에 파일 생성 후 미러 수동 복사 필요
**빌드**: ✅ (Playwright browser test PASS)
**커밋**: 38acac2 → pushed to master

---

## 2026-04-07 컨텍스트창 최적화 — 서브에이전트 아키텍처 전환

**완료**:
- 9개 서브에이전트 신규 생성 (cso, adversarial, review-pr, benchmark, qa, doc-sync, autoplan, tdd, guardrail)
- 9개 슬래시 커맨드 thin 래퍼 교체 (커맨드 총 88KB → 58KB, 호출 시 메인 컨텍스트 90%+ 절감)
- install-commands.sh cp→symlink 전환 → 스킬 목록 중복 제거
- vibe.md Daily Tip (매일 2개 유용한 명령어 자동 소개)
- Tier 2 guardrail 에이전트 (haiku 모델, 디버그 코드/설정 위반/보안 패턴 감지)

**이슈**: 없음
**빌드**: 153 tests pass

---

## 2026-03-31 bkit 차용 + lib/ 18모듈 도달 (153 tests)

**완료**:
- bkit 4개 핵심 패턴 TDD 차용: circuit-breaker, state-machine, gate-manager, self-healing
- orchestrator 연결: circuit-breaker (per-feature 실패 추적) + self-healing (자동 복구 파이프라인)
- reviewer 연결: gate-manager (pass/retry/fail 정량 판정)
- 총 18개 lib 모듈, 153 테스트, 0 failures

**이슈**: 없음
**빌드**: ✅ (tsc --noEmit + vitest run 153/153)

---

## 2026-03-30 외부 레포 4개 차용 + PIOP + lib/ 14모듈 TDD

**완료**:
- 외부 레포 분석 및 차용: gstack(7), harness-diagnostics(2), everything-claude-code(5), cc-mirror(분석만)
- lib/ 14개 TypeScript 모듈 TDD 구현 (116 테스트, 0 failures)
- MoA Multi-Layer Loop + Judge Agent + Stall Detection 통합
- PIOP 5-Phase 프로토콜 생성 + 실전 실행 (연결율 8.6% → 54.3%)
- Ralph Loop 실전 테스트: Pre-check 즉시 완료 + formatLearning() 자율 구현 성공
- 테스트 인프라 부트스트랩: package.json + vitest + tsconfig.json

**이슈**: 없음
**빌드**: ✅ (tsc --noEmit + vitest run 116/116)
**비용**: haiku Ralph $0.16 (formatLearning 태스크)

---

## 2026-03-30 Auto Mode 통합 + 보안 강화

**완료**:
- Anthropic auto mode 딥리서치 (2계층 방어 아키텍처, Sonnet 4.6 분류기, 0.4% FPR)
- `getPermissionMode()` 구현: auto 우선 → 캐시 → 허용목록 검증 → bypassPermissions 폴백
- 전 데몬(Ralph/Research/Dispatch) auto mode 적용 + /vibe 터보모드 통합 (Step 3.7)
- `/review` 적대적 리뷰 실행: CRITICAL 2건(env 미검증, 쉘 인용), HIGH 3건(폴백 불일치, 파이프라인 env 단절, checkCommand 주입) 전량 수정
- 보안 강화: buildClaudeEnv() 위험 env 6개 제거, safePath() 경계 수정, dispatch.sh 변수 인용

**이슈**: auto mode는 Research Preview — 안정성 이슈 보고됨 (GitHub issues)
**빌드**: ✅ (전 파일 구문 검증 통과)

---

## 2026-03-28 Ralph Loop 자율 개발 데몬 구현 + 최적화

**완료**:
- Ralph Loop 조사 (Geoffrey Huntley, 2024~) → A-Team 통합 설계
- `ralph-daemon.mjs`: 5레이어 비용 최적화, 별도 브랜치 안전장치, graceful shutdown
- `ralph-prompts.mjs`: lean context, AGENTS.md 학습, 리서치 노트 주입
- `daemon-utils.mjs`: 공통 유틸 추출 (atomicWriteJSON, findClaude, safePath, buildClaudeEnv)
- `/ralph` 커맨드: start/stop/status/log/notes + 태스크 작성 가이드
- Research → Ralph 파이프라인: `/re pipeline` 원스탑, 리서치 노트 자동 연결
- `/vibe` Step 3.5: 주간 야간 Ralph 태스크 자동 제안
- 코드 리뷰 (reviewer agent): HIGH 3건 + MEDIUM 7건 + LOW 3건 전량 수정

**이슈**:
- 없음 (실전 테스트는 다음 세션)

**빌드**: ✅ (스크립트 전용 — daemon-utils import 검증 통과)

---

## 2026-03-28 A-Team pull 워크플로우 표준화

**완료**:
- `GEMINI_TASKS.md` 내 '각 프로젝트에서 A-Team pull 워크플로우 표준화' 완료
- `CLAUDE.md` 내 업데이트 및 배포 섹션 표준 패턴 적용
- `README.md` 내 빠른 시작 섹션 최신화 및 절대 경로(`~/tools/A-Team`) 표준화

**이슈**:
- 없음

**빌드**: ✅ (문서 전용)

---

## 2026-03-28 훅 계층 재구성 + 토큰 최적화

**완료**:
- SessionStart[startup/resume] 훅 구현 → /vibe + /pickup 수동 입력 자동화
- auto-commit-on-compact.sh 강화 (.compact-state.json 스냅샷)
- auto-resume-after-compact.sh 강화 (compact-state 활용)
- orchestrator.md 70% 축소 (287→87줄), vibe.md 52% 축소 (101→49줄)
- preamble.md에 coding-safety + sync-and-commit + turbo-auto 통합 부록화
- governance/workflows/vibe.md 63% 축소 (43→16줄)
- /vibe Step 3에 태스크별 모델 추천 안내 추가
- docs/21-hook-hierarchy.md 신규 — 5-Tier 자동화 아키텍처 문서
- 모델 자동 전환 실현 가능성 조사 → Hook API read-only 확인, dispatch --model로 해결

**이슈**:
- 컨텍스트 압축 2회 (훅 리서치 + 최적화 작업량)
- Hook API model 필드 read-only → 메인 세션 모델 전환은 수동 유지

**빌드**: ✅ (문서/스크립트 전용)

---

## 2026-03-28 병렬 처리 도구 종합 가이드 작성

**완료**:
- 4개 병렬 리서치 에이전트 실행 (OpenHands/Plandex, Mato/CAO, MCP 인프라, Context Handoff)
- 6개 웹서치로 최신 도구 발굴 (Superset IDE, Claude Squad, ComposioHQ, Multiclaude, Gas Town 등)
- docs/20-parallel-processing-landscape.md 신규 — 5-Tier 분류 + 8개 개발 케이스별 최적 선택 가이드
- INDEX.md 갱신 (doc 20 추가)

**이슈**:
- 컨텍스트 압축 2회 발생 (대량 리서치 에이전트 결과 수집으로 인해)

**빌드**: ✅ (문서 전용)

---

## 2026-03-27 멀티 에이전트 패턴 Phase 1 통합

**완료**:
- /tdd, /craft 누락 커맨드 배포 수정 + orphan 감지 가드 (install-commands.sh)
- 20+ 멀티 에이전트 프레임워크 광범위 리서치 (CrewAI, LangGraph, OpenAI Agents SDK, Swarms, MetaGPT, smolagents 등)
- 7차원 통합 평가 프레임워크 문서화 (docs/17)
- 멀티 에이전트 오케스트레이션 리서치 원본 저장 (docs/18)
- Phase 1 도입 설계 확정 (docs/19): 파일 단위 조치 매핑
- 3-tier Guardrail 규약 신규 (governance/rules/guardrails.md)
- 체크포인팅 규약 신규 (governance/rules/checkpointing.md)
- orchestrator.md MixtureOfAgents 모드 + 체크포인트 관리 추가
- reviewer.md 3-tier 구조 명확화
- docs/08 MoA/SOP 패턴 추가
- templates/PARALLEL_PLAN.md Guardrail + MoA + Checkpoint 섹션 추가
- scripts/checkpoint.sh 신규 (save/load/list/archive)

**이슈**:
- 서브에이전트 WebSearch/WebFetch 권한 거부로 리서치 직접 진행
- /vibe 세션 초기에 wrong project 로드 (active-project 파일 업데이트로 수정)

**빌드**: ✅ (문서/스크립트 전용, 빌드 명령 없음)

**커밋**:
- 45cd5e6 fix: 누락 커맨드 배포 + orphan 감지 가드 추가
- 8d11d21 docs: 통합 평가 프레임워크 추가 (17번 doc)
- 2c0caa3 feat: 멀티 에이전트 패턴 Phase 1 통합 (MoA + Guardrail + Checkpointing)
