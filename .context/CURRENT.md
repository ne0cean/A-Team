# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**464 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities** (2026-04-28).

## 🎯 Team Roadmap (단일 진실의 원천)

> **목표**: 1인 + AI 팀이 대기업 마케팅/디자인/QA/분석 팀 수준 대체
> **현재 Phase**: 0 (메타 인프라) — analytics 통합 + 대시보드 + 회고 템플릿
> **거버넌스**: [.context/team-roadmap.md](team-roadmap.md) — 새 모듈 빌드 요청 시 Gate 검사 필수

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 메타 인프라 (analytics 통합·대시보드·회고) | 🔨 진행 중 |
| 1 | 분석/BI (외부 데이터 통합·인사이트·이상 감지) | ⏳ blocked |
| 2 | 시장·사용자 인텔리전스 | ⏳ |
| 3 | 마케팅 깊이 (브랜드 전략·캠페인 기획·발행) | ⏳ |
| 4 | 디자인 깊이 (브랜드 시스템·디자인 시스템·UX 리서치) | ⏳ |
| 5 | QA + 사용성 | ⏳ |
| 6 | 운영 (PR/CS/세일즈/재무) | ⏳ |

**최근 완성**:
- **Phase 0.5 capability-growth-engine + CSO-L03 완료** (2026-04-28): 7컴포넌트 전부 빌드 — capability-map.json(60+ caps) + gap-sensor.ts + gap-priority.mjs + capability.mjs + roadmap-update.mjs + /capability 커맨드 + vibe Step 0.69. sleep-resume.sh --add-dir 버그 수정 (자율 재개 복구). GPG 서명 정책 + 설정 스크립트. vitest coverage 92%. 464 PASS.
- **CSO-L03 CI + zzz 재진입 준비** (2026-04-27): GitHub Actions CI workflow (tsc + vitest on PR/push). RESUME.md 갱신 — Phase 0.5 + autoresearch 파일럿 큐.
- **Self-test 라운드 + zzz 정직화 + Phase 0 마감 보강** (2026-04-26~27, 16 커밋): auto-switch 401/429 fallback + OAuth refresh / install-design-hook --target / PMI M4 defer / zzz Step 0 (CLI flag 게이트) + 3계층 권한 모델 + prefix-wildcard 검증 + 자율 종료 금지 + 다음 작업 픽업 + IDE 반-자동 모드(`/zzz --ide`) / MODEL_PRICING Opus 4.6 $15/$75→$5/$25 정정 / IMP-01 retro parallel-consolidate + raw 데이터 사전 추출 / RD-04 brutalist 11px 검증 + JSX className AI smell 검증 / UI Auto-Inspect 훅 분기 16건 검증. 442→458 PASS. **3회 self-test로 결함 노출→정정 사이클 작동 확인**.
- **Auto-switch 엔진 + zzz 재설계** (2026-04-20): 계정 자동 전환 엔진 a-team 글로벌 이식 (`scripts/auto-switch/`). claude-remote는 얇은 PTY 어댑터. launchd 60초 크론 + Telegram fallback + 90일 legacy retention. /zzz 의도 수정("하던 작업 이어서"). refs 10개 Quantified Constraints. `/sleep`+`/overnight`→`/zzz` 통합, `/resume-on-reset`→`/resume`.
- **Marketing/Design Module Phase 1+2** (2026-04-18): 풀 콘텐츠+비주얼 자동화 — 8 스킬 커맨드 + 13 프롬프트 + 8 에이전트 + 6 스택 + 4 워크플로우(n8n/Make.com) + 파일럿 검증.
- **Design Subsystem 3-Phase** (2026-04-15): static rule 22/24 (RD-03 추가) + LLM critique + tone-first.
- **Phase 14 Optimization + Wave 1-3** (2026-04-14): RFC-001~007, M1 delta -48.5%.
- **jangpm-meta-skills 통합** (2026-04-15): `/autoresearch` + `/blueprint`.

## 🔬 Autoresearch — Shadow Mode (자동 트리거, 사용자 명시 호출 불필요)

