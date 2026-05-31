# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**583 tests PASS** (2026-05-26). Cortex Ritual Dashboard v2 전면 리빌드 + OneNote 데이터 마이그레이션.

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

## Last Completions (2026-05-28) — Dashboard 통합 앱 전환 (OneNote 구조)

- **프론트엔드 모듈 분리** — 2014줄 단일 HTML → index.html(앱 셸 ~100줄) + css/main.css(274줄) + js/app.js(1650줄). Cloudflare Workers assets로 서빙.
- **원노트 구조 적용** — 좌측 사이드바(cortex 노트 트리, 검색, 새 노트 생성) + 메인(대시보드 캘린더). PC: 사이드바 열기/닫기 토글, 모바일: 슬라이드 오버레이.
- **노트 뷰어/에디터** — 사이드바에서 파일 클릭 → 메인에 마크다운 렌더링, Edit 버튼으로 편집 → Save로 GitHub 커밋.
- **이미지 업로드** — Worker `POST /api/cortex/upload` → GitHub cortex/attachments/에 저장. 에디터에서 파일선택 + 클립보드 붙여넣기 지원.
- **새 노트 생성** — 사이드바 "+" 버튼 → 파일명 입력 → 현재 폴더에 .md 생성 → 즉시 편집.
- **Capture 바** — 하단 고정 입력바. 텍스트 메모 → cortex/inbox/에 저장, `28 w 미팅` 단축 → 캘린더에 직접 추가, 사진 → GitHub 업로드.
- **통합 검색** — 🔍에서 스케줄(D1) + 노트(GitHub tree) 동시 검색. 결과를 SCHEDULE/NOTES로 구분 표시.
- **PWA 오프라인** — Service Worker 재활성화. 셸 캐시 + API stale-while-revalidate.
- **월 경계 데이터** — 이전/다음 달 데이터 동시 로드, 주 경계에서 양쪽 달 표시.
- **API 상수 누락 수정** — `const API = ''` 누락으로 캘린더 렌더 실패 → 수정.

## Last Completions (2026-05-27) — Cortex 뇌 시스템 + MeiliSearch + Dashboard 개선

- **Cortex "제2의 뇌" 설계 + Tier 1 구현** — catalog.jsonl(1638파일 인덱스), access-log.jsonl(접근 기록), cortex-health.mjs(주간 진단 80점), system-health.mjs(전체 시스템 진단 70점). /vibe에 자동 tidy 5개 삽입. ritual JSON→data/ 분리(운영데이터/지식 분리). 주간 크론 2개 등록(cortex-health 월09:00, system-health 월09:30).
- **MeiliSearch 검색 엔진 도입** — 바이너리 설치 v1.45.0, 3499문서 인덱싱, typo tolerance + 한국어 토큰 분리. cortex-index.mjs 인덱서. Telegram 검색(`?키워드`)이 MeiliSearch API 호출.
- **Telegram 봇 기능 강화** — 검색(`?키워드`: cortex + 웹 DDG + Groq 종합), 일정 추가(`28 w 팀미팅`), 음성 전사(Groq Whisper), 클릭 가능 링크(GitHub/DDG URL). ritual 카테고리 제거(i/w/o만).
- **Dashboard UI 개선** — 모바일 viewport 1200px 고정(PC 동일 폭), pull-to-refresh, URL 자동 하이퍼링크(신규+기존), 드래그 여백 확대, EX+비전 헤더 통합, EX 운동부위 변경(전면/측면/후면/등/가슴), 공휴일 전월별 표시, 캘린더 이전/다음달 날짜 표시, recurring 항목 체크 가능, 복구 아이콘 변경, Worker save 안전장치 수정(workout 저장 차단 해소).
- **모델 오케스트레이션 리뷰** — 로컬 모델(Groq/Ollama) 사용 0건 적발. enforce-model-param.sh(Agent model 미지정 시 deny), model-compliance.sh(SubagentStop 위반 감사) 작성.
- **AI-native PKM 벤치마크** — 20개 GitHub 프로젝트 조사(mem0/graphiti/Khoj/screenpipe/fabric/claude-obsidian). Karpathy wiki 패턴 + graphiti temporal graph + mem0 메모리 레이어 3패턴 하이브리드 방향.
- **냉철한 제언 6건** — 인프라 중독 탈피, Connectome 즉시 시작, String 기둥 강화, 루틴 프레임 파괴, AI 의존도 관리, Snowball 숫자 트래킹.

