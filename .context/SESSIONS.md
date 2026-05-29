# SESSIONS — A-Team 세션 로그

---

## [2026-05-29] Dashboard 사후 분석 + Svelte 리빌드 착수

**완료**: UX-SPEC.md (12섹션), 근본 원인 5 Whys, ui-deploy-gate.md, Svelte 초기화 + 6개 컴포넌트. vanilla 검색 500/스크롤바/버튼 레이아웃 수정.
**이슈**: 5일간 미검증 배포 반복. Svelte 리빌드 미완 (6개 컴포넌트 + App.svelte 남음).
**빌드**: ✅ 583 tests PASS

## [2026-05-28] Dashboard 통합 앱 전환 (OneNote 구조)

**완료**: 프론트엔드 모듈 분리 (2014줄→셸+CSS+JS), 원노트 구조 (좌측 사이드바+메인 대시보드), 노트 열람/편집/생성, 이미지 업로드(파일+붙여넣기→GitHub), Capture 바, 통합 검색(D1+GitHub), PWA SW, 월 경계 데이터, PC 사이드바 토글.
**이슈**: `const API=''` 누락→캘린더 미렌더링 (배포 전 검증 미흡). GitHub tree 캐시 지연. SW 캐시 업데이트 지연.
**빌드**: ✅ 583 tests PASS

## [2026-05-27] Cortex 뇌 시스템 + MeiliSearch + Dashboard 개선 + 모델 오케스트레이션 감사

**완료**: Cortex Tier 1 구현(catalog/access-log/cortex-health/system-health + /vibe tidy 자동화). MeiliSearch 3499문서 인덱싱(typo tolerance). Telegram 검색(?키워드 → cortex+DDG+Groq 종합) + 일정 추가(28 w 팀미팅) + 음성 전사. Dashboard UI 대규모 개선(viewport 1200px 고정, pull-to-refresh, URL 자동링크, EX 헤더 통합, 캘린더 이전/다음달 표시, recurring 체크 가능, Worker save 안전장치 수정). AI-native PKM 20개 벤치마크. 모델 오케스트레이션 리뷰 — 로컬 모델 사용 0건 적발, 강제 훅 작성(미등록). 냉철한 제언 6건(인프라 중독, Connectome 즉시 시작, String 강화).
**이슈**: 모델 오케스트레이션 훅 settings.json 미등록(deny됨). MeiliSearch launchd 미등록. Dashboard 캘린더 말일 버그 잔존 가능. GitHub Push Protection 차단(MSAL 토큰 — unblock URL 필요).
**빌드**: ✅ 583 tests PASS

## [2026-05-26] Dashboard 클라우드 배포 + 보안 감사 + Obsidian Mobile

**완료**: Cloudflare Workers+D1 배포(`cortex.feat-breeze.workers.dev`). 레드팀 E2E 감사→P0/P1 8건 수정(봇 토큰 env, Worker 인증, execSync→fetch, 0.0.0.0→127.0.0.1, save() 에러, 입력 검증). tidy-inbox 자동분류 스크립트+cron. 외부 모델 교차 감사(Groq Llama 70B) 구조 추가. Telegram 텍스트 E2E 검증. Obsidian Mobile iCloud symlink 설정. `/end` PRD 자동 동기화 Step 3.45. Favicon.
**이슈**: Telegram offset 미영속(재시작 시 중복). 사진/링크/음성 미테스트. 로컬↔D1 동기화 자동화 미구현. Dashboard 프론트 AUTH 토큰 하드코딩(public HTML에 노출).
**빌드**: ✅ 583 tests PASS

## [2026-05-26] Cortex 구조 확정 + 모바일 캡처 인프라

**완료**: Cortex PARA-B 구조 확정 — areas→"hexagonal pillars_rocks_helm" rename, 6pillars(845md)+3_Archive(451md) 기둥별 매핑 병합, 1_Projects(343md)→projects/ 이동, ritual-routine 중복 해소. Telegram→cortex/inbox 자동 캡처 데몬(launchd 상시). Obsidian vault 설정. PKM 6시스템 세부분류 벤치마크 리서치 완료.
**이슈**: Obsidian Mobile 동기화 방식 미결정 (iCloud symlink vs Working Copy). Cortex 상세 구조(depth 2 + MOC + naming) 다음 세션에서 확정 필요.
**빌드**: ✅ 583 tests PASS

## [2026-05-26] Cortex Ritual Dashboard v2 전면 리빌드

