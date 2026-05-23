# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**563 tests PASS** (2026-05-23). Quality Pipeline + PRD Gate + do-better 마이그레이션 Phase 1 + A-Team PRD v1.0.

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

## Last Completions (2026-05-23) — Cortex 통합 + Ritual Dashboard + OneNote 마이그레이션

- **Cortex 통합 (961 files)** — OneNote InterStellar 447페이지 cortex 분류 완료 (areas/projects/archives). 6 Hexagonal Pillars (Cha/Fam/Soli/Inter/Life/Ass) 구조 확인. Connectome 관련 31페이지 별도 분류. classify.py 2회 실행.
- **Cortex 웹 대시보드 (localhost:7843)** — Ritual & Routine contenteditable 캘린더 그리드. 체크박스 클릭 → .json+.md 즉시 저장. 인라인 편집, One Thing, 카테고리별 항목 추가/삭제. launchd 자동시작 설정.
- **OneNote 링크 주입** — inject-links.py로 139파일 frontmatter에 onenote_url 추가. 원본 대조 가능.
- **OneNote snapshot/sync 시스템** — snapshot.py (변경 감지), sync.py (차분 동기화 --dry-run 지원). staging 192페이지 다운로드 (360 남음, 토큰 만료).
- **Thinking Toolkit** — `cortex/thinking-toolkit.md`. 개념/접근법 축적 시스템. 자동감지 + /end 수확 프로토콜. Ideation Frameworks 5개 (Morphological/Behavior/Inversion/Human/12-Framework).
- **`/morning` 스킬** — 목표 상기 + One Thing 강제 + 오늘 할 일. Pillar 연결.
- **ritual-routine 스크립트** — archive.sh (주간 백업), new-month.sh (월 자동 생성)

**빌드**: ✅ 563 tests PASS, 기존 flaky 1건 (ppt-benchmark-audit)

## Last Completions (2026-05-23 이전) — Quality Pipeline + PRD

- **Quality Pipeline 3-Layer** — property-based + mutation + fitness + Layer 2 자동 리뷰
- **A-Team PRD v1.0** — 제품 정의 "AI 비즈니스 운영 시스템", 74개 중 5개만 사용 발견
- **PRD Gate + do-better Phase 1 + Anti-Slop + A-Team-1→a-team 통합**

## Last Completions (2026-05-22) — Wiring Integrity + Scheduled Reviews

- **wiring integrity 테스트 4종** — refs(참조 무결성), agents(subagent_type↔파일), bash($VAR한글 탐지), frontmatter(name+description 필수). npm test마다 자동 실행
- **scheduled-reviews 시스템** — "지켜보겠다" 거짓 약속 근절. JSON 등록 → vibe/pickup Step 0.75에서 due 항목 자동 표시
- **governance/rules/no-watch-promises.md** — 모니터링 약속 금지, 즉시 자동화 또는 스케줄 등록 강제
- **PMI 완전 실행** — Phase 1-5 + adversarial CONFIRMED 5건 수정 (`.claude/` 경로 스캔, 재귀 탐색, 대문자 subagent_type, backtick 매칭, 파일 삭제 방어)
- **$VAR한글 bash 버그 6건 수정** — absorb-scan.sh 1건 + intel.md 5건 `${VAR}` 중괄호 처리
- **coding-safety.md §3** — 한국어+Bash 변수 안전 규칙 추가
- **pmi.md SSOT drift 해소** — adversarial "선택" → "필수"
- **intel-analyzer.md** — name 필드 추가 (frontmatter 테스트가 발견)
- **reference/resources.md** — WSJ Guide to Information Graphics 레퍼런스 URL 저장

**빌드**: ✅ 558 tests PASS (47 files), 0 failed

## Last Completions (2026-05-22 이전)
→ [.context/SESSIONS.md](SESSIONS.md) 참조

## 다음 우선순위
- [ ] **Postiz OAuth 설정** — localhost:4007에서 소셜 미디어 계정 연동 (수동 작업)
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

### High Priority
- [ ] **OneNote 마이그레이션 완료** — 360페이지 남음 (6기둥 섹션). 재인증 후 migrate-staging.py 실행
- [ ] **Cortex 6기둥 재분류** — 기존 areas/projects → 6 Hexagonal Pillars 중심 구조 전환
- [ ] **대시보드 하단 섹션 마이그레이션** — 상시 업무/Yearly/Monthly → 자동 주입 시스템 설계
- [ ] **제품 빌드 시작** — 커넥톰 등 프로젝트 A-Team으로 실전 빌드 (플라이휠 증거)
- [ ] **자동화 배선 강화** — daily-brief/growth-engine이 의장 호출 없이 자동 실행

### Medium Priority
- [ ] **do-better 마이그레이션 Phase 2** — Wiki 복리 시스템 도입 (SCHEMA + wiki-ingest + wiki-lint)
- [ ] **do-better 마이그레이션 Phase 3** — transcript-organizer + web-crawler-ocr 포팅
- [ ] **A-Team OKR 설정** — `/okr`로 6개월 목표 설정 (PRD 성공 기준 기반)
- [ ] **Stryker 첫 full run** — mutation score baseline 측정

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
- OneNote API 토큰 만료 — 재인증 필요 (device code flow). 360페이지 미완료.

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
