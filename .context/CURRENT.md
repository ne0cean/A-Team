# CURRENT — A-Team 글로벌 툴킷

## Pre-flight Gate — 2026-06-07 (debrief)
- [x] Vision Board / Twilight Mood board 시각 확인 후 전체 재마이그레이션 컨펌 받기 (2026-06-07 승인)
- [x] cortex/2/5-life-xlab/ritual-routine/ 보호 파일 절대 덮어쓰기 금지 ✅
- [ ] autoresearch 실행 전: preempt-agent hook 상태 확인 (retro 테스트 차단 원인)
- [ ] advisor mode 추가 전: 스킬 brevity 제약 + 아키텍처 목적 체크 (board≤50줄, morning나레이션 충돌)
- [ ] retro advisor mode 재테스트: hook 비활성화 환경에서 실행


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
- **Advisor Mode autoresearch 완료 (2026-06-07)**: 9개 스킬 테스트. KEEP 5개(brainstorm/office-hours/plan-ceo/cold-review/okr) ADVISOR MODE 적용. SKIP 4개(thinking-partner=이미 advisory, board=≤50줄 제약, morning=나레이션 최소화, retro=Groq hook 차단). 슬래시 커맨드 워크플로우 가이드 생성.

- **board-template Vision Board 품질 수정 (2026-06-07, 진행 중)**: 중첩 이미지 추출(Pass2 nested img), 텍스트 개행 정규화(\r\n\t→단일 개행), autoLayout 첫 로드 복원(겹침 방지), Ctrl+Z undo 스택(50 steps, 드래그/리사이즈/삭제/추가/텍스트편집). Vision Board 20/20 이미지 복원. **미완: 사용자 컨펌 후 전체 재마이그레이션 + 배포 필요**

- **OneNote → Cortex HTML 카드보드 전면 재마이그레이션** (2026-06-07): 기존 오염 마이그레이션(1313개 중복) 제거. Archive 원본 1638개 .md → HTML 카드보드 1137개 생성(3525 카드). 이미지 MD5 매핑(707 PNG 100% 자동 복원). 신규 cortex 0–4 디렉토리 구조. Twilight Mood board 포맷 준용. Graph API URL 괄호 regex 버그 수정. `scripts/migrate-onenote-html.mjs` 신규.

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

## Last Completions (2026-06-08) — Cortex Dashboard 검은 화면 근본 수정 + 재발방지

- **toggleView() 14일 버그 수정** — week 전환 시 `currentWeekStart` 오늘 기준 리셋
- **getMonthlyRecurring() monthly 주입 제거** — 사이드바 전용 복원
- **검은 화면 근본 수정** — `render()` null guard + `loadMonth()` try/catch. 원인: loadFrames(1 API) vs loadMonth(3 API) race condition → monthData=undefined crash
- **DECISIONS.md** — [D-WEEKFIX] [D-MONTHLYINJECT] [D-RENDER-GUARD] [D-LOADMONTH-TRYCATCH] 등록
- wrangler deploy 완료 (`npx wrangler deploy --config wrangler.toml`) + D-RENDER-GUARD line 238 확인
- **A-Team /absorb** — kb-real-estate 2건 pending 등록

## Last Completions (2026-06-08) — Cortex Dashboard carry/delete/workout 버그 수정

- **carry cascade 방지** — `getCatItemsForRender` carry filter에 `!i._carried` 추가. _carried 항목 재이월 차단
- **delete 전파** — `delItem`에서 미래 날짜 `_carried` 항목 연쇄 제거 + `_carry_rejects` target 날짜에 저장 (버그: 원본 날에 저장하던 것 수정)
- **9일 input 오염 데이터 초기화** — 72개 누적 _carried 항목 D1에서 정리
- **workout 완전 격리** — `workout-log` 독립 D1 키 (`{ "YYYY-MM-DD": [...] }`). `/api/workout-log` 전용 엔드포인트. 월 탐색해도 상단 bar는 오늘 날짜 고정. `save()` / 빌드 / 배포 영향 없음
- 배포 완료 (98831c25)

## Last Completions (2026-06-07) — Vision Board 재마이그레이션 + Cortex 배포

- `node scripts/migrate-onenote-html.mjs --apply` — 1137 HTML 파일 재생성, 3452 카드
- Cortex Worker 배포 완료 (16e0ae6a)
- `cortex/2/5-life-xlab/ritual-routine/` 보호 파일 무결성 확인 ✅

## Last Completions (2026-06-07) — Cortex PWA 모바일 흰/검은 화면 복구