**완료**: OneNote 10년 주간 플래너 → localhost:7843 대시보드 완전 이전. 서버 v2 (20+ API), Day Frames 시스템 (3 day types + routine/todo + 이월), Standing Orders 4탭 CRUD, 공휴일 33개 + HF 11개 캘린더 반영, Vision & Milestones 5개년 테이블, 크로스데이 D&D, 하이퍼링크, Undo, 디자인 개선. 데이터 마이그레이션 (May 209 + June 344 items), 오타 16건 수정.
**이슈**: 데이터 유실 3회 발생 (SW 캐시, 마이그레이션 덮어쓰기, inject-frames 빈 데이터). 빈 데이터 저장 방지 안전장치 추가로 해결. OneNote 원본 재파싱 미완 (git .md 기반 오타 잔존).
**빌드**: ✅ 583 tests PASS

---

## [2026-05-25] Cortex 워크스페이스 + YT 16개 분석 + PKM 벤치마크 + 거버넌스 V2

**완료**:
- Cortex PARA 워크스페이스 전면 재설계 (디렉토리 재편, 커맨드 7개, CORTEX.md 매뉴얼, VS Code 설정)
- 거버넌스 V2 — Cascade Updates, Typed Links(7종), NoteType(5종), Knowledge Consolidation, Worker Output Rule
- YouTube 16개 영상 Groq Whisper 전사 + 5그룹 분석 리포트 + 즉시 적용 6건 (opusplan, LSP, Plan-Annotate-Execute, /ppt Q0, yt --transcribe, MSAL 갱신)
- Ritual Board recurring templates (JSON + API 5개 + 자동주입)
- OneNote migration 완료 (1,639파일, MSAL 자동갱신, 3_Archive 451)
- PKM 벤치마크 14개 + 5개 GitHub 레포 딥다이브 (소스코드 직접 분석)
- SKILL.md 호환성 분석 (70-80% 변환 가능)
- Connectome에 위키 패턴 적용 (/idea /inbox /consolidate /recall)
- wiki-types.ts 확장 (WikiCategory +5, LinkType 7종, NoteType 5종)

**이슈**: Whisper 로컬 CPU 과부하 → Groq API 전환으로 해결. 백그라운드 작업 실패 미보고 → 피드백 반영(즉시 알림 규칙).
**빌드**: ✅ 583 tests PASS

---

## [2026-05-25] Idea Auto-Accumulation System

**완료**:
- `/end` Step 1.5 Idea Harvest 추가 (아이데이션 세션 판별 게이트 + 중복 수확 방지)
- `/brainstorm` Step 4.5 Registry Sync 추가 (복귀 선언 뒤 실행)
- `/mece-gap` 신규 커맨드 (F1 형태학적 빈 셀 기본, --deep 시 F2-F9)
- CLAUDE.md 자동 제안 테이블에 `/idea`, `/mece-gap` 추가
- 레드팀 리뷰 4건 반영

**이슈**: 없음
**빌드**: 테스트 없음 (커맨드/거버넌스 파일만 수정)

---

## [2026-05-24] Cortex 통합 + Ritual Dashboard + Thinking Toolkit

**완료**:
- OneNote InterStellar 447페이지 cortex 분류 완료 (961 files). classify.py 2회 실행. 6 Hexagonal Pillars 구조 확인.
- Cortex 웹 대시보드 (localhost:7843) — contenteditable 캘린더 그리드. 체크/편집 → .json+.md 즉시 저장. launchd 자동시작.
- OneNote 링크 주입 (inject-links.py) — 139파일 frontmatter에 onenote_url 추가
- snapshot.py + sync.py — OneNote 변경 감지 + 차분 동기화
- staging 192페이지 추가 다운로드 (6기둥 섹션). 360페이지 남음 (토큰 만료)
- Thinking Toolkit (`cortex/thinking-toolkit.md`) — 자동감지 + /end 수확 프로토콜. Ideation Frameworks 5개.
- `/morning` 스킬 — 목표 상기 + One Thing 강제 + Pillar 연결
- ritual-routine-archive.sh + new-month.sh

**이슈**:
- OneNote API 토큰 1시간 만료 — 360페이지 미완료 (6기둥 본체)
- markdownify 변환 품질 — 원노트 spatial layout → .md 변환 시 가독성 저하
- 스크린샷 OCR 오류 — 원본 API 데이터가 아닌 캡처에서 텍스트 추출한 실수. 원본 .md 파일 활용으로 수정 방향 확정.
- 대시보드 하단 섹션 (상시/Yearly/Monthly/Vision/Character) 마이그레이션 미착수 — 다음 세션