**Mode**: `SHADOW-TRACKING` (활성, 2026-04-15 ~)

테스트 기간 동안 tracked 커맨드(`/office-hours`, `/blueprint`, `/plan-eng`)가 실제 사용될 때마다 Claude가 **자동으로 로깅 + self-score**. 주간 집계 + 3주+15runs 축적 시 자동 판정.

**Claude 의무**:
- 매 tracked command 사용 후: `.autoresearch/_shadow/<name>/log.jsonl`에 조용히 로그 (나레이션 금지)
- 세션 시작 시: 주간 집계 / 판정 조건 확인 / 충족 시만 알림
- 상세 프로토콜: `CLAUDE.md` "Autoresearch Shadow Mode" 섹션
- 전체 계획: `.context/AUTORESEARCH-PLAN.md`
- Eval suites: `governance/skills/autoresearch/shadow-evals.yaml`

**Override**: AUTORESEARCH-PLAN.md의 `Mode`를 `PAUSED`/`DECIDED`/`DISMISSED`로 변경.

## In Progress Files
- (없음) — RESUME.md에 zzz 큐 저장 완료 (`7a03be9`). 다음 세션 `--dangerously-skip-permissions` 재진입 후 `/zzz`.

## Phase 0 To-Do (현재 우선순위)

- [x] ✅ `/vibe` Step 0.67 team-roadmap 거버넌스 로드 (`vibe.md`)
- [x] ✅ `lib/analytics-schema.json` — 23종 EventType 표준화 + AnalyticsEvent 확장
- [x] ✅ `logMarketingEvent()` helper + 3 vitest (`lib/analytics.ts`)
- [x] ✅ `/dashboard` 커맨드 — Module Health 표 + JSON 출력 + 3 vitest (`scripts/dashboard.mjs`)
- [x] ✅ design-auditor 첫 회고 작성 (10 events 누적, Phase 4 sub-module Gate PASS)
- [x] ~~**마케팅 모듈 logEvent 실 호출 경로**~~ ✅ `84ca8e7` — 5개 커맨드 (research/generate/repurpose/publish/analytics) 모두 `logMarketingEvent` 호출 명시 + 변경이력 등록 완료. **Phase 0 마감**.
- [x] ~~design-auditor를 connectome + claude-remote에 install-design-hook.sh 적용~~ ✅ `8aeb07f` 2026-04-26 — `--target=PATH` 옵션 추가 + 양 repo install 완료. 외부 UI 작업 시 PostToolUse 자동 트리거. backup: `.claude/settings.json.bak.20260426-172111`.

## 🚨 Phase 0.5 설계 제안 (사용자 confirm 대기)

**문서**: [.context/designs/capability-growth-engine.md](designs/capability-growth-engine.md)

a-team의 궁극 지향점 = **프로덕트 런칭 + 운영 가능한 하나의 회사**.
정적 7-Phase 로드맵에 **자동 갭 감지/우선순위/회고 사이클** 추가 → 지속 성장 구조.

7 컴포넌트:
1. `lib/capability-map.json` — 7부서 60+ 기능 인벤토리 + 커버리지 %
2. `lib/gap-sensor.ts` + `friction-log.jsonl` — "안 돼/수동" 자동 감지
3. `scripts/gap-priority.mjs` — impact × frequency × feasibility
4. `scripts/roadmap-update.mjs` — 매주 자동 우선순위 재정렬 제안
5. `/blueprint` 확장 — 갭 → PRD 자동 초안
6. `/capability` CLI — 부서별 점수 + 런칭 시나리오 매핑
7. `/vibe` Step 0.69 — 라이프사이클 게이트 자동화

→ 사용자 confirm 시 Phase 0 (마케팅 logEvent 1건) 마무리 후 Phase 0.5 빌드 시작 (1주 예상)

## Next Tasks