- **근본 원인**: `<iframe src="/vision.html">` → Cloudflare 307 redirect → SW stale-while-revalidate 캐시 오염 → iOS Safari 빈 response → 흰/검은 화면
- `index.html:83` `/vision.html` → `/vision`, `sw.js` v35 → v36 (캐시 클리어)
- 배포 완료 (`003dc05e`) — curl 검증 ✅

## Last Completions (2026-06-07) — Cortex 노트 뷰어 HTML 렌더링 + copy 버튼

- **HTML 노트 뷰어 수정** — `.html` 파일을 `renderMarkdown()`(HTML escape) 대신 `<iframe srcdoc>`으로 렌더링. 기존: 코드 그대로 출력. 수정: 스타일/스크립트 포함 완전 렌더링
- **copy 버튼(⎘) 추가** — `renderNoteViewer()`에 `copyNotePath()` + 버튼 신규 추가 (Svelte 프로토타입에만 있었고 실제 배포 코드 누락)
- **OneNote HTML 문서 편집기 전환** — 카드보드(floating 카드) → 선형 문서 편집기. 텍스트 `contenteditable` + 상단 sticky 툴바(저장/주소복사). 1137개 파일 재생성
- **Cortex 대시보드 배포** — `3e3d53de` (cortex.feat-breeze.workers.dev)

## Last Completions (2026-06-07) — Goal Cascade + Obsidian 연결 + Cortex Vision 교체

- **Goal Cascade 구조** — `cortex/areas/life/vision/annual-2026.md` + `monthly-2026-06.md` 생성. vision-roadmap.json 2026 데이터 기반. `/vibe` 시 `🎯 올해: Start美` 표시 (vibe-init.sh Step 0.68)
- **월간 스케줄러** — `scripts/maintenance/monthly-cascade-create.sh` (롤링 자동 생성) + scheduled-reviews.json 연동. 매월 1일 알림
- **Obsidian vault** — `cortex/` 폴더를 vault로 열면 기존 .md 전부 Graph view 시각화
- **Twilight Mood board 복원** — git history에서 HTML + onenote attachments 707개 복원
- **Vision panel 교체** — Cortex 대시보드 Vision & Milestones → Twilight Mood board iframe 대체 배포 (SW v35)
- **SW bump 경고 규칙** — cortex CLAUDE.md + MEMORY.md 반영. SW 버전 bump 전 사용자 경고 의무화
- **board-template.html** — git history에서 복원

## Last Completions (2026-06-07) — GitHub 벤치마킹 + server.mjs workout 버그 수정

- **server.mjs workout 보존 버그** 수정 — `saveMonth()` 내 preserve workout 루프 추가 + `/api/workout` POST 배열 포맷 + XOR 그룹 로직. 로컬 개발 서버가 Worker와 동기화됨
- **GitHub 벤치마킹** 4개 프로젝트 조사 (Cortex / A-Team / dial / mole) — 계획 파일 `~/.claude/plans/delightful-cuddling-cosmos.md`
- **NNN-Studio/Dial** — archived(2026-01-15), 앱별 모드전환 없음. 흡수 불필요
- **tw93/Mole V1.37~V1.39** — 도메인 달라 흡수 없음. mole install.sh `.py` 동기화 추가 완료
- **mac-dial upstream** — 이미 최신. rebase 불필요
- **rohitg00 PR** — A-Team 비공개라 불가 (오픈소스 전환 후 재검토)

## Last Completions (2026-06-07) — H&A 채널 리서치 (트레바리 + 웰리트립)

- **트레바리 찜목록 27개** Playwright 스크래핑 → AI 하이퍼포머(35만/강남/6.28) + 매력적인 결핍(35만/안국/6.14) 픽
- **웰리트립 전체 서브페이지** 분석 → 전 프로그램 소그룹(6-12명) 확인. H&A 랭킹: 핀란드(12명/595만) > 몽골(12명/350만) > 발리에너제틱(11명/330만)
- **action-plan.md** 트레바리 S3 픽 + 웰리트립 채널 섹션 신규 추가. 커밋 완료.

## Last Completions (2026-06-06) — Cortex Dashboard UX + 버그 수정 (SW v34)

- **탭 상태 유지** — `_activeSOTab`으로 CRUD 후 탭 리셋 방지
- **캘린더 미갱신 수정** — yearly/weekly/monthly_recurring CRUD 후 `render()` 추가
- **standing 날짜 뱃지** — 다중 날짜(쉼표 구분) + `(토)` suffix 파싱. 날짜 우측 오렌지 뱃지. outcome 주입 → render-time 계산으로 전환
- **linkify** — `item.url` 있어도 텍스트에 `](` 포함 시 linkify 적용
- **드래그 핸들** — `⠿` 제거, 체크박스/구분선텍스트를 핸들로
- **셀 스크롤** — speed/entry gate 제거, `overflow-y: auto`
- **day_type 오발동 방지** — day-num onclick 제거, 배지 클릭만 cycleDayType

