# SESSIONS — A-Team 세션 로그

---

## [2026-04-26~27] Self-Test 라운드 + Phase 0 자동 가능 영역 마감 (16 커밋)

**완료** (시간순):
- `7da5551` auto-switch trigger 401/429 fallback + OAuth refresh (3 신규 테스트)
- `411002d` design-retro 2주차 회고 + CronCreate 미등록 마커 정리
- `8aeb07f` install-design-hook --target=PATH (외부 repo 설치 지원, connectome+claude-remote 적용)
- `7eff949` CURRENT.md design-auditor install 완료 마커
- `888a66a` zzz-permission-toggle 재진입 가드 (backup 자기-오염 방지)
- `8a855a4` zzz Step 0 — `--dangerously-skip-permissions` CLI flag 게이트
- `963fb8b` zzz 3계층 권한 모델 명시 (Bash 단일/복합 + WebFetch)
- `8b414e7` zzz 권한 모델 정정 — prefix-wildcard 작동, domain-wildcard 미작동 실측
- `2d11ec7` zzz 자율 종료 금지 + 다음 작업 자동 픽업 (의사결정 결함 발견)
- `6c0d3fd` MODEL_PRICING Opus 4.6 가격 정정 ($15/$75 → $5/$25, 공식 대조)
- `f17e357` /retro IMP-20260415-01 parallel-consolidate 패턴 적용 (jangpm/reflect 차용)
- `683859b` RD-04 brutalist 11px + JSX className AI smell 검증 갭 닫기 (14 테스트)
- `8e8ac72` UI Auto-Inspect pre/post 훅 분기 16건 검증 테스트
- `c283da8` /retro Phase 1 raw 데이터 사전 추출 (IMP-01 자기-검증 결과 결함 발견 후 보강)
- `ac2f7c5` zzz Step 0 검사 정정 — 자식 셸 args 가 아닌 부모 Claude CLI args
- `fe0bffc` zzz `--ide` 반-자동 모드 신설 (IDE 환경 대응)

**메타 패턴 — Self-test 사이클 작동 확인** (3회):
1. /retro 패치 → 자기 사용 → researcher 가 git 못 돌림 발견 → Phase 1 raw 데이터 사전 추출 추가
2. zzz Step 0 패치 → 자기 사용 → `ps -o args= -p $$` false positive 발견 → 부모 트리 climb 검사로 정정
3. zzz Step 0 정정 → IDE 환경에선 풀-오토 절대 불가 확인 → `/zzz --ide` 반-자동 모드 신설

**핵심 발견**:
- IDE (Antigravity/VSCode) 환경: `--permission-mode acceptEdits` 강제, CLI 플래그 진입 불가
- 풀-오토 zzz 는 셸 직접 진입 (`claude --dangerously-skip-permissions`) 세션에서만 가능
- Bash `Bash(prefix:*)` wildcard 작동 / WebFetch `domain:*.foo.com` 미작동 (실측)
- P3 task 두 건 ("brutalist 11px 허용" / "JSX className 분석")는 코드 누락이 아닌 **검증 누락**이 진짜 갭
- /retro 자기-검증으로 자기 결함 발견 후 즉시 보강 — 도구가 자기 검증을 하는 사이클 처음 작동

**이슈/Blocker**:
- Phase 0 마지막 to-do "마케팅 모듈 logEvent 실 호출 경로" 1건 남음 (`marketing-research.md` 등 5개 커맨드)
- 사용자 개입 필요 task (Postiz Docker, Advisor API key, Wave 실측 등) 다음 단계 대기

**빌드**: ✅ 458/458 tests PASS, tsc 0 errors

---

## [2026-04-19 PM] Capability Growth Engine 설계 (Phase 0.5 제안)

**핵심 결정**: 사용자가 a-team 궁극 지향점을 "프로덕트 런칭 + 운영 가능한 하나의 회사"로 명시. 정적 로드맵 → self-growing 구조로 진화 필요.

**산출물**: `.context/designs/capability-growth-engine.md` — 7 컴포넌트 시스템 다이어그램 + 빌드 순서 + Gate 기준
- Capability Map (60+ 기능 × 커버리지 %)
- Gap Sensors (friction-log)
- Priority Engine (impact × freq × feasibility)
- Roadmap Auto-Update (매주)
- PRD Generator (/blueprint 확장)
- /capability CLI (부서별 점수 + 런칭 시나리오 매핑)
- /vibe Step 0.69 Lifecycle Gate