## Last Completions (2026-05-26) — Dashboard 클라우드 배포 + 보안 수정 + Obsidian Mobile

- **Cloudflare Workers + D1 배포** — `https://cortex.feat-breeze.workers.dev` (APAC/ICN). Worker 코드 변환, 6개 JSON→D1 마이그레이션, 맥 무관 항시 가동. Favicon(뉴럴넷 아이콘) 추가.
- **레드팀 E2E 감사 + P0/P1 수정 8건** — 봇 토큰 하드코딩 제거(env 전용), Worker API 인증(Bearer), execSync 셸 인젝션→fetch 교체, 0.0.0.0→127.0.0.1, save() 에러 표시, 입력 검증(ym 정규식/index 범위), Worker 에러 응답 generic화, tidy-inbox cron 등록.
- **tidy-inbox 자동 분류 스크립트** — 규칙 기반 키워드 매칭 + Groq LLM 폴백. launchd 5분 cron. inbox→6기둥/PARA 자동 이동.
- **외부 모델 교차 감사** — `/adversarial --full`, `/cso`에 Groq Llama 70B 교차 리뷰 구조 추가. 자기 코드 자기 리뷰 사각지대 해소.
- **Telegram E2E 검증** — 텍스트 수신 확인. 데몬 WorkingDirectory/env 수정. offset 미영속 중복 버그 발견(미수정).
- **Obsidian Mobile 연동** — cortex/ → iCloud symlink 설정. iPhone에서 3439개 노트 열람/편집 가능. Dashboard는 ritual-routine 전용, Obsidian은 노트 전체.
- **`/end` PRD 자동 동기화** — Step 3.45 추가. 구조적 변화 시 plan 파일 자동 갱신.

## Last Completions (2026-05-26, 이전) — Cortex 구조 확정 + 모바일 캡처 인프라

- **Cortex PARA-B 구조 확정 + 6기둥 병합** — `cortex/areas/` → `cortex/hexagonal pillars_rocks_helm/` rename. archive/interstellar-onenote의 6pillars(845md) + 3_Archive(451md) 기둥별 매핑 병합 (Cyrano→mo-chuisle, Solidarity→string, Accumulation→snowball, Career/Skill/성장전략/AI전략팀/SD→interstellar). 1_Projects(343md)→cortex/projects/ 이동. ritual-routine 중복 해소 (파일별 정본 선택 + bak 정리). 최종: 1,292md areas + 343md projects.
- **Telegram → cortex/inbox 자동 캡처 데몬** — `scripts/telegram-inbox.mjs` (long-polling, 텍스트/사진/파일/음성/포워드 지원, 📥 확인 이모지). launchd `com.ateam.telegram-inbox` 상시 실행 등록. 모바일에서 봇에 던지면 즉시 .md 저장.
- **Obsidian vault 설정** — `cortex/.obsidian/` (app.json + core-plugins + daily-notes). 새 노트 기본 위치 inbox/, 첨부 inbox/attachments/. gitignore로 워크스페이스 캐시 제외.
- **PKM 세부 분류 벤치마크 리서치** — Zettelkasten/LYT-ACE/PARA/PPV/Thomas Frank 6시스템 비교. 결론: 캡처 단위=파일 1개(atomic), 모바일=Telegram→inbox(Obsidian 직접 열지 않음), 하위구조=폴더 depth 2 + MOC, 처리=매일 5분 quick sort + 주간 30분 리뷰.

