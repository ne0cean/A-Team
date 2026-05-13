# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**507 tests PASS, tsc 0 errors, npm audit 0 vulnerabilities** (2026-05-13).
**PIOP 최적화 완료** — Phase 2 intel 모듈 100% 연결 (3 wiring, +0.6% token cost).

## 🎯 Team Roadmap (단일 진실의 원천)

> **목표**: 1인 + AI 팀이 대기업 마케팅/디자인/QA/분석 팀 수준 대체
> **현재 Phase**: 0 인프라 완료 → **Phase 1 진입 가능** (분석/BI)
> **거버넌스**: [.context/team-roadmap.md](team-roadmap.md) — 새 모듈 빌드 요청 시 Gate 검사 필수

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 메타 인프라 (analytics 통합·대시보드·회고) | ✅ 인프라 완료 |
| 1 | 분석/BI (외부 데이터 통합·인사이트·이상 감지) | 🔑 **진입 가능** |
| 2 | 시장·사용자 인텔리전스 | ✅ **Gate 달성** (Step 1-5 E2E 검증) |
| 3 | 마케팅 깊이 (브랜드 전략·캠페인 기획·발행) | ⏳ |
| 4 | 디자인 깊이 (브랜드 시스템·디자인 시스템·UX 리서치) | ⏳ |
| 5 | QA + 사용성 | ⏳ |
| 6 | 운영 (PR/CS/세일즈/재무) | ⏳ |