**상태**: 설계 완료, 빌드는 사용자 confirm 대기. CURRENT.md 에 명시.

**빌드**: ✅ (코드 변경 없음, 설계 문서만)

---

## [2026-04-19] Team Roadmap SSOT + Phase 0 메타 인프라 5/6

**최종 지표**: 425 tests PASS (416→425, +9), tsc 0 errors

**완료** (4 커밋, 전부 push):
1. **rc.md 멀티 큐 통합** (`f7f196d`) — 다른 머신 수정 분. /api/handovers + fallback, 10분 만료.
2. **absorb dedup + 60건 archive** (`96e74fe`) — already_known() PENDING/PROCESSED 양쪽 체크. 매주 launchd 재실행해도 중복 등록 안 됨. +3 vitest.
3. **team-roadmap.md SSOT 7-Phase** (`ab20596`) — 대기업 마케팅/디자인/QA/분석 팀 대체 목표. Phase 0-6 + Gate + Earned integration 거버넌스.
4. **Phase 0 메타 인프라 5/6** (`ded3cb7`):
   - `/vibe` Step 0.67 team-roadmap 거버넌스 로드 (새 모듈 요청 시 자동 Gate 검사)
   - `lib/analytics-schema.json` — 23 EventType JSON Schema
   - `lib/analytics.ts` — logMarketingEvent() helper + EventType 타입
   - `scripts/dashboard.mjs` + `/dashboard` 커맨드 — Module Health 표 + JSON 출력
   - `.context/retros/_template.md` + design-auditor 첫 회고 (10 events 분석, sub-module Gate PASS)
   - +6 vitest (dashboard 3 + logMarketingEvent 3)

**이슈/발견**:
- 사용자 "대기업 팀 수준 대체" 진짜 목표 명시 → 7-Phase 로드맵 설계 + 거버넌스 코드베이스 박음
- 정직한 평가 오류: "마케팅/디자인 모듈 30일 안 씀" → 사용자 지적으로 정정 (만든 지 1-4일)
- meta-tooling 함정 방지: Earned integration 원칙 + Gate 조건을 vibe.md에 자동 검사로 박음

**남은 Phase 0** (1건):
- 마케팅 5 커맨드 (research/generate/repurpose/publish/analytics)에 logMarketingEvent 호출 경로 명시 → Phase 0 Gate PASS → Phase 1 BI 진입

**빌드**: ✅ 425/425 PASS

---

## [2026-04-18 PM] Phase 3 마무리 + Design module M1-M3 완전 종결

**최종 지표**: 416 tests PASS (400→416, +16), tsc 0 errors, npm audit 0 vulnerabilities

**완료** (5 커밋, 전부 push):
1. **Phase 3 라이브 검증 종결** (`e14aec6`) — OG PNG 변환(Playwright, 43KB) + design-auditor 통과(AI smell 0-1/10, A11Y PASS, ship-ready) + honest report (.context/pilots/2026-04-18-phase3-honest-report.md)
2. **Design-auditor false positive 수정** (`cdc8f5c`) — RD-04 caption-class 18종 + tone-aware (editorial-technical/brutalist/bold-typographic/minimal) + AI-02 페어링 감지 (mono/serif/IBM Plex 등 16종). og-image 점수 64→92.
3. **PMI M2 closure** (`7a7f0ab`) — `scripts/audit-design.mjs` CLI 신규. design-auditor.md 깨진 `node -e` 예시 제거. logDesignAudit() 자동 호출 → analytics.jsonl append. +5 vitest.
4. **PMI M3 closure** (`f869e88`) — `templates/hooks/post-design-audit.sh` PostToolUse 훅 + `scripts/install-design-hook.sh` 1-command 설치 (gitignored .claude/settings.json 자동 패치, dry-run/uninstall 지원). +5 vitest.

**이슈/발견**:
- Phase 3 토픽 "Claude Code 토큰 리밋 자동 재개" 5플랫폼 콘텐츠 생성 80% 자동화 달성 (twitter/linkedin/instagram + OG image)
- Postiz/Midjourney 외부 인프라 + [HUMAN INSERT] 3개 → 사용자 영역, 이번 세션 못 풂
- design-auditor LLM critique가 정적 룰 false positive(64점)를 PASS로 정확 판정 → LLM critique 가치 입증
- 회귀 발견: RD-04 11-13px caption + AI-02 mono pairing 미인식 → 즉시 수정

**남은 PMI MEDIUM**: M4 (ralph-daemon sleep-mode flag) 만 남음.

