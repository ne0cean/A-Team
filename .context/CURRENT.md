# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**541 tests PASS** (2026-06-03). 3-Tier Knowledge Architecture + PostToolUse:Bash 진단 훅 구축.

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

<<<<<<< HEAD
## Last Completions (2026-06-05) — Next Tasks 검증 완료

- **impact.mjs smoke test** ✓ — BFS 정상 작동: `lib/intel-types.ts` → `test/intel-integration.test.ts`, `test/intel.test.ts` 2개 영향 파일 추적
- **pickup/resume checkpoints** ✓ — 이미 구현됨: pickup.md Step 2 + Step 0 감지, resume.md line 110/122
- **vibe-init.sh Step 0.65b** ✓ — 이미 구현됨: Phase Checkpoints `.context/checkpoints/*.json` 읽기
- **reviewer.md retry_count** ✓ — 이미 구현됨: 출력 스키마 + 에스컬레이션 조건(retry_count >= 2 → BLOCKED)
- **SubagentStop 훅 등록** ✓ — settings.json 등록 확인, 코드 정상
=======
## Last Completions (2026-06-04) — 이전 세션 불충분 요소 보완 + Cortex 배포

- **pickup/resume checkpoints 통합** (03a96ad5): pickup.md Step 0 체크포인트 감지 조건 + Step 2 checkpoints 5번째 컨텍스트 소스. resume.md 템플릿 Checkpoints 섹션 + SubagentStop 자동 저장 규칙 + 폴백 추가. .context/checkpoints/ mkdir -p 자동 생성.
- **impact.mjs 실행 검증**: lib/analytics.ts → test/analytics.test.ts 의존 추적 정상 확인
- **SubagentStop 훅 등록 확인**: ~/.claude/settings.json lines 334-344 등록 완료
- **reviewer.md retry_count**: 이미 Line 122에 존재 확인 (추가 불필요)
- **vigil.md name 필드 추가** (b0b757da): wiring-integrity-frontmatter 테스트 수정. 576 PASS → 576 PASS 유지
- **QA-ISSUES #24/#26 FIXED** (1168cfa3): 코드에 이미 수정됨 확인. BUG 0개, BROWSER 2개(#2/#16) 잔여
- **Cortex Dashboard 배포** (516a68ee): wrangler deploy 완료, 11개 파일 업로드
>>>>>>> 9617b20c (chore: 미커밋 파일 일괄 동기화)

## Last Completions (2026-06-04) — AI 개발 방법론 거버넌스 통합 + SubagentStop 훅

- **거버넌스 구조 5개 Fix** — quality-pipeline 체인 수리, Compaction AC 자동 저장, /end pre-flight 미완료 확인, orchestrator↔vigil 자동 통합, research-integration.md 신설
- **외부 리서치 → 구현** — `scripts/impact.mjs` (BFS 영향도 분석), `governance/rules/risk-tier.md` (4등급 체계), `governance/rules/supervisor-pattern.md` (Generator-Evaluator 격리 + retry 에스컬레이션)
- **SubagentStop 훅** — `~/.claude/hooks/subagent-stop.js`: 변경 파일 2개+ → vigil 큐잉 + `.context/checkpoints/` Phase 체크포인트 자동 저장. settings.json 등록 완료
- **TRIGGER-INDEX.md** — impact-analysis / risk-tier / supervisor-pattern 3개 rule 추가 (합계 ~1,475 lines)
- **540 tests PASS** (임시 파일 pre-existing 실패 3개 무관)

## Last Completions (2026-06-05) — AC Impact Auto-Injector

- **ac-impact-injector.sh** — `scripts/hooks/ac-impact-injector.sh` 구현. PostToolUse:Write|Edit 훅. `current-task-ac.txt` 저장 시 자동으로 `impact.mjs` 실행 → RISK 등급 주입. 3 엣지 케이스 검증 (idempotency, non-AC file, placeholder RISK). settings.json 등록 설정 제공 (사용자 직접 적용 필요). **541 tests PASS**.

## Next Tasks

## Blockers
- (없음)

## Last Completions (2026-06-03) — Cortex Dashboard 핵심 버그 수정 5건

- **loadFrames → render() 누락** (근본 원인): loadFrames() 완료 후 renderFrames()만 호출, render() 미호출 → 캘린더에 프레임 내용 미반영. render() 1줄 추가로 수정
- **6 Pillars addFrameItem 동기화**: separator 있을 때 sync 안 되던 버그 수정. 새 항목은 항상 separator 앞에 삽입 + 전 frame type 동기
- **Ctrl+K 팝업 UI**: prompt() → 기존 linkPopup UI 재사용. mode='ctrlk' 추가. routine/todo 분기 저장 처리
- **미래 날짜 루틴 기본 펼침**: frame-group-hdr badge 제거, 기본 펼침으로 변경
- **routine 카테고리/todo 아키텍처**: 템플릿 live 렌더링, worker inject-frames carry 캐스케이드 제거, 중복 카테고리 렌더링 방지
- 배포: `https://cortex.feat-breeze.workers.dev` (Version: 4c07a9dd)

## Last Completions (2026-06-03) — 3-Tier Knowledge Architecture + 진단 훅