### High Priority
- [x] ~~**🗓️ 2026-04-22 10:17 KST — `/design-retro` 자동 실행 예약됨**~~ ✅ 2026-04-26 수동 실행. CronCreate 미등록 확인 (CronList 빈 결과). 회고: [retros/design-auditor-2026-04-26.md](retros/design-auditor-2026-04-26.md). 결론: 외부 repo install 전엔 회고 ROI 0 → 시간기반 재예약 안 함.
- [ ] **Postiz Docker 가동 + OAuth** → `content/social/2026-04-18-claude-sleep-resume/` 실제 발행 → publish-log status: scheduled로 전환
- [ ] **[HUMAN INSERT] 3개 채우기** — LinkedIn 2개 + Instagram caption 1개 (1-2분)
- [x] ~~**design-auditor false positive 수정**~~ ✅ `cdc8f5c` — RD-04 caption-class + tone-aware, AI-02 페어링 감지. og-image 점수 64→92.
- [ ] **Advisor tool 라이브 API 테스트** — `ANTHROPIC_API_KEY` 환경 설정 + `useSdkPath=true` + `ralph --once` (이번 세션에서 키 부재로 스킵)

### Medium Priority
- [ ] **`/autoresearch` 파일럿 실행** — target 커맨드 1개(`/office-hours`) baseline + 3-5 experiments
- [ ] **`/blueprint` 실사용 1회** — 다음 기능을 blueprint로 문서화 → `/autoplan` 검토
- [x] ~~**PMI MEDIUM M4** ralph-daemon sleep-mode flag~~ ✅ 2026-04-26 **defer 확정** — zzz는 RESUME.md+CronCreate+auto-switch+/pickup으로 이미 충분. ralph 자체에 flag 추가 불필요. 재논의 트리거: 야간 ralph 루프 토큰 리셋 미감지 사례 발생 시.
- [ ] **eval-store A/B 수집 개시** (advisor-on/off 50 샘플 → harness-score 비교)
- [ ] **Phase 1.5 skip rate 실측** (pre-check 에이전트 첫 데이터)
- [x] ~~**CSO-L03 CI** (GitHub Actions npm test + tsc on PR)~~ done `.github/workflows/ci.yml`
- [x] ~~**CSO-L03 GPG 서명**~~ ✅ `324a79d` — governance/rules/gpg-signing.md + scripts/setup-gpg-signing.sh. 키 생성은 사용자 1회 액션: `brew install gnupg && gpg --full-generate-key && bash scripts/setup-gpg-signing.sh --global`
- [x] ~~**MODEL_PRICING 공식 가격 대조**~~ ✅ 2026-04-26 — Opus 4.6 가격 $15/$75 → $5/$25 정정 (3x 과대 계상 발견). Opus 4.7/4.5/4.1/4 + Sonnet 4.5/4 + Haiku variants 추가 등록. 429 tests PASS.