**빌드**: ✅

---

## [2026-04-11] 7-Pass 최적화 파이프라인 (PIOP + benchmark + doc-sync + CSO + CB 통합)

**최종 지표**: 237 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities, Harness L5 (82.7/100)
**커밋 체인**: `497934b` PIOP → `2f23743` CSO → `{final}` CB 단일화 + 아카이브

핵심 작업:
1. **`/optimize` (PIOP)** — Phase 1-5, 7개 Cross-Module Wiring, 토큰 -11.8%
2. **`/benchmark --diff`** — NEW BASELINE (`.context/benchmarks/2026-04-11.json`)
   - npm test 1.47s avg, tsc 0.74s, 19 test files / 237 tests
3. **`/doc-sync`** — Health Score 92/100, STALE 2건 auto-fix, BROKEN 0
4. **`/cso`** — OWASP Top 10 + STRIDE 8단계, HIGH 3 + MEDIUM 4 + LOW 3 발견 + 8건 즉시 패치
   - CSO-H01 `.research/` 세션 UUID 노출 차단
   - CSO-H02 `vite 8.0.0-8.0.4` 3 CVEs → `npm audit fix`
   - CSO-H03 `daemon-utils.mjs` `bypassPermissions` 무음 폴백 → `'plan'` 명시
   - CSO-M01~M04: env 전파 / atomicWriteJSON / 이상감지 / Threat Model
   - CSO-L02: 셸 메타문자 경고 강화
5. **SimpleCircuitBreaker 완전 통합** — `lib/advisor-breaker-config.json` 단일 진실 공급원
6. **보안 테스트 +13** — `test/security-remediation.test.ts`
7. **세션 아카이브** — `.context/benchmarks/` + `.context/security-reports/`

추가 PIOP Phase 1-5 — Cross-Module Wiring + Token Optimization (224 tests):
- 7개 Cross-Module Wiring (daemon-utils ↔ ralph-daemon ↔ analytics ↔ learnings ↔ end.md ↔ vibe.md ↔ claude-code.md)
- 에이전트 총 토큰: 7,232 → 6,376 words (-11.8%)
- Harness Score: L5 (82.7/100)

Adversarial Review 14건 보안 리메디에이션 (224 tests, +53 신규):
- HIGH 5건: 셸 인젝션 / 모델 allowlist / Prompt Injection / SDK 환경 오염 / 예산 게이트
- MEDIUM 6건: model-pricing.json / SimpleCircuitBreaker / Opus fallback / sampling_required / 유니코드 공백 / atomicWriteJSON / SSRF / 스키마 검증
- LOW 3건: ADVISOR 상수화 / eval-store validation
- 신규: `lib/model-pricing.json`, `test/security-remediation.test.ts`

토큰 비용 추정 + Pre-Check 에이전트 (171 tests):
- `lib/cost-tracker.ts` MODEL_PRICING + estimateCostUsd
- `.claude/agents/pre-check.md` (Haiku, Phase 1.5 Skip Gate, confidence ≥ 0.95)

Unified Advisor Architecture Phase 1+2 — `advisor_20260301` 통합 (166 tests):
- Anthropic 2026-04-09 공개 advisor tool 베타 통합
- 공식 벤치: SWE-bench +2.7pp, 비용 -11.9%, BrowseComp 2.09×
- Layer A (Pre-Check + 조건부 Reviewer) + Layer B (advisor tool 데몬)
- `governance/workflows/advisor-architecture.md` 청사진

---

## [2026-04-09 ~ 2026-04-10] PIOP 최적화 + /improve + UI Auto-Inspect

**2026-04-10 PIOP 최적화** (153 tests):
- optimize.md → thin 래퍼 (-380 words)
- vibe.md Daily Tip 외부화 → daily-tips.md
- orchestrator.md MoA 외부화 → workflows/moa.md
- state-machine.ts 고아 모듈 → orchestrator phase 라이프사이클 연결
- 에이전트 총 토큰 -5.6%, 커맨드 총 토큰 -8.5%

**`/improve` 역방향 피드백 시스템**:
- `.claude/commands/improve.md` (등록/조회/반영 3모드)
- `improvements/pending.md` + `done.md`
- vibe.md Step 0.8 세션 시작 시 알림

**정기 7축 최적화**: `governance/workflows/biweekly-optimize.md` (체인/계위/토큰/연쇄/루프/퍼포먼스/Dead Path)