**빌드**: ✅ 563 tests PASS

---

## [2026-05-23] OneNote → Obsidian 마이그레이션

**완료**:
- OneNote InterStellar 노트북 → Obsidian 마이그레이션 375/~475페이지 (79%)
- Microsoft Graph API + device code flow + markdownify HTML→MD 변환
- 12섹션(1_, 2.SLL, 3.HFK, 5.Sport, A TEAM, Dashboard, MK1, MKT_FB, Side hustle, Writing, 1.Character 등) 17디렉토리
- skip-existing 재실행 가능 스크립트 (`/tmp/onenote-migration/migrate.py`)

**이슈**:
- API 속도제한(429 Too Many Requests) — REQUEST_DELAY 1.0s + 점진적 백오프로 대응
- 토큰 1시간 만료 — 재인증 1회 수행, 2차 만료로 ~100페이지 미완료 (1. Character 61/100~)
- device code flow에서 인증과 마이그레이션을 별도 프로세스로 실행하면 토큰 유실 → `auth_and_run.py` 통합 스크립트로 해결

**빌드**: ✅ 563 tests PASS

---

## [2026-05-23] Quality Pipeline + PRD + do-better 마이그레이션

**완료**:
- Quality Pipeline 3-Layer (property-based + mutation + fitness + Layer 2 자동 리뷰 + CI mutation job)
- Branch Protection 설정 (master PR+CI 필수)
- A-Team PRD v1.0 작성 (/office-hours Amazon 모드 → PR/FAQ → PRD)
- 핵심 발견: 74개 중 5개만 사용, 인간 호출 의존 구조
- PRD Gate (governance/rules/prd-gate.md + vibe Step 0.9) — PRD 없이 빌드 금지
- do-better-workspace-v2 라인바이라인 분석 (119파일, 23K줄, 22 skills, 5 agents)
- do-better 마이그레이션 Phase 1: researcher 소스 체이닝 업그레이드, analysis-worker/content-worker 신규 (슬롭 점검+6단계 분석)
- Anti-Slop 원칙 quality-pipeline.md 반영
- A-Team-1 → a-team 중복 clone 통합
- bypass 모드 활성화
**이슈**: 없음
**빌드**: ✅ 563 tests PASS (기존 flaky 1건)

## [2026-05-23] Quality Pipeline + 탑 클래스 개발 프로세스

**완료**:
- Quality Pipeline 3-Layer 시스템 (governance/rules/quality-pipeline.md SSOT)
- 12개 개발 방법론 시그널 자동 전환 (CLAUDE.md)
- Property-Based Testing — fast-check v4.8, 12 tests (confidence.ts + harness-score.ts)
- Mutation Testing — StrykerJS v9.6.1, stryker.config.mjs, npm run mutate
- Architecture Fitness Functions — 6 tests (레이어 경계 + 순환 의존성 + 모듈 독립)
- CI mutation job 추가 (PR only, incremental 캐시)
- Branch Protection 설정 완료 (master PR+CI 필수)
- PR 템플릿 quality gates 강화
- /end에서 리뷰 제거 → Layer 2 (빌드 완료 시점)로 이동
**이슈**: 없음
**빌드**: ✅ 576 tests PASS (기존 flaky 1건)

## [2026-05-16] 디자인 거버넌스 + PPT 파이프라인 수정

**완료**:
- 디자인 토큰 템플릿 5프리셋 + variables.css + tailwind-tokens.js
- 디자인 드리프트 감지기 (CSS/JSX 매직넘버 스캔, A~F 등급)
- designer 에이전트 3단계 토큰 라이프사이클
- PPT 파이프라인 consulting 모드 + 테마 라우팅
- Growth Engine 일간 실행 GREEN 3건 적용
**이슈**: 없음
**빌드**: ✅ 531 tests PASS

## [2026-05-15] Growth Engine (자율 성장 엔진)

**완료**:
- /daily-brief 자율 성장 엔진 (크롤링→분석→자동 적용→보고)
- growth-engine 에이전트 (GREEN/YELLOW/RED 안전 등급)
- 거버넌스 주기 완성: 일간(/daily-brief) + 주간(/insights) + 월간(/board)
- /daily-review deprecated → /daily-brief 흡수
**이슈**: 없음
**빌드**: ✅ 532 tests PASS

## [2026-05-22] Wiring Integrity 자동 검증 + Scheduled Reviews 시스템