## Last Completions (2026-05-26, 이전) — Cortex Ritual Dashboard v2 전면 리빌드

- **Ritual Dashboard v2 전면 리빌드** (2026-05-25~26, 대규모): OneNote 10년 주간 플래너를 localhost:7843 웹 대시보드로 완전 이전.
  - **데이터 마이그레이션**: OneNote 원본 파싱 → 월별 JSON (May 20일 209items, June 30일 344items) + standing-orders.json + 오타 16건 수정
  - **서버 v2**: 20+ API endpoints (month CRUD, day-type, notes, search, standing-orders, day-frames, inject-frames, move-item, undo, vision-roadmap)
  - **Day Frames 시스템**: Weekday/Flow/Block 3타입 프레임 + 어드민 탭 + routine/todo 구분 + 이월 로직 + 프레임 상단/수동 하단 정렬
  - **Standing Orders 4탭**: Standing + Weekly(매주/격주) + Monthly(recurring+이번달) + Yearly(월+일) — 모두 CRUD + 순서변경 + 하이퍼링크
  - **캘린더 자동 반영**: 공휴일 33개 + Happy Friday 11개 + 제헌절 복귀 + 월간/주간/연간 반복 항목
  - **Vision & Milestones 패널**: 5개년(2026-2030) × 7카테고리 테이블 + Admin Notes
  - **UI**: Full Month 기본뷰 + 지나간 주 접기 + Day Type 상단바 + 카테고리 컬러바 + 운동부위 칩 + 크로스데이 드래그앤드롭 + Enter 텍스트 분기 + 하이퍼링크(🔗) + Undo 버튼
  - **디자인 개선**: audit 기반 타이포/간격/컬러 개선 (Linear/Notion 톤)
  - **PWA**: manifest + SW (개발 중 비활성) + safe-area
  - **빈 데이터 저장 방지 안전장치** (프론트+서버 양쪽)
- **583 tests PASS** 유지

## Last Completions (2026-05-25) — Idea Auto-Accumulation System + Cortex 워크스페이스

- **Idea Auto-Accumulation System 구현** — 아이디어가 세션마다 분산되는 문제를 구조적으로 해결. 3개 컴포넌트 A-Team 글로벌 반영:
  - `/end` Step 1.5 Idea Harvest — 아이데이션 세션 판별 게이트 + 레지스트리 자동 수확 (비-아이데이션 세션은 스킵)
  - `/brainstorm` Step 4.5 Registry Sync — 생존/탈락 아이디어 자동 레지스트리 반영 (복귀 선언 뒤 실행)
  - `/mece-gap` 신규 커맨드 — 9프레임(F1-F9) 기반 아이디어 사이 미탐색 영역 발굴. F1 형태학적 빈 셀 기본, `--deep` 시 F2-F9 추가. 축 저장으로 시계열 비교 가능.
  - CLAUDE.md 자동 제안 테이블에 `/idea`, `/mece-gap` 추가
  - 레드팀 리뷰 4건 반영: 토큰 절약 게이트, 중복 수확 방지, F1/deep 분리, 축 안정성

## Last Completions (2026-05-25, 이전) — Cortex 워크스페이스 + YT 16개 분석 + Ritual Board