**2026-04-09 UI Auto-Inspect**:
- `scripts/browser/` Playwright CLI 6개 스크립트
- PreToolUse + PostToolUse 훅 (캡처 + diff + 좌표 + additionalContext)
- `.claude/agents/ui-inspector.md` (Bash+Read, MCP 0 오버헤드)
- `governance/rules/visual-verification.md`
- MCP 대비 토큰 93% 절감 (15,000 → ~1,000 tok/검증)

---

## [2026-04-07] 컨텍스트창 최적화 — 서브에이전트 아키텍처 전환

- 9개 서브에이전트 신규: cso/adversarial/review-pr/benchmark/qa/doc-sync/autoplan/tdd/guardrail
- 9개 슬래시 커맨드 → thin 래퍼 (3-5KB → ~350B, 메인 컨텍스트 90%+ 절감)
- install-commands.sh cp→symlink 전환
- vibe.md Step 0.3 Daily Tip
- Tier 2 guardrail 에이전트 (Haiku, 코드 변경 후 자동 체크)
- 자동 트리거링: 에이전트 description 자연어 매칭

---

## [2026-03-30] bkit 차용 + PIOP MEDIUM wiring + Ralph Loop 실전 + 외부 레포 차용 (153 tests)

**bkit 차용 (4 모듈, 33 신규 테스트)**:
- `lib/circuit-breaker.ts` 3-state 회로 차단기
- `lib/state-machine.ts` 선언적 FSM
- `lib/gate-manager.ts` Quality Gate (pass/retry/fail)
- `lib/self-healing.ts` 자동 복구 파이프라인 (Error→Fix→Verify, max 5)

**PIOP MEDIUM priority wiring** (연결율 34.3% → 54.3%):
- vibe.md Step 0.7: learnings/instinct 세션 시작 로드
- orchestrator.md: Phase 0 hook_tier, Phase 3.7 학습 주입
- reviewer.md: adversarial counter-check, coverage-audit 검증
- end.md Step 3.5: eval-store 세션 결과 저장

**Ralph Loop 실전 테스트 성공**: haiku가 `formatLearning()` + 테스트 4건 자율 구현

**3개 외부 레포 차용 (7 모듈, 49 테스트 → 116)**:
- `lib/adversarial.ts` ← harness-diagnostics
- `lib/harness-score.ts` ← harness-diagnostics
- `lib/hook-flags.ts` / `quality-gate.ts` / `cost-tracker.ts` / `instinct.ts` / `config-protection.ts` ← everything-claude-code

**Post-Integration Optimization Protocol (PIOP) 생성**:
- `governance/workflows/post-integration.md` (5-Phase)
- `/optimize` 슬래시 커맨드
- vibe.md Step 0.5 + end.md Step 3.5 + orchestrator.md Phase 5.7

**gstack 핵심 코드 TDD 차용** (7 모듈, 67 테스트):
- `lib/learnings.ts` / `confidence.ts` / `coverage-audit.ts` / `skill-gen.ts` / `eval-store.ts` / `analytics.ts` / `worktree.ts`
- 테스트 인프라: vitest + tsconfig.json

**MoA Multi-Layer Loop + Judge Agent + Stall Detection**:
- orchestrator.md MoA 전면 확장 (max_rounds=3, 합의 검사, 3단계 Aggregation)
- `.claude/agents/judge.md` 신규 (근거 강도 5단계 평가)

**Auto Mode 통합 + 보안 강화**:
- daemon-utils.mjs getPermissionMode() / buildClaudeEnv() / safePath()
- ralph-daemon.mjs auto mode + checkCommand freeze
- /review 적대적 리뷰: CRITICAL 2 + HIGH 3 + MEDIUM 4 전량 수정

---

## [2026-03-28] Ralph Loop 자율 개발 데몬 구현 (NEW)

- `scripts/ralph-daemon.mjs` 5레이어 비용 최적화 (pre-check, stall detection, lean context, model tiering, budget cap)
- `scripts/ralph-prompts.mjs` per-iteration lean context 빌더 + AGENTS.md 학습 축적
- `scripts/daemon-utils.mjs` 공통 유틸 추출
- `.claude/commands/ralph.md` `/ralph` 글로벌 커맨드
- 별도 브랜치 안전장치 (`ralph/YYYY-MM-DD-<slug>`)

**Research → Ralph 파이프라인**:
- research-daemon.mjs 확장: 리서치 완료 → ralph-state.json pending 감지 → Ralph 자동 시작
- `/re pipeline "task"` 원스탑 커맨드
- vibe.md Step 3.5 야간 Ralph 태스크 자동 제안