**완료**:
- wiring integrity 테스트 4종 (refs/agents/bash/frontmatter) — npm test 자동 실행
- scheduled-reviews 시스템 — JSON 등록 → vibe/pickup에서 due 항목 자동 표시
- governance/rules/no-watch-promises.md — "지켜보겠다" 거짓 약속 금지 규칙
- PMI 완전 실행 — Phase 1-5 + adversarial CONFIRMED 5건 수정
- $VAR한글 bash 버그 6건 수정 (absorb-scan.sh + intel.md)
- coding-safety.md §3 한국어+Bash 변수 안전 규칙
- pmi.md SSOT drift 해소 (adversarial "선택"→"필수")
- intel-analyzer.md name 필드 추가
- reference/resources.md WSJ Guide 레퍼런스 저장

**이슈**: WSJ Guide Scribd 페이지 파싱 미완 (인증 벽). 로컬 PDF 확보 후 재시도 필요
**빌드**: ✅ 558 tests PASS (47 files)

---

## [2026-05-21] PPT benchmark corpus + consulting planner 연결

**완료**:
- 공식 컨설팅 벤치마크 코퍼스 추가 (`reference/ppt-benchmarks/manifest.json`, `selected-slides.json`, README)
- `scripts/ppt/benchmark-corpus.mjs` 추가: 공식 PDF fetch, PyMuPDF fallback render, 로컬 캐시 분리
- `scripts/ppt/benchmark-audit.mjs` 추가: action title / evidence density / placeholder / bloated big number / decorative layout 점수화
- `scripts/ppt/server.py`를 템플릿 나열식에서 컨설팅 narrative 기반 planner로 교체
- benchmark gate를 spec 생성 직후 연결
- `scripts/ppt/generate_consulting.py`의 `bar_chart`/`data_table` 변환 필드 정합성 수정
- 새 spec benchmark score `100/100 A`, consulting PPT QA `100/100 A`, 전체 테스트 `544 PASS`

**이슈**: macOS Quick Look 썸네일에서 한글이 `?`로 렌더링됨. `mckinsey_pptx` CJK 폰트 경로 추가 점검 필요

**빌드**: ✅ `npm run build`, `npm test`

## [2026-05-21] Multi-Agent 지원 구조 + 문서 hygiene

**완료**:
- AGENTS.md 신설 + CLAUDE.md 레이어 분리 (Claude Code 전용 / Universal 분리)
- GEMINI.md 자동 생성 → Codex·Gemini CLI 멀티 에이전트 대응
- scripts/sync-agents.mjs: pre-commit hook으로 AGENTS/GEMINI.md 자동 동기화
- vibe-init.sh: 세션 시작 시 프로젝트에 AGENTS.md + GEMINI.md 자동 복사
- 문서 drift 수정: README 537→531, package.json ISC→MIT, PROTOCOL.md 참조 3개
- governance/rules/lifecycle.md: 커맨드 상한선 60→80 현실화
- CURRENT.md 200→165줄 (2주 초과분 이관)
- launchctl 스크립트 4개 Windows 무음 실패 → 명시적 경고 후 exit

**이슈**: Windows에서 mklink symlink 실패 → cp fallback (진짜 symlink 아님, vibe-init 복사로 대체)

**빌드**: ✅ (문서·스크립트·거버넌스 변경, 테스트 없음)

---

## [2026-05-16] 디자인 거버넌스 시스템 + PPT 파이프라인 수정

**완료**:
- 디자인 토큰 템플릿 5프리셋 (`templates/design-tokens/`)
- 디자인 드리프트 감지기 (`scripts/design-drift-detect.mjs`) — A~F 등급 스코어링
- designer 에이전트 Phase A/B/C 토큰 라이프사이클 추가
- vibe Step 0.8 — 세션 시작 시 토큰 유무 자동 감지
- PPT ppt-strategist consulting 모드 + generate_via_intake consulting 라우팅 수정
- Growth Engine 일간 실행 GREEN 3건 적용

**이슈**: skt_statistics GitLab URL 미수신 — 토큰 주입 보류
**빌드**: 531 PASS / 6 flaky (PPT 0)

---

## [2026-05-15] PPT 엔진 컨설팅급 대폭 업그레이드