### Low Priority / Future
- [x] ~~**IMP-20260415-01 처리** — reflect parallel-consolidate 패턴~~ ✅ 2026-04-26 — `/retro` 에 적용 (4 Agent parallel + 1 consolidator + dynamic options). `/end` 는 직렬 단계라 SKIP. retro.md 86 → 158 lines, sequential 분석 6개 → parallel 4개 + dedup 1개.
- [x] ~~**sleep.md 압축 검토**~~ ✅ N/A — `sleep.md` 삭제됨 (`/zzz` 통합 완료)
- [ ] **Wave 1 실측 A/B 벤치** (실제 Claude API, RFC-001/003/004/007-S)
- [ ] **G5+G7 판정 후 `v-wave-1` 공식 tag 생성**
- [x] ~~lib/budget-tracker.ts ↔ lib/cost-tracker.ts 데이터 파이프 통합~~ ✅ `278de73` mergeCostsFromSummary 테스트 3건
- [x] ~~scripts/worktree-exec.sh 사용 안내 coder.md 추가~~ ✅ `7a29a61`
- [x] ~~eval/templates b3-b5 추가~~ ✅ 이미 b1-b6 전부 존재
- [ ] Wave 2/3 실측 → 공식 tag
- [ ] Stage 9 Holistic 진행 (Wave 3 실측 후)
- [ ] Stage 10 Weekly cron 실제 활성화
- [x] ~~UI Auto-Inspect 실전 테스트~~ ✅ 2026-04-26 — pre-ui-capture.sh + post-ui-verify.sh 7개 분기 (file 필터/UI ext/test/.d.ts/node_modules/env disable/dev server unreachable) 검증 테스트 16건 추가. snapshot.js Playwright sanity 통과 (closed port에서 정상 에러 JSON 반환). 458 PASS. 실 dev server diff 검증은 외부 React 앱에서 자동 트리거 (a-team 자체엔 dev server 없음).
- [x] ~~design-smell-detector tone-aware threshold (P3, brutalist 11px 허용)~~ ✅ 2026-04-26 — 로직 이미 RD04_CAPTION_TONES 에 brutalist/bold-typographic/minimal 포함, 검증 누락이 진짜 갭. 테스트 6건 추가 (brutalist 11px 통과 / bold-typographic 11px / minimal 12px / 회귀 3건). 434 PASS.
- [x] ~~design-auditor className 분석 강화 (P3, JSX 클래스 문자열 → AI smell 패턴)~~ ✅ 2026-04-26 — AI 룰 정규식이 word-boundary 매칭이라 className/clsx/cn/template literal 모두 이미 감지. 검증 누락이 진짜 갭. 테스트 8건 추가 (multiline JSX + clsx + cn + template literal + false positive 가드). 442 PASS.

### Completed (2026-04-18)
- [x] ✅ Marketing Module Phase 1+2
- [x] ✅ Design Module Phase 1+2
- [x] ✅ 풀 파이프라인 파일럿 (blog-first + social-first)
- [x] ✅ Design Subsystem 3톤 파일럿 (Linear/Stripe/Rauno)
- [x] ✅ design-auditor LLM critique 실전 테스트 (PL-01/PL-02 정확 감지)
- [x] ✅ design-smell-detector 룰 확장 (21 → 22, RD-03 WCAG contrast)
- [x] ✅ A11Y-05 JSX htmlFor 버그 수정 (실전에서 발견)
- [x] ✅ Automation Layer (n8n WF-1/3 + Make.com WF-2/4 + validate-brief.mjs)
- [x] ✅ CURRENT.md 분할 (439 → 264줄, Previous Completions → SESSIONS.md)

## Last Completions (2026-04-15 심야 → 2026-04-16 새벽) — 야간 자율 완성

**컨텍스트**: 외부 Top 10 리서치 → 3개 즉시 흡수 + E2E 검증 + /overnight 1-click 스킬 완성.

**핵심 성과** (`39800ce` → `2eb4fb8`, 7 커밋):
1. **Probe exponential backoff** (`39800ce`) — sleep-resume.sh probe 에 5s→25s→125s + Retry-After 헤더 파싱 (frankbria + Anthropic SDK + LiteLLM 패턴 통합)
2. **Ralph-daemon hourly cap + timeout guard** (`d9703bb`) — `maxBudgetPerHour: $3.00` 롤링 윈도우 (Boucle $48/day 방지) + `maxConsecutiveTimeouts: 2` (무한 retry loop 방지)
3. **Quality Gates 4-stage** (`d9703bb`) — governance/rules/quality-gates.md + scripts/quality-gate-stage2.sh (diff sanity + JSON schema + token budget + test ratio, PASS/BLOCK/WARN 3단 exit code)
4. **PID lock** (`816fcc6`) — E2E 테스트 발견 (launchd 2분 interval 과 prev instance overlap) → 스크립트 시작 시 pid lock 체크, overlap 차단
5. **/overnight 스킬 신설** (`2eb4fb8`) — 사용자 1-5 요구사항 원스탑:
   - 토큰 소진까지 작업 → 멈춤 → 리셋 시 재시작 → 다음 소진까지 계속 → 질문 없이 랄프 전자동
   - `auto` 모드: CURRENT.md Next Tasks 안전 필터 (rule/구현/test/doc 포함, prod/deploy/설계/파일럿 제외)
   - 명시 모드: 자연어 태스크 1개 큐잉
   - RESUME.md 작성 + launchd 검증 + CLI 인증 probe + 금지 사항 자동 주입