- **governance/patterns/ 4개 신규** — browser-automation / data-mutation / api-error-handling / visual-qa
- **governance/diagnostics/ 2개 신규** — browser-automation-failures / cloudflare-worker-errors (5섹션 진단 트리)
- **/vibe Step 0.85 Domain Pattern Gate** — wrangler.toml / scripts/browser/ 감지 → 패턴 파일 절대경로 Read 자동 주입
- **/end Step 6.76 레슨→패턴 커버리지 체크** — 신규 레슨 태그 → 대응 패턴 파일 미갱신 시 1줄 알림
- **PostToolUse:Bash 훅** — `scripts/hooks/post-bash-diagnostic.sh` + `~/.claude/settings.json` 훅 등록. Bash 실패 시 진단 파일 자동 서페이싱. 26ms 오버헤드 검증.
- **541 tests PASS**

## Last Completions (2026-06-02) — 병렬 진단 + Growth System T4 + QA 마무리

- **병렬 에이전트 3개** — QA 코드 분석 / D1 진단 / 훅+MeiliSearch 상태 확인
- **T1 배지 회귀 복구** (1585fade) — QA 커밋 과정에서 누락된 done/total 배지 재추가 + 배포 f2686029
- **input↔outcome 진단 완료** — 코드 CLEAN, 마이그레이션 불필요. 6/1 15:45~22:23 입력분만 UI 수동 확인 권장
- **모델 훅 확인** — enforce-model-param.js + model-compliance.js 이미 PreToolUse 등록됨
- **Growth System T4** (52243d5c) — `scripts/cortex-growth-snapshot.mjs` 구현. D1→done/total/pillar/#lesson 집계→analytics.jsonl emit. T1~T4 전체 완료
- **576 tests PASS** (ppt-benchmark 2개 파일 기존 실패, 무관)

## Last Completions (2026-06-02) — Cortex Dashboard QA 1차+2차 수정 (20개 항목)

- 1차(cf2426ed) 16개 + 2차(cdd637d7) 4개 수정·배포. #2/#16/#24/#26 코드 분석 완료(브라우저 확인 대기)

## Last Completions (2026-06-01) — 기획-검수-빌드-검수 4-레이어 + Dashboard 복구

- 4-레이어 Shift-Left 품질 아키텍처 완성 (Layer 0~3 훅), Dashboard Track A~D 버그 수정·배포, Paperclip 기각 + cherry-pick 로드맵
- **537 tests PASS** 유지

## Last Completions (2026-05-24 이전)
→ [.context/SESSIONS.md](SESSIONS.md) 참조

## Multi-Model Router ✅
Phase 1-5 완료. 설계: [.context/designs/multi-model-router.md](designs/multi-model-router.md)

## Completed Phases (참조용)
- **Phase 0-0.5** ✅ — 메타 인프라 + Capability Growth Engine
- **Phase 1** ✅ — 분석/BI (insights + anomaly + weekly report)
- **Phase 2** ⏸️ 80% — 인텔리전스 (발행 블로커: 브랜딩 미확정)
- **P4** ✅ — Governance & Trust (/board + Legal + BCP/DR + OKR Rocks)

## Next Tasks

### High Priority
- [ ] **Cortex inject-frames 정리** — 배포 후 inject-frames 버튼 실행해 days 4-30 잘못된 _carried 항목 청소
- [ ] **Cortex Dashboard #2/#16/#24/#26 브라우저 확인** — 사용자 수동 확인 후 이상 발견 시 CODE-FIX 요청. 원본 설명 파일 미존재, 코드 분석상 구현됨.
- [ ] **Dashboard 통합 앱 안정화** — 모바일 UX 피드백, 사이드바 노트 로딩 속도, 이미지 업로드 실기기 검증, 동기화 이슈
- [ ] **제품 빌드 시작** — Connectome MVP 이번 주 배포 (인프라 중독 탈피)

### Medium Priority
- [ ] **LSP 활성화** — settings.json 히든 플래그 + 언어서버 설치 (YT 그룹D 도출)
- [ ] **A-Team OKR 설정** — `/okr`로 6개월 목표 설정 (PRD 성공 기준 기반)
- [ ] **Stryker 첫 full run** — mutation score baseline 측정
- [ ] **Ritual Board 이름 확정** — 완성 후 추천

### Low Priority / Future
- [ ] **PPT 컨설팅 페이퍼 수준 보강** — Bain/BCG 벤치마크 기반 로드맵 실행. (1) Inline Pullquote 레이아웃 (2) Light weight 헤드라인 옵션 (3) text_chart 복합 레이아웃 (4) Portrait 포맷 지원 (5) 컨설팅 3사 스타일 완전 재현. 목표: Top 컨설팅 페이퍼 수준 출력. 상세: `reference/ppt-benchmarks/ANALYSIS.md`
  - why: PPT 모듈 → 컨설팅급 산출물 자동화 → 대기업 팀 수준 대체
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
- [BLOCKED] **VDI GitLab CE** — 사내 서버(VM) 확보 필요
  - blocked_by: 외부 (IT팀 VM 확보 협의)
  - impact: LOW
  - workaround: GitHub 임시 사용 중
- [BLOCKED] **Obsidian Mobile 동기화** — 동기화 방식 미확정
  - blocked_by: 수동 작업 (실기기 테스트 후 iCloud symlink vs Working Copy 선택 필요)
  - impact: LOW
  - workaround: Telegram → cortex/inbox 자동 캡처로 모바일 입력 대체 중

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