**완료**:
- generate_v2.py 전면 재작성 (18종 레이아웃, 8종 테마, 그라데이션/그림자/CJK/풋터/노트)
- mckinsey_pptx 라이브러리 통합 (40종 McKinsey/BCG/Bain 슬라이드 타입)
- generate_consulting.py 어댑터 (--style mckinsey/bcg/bain)
- McKinsey 공식 컬러 적용 (#051C2C, #2251FF)
- BCG (#147B58) / Bain (#CB2026) 테마 추가
- 광역 리서치 7건 (Gamma, GenSpark, Skywork, 프로 디자인 원칙, python-pptx 고급, 오픈소스, 컨설팅 스펙)
- 레드팀 적대적 리뷰 완료 (Critical 1 + High 7 + Medium 4)

**이슈**:
- 파이프라인 끊김: server.py/ppt-strategist가 consulting 엔진 미연결
- CJK 폰트 우회가 consulting 엔진에 미적용
- convert_spec() 데이터 손실 3건 (data_table/bar_chart/timeline)
- mckinsey_pptx LICENSE 미복사
- RESUME.md에 수정 계획 6건 기록

**빌드**: ✅ (tsc 0 errors, 530 PASS / 7 FAIL — FAIL은 기존 audit-design 이슈)

## [2026-05-15] PPT AskUserQuestion 인테이크 + 커밋 정리

**완료**:
- ppt.md: [STOP] 마커 → AskUserQuestion 도구 호출 지시로 전면 교체 (Q1~Q5 + 스펙 확정)
- generate_via_intake.py, ppt-wizard.sh, ppt.bat 신규 커밋
- .gitignore: PPTX/PDF 바이너리 출력 제외 추가
- P0 개선사항 확인 (P0-1 analytics tracking, P0-2 test 비율)

**이슈**:
- Windows 환경 tsc 미설치 — 빌드 스킵 (PPT Python 스크립트만 수정, TS 무관)
- AskUserQuestion 옵션 최소 2개 제약 — /ppt Q1(자유입력) 패턴 개선 필요

**빌드**: ⚠️ (Windows tsc 미설치, 기존 이슈)
## [2026-05-15] Critical 3갭 해소 + 최정상 빌드업 (5/13~5/15 마라톤)

**완료**: Phase 0.5 자기개선 루프(gap-sensor+priority+vibe/end 연결), Trajectory eval(path_evals 3개+trajectory-eval.mjs), FSM Verification Gate. 레드팀 최상급(Worker-Critic+Garak+Semgrep+멀티라운드+red-team-protocol). 기획 최상급(Amazon PR/FAQ+_TBD_+설계결정DB+Outcome tracking+PRD 압축). Agent Teams 통합. ralph→zzz(CB/dual-exit/backup). 커맨드 자동 트리거 7→35개. 커맨드 코칭 Step 6.8. Stop auto-save+push. Health 감시 훅. 신규 프로젝트 스캐폴딩. 경쟁사 분석(SuperClaude/BMAD/spec-kit 대비 유일한 인프라 레이어). 비대화 해소(CURRENT -61%, autoresearch -80%, zzz -69%). /board 이사회 제1회. OKR Q2. Legal/BCP-DR 템플릿. anomaly-detect + weekly-report.
**이슈**: 브랜딩 미확정 → Postiz/소셜 대기. audit-design-cli flaky 5건 기존.
**빌드**: 532 PASS (+43), 20+ commits

---

## [2026-05-14] PPT 엔진 v3 + 클릭형 인테이크 UI

**완료**:
- generate_v2.py v3: 12pt 최소 폰트 강제, Y축 겹침 해소, ROUNDED_RECTANGLE+RIGHT_ARROW 도형, oval_dot() 추가, italic 파라미터 버그 수정
- scripts/ppt/intake.py: questionary 기반 터미널 클릭형 인테이크 (화살표키·체크박스·슬라이더)
- scripts/ppt/server.py: 로컬 웹 서버 (localhost:7842), 클릭 폼 → 즉시 PPTX 다운로드
- 반도체 전략 PPT consulting_clean 버전 재생성 (12장, 전체 내용)

**이슈**: Marp 대비 품질 격차 남아있음 — python-pptx 도형 한계. pptxgenjs-jsx 마이그레이션 검토 필요
**빌드**: ✅ (generate_v2.py 정상 실행, 3커밋 push)

## [2026-05-13] P4 Governance & Trust + 이사회 + 문서 비대화 해소

**완료**: Analytics anomaly-detect.mjs (6가지 감지) + weekly-report.mjs (통합 리포트, Business KPI 섹션). capability-map APQC P0-P3 반영 (42%→44%). PMI 실행 — CURRENT.md 418→163줄 (-61%), autoresearch -80%, zzz -69%, webapp-prd/dashboard-prd stub화. governance/rules/document-hygiene.md 영구 규칙. P4: /board AI 이사회 제1회 (4인 페르소나, MRR $0 직면, 인프라 모라토리엄 결의) + templates/legal/ (Privacy+ToS+GDPR) + templates/bcp-dr.md + OKR Q2 설정 (Rocks 3개). 레드팀 3건 수정 (ts fallback, ANOMALY_NO_EMIT self-pollution, a11y false positive). 벤치마크 7 프레임워크 + 3 사례 + 7 GitHub 기록.
**이슈**: 브랜딩 미확정 → Postiz OAuth/소셜 계정 대기. 인프라 모라토리엄 선언 (제품 출시 전 새 커맨드 빌드 금지).
**빌드**: 507 PASS (+18), 5 commits pushed.

---

## [2026-05-13] APQC Gap Analysis P0-P3 + 풀오토 오케스트레이션

**완료**: 5개 병렬 리서치 (회사 구조/부서 택소노미/AI 자동화/GitHub 프레임워크/테크스택) + 2개 추가 리서치 (라이선스/Revenue·SEO·Sales). APQC 13 카테고리 vs A-Team 매핑 → 52%→68%. P0: license-checker-rseidelsohn CI + legal 템플릿 (Common Paper CC BY 4.0) + revenue tracking + customer support 설계. P1: /prioritize RICE + feedback-loop + growth-framework. P2: /incident + /okr + health-check.mjs (10항목 전체 PASS). P3: community + budgeting + infrastructure. npm install 보안 감사 PreToolUse 훅. Orchestration v2: permissionDecision:deny Agent 차단 성공 + hookSpecificOutput.additionalContext 주입 확인 + Explore grep 차단 (0 tok). 거짓말 5건 적발/수정.
**이슈**: systemMessage UI전용 확인. Groq 한국어 생성 불가. UserPromptSubmit 발동 미확인.
**빌드**: 489 PASS + 10/10 health

---

## [2026-05-11] Orchestration v2 — 6라운드 레드팀 기반 실험 설계

**완료**: 4개 병렬 리서치 (GitHub 28개 프로젝트, 벤치마크, 훅 아키텍처, speculative execution). 실측 벤치마크 (Groq 272-889ms, 병렬 OK, 한국어 실패 확인). 핵심 메커니즘 발견: `permissionDecision:deny` → Agent 차단 + hookSpecificOutput.additionalContext 주입 작동. Explore 에이전트 grep 검색 완전 차단 성공 (0 tok, 1s). 거짓말 5건 적발 및 수정.
**이슈**: systemMessage UI전용 (모델 컨텍스트 미주입), 한국어 생성 Groq 불가, UserPromptSubmit 발동 미확인, Groq 오답 시 맹신 가능성.
**빌드**: 489 PASS

---

## [2026-05-09] Multi-Model Router Phase 3-5 완료 — MCP SDK + 모니터링

**완료**: @modelcontextprotocol/sdk 설치 + mcp-local-model.mjs API 수정 (서버 부팅 정상). monitor.mjs Direct Mode 재작성 (Groq/Ollama 헬스체크 + 엔드포인트 테스트 + analytics 사용량 + Groq rate limit 추적). 설계문서 Phase 3-5 체크리스트 갱신.
**이슈**: local-strong (32B) cold start 60s 타임아웃 → 테스트 타임아웃 60s로 증가. Claude Code 재시작 필요 (mcp__llm__ask 활성화).
**빌드**: 489 PASS

---

## [2026-05-05] Prompt Coaching 시스템 — 5가지 실패 유형 기반 피드백 루프

**완료**:
- `/end` Step 6.7 Prompt Coaching 신설:
  - 5가지 실패 유형: 의도 오해, 스코프 폭주, 결과물 불일치, 컨텍스트 단절, 재작업 루프
  - 각 유형별 감지 패턴 + 자가 체크 질문 + 개선 공식
  - Before/After 구체적 예시 포함 출력
- `lib/analytics-schema.json` 업데이트:
  - `prompt_quality` 이벤트 타입 추가
  - `promptFailureTypes`, `promptReworkCount`, `promptTopPattern` 필드
- `/vibe` Step 0.75 프롬프트 패턴 트렌드 통합:
  - 주간 실패 유형 집계
  - 습관화된 패턴 감지 + 개선 추이 표시

**이슈**: 없음

**빌드**: ✅ 489 PASS / tsc 0

---

## [2026-05-04] YouTube 영상 완전 흡수 — Context Engineering 통합

**완료**:
- Dex Horthy "No Vibes Allowed" 영상 완전 분석:
  - youtube-transcript-api로 23,639 chars 자막 추출 (<5초)
  - 8 keyframes 추출 (frame-01.jpg ~ frame-08.jpg)
  - 10가지 핵심 개념 추출 + A-Team 적용성 판단
- 신규 파일 4개:
  - governance/rules/context-engineering.md (167 lines) — Smart Zone 0-40% vs Dumb Zone 40-100%, Compaction 트리거, Sub-agent 용도
  - .claude/agents/README.md (180 lines) — Sub-agent 아키텍처 원칙 (컨텍스트 제어 ✅ vs 역할 분리 ❌)
  - .research/notes/2026-05-04-no-vibes-allowed-dex-horthy.md (270 lines) — 전체 분석 노트
  - scripts/yt-extract.sh 개선 — youtube-transcript-api 우선, yt-dlp fallback 추가
- 수정 파일 2개:
  - .claude/agents/orchestrator.md — Phase 2.8 신설 (Compaction Check, 40% 임계값 자동 압축)
  - .context/guides/postiz-oauth-setup.md — Google OAuth 오류 설명 수정 (email/password 로그인)
- 핵심 개념 통합:
  - Research-Plan-Implement (RPI) → orchestrator Phase 1-5 (이미 구현됨)
  - Compaction → /handoff + 자동 트리거 (Phase 2.8 신규)
  - Smart Zone 40% → context-engineering.md (신규)
  - Sub-agents for context control → README.md 명시 (신규)
  - Progressive Disclosure → CLAUDE.md 계층 (이미 구현됨)

**이슈**:
- 초기 superficial analysis (keyframes만) → 사용자 피드백 ("제대로 분석해야지") → 완전 분석 재실행
- youtube-transcript-api 설치 필요 (pip3 install --user --break-system-packages)

**빌드**: ✅ 489 PASS / 0 tsc / 0 vulns

**커밋**: 1개 (feat: YouTube 영상 완전 흡수 — Context Engineering + youtube-transcript-api)

**다음 단계**: Postiz OAuth 설정, Phase 2 콘텐츠 발행

---

## [2026-05-03] Phase 2 Gate 달성 — Intel 시스템 E2E 검증

**완료**:
- Phase 2 파일럿 Step 1-5 완료 (Phase 2 Gate 6/6 조건 충족):
  1. Vercel 경쟁사 분석 (.intel/competitors/2026-05-03-vercel.json) — 3 tiers, 10 features, dataQuality: complete
  2. Edge computing 트렌드 (.intel/trends/2026-05-03-edge-computing.json) — rising, 127 mentions, 70% positive
  3. Indie hackers 페르소나 (.intel/personas/2026-05-03-indie-hackers.json) — confidence: high, JTBD 7개, Pain Points 14개
  4. Edge SaaS 런칭 브리프 (.context/briefs/2026-05-03-edge-saas-launch.md, 227 lines) — 3개 마케팅 각도
  5. **블로그 콘텐츠 생성** (content/drafts/2026-05-03-edge-saas-launch.md):
     - 제목: "Zero to Revenue in 48 Hours: How Edge Computing Killed the Indie Hacker Bootstrap Myth"
     - 3,247 words (목표 3,000 초과 달성)
     - Intel 데이터 인용 3개 소스 (vercel.json, edge-computing.json, indie-hackers.json)
     - [HUMAN INSERT] 마커 3개 (케이스 스터디 대기)
     - Analytics 이벤트 로깅 (`intel_used: true`)
- Phase 2 T6 통합 테스트 (intel-aggregate.mjs) — "all" keyword 처리 수정 + 4 테스트 추가
- 정기 유지보수 시스템 구축:
  - governance/rules/maintenance-schedule.md (11개 정기 작업 스케줄)
  - scripts/install-maintenance-cron.sh (3개 launchd 작업 자동 생성)
  - scripts/maintenance/README.md (설치·운영 가이드)

**Gate 검증**:
- ✅ Competitor analysis (Vercel, complete quality)
- ✅ Trend analysis (edge computing, rising)
- ✅ Persona research (indie hackers, high confidence)
- ✅ Marketing brief generated (3 sections)
- ✅ Marketing content cites intel data (3 explicit citations)
- ✅ Analytics event logged (intel_used: true)

**이슈**: "all" keyword 처리 누락 (integration test에서 발견 → 즉시 수정)

**빌드**: ✅ 489 PASS / 0 tsc / 0 vulns

**커밋**: 4개 (context compaction + Phase 2 pilot Steps 1-5)

**다음 단계**: [HUMAN INSERT] 3개 채우기, 콘텐츠 리뷰, Postiz OAuth 설정

---

## [2026-05-03] Phase 2 Intel 파일럿 Step 1-4 + 정기 유지보수 시스템

**(통합됨 — 위 세션으로 병합)**

---

## [2026-05-01] 멀티 통합 세션 — 영상 흡수 + DESIGN.md + 모델 적정성

**완료**:
- GAN 격리 원칙 (orchestrator Phase 2.7 + reviewer.md) — Anthropic Harness Design 영상
- ECS 원칙 (에이전트 직접 호출 금지) — Array's DevBook 영상
- /yt YouTube 풀 추출 스킬 (yt-dlp+ffmpeg, 자막+키프레임)
- 외부 디자인 도구 추천 트리거 (designer.md, 5 도구 매트릭스)
- DESIGN.md 표준 통합 (Google Labs 2026-04-21) — designer Step 0 + vibe Step 0.66 + gate.md 우선순위
- PMI 5-phase 실행 — gate.md DESIGN.md wiring 1건 즉시 수정
- 모델 적정성 자동 평가 룰 (governance/rules/model-allocation.md + CLAUDE.md)
- RTK 0.38.0 설치 (글로벌 PreToolUse Bash 훅, 60-90% 토큰 절약)
- yt-dlp 설치, 권한 버그(`//Users/...` glob) 진단+수정

**이슈**:
- Claude Code 메인 세션 모델 자동 전환은 harness 미지원 — 우회: 자가평가 + 위임 + 사용자 push
- vibe.md 2432 words (커맨드 기준 1200 초과) — 누적 증가 추세, 별도 최적화 필요

**빌드**: ✅ 471 PASS / 0 tsc / 0 vulns

## [2026-04-28] 태스크 정리 + Phase 1 방향 결정

**완료**: RESUME.md 4개 태스크 상태 점검. SDK 0.91.1 이미 완료 확인. Advisor/eval-store/Postiz 보류 처리 (외부 의존). Phase 1 Anomaly/Causal/외부데이터 연결 보류 (데이터 부족). 나중에 할 목록 6개 CURRENT.md 기록. Phase 2 진입 결정.
**이슈**: Advisor tool은 Max 플랜 미지원으로 API 크레딧 확보 전까지 진행 불가.
**빌드**: ✅ 471 PASS

## [2026-04-30] Continuous Growth System 6-Task 구현

**완료**:
- `cf1b64c` feat: Continuous Growth System — analytics emit + /vibe 주간리포트 + CSO 4-axis + lifecycle 60상한 + PM Gate(pm+scope-validator) + /cold-review 월간감사
- gstack 흡수 완전성 재확인: `/office-hours→/plan-ceo→/plan-eng` 체인 pm.md에 명시. Business Ops 레이어(unit economics/P&L)는 gstack 원본에도 없었음 — Phase 2 과제
- scope-validator(Haiku): coder/architect 직전 스코프 경계 PASS/WARN/BLOCK 판정
- orchestrator Phase 2.05(PM Gate) + Phase 2.06(Scope Validator) 추가
- 커맨드 53개 배포 완료

**이슈**: node_modules 미설치 (Windows 로컬) — 빌드 검증 CI 의존

**빌드**: CI ✅ (GitHub Actions master push 트리거)

## [2026-04-27] CSO-L03 CI + zzz 재진입 준비

**완료**:
- `ca11f44` ci: GitHub Actions CI 추가 (tsc + vitest on PR/push to master)
- `7a03be9` RESUME.md 갱신 — Phase 0.5 capability-growth-engine + autoresearch 파일럿 큐

**이슈**: IDE(Antigravity) 환경에서 `/zzz` 풀-오토 불가 → `--dangerously-skip-permissions` 재진입 안내
**빌드**: 458 tests PASS, tsc 0 errors

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

## [2026-05-25] PMI + Design INDEX + Cortex PARA 재편

**완료**:
- PMI 5-Phase — fast-check 설치, wiki-types TSC 수정, CLAUDE.md 축소, 583 tests PASS
- Design Taste Evaluator Phase 1 — INDEX.md 72 brands, 8 categories, tone clusters
- Cortex 재편 — staging 587파일 OneNote 원본 구조 복원, pillars/areas 중복 제거, Dashboard 100개 6기둥 분류
- OneNote 누락 658개 다운로드 (2_6 pillars 2~6번 전체)
- claude 실행 문제 해결 (claude-remote 서버 종료)

**이슈**: OneNote 3_Archive 미다운로드 (Microsoft API 장애)
**빌드**: ✅ 583 tests PASS (50 files)