6. **Top 10 외부 리서치 저장** (`92c11b3`) — `.research/notes/2026-04-15-overnight-autonomous-research.md` 900+ lines
7. **E2E 검증 테스트 완료** — Probe success on attempt 1 / claude --print 정상 invocation / trap EXIT 로깅 / Stage 2 gate BLOCK 확인 (secret file exit=1)

**최종 자율 모드 복원력 표**:
| 계층 | Before | After |
|---|---|---|
| 토큰 리셋 감지 | 단순 probe 1회 | Exponential backoff 3회 + Retry-After |
| 비용 폭주 방지 | iter budget 만 | + 시간당 cap $3.00 |
| Timeout loop | 단일 기록 | 연속 2회 자동 중단 |
| Quality 검증 | Correctness 만 | + Stage 2 block (schema/token/test) |
| E2E 검증 의무 | 없음 | 조항 7 (probe + 실 fire + 상태 변화) |
| 병렬 실행 | 충돌 가능 | PID lock |
| 1-click 세팅 | /sleep 수동 RESUME.md | /overnight auto 원스탑 |

**검증**: 392/392 tests PASS, tsc 0 errors, launchd 2개 활성 (sleep-resume 매 2분 + absorb-weekly 매 일요일 11:07)

## Last Completions (2026-04-15 저녁) — Sleep 버그 수정 + /end 개선 + /absorb 역류 시스템

**컨텍스트**: 외출 후 돌아와서 14시간 자율 모드 0건 진행 발견 → 버그 분석 및 수정 + 인프라 확장.

**핵심 성과**:
1. **Sleep 버그 3개 수정** (`b5529fe`): `claude -p --dangerously-skip-permissions` 플래그 버그 → `--permission-mode bypassPermissions` 교체 (14시간 작업 안 된 근본 원인). Rate-limit regex 확장 ("hit your limit", "resets 9am"). `gtimeout 2700` + `trap EXIT` + plist `AbandonProcessGroup=true`.
2. **End-to-End 검증 강제 조항** (`7072d24`): `autonomous-loop.md` 강제 조항 7 신설. 자율 루프 인프라 설치 후 실 본작업 1 cycle 성공 확인 없이 외출 허락 금지.
3. **T1-T6 직접 구현** (`8df9bbc`): RESUME.md 큐잉된 6 rule 대면 세션에서 직접 실행. RD-01/05, A11Y-05, LS-02/03, AI-07. 376 → 392 tests (+16). Static rule 15/24 → 21/24.
4. **RESUME.md status=completed** (`8d2e7bd`): 다음 /sleep 은 새 RESUME.md 필요.
5. **/end 버그 수정 + 자동 repo 생성** (`9e71590` + `236de1e`): `git push origin main` 하드코딩 → 브랜치 자동 감지. Remote 미설정 시 `gh repo create` 자동. "Repository not found" 에러에서 계정/이름 파싱해 자동 생성.
6. **/vibe Step 0.2 A-Team 자동 sync** (`40db289`): 6h 이상 stale 시 `git pull --rebase --autostash origin master` 자동. Symlink 구조로 모든 머신 반영.
7. **CLAUDE.md canonical path 명시** (`a24dc68`): `~/tools/A-Team` → `~/Projects/a-team`.
8. **/absorb 역류 시스템 — 순수 bash + 주간 launchd** (`1542c1e` + `136dbdd`): `scripts/absorb-scan.sh` 다른 프로젝트의 `.claude/commands/*.md` 스캔, regex heuristic 분류 (LOCAL/GLOBAL/UNCLEAR), pending.md append. 비용 $0, 5초 실행. 매주 일요일 11:07 KST launchd 자동.
9. **첫 실전 /absorb 스캔**: 12 프로젝트 → NEW 23 + DIFF 9 = 32 파일 → 30건 pending.md 등록 (IMP-20260415-01 ~ 30).