## Last Completions (2026-06-05) — Cortex Dashboard Round 2

- **Notes 검색 → GitHub Code Search API**: 파일 내용 검색으로 전환. fallback(path-only) 유지
- **unified search schedule source 추가**: source 카테고리 검색 포함
- **Input textarea 전체 적용**: getDayCatType 조건 제거, 모든 카테고리 textarea
- **스크롤 speed gate**: deltaY > 40 → 페이지 스크롤 의도로 pass-through
- **addItemPrompt querySelector 버그 수정**: textarea 우선 선택
- **SW 캐시 v23 → v24**, 배포 완료 (6b417ea0)
- **BLOCK**: `GITHUB_TOKEN` Cloudflare 시크릿 미등록 → notes 내용 검색 여전히 fallback 상태. `npx wrangler secret put GITHUB_TOKEN --config wrangler.toml` 실행 필요

## Last Completions (2026-06-05) — Cortex Dashboard 다수 버그 수정

- **_catNames.input "Outcome" 버그** 수정: D1에서 "input":"Outcome" 제거 → Input 라벨 정상화
- **flow/block Outcome/Source 분리**: source 카테고리 신설(기존 15개 아이템), outcome 빈 todo로 분리. SOURCE_SYNC_MAP weekday.input↔flow.source↔block.source 재매핑
- **일괄 붙여넣기 textarea 방식**: Add item input→textarea 교체, submitFrameTextarea() 구현. Citrix VDI 환경 동작
- **workout null 오염 근본 수정**: 중복 POST 핸들러(라인 283) 제거, Day5 null 정리
- **배포 경로 오류 수정**: wrangler.jsonc → worker/wrangler.toml --config 명시 배포로 정정
- **CAT_NAMES source 추가**: source:"Source" + catColorMap 주황색 추가

## Last Completions (2026-06-05) — Cortex-Confluence 동기화 설계

- **Blueprint 작성** — `blueprint-cortex-confluence-sync.md` (VDI↔로컬 Cortex 스케줄러 양방향 실시간 동기화)
- **JSON→XHTML 변환기 초안** — `scripts/confluence-sync/json-to-confluence.mjs` (월간 캘린더 77K, Standing Orders 9K, Day Frames 4K chars 생성 확인)
- **설계 결정 기록** — `.context/design-decisions.md` 신설 (SSOT=Cortex, Confluence=VDI 터널)
- **BLOCK**: Confluence PAT 발급 확인 필요 (VDI 접속 시). Cortex 데이터 구조 안정화 선행 필요

## Last Completions (2026-06-05) — Cortex Frame 카테고리 관계 재정의

- **GITHUB_TOKEN 시크릿 등록** — Cloudflare Worker `cortex` 배포. notes 내용 검색 활성화
- **SOURCE_SYNC_MAP 수정** — weekday:input 제거, flow:source ↔ block:source만 유지
- **work 레이블** Tasks → Work
- **_carried 시각** ↩ 노란 아이콘 제거, 짙은 회색(#888) 텍스트
- **D1 weekday.input** type `routine` → `todo` (이월 파이프라인 활성화)
- 배포 완료 (`dade39b5`) — outcome/input 미체크 항목 날짜 순 이월 동작

## Last Completions (2026-06-05) — Cortex Dashboard Round 2 + 버그 수정

- Notes 검색 GitHub Code Search API 전환, unified search, textarea 전체 적용
- source 카테고리 신설, flow/block outcome/source 분리, SOURCE_SYNC_MAP 재매핑
- 일괄 붙여넣기 textarea (Citrix VDI 환경 동작), workout null 오염 근본 수정
- impact.mjs/pickup-resume/vibe-init checkpoints/reviewer retry_count/SubagentStop 검증 완료

## Next Tasks

### High Priority
- [ ] **Cortex 데이터 구조 안정화** — Confluence 동기화 구현 전 선행 필수
- [ ] **Confluence PAT 발급** — VDI에서 프로필 > Personal Access Tokens 확인
- [ ] **Confluence 역변환기 + daemon** — 안정화 후 구현 재개
- [ ] **제품 빌드 시작** — Connectome MVP

### Medium Priority
- [x] **Dashboard a11y 수정** — design audit score 65→70+ (dcbb6c99)
- [ ] **A-Team OKR 설정** — `/okr`로 6개월 목표 설정
- [ ] **generate_from_template.py** — 기존 PPTX 텍스트 교체 엔진