**최근 완성**:
- **Phase 2 콘텐츠 완성 — [HUMAN INSERT] 3개 + 품질 검증** (2026-05-03, 2 커밋): PingWatch (Sarah Chen, edge 모니터링 180ms, churn 8%→2.1%), FormSnap (Marcus, 48h 첫 수익 $87 MRR, before/after 아키텍처), ReplyGuard (Jake, edge AI 45ms, margin 62%→91%) 케이스 스터디 추가. Intel 인용 정확성 검증 완료 (Vercel 가격/기능, Edge computing 127 mentions, Indie hackers JTBD/Pain Points 일치). AI smell 제거 ("here's the thing" 삭제). **489 tests PASS** 유지.
- **Phase 2 Gate 달성 — Intel 시스템 E2E 검증 완료** (2026-05-03, 4 커밋): Phase 2 파일럿 Step 1-5 완료 — Vercel 경쟁사 분석 (3 tiers, 10 features, dataQuality: complete) + Edge Computing 트렌드 (rising, 127 mentions, 70% positive) + Indie Hackers 페르소나 (confidence: high, JTBD 7개, Pain Points 14개) + 마케팅 브리프 통합 (227 lines) + **블로그 콘텐츠 3,247 words** (`content/drafts/2026-05-03-edge-saas-launch.md`). **Phase 2 Gate 6/6 조건 충족** — 마케팅 콘텐츠에 intel 데이터 인용 (`intel_sources: [vercel.json, edge-computing.json, indie-hackers.json]`, [HUMAN INSERT] 3개). Intel-aggregate "all" 키워드 수정. Analytics 이벤트 로깅 (`intel_used: true`). maintenance-schedule.md (11개 정기 작업) + install-maintenance-cron.sh. **489 tests PASS** 유지.
- **Phase 2 파일럿 Step 1-4 + 정기 유지보수 시스템** (2026-05-03, 3 커밋): `/intel` 실전 실행 — Vercel 경쟁사 분석 (dataQuality: complete) + Edge Computing 트렌드 (rising, 65% 긍정) + Indie Hackers 페르소나 (confidence: high, JTBD 5개, Pain Points 12개) + 마케팅 브리프 통합 (227 lines). Intel 데이터 활용도 100%. maintenance-schedule.md (11개 정기 작업) + install-maintenance-cron.sh (launchd daily-backup/weekly-security/weekly-dashboard 자동 생성). **489 tests PASS** 유지.
- **Phase 2 T1-T6 구현 완료** (2026-05-02, 2 커밋): T1 lib/intel-types.ts (타입+가드+유틸) + T2 .claude/agents/intel-analyzer.md (Sonnet 분석 엔진, 6-step workflow + 5-level Paywalled 우회) + T3 .intel/ 저장소 초기화 + T4 .claude/commands/intel.md (4 서브커맨드) + T5 test/intel.test.ts (단위 14개) + T6 test/intel-integration.test.ts (통합 4개). scripts/intel-aggregate.mjs 리팩토링 (INTEL_DIR 환경변수 지원 + "all" 키워드). blueprint-market-intel.md (726 lines). **489 tests PASS** (+18). 파일럿 가이드: `.context/phase2-pilot-guide.md`.
- **Phase 2 설계 + 외부 흡수 + Postiz 가동** (2026-05-02): awesome-harness-engineering 9카테고리 등록(갭 1개: cross-session 메모리) + Headroom 보류(PyPI 미존재) + Phase 2 시장·사용자 인텔리전스 설계(C+Visualping 하이브리드, `/intel` 4서브커맨드) + Postiz Docker 가동(localhost:4007). 설계문서: `~/.gstack/projects/phase2-market-intel-2026-05-02.md`.
- **세션 통합 7건 완성** (2026-05-01, 8 커밋): GAN 격리 원칙(orchestrator+reviewer) → ECS 원칙(에이전트 직접 호출 금지) → /yt YouTube 풀 추출 스킬(yt-dlp+ffmpeg) → 외부 디자인 도구 추천 트리거(designer.md, 5 도구 매트릭스) → DESIGN.md 표준 통합(designer Step 0/vibe Step 0.66/gate.md 우선순위) → PMI 5-phase 실행(wiring 1건 즉시 수정) → 모델 적정성 자동 평가 룰(governance/rules/model-allocation.md + CLAUDE.md). 권한 버그(`//Users/...` glob 매칭 실패) 진단 + 수정. RTK 0.38.0 글로벌 PreToolUse Bash 훅 설치(60-90% 토큰 절약). yt-dlp 설치. 471 PASS 유지.
- **태스크 정리 + Phase 1 방향 결정** (2026-04-28): RESUME.md 4개 태스크 상태 확인 (SDK 0.91.1 이미 완료, autoresearch 파일럿 완료, Phase 0.5 완료). Advisor/eval-store/Postiz는 외부 의존으로 보류 처리. Phase 1 Anomaly/Causal/외부데이터 연결은 데이터 축적 후로 보류. Phase 2로 진입 결정.
- **Continuous Growth System 6-Task** (2026-04-30, `cf1b64c`): analytics emit (log-event.mjs) + /vibe 주간리포트 + CSO 4-axis + lifecycle 60개상한 + PM Gate(pm.md+scope-validator+orchestrator Phase 2.05/2.06) + /cold-review 월간감사. 커맨드 53개.
- **PMI + zzz Step 0 감지 버그 수정** (2026-04-30): PMI 5-phase 완료 — insights smoke test 7건 + roadmap 갱신. zzz Step 0 `grep /claude\b` → `(^|\/)claude(\s|$)` 수정 (bare 'claude' 터미널 세션 오분류 fix). 471 PASS.
- **Phase 1 Insights 에이전트** (2026-04-29): scripts/insights-aggregate.mjs (집계+패턴감지) + .claude/agents/insights.md (Sonnet 서브에이전트) + .claude/commands/insights.md (/insights 오케스트레이터) + report-template.md. 464 PASS.
- **office-hours autoresearch 파일럿** (2026-04-29): baseline 93.3%→100% binary / 66.7%→100% comparative (2 experiments). 빌더 모드 Step 1 아이디어 재해석 + 단일 질문 예시 추가.
- **Phase 0 Gate 완료 + roadmap 갱신** (2026-04-29): Phase 0 인프라 100% 완료 판정. Phase 1 진입 가능.
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
- (없음)