**검증**:
- 392/392 tests PASS, tsc 0 errors
- `launchctl list`: `com.ateam.sleep-resume` (매 2분) + `com.ateam.absorb-weekly` (매 일요일) 둘 다 등록
- 다른 컴퓨터 push 복구 필요: `cd ~/Projects/a-team && git push origin master` 수동 실행 (기존 커밋 있으면)

**커밋 체인** (10건): `b5529fe` → `7072d24` → `8df9bbc` → `8d2e7bd` → `9e71590` → `236de1e` → `40db289` → `a24dc68` → `1542c1e` → `136dbdd`

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

## Last Completions (2026-04-18) — Marketing/Design Module + 파일럿 + Automation

**컨텍스트**: 1인 마케팅+디자인 회사 풀 모듈 구축. 파일럿으로 검증 후 자동화 layer 완성.

**핵심 성과** (이 세션 8 커밋, 모두 push):

1. **Marketing Module Phase 1+2** (`9e287e4` → `cd17ced`)
   - 7 스킬 커맨드 (research/generate/repurpose/publish/analytics/loop/marketing + social)
   - 8 프롬프트 (blog/twitter/linkedin/email/ad-copy/research/instagram/tiktok)
   - 5 에이전트 (CEO Opus + Content/Social/Funnel Sonnet + Analytics Haiku)
   - 3 스택 (starter $100 / pro $260 / enterprise $880)
   - schemas/brief.schema.json (06-brief.json 검증)

2. **Design Module Phase 1+2** (`1c62a0a` → `f0252a5`)
   - 4 스킬 커맨드 (brief/generate/thumbnail/audit)
   - 5 프롬프트 (image-gen/thumbnail/social-visual/brand/interactive)
   - 3 에이전트 (Art Director/Image Critic/Brand Guard)
   - 3 스택 (starter $30-50 / pro $85-110 / enterprise $304)
   - INTEGRATION.md (Marketing 연동 파이프라인)

3. **파일럿 검증** (`cd17ced` + `3d0d563`)
   - 마케팅 풀 파이프라인 (실토픽 "1인 창업자 AI 마케팅 ROI") — Mode A blog-first + Mode B social-first 모두 작동 확인
   - Design Subsystem 3톤 샘플 (Linear 100/Stripe 100/Rauno 80)
   - Design-auditor LLM critique (PL-01/PL-02) 정확 감지 검증
   - 발견된 버그 1개 즉시 수정: A11Y-05 JSX htmlFor false positive

4. **Automation Layer** (`5021d4b`)
   - n8n WF-1 Daily Content Pipeline
   - Make.com WF-2 Repurpose & Visual Generation (Iterator 15 포맷 병렬)
   - n8n WF-3 Multi-Platform Publishing (Postiz API 22+ 플랫폼)
   - Make.com WF-4 Analytics + Self-Improvement Loop (매주 자동)
   - scripts/validate-brief.mjs (CLI + 워크플로우 양쪽 호출)

5. **RD-03 WCAG Contrast Detection** (`0f9fa04`)
   - lib/design-smell-detector.ts 신규 룰 (parseColorToRgb + relativeLuminance + contrastRatio)
   - hex/rgb()/named colors 지원
   - severity: <3:1 = HIGH, 3-4.5:1 = MEDIUM
   - static rules 21 → 22 / 24 (PL-01/PL-02는 LLM critique 영역)

**검증**:
- 392 → 400 tests PASS (+8: RD-03 6개 + htmlFor 2개)
- tsc --noEmit 0 errors
- 파일럿 산출물: `.context/pilots/2026-04-18-{marketing-design,design-subsystem,design-auditor}-pilot.md`

## Recent Wins (Archive references)

- 2026-04-11 ~ 2026-03-28 sessions → see [.context/SESSIONS.md](SESSIONS.md)
- Includes: 7-Pass Optimization, PIOP iterations, Adversarial Review 14건, Pre-Check Agent, Advisor Architecture, UI Auto-Inspect, bkit/gstack 차용, Ralph Loop 구현

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