- **PMI 5-Phase 완료** — `@fast-check/vitest` 설치 (property tests 13개 복구), `wiki-types.ts:81` 타입 캐스팅 수정, CLAUDE.md 207→192줄 축소. 583 tests PASS.
- **Design Taste Evaluator Phase 1 — INDEX.md 구축** — `reference/design-systems/INDEX.md` 생성. 72 brands, 8 categories, tone clusters, incomplete entries 식별. taste-evaluator 에이전트 연결 준비 완료.
- **Cortex PARA+6기둥 재편** — staging 587파일 OneNote 원본 구조(notebook/section_group/section)로 복원. pillars/+areas/ 중복 구조 통합 → InterStellar/2_6 hexagonal pillars/ 단일화. Dashboard 100개 6기둥 분류(interstellar 44, snowball 25, character 14, life-xlab 12, string 5). 중복 22개 해소. archives/legacy 11개 snowball 편입. 신입연수 22개 삭제.
- **OneNote 누락 658개 다운로드** — 2_6 hexagonal pillars 2~6번 + Zeroing + Futures options 전체 다운로드 (level/order 메타데이터 포함). 3_Archive는 Microsoft API 장애로 미완료.
- **OneNote InterStellar Migration 완료** — Zeroing 73개 + Futures options 1개 추가 다운로드 (이전 세션 누락분). cortex/projects/ 164개 중복 파일 제거. 3_Archive 118개 부분 다운로드 (API 정상 작동 구간). 최종 상태: InterStellar 1,306파일 (1_Projects 343 + 2_6 pillars 845 + 3_Archive 118), page index 921개 전량 on-disk. onenote-download-missing.py `import time` 버그 수정. 원격 이미지 293개 (Graph API URL, 텍스트 정상).
- **Cortex 워크스페이스 재설계** — PARA 최상위 + 6기둥 Areas 하위 구조 확정. InterStellar→archive/interstellar-onenote/ 이동. 커맨드 6개 신규(/inbox, /idea, /tidy-inbox, /learn, /recall, /daily-note). CORTEX.md 매뉴얼 + governance/rules/cortex-ops.md 거버넌스. VS Code 스니펫 + Paste Image 설정.
- **YouTube 16개 영상 풀 분석** — Groq Whisper API 전사 + 5그룹 분석 리포트 (.context/briefs/). 즉시 적용 6건: opusplan, LSP 우선, Plan-Annotate-Execute 패턴, /ppt Q0 템플릿 분기, yt-extract --transcribe, OneNote MSAL 자동갱신.
- **Ritual Board recurring 구현** — JSON 스키마 + 서버 API 5개 + UI 하단 자동반영 + 멱등성.
- **OneNote migration 완료** — 1,639파일 on-disk. 3_Archive 451파일. MSAL 토큰 자동갱신 추가.
- **PKM 벤치마크** — 14개 프로젝트 조사. LLM Wiki + Obsidian Claude PKM + CortexGraph 하이브리드 방향.
- **SKILL.md 호환성 분석** — A-Team→SKILL.md 변환 70-80% 가능.

**빌드**: ✅ 583 tests PASS (50 files)

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
- [ ] **Dashboard 통합 앱 안정화** — 모바일 UX 피드백, 사이드바 노트 로딩 속도, 이미지 업로드 실기기 검증, 동기화 이슈
- [ ] **모델 오케스트레이션 강제 훅 등록** — enforce-model-param.sh + model-compliance.sh를 settings.json에 등록 (이번 세션 미완)
- [ ] **MeiliSearch launchd 등록** — com.ateam.meilisearch.plist load (바이너리 설치 완료, 데몬 미등록)
- [ ] **제품 빌드 시작** — Connectome MVP 이번 주 배포 (인프라 중독 탈피)
- [x] **매일 OUTCOME 1개 외부 산출** — Standing Orders에 추가 (2026-06-01)

### Medium Priority
- [ ] **generate_from_template.py** — 기존 PPTX 텍스트 교체 엔진 (YT 그룹C 도출)
- [ ] **LSP 활성화** — settings.json 히든 플래그 + 언어서버 설치 (YT 그룹D 도출)
- [ ] **A-Team OKR 설정** — `/okr`로 6개월 목표 설정 (PRD 성공 기준 기반)
- [ ] **Stryker 첫 full run** — mutation score baseline 측정
- [ ] **Ritual Board 이름 확정** — 완성 후 추천

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
- VDI GitLab CE — 사내 서버(VM) 확보 필요 (IT팀 협의)
- Obsidian Mobile 동기화 — iCloud symlink 또는 Working Copy 중 선택 필요 (실기기 테스트 후 결정)

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