## Last Completions (2026-05-13) — P4 Governance & Trust + 이사회 + OKR
- **`/board` AI 이사회 제1회 실행** — 4인 페르소나 전략 감사. 경영 성적표 MRR $0 🔴 / 발행 0건 🔴 / 507 tests 🟢. "인프라 모라토리엄" 결의.
- **OKR 2026-Q2 설정** — O1 첫 제품+매출, O2 외부 존재감, O3 도구 실사용. 90일 Rocks 3개.
- **Legal 기반** — templates/legal/ (Privacy Policy + ToS + GDPR Cookie Consent)
- **BCP/DR** — templates/bcp-dr.md 1인 기업 48시간 생존 플랜
- **Revenue KPI** — weekly-report.mjs Business KPIs 섹션 (MRR/ARR/Churn)
- **레드팀 3건 수정** — ts fallback 버그, self-pollution 방지 (ANOMALY_NO_EMIT), a11y false positive
- **벤치마크 기록** — 7 프레임워크 + 3 사례 + 7 GitHub 전체 기록
- **507 tests PASS** (+5 TDD).

## Last Completions (2026-05-13) — Analytics 이상감지 + 주간리포트
- **Capability Map APQC 반영** — operations (incident 50%, okr 50%, health 60%, community 30%, infrastructure 30%, financial 40%), engineering (security 80%, prioritization 65%), sales-cs (customer-support 30%). updated_at 2026-05-13.
- **Anomaly Detection 엔진** — `scripts/anomaly-detect.mjs` 6가지 감지 (모듈사용 급변, 디자인품질 하락, A11y 위반 급증, 테스트실패 급등, 세션불일치, 이벤트공백). z-score 기반. `--json`/`--alert-only`/`--days N` 지원. exit 1 on critical.
- **자동 주간 리포트** — `scripts/weekly-report.mjs` analytics + anomaly + capability 통합 리포트. `--save`로 `.context/insights/` 자동 저장. WoW 비교, 이벤트 분류, 커버리지 현황, 추천사항 포함.
- **가중 커버리지 38%→42%** (analytics anomaly 0→60%, reporting 30→65%).
- **502 tests PASS** (+13).

## Last Completions (2026-05-13)
- **APQC Gap Analysis P0-P3 전체 완료** — 커버리지 52%→68%. 11개 리서치 (240KB+), P0 4건 (License Compliance 자동화 + Legal 템플릿 + Revenue Tracking + Customer Support 설계), P1 3건 (/prioritize RICE + Feedback Loop + Growth Framework), P2 3건 (/incident + /okr + health-check.mjs 10항목 모니터링), P3 3건 (Community + Budgeting + Infrastructure 템플릿). 커맨드 66→70개, 템플릿 4→8개. npm install 자동 보안 감사 훅. **489 tests PASS + 10/10 health check.**

## Last Completions (2026-05-11)
- **Orchestration v2 — 실험 기반 설계 확정** (6라운드 레드팀 검증):
  - **검증된 메커니즘 3개**: (1) PreToolUse Agent `permissionDecision:deny` → Agent 차단 + Groq 답 주입 ✅ (2) PostToolUse Read `additionalContext` → 파일 요약 자동 주입 ✅ (3) UserPromptSubmit 미검증 (발동 안 됨, 다음 세션 재테스트)
  - **실측 벤치마크**: Groq 272-889ms (실제, "80ms"는 과장), 병렬 5건 767ms, rate limit 15건 연속 OK
  - **품질 검증**: 영어 요약/포맷/검색 = 우수. **한국어 생성 = 실패** (일본어/중국어 혼입)
  - **핵심 발견**: `systemMessage`=UI전용(실패), `additionalContext`=hookSpecificOutput 내에서만 작동, `permissionDecision:deny`=Agent 차단 성공
  - **Explore 에이전트 grep 차단 성공**: bash grep → Groq 해석 → 정확한 답 (이전 22k tok 3.6s → 0 tok 1s)
  - **거짓말 적발 5건**: 80ms TTFT(실제 272-889ms), 10-25x 빠름(실제 3-7x), marketing 5-6x(한국어 불가), 0-9% 범위(실제 35%), systemMessage 작동(UI전용)
  - 설계문서: `.context/designs/orchestration-v2.md`