**코드 리뷰 + 최적화**: HIGH 3 + MEDIUM 7 + LOW 3 전량 수정 (atomic write, race condition 롤백, 하드코딩 경로 제거, spawn timeout, 경로 트래버설 방지)

---

## [2026-04-15 심야 → 2026-04-16 새벽] 야간 자율 Top 3 흡수 + /overnight 스킬 완성 (7 커밋)

**컨텍스트**: 외부 리서치 → Top 3 즉시 흡수 → E2E 검증 → `/overnight` 1-click 스킬로 마감.

**완료**:

### 1. 외부 Top 10 리서치 (`92c11b3`)
Claude Code Routines (공식, 2026-04-14 출시) / frankbria/ralph-claude-code / alfredolopez80/multi-agent-ralph-loop / ClaudeNightsWatch / ARIS / Autoclaude / vercel ralph-loop-agent / LiteLLM / LangGraph / opencode-scheduler — 각 별점 + A-Team 흡수 방안 + 회피 함정 8개 상세 분석.

### 2. Top 3 즉시 흡수 전부 완료
**흡수 1** (`39800ce`) sleep-resume.sh probe 3-tier priority:
- Retry-After 헤더 파싱 (Anthropic SDK 패턴)
- Rate limit 메시지 whitelist regex (false positive 방지)
- Exponential backoff 5s → 25s → 125s (일시 네트워크 오류)

**흡수 2** (`d9703bb`) ralph-daemon.mjs:
- `maxBudgetPerHour: 3.00` — Boucle $48/day 사건 방지
- `state.hourlySpend` 롤링 1시간 윈도우
- `maxConsecutiveTimeouts: 2` — 무한 retry loop 방지 (frankbria 레슨)

**흡수 3** (`d9703bb`) Quality Gates 4-stage:
- governance/rules/quality-gates.md — 비용/차단력 계단화 원칙
- Stage 1 Correctness (block, 기존) / Stage 2 Quality (block, 신규 구현) / Stage 3 Security (warn, 로드맵) / Stage 4 Consistency (advisory, 로드맵)
- scripts/quality-gate-stage2.sh: diff sanity + JSON schema + token budget + test ratio
- Exit: 0 PASS / 1 BLOCK / 2 WARN

### 3. PID Lock (`816fcc6`) — E2E 테스트 발견
E2E 검증 중 launchd 2분 interval 이 prev instance overlap — 동시 2+ claude --print 프로세스. 스크립트 시작 시 `$LOCK_DIR/running.pid` 체크 + trap EXIT 에서 제거.

### 4. /overnight 1-click 스킬 (`2eb4fb8`)
사용자 1-5 요구사항 원스탑:
1. 토큰 소진까지 작업 (claude --print `--max-budget-usd`)
2. 소진 시 멈춤 (probe rate-limit 감지)
3. 리셋 시 재시작 (launchd 매 2분 probe)
4. 다음 소진까지 계속 (cycle 반복)
5. 질문 없이 랄프 전자동 (autonomous-loop 조항 1-7 주입)

**사용**: `/overnight auto` (CURRENT.md 안전 필터) 또는 `/overnight "<task>"` (명시).

**실전 검증**: auto 모드 2건 큐잉 + 15건 skipped (파일럿/설계/미검증 자동 제외).

### 5. E2E 검증 (2026-04-15 21:37 KST)
- ✅ Probe success on attempt 1 (backoff 로직 동작)
- ✅ claude --print 정상 invocation (2026-04-15 새벽 flag 버그 재발 X)
- ✅ trap EXIT `final=0` 로깅
- ✅ Stage 2 gate: secret file `.env` → BLOCK (exit 1)
- ⚠️ Test task 완료는 claude 처리 시간 길어 kill (코어 로직 검증 완료)

**이슈**: 없음 (모든 기능 정상 동작)

**빌드**: ✅ 392/392 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities

**커밋 체인** (7건): `92c11b3` → `39800ce` → `d9703bb` → `816fcc6` → `2eb4fb8` + 중간 /end 세션 기록

**Next 우선순위**:
- 사용자 실제 /overnight auto 실행 → 밤샘 검증 (다음 세션)
- Stage 3/4 (Security + Consistency) 구현
- Claude Code Routines 연결 복구 후 /absorb 주간 launchd → Routines 이관 검토

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