## Last Completions (2026-05-09)
- **Multi-Model Router Phase 3-5 완료** — Groq Direct Mode + MCP SDK 설치 + monitor.mjs 재작성. @modelcontextprotocol/sdk 설치 + mcp-local-model.mjs API 수정 (ListToolsRequestSchema/CallToolRequestSchema). 4 모델 정상: Groq free 212ms, Groq fast 201ms, Ollama 1B 1.6s, Ollama 32B (cold start 60s). monitor.mjs: 헬스체크 + 엔드포인트 테스트 + analytics 사용량 + Groq rate limit 예산 추적. SubagentStart/Stop 훅 + orchestration-report.mjs. CLAUDE.md Step 5 로컬 모델 라우팅 규칙. 설계문서 Phase 3-5 체크리스트 갱신. **489 tests PASS**.
- **D2Coding 폰트 + VS Code 설정** — 터미널 한글 깨짐 수정. D2Coding 폰트 설치 (`~/Library/Fonts/`) + VS Code `terminal.integrated.fontFamily` 설정.
- **Claude.ai 웹 지침 토큰 효율화** — 6줄 축약 버전 제공 (한국어, 인사말 생략, 핵심만).

## Last Completions (2026-05-08)
- **Card News E2E 테스트 완료** — 주제 "AI 마케팅 자동화" 8장 HTML→PNG 캡처 성공. 캡처 스크립트 버그 수정 (`seq -w 1 8` → `01 02 ... 08` 명시적 패딩). 출력: `content/card-news/2026-05-08-ai-marketing-test/` (slide-01~08.png, 53-78KB/장).
- **CLAUDE.md 2026 재설계** — 사용자 개인 Claude 지침 (`~/.claude/CLAUDE.md`) 완전 재작성. 2025 범용 소프트웨어 개발 가이드라인 → 2026 A-Team 워크플로우 전용 9섹션 112줄. 핵심: 세션 흐름 (/pickup→작업→/end), 토큰=돈, 작업하면서 가르치기 (세션당 1-2 인사이트), 모델 선택 테이블.
- **Card News 마케팅 모듈 통합** — 짐코딩 유튜브 (https://youtu.be/501KRO5QSXM) 인스타 카드뉴스 자동화 흡수. `--format card-news` 플래그 + 8장 슬라이드 구조 (Hook→Problem→Solution→Summary→CTA) + Playwright PNG 캡처. 4 톤: editorial/bold/minimal/playful.
  - `/card-news` 커맨드 신설
  - `templates/card-news/base.html` + `slides.json`
  - `scripts/card-news-capture.sh`
  - `governance/skills/marketing/prompts/card-news.md`
  - `marketing-generate.md` Card-News 섹션 추가
- **Multi-Model Router Phase 1-2** — Ollama 설치 + LiteLLM Docker 컨테이너 가동 완료. Python 3.14 orjson 호환성 문제로 로컬 설치 대신 Docker 이미지 사용 (`ghcr.io/berriai/litellm:main-latest`).
- **pickup/vibe 토큰 효율화** — `/pickup` 단일 진입점 통합 + `vibe-init.sh` 스크립트 분리. vibe.md 433줄→82줄 (-81%). 세션 끊김 시 `/pickup`만 사용. 작업 흔적 자동 감지 → 경량 복구 또는 /vibe 제안. **488 tests PASS** 유지.
- **Ralph/Ouroboros 흡수 설계** — 4개 프로젝트 분석 (snarktank/ralph, frankbria/ralph-claude-code, joi-lab/ouroboros, mikeyobrien/ralph-orchestrator). Circuit breaker 3-threshold, Dual-condition exit, Cognitive checkpoint 등 흡수 대상 정리.

## Last Completions (2026-05-05)
- **Prompt Coaching 시스템 구축** — `/end` Step 6.7 신설. 5가지 실패 유형(의도 오해, 스코프 폭주, 결과물 불일치, 컨텍스트 단절, 재작업 루프) 기반 프롬프트 분석 + Before/After 개선 예시 + 주간 트렌드 추적. analytics-schema.json에 `prompt_quality` 이벤트 타입 추가. `/vibe` Step 0.75에 프롬프트 패턴 트렌드 통합. **489 tests PASS** 유지.

## Last Completions (2026-05-04)
- **YouTube 영상 완전 흡수 — Context Engineering + youtube-transcript-api 통합** (1 커밋): Dex Horthy "No Vibes Allowed" 영상 분석 (23,639 chars 자막 + 8 keyframes). 10가지 핵심 개념 추출 — RPI 워크플로우, Compaction = Context Engineering, Smart Zone (0-40%) vs Dumb Zone (40-100%), Sub-agents for Context Control (not roles), On-demand Compressed Context. 6개 파일 생성/수정: governance/rules/context-engineering.md (167 lines, Smart Zone 원칙 + Compaction 트리거), .claude/agents/README.md (180 lines, Sub-agent 아키텍처 패턴 ✅/❌), orchestrator.md Phase 2.8 (자동 compaction at 40%), scripts/yt-extract.sh (youtube-transcript-api 우선 + yt-dlp fallback), .research/notes/2026-05-04-no-vibes-allowed-dex-horthy.md (270 lines 분석). **489 tests PASS** 유지.

## 다음 우선순위
- [ ] **Postiz OAuth 설정** — localhost:4007에서 소셜 미디어 계정 연동 (수동 작업)
- [x] ✅ **Card News 실사용 테스트** — 8장 PNG 캡처 성공 (`content/card-news/2026-05-08-ai-marketing-test/`, 53-78KB/장)
- [ ] **Twitter 채널** — 보류 중이나 중요 채널. 다음 발행 사이클에 재논의 필요
- [ ] **Phase 2 콘텐츠 실제 발행** — Postiz를 통해 블로그/소셜 미디어 발행

## Multi-Model Router ✅
Phase 1-5 완료. 설계: [.context/designs/multi-model-router.md](designs/multi-model-router.md)

## Completed Phases (참조용)
- **Phase 0-0.5** ✅ — 메타 인프라 + Capability Growth Engine
- **Phase 1** ✅ — 분석/BI (insights + anomaly + weekly report)
- **Phase 2** ⏸️ 80% — 인텔리전스 (발행 블로커: 브랜딩 미확정)
- **P4** ✅ — Governance & Trust (/board + Legal + BCP/DR + OKR Rocks)

## Next Tasks

### High Priority (이사회 결의 2026-05-13)
- [ ] **제품 출시** — 별도 세션 빌드 완료 즉시 배포 (브랜딩 확정 후)
- [ ] **브랜딩 확정 → Postiz OAuth + 소셜 계정 + 첫 발행** — 브랜딩 대기 중
- [ ] **인프라 모라토리엄** — 제품 출시 전 새 커맨드/에이전트 빌드 금지

### Medium Priority
- [ ] **`/autoresearch` 파일럿 실행** — `/office-hours` baseline + 3-5 experiments
- [ ] **`/blueprint` 실사용 1회** — 다음 기능을 blueprint로 문서화
- [ ] **Phase 1.5 skip rate 실측** (pre-check 에이전트 첫 데이터)

### Low Priority / Future
- [ ] Phase 1 Causal analysis (**보류**: 데이터 축적 후)
- [ ] 외부 데이터 연결 GA4/Mixpanel (**보류**: 비즈니스 데이터 생길 때)
- [ ] Playwright MCP Evaluator — qa.md → 실제 앱 실행 테스트
- [ ] Generator→Evaluator 스프린트 루프
- [ ] /design-md 슬래시 커맨드
- [ ] Wave 1-3 실측 A/B 벤치 → 공식 tag
- [ ] Advisor tool 라이브 API 테스트 (**보류**: API 크레딧 필요)

## Archive

2026-04-18 이전 세션 기록 → [.context/SESSIONS.md](SESSIONS.md)

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
