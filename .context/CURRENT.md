# CURRENT — A-Team 글로벌 툴킷

## Pre-flight Gate — 2026-06-13 (debrief)
- [ ] **파레트 체크 브라우저 직접 검증** — mergeMonthData done:true 보존 로직 배포됨. 체크 → 다른 탭 갔다옴 → 체크 유지되는지 확인
- [ ] **D1 직접 수정 전 필수**: "사용자 브라우저 열려있나?" 확인 → 열려있으면 닫은 후 진행
- [ ] **D1 수정 완료 = 브라우저 시각 확인**: `POST ok:true` / API 데이터 정합만으로 완료 선언 금지. 브라우저 새로고침 후 직접 확인.
- [ ] **carry 검증 = 누락 + 순서 둘 다**: 누락 0개여도 ORDER 다르면 화면 달라 보임. D[n][0..7] == D[n-1][0..7] 확인.
- [ ] **체크 날아간다는 신고**: 코드 보기 전에 `GET /api/month`로 실제 done 상태 먼저 확인
- [ ] 자격증명 확인 순서: 작업 전 `.env.*` / `cortex/.onenote-token.json` 먼저 grep — 사용자에게 발급 요청 전 필수
- [ ] 파레트 Worker 수정 시 `merge.js` 먼저 확인 — done:true 보존 로직, _unchecked 플래그 이해 후 수정
- [ ] **mjs↔lib/*.ts 결합 검증**: vitest 통과 ≠ 런타임 안전. 반드시 `npx tsx`로 실제 CLI 1회 spawn. lib top-level `__dirname`은 `dirname(fileURLToPath(import.meta.url))` 확인 ([[lesson_esm_dirname_tsx_import]])
- [ ] **knowledge-gardener 첫 실행**: loop-closer가 만든 `.context/loop/gardener-queue.md` + coverage 제안 21건 검토 (capability-map 적용은 \|Δ\|≤0.1만)
- [ ] **파이프라인 실측 누적**: 캠페인을 실 root에서 돌려 `pipeline_stage` 이벤트 쌓아야 benchmark-gap이 N>0 (현재 전 단계 no-data)

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.
**582 tests PASS** (2026-06-13). 3-Tier Knowledge Architecture + PostToolUse:Bash 진단 훅 구축.

## 🎯 Team Roadmap
> **목표**: 1인 + AI 팀이 대기업 마케팅/디자인/QA/분석 팀 수준 대체 | **거버넌스**: `.context/team-roadmap.md`

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 메타 인프라 | ✅ 완료 |
| 1 | 분석/BI | 🔑 **진입 가능** |
| 2 | 시장·사용자 인텔리전스 | ✅ Gate 달성 |
| 3-6 | 마케팅·디자인·QA·운영 | ⏳ |

## 🔬 Autoresearch Shadow Mode
**Mode**: `SHADOW-TRACKING` — `/office-hours`, `/blueprint`, `/plan-eng` 사용 시 자동 로깅. 상세: `AUTORESEARCH-PLAN.md`

## In Progress Files
- (없음)

## Last Completions (2026-06-13) — Cortex Palette carry/month 구조적 결함 근절

- **사고**: 7월 스케줄러에 6월 데이터 통째 복제 (7월 D1에 `month:"2026-06"` 저장). `/investigate`로 근본원인 5개 확정.
- **근본수정 5**: ①렌더 부작용 제거 → `worker/src/carry.js` 순수함수 `computeCarry` 추출 ②cross-month owner 분리(인접월 셀은 persist=false, 저장 금지) ③월 정체성 이중가드(프론트 `save()` + worker 409 `isCrossMonthClobber`) ④day 루프 `daysInMonth` bound(phantom day 제거) ⑤carry 테스트 0→커버.
- **무결성 게이트**: `verify-data.mjs`에 `.month===key`/day범위/카테고리 검사 추가 → 이 부류 오염 배포 전 자동 차단. deploy.sh가 carry.js 자동 재생성(드리프트 방지).
- **복구**: 7월=06-12백업으로 delete-first 교체(merge 우회), 6월 phantom day31 제거. GET 실측 검증 + 게이트 PASS.
- **TDD**: `restorePlan.js`(--restore-month) + carry 엣지 7케이스. **77 tests PASS**. /ship reviewer HIGH 2건 검증(1 오탐, 1 하드닝).
- **불변식 기록**: DECISIONS.md에 carry/owner/가드/게이트 명문화. POSTMORTEM 패턴 4개는 기존 유지.

## Last Completions (2026-06-13) — Cortex Research Gateway (개인화+복리 검색)

- **3레이어**: L1 웹(Exa, 월20k무료) 사옴 / L2 개인화(질의재구성+합성grounding)=모트 / L3 복리메모리(deposit→recall). 캐시형은 퍼플렉시티 못 이김 → L2/L3 투자.
- **복리 실증(키 불필요)**: `research.mjs --q --dry-run --root` 연속 2검색 → 2차가 1차 적립 회상→재구성질의에 엔티티 주입. CLI 테스트 고정.
- **MVP**: L3=로컬 JSONL. D1+Vectorize/Cognee는 IO교체로 Phase 2(lib 순수로직 불변).
- **라이브 가동**: EXA_API_KEY 설정됨(.env). 실 검색 검증(answer 1026자·출처8·개인화 과거4/프로필6).
- **접근성 surface**: 브라우저 `web-server.mjs`(launchd `com.ateam.research-web` :4010 상시가동·검증) + 텔레그램 `telegram-bot.mjs`+`lib/telegram.ts`(launchd `com.ateam.research-tg`는 토큰 후 로드). CLI `research.mjs`/`/research` 스킬.
- **L3 시맨틱**: `lib/vectorize.ts`+`lib/research-io.ts`(이중저장·graceful degrade) 코드 완료. Vectorize 인덱스 생성 시 자동 활성(없으면 로컬전용).
- **763 tests PASS, tsc 0**.
- **BLOCK**: 텔레그램 = @BotFather 토큰→`.env` TELEGRAM_BOT_TOKEN→`com.ateam.research-tg` 로드. 시맨틱 = `wrangler vectorize create cortex-research --dimensions=1024 --metric=cosine`+CF토큰.

## Last Completions (2026-06-13) — Cortex Palette carry/check/order 버그 수정

- **mergeMonthData done:true 보존**: stale save race condition 근본 수정. `_unchecked:true` 플래그로 intentional uncheck 구분. 44 tests PASS, 배포 완료.
- **toggleItem d+1 carry**: 주 마지막 날(토) 체크/언체크 시 D+1 carry 재계산 강제 실행
- **getCatItemsForRender dedup**: stored-stored, stored-carried 중복 항목 자동 제거 + 빈 텍스트 제거
- **orphaned _carried 고아 항목 제거**: stale removal `prevDoneTexts` → `prevUndoneTexts` 교체. prevDay에 undone으로 없으면 제거 (D+2 이상 고아 자동 처리). 배포 완료.
- **D13/D14 carry 순서 복원**: cleanup 스크립트로 scramble된 순서를 D12 기준으로 완전 재정렬. stored→_carried 변환. D14 동기화 + 고아 3개 제거.
- **POSTMORTEM-2026-06-13.md**: 재발 방지 4개 규칙 기록

## Last Completions (2026-06-13) — PMI + 벤치마킹 P0 완료

- **P0 benchmark synthesis**: ACI Syntax Validator 훅 + events.jsonl + analytics SQLite + .claude/skills/ 10파일 + zzz-heartbeat launchd. 582 tests PASS.
- **confluence-sync launchd 등록**: `com.cortex.confluence-sync` 가동
- **AI핸즈온 THU 수정 + 서울 재발견 7/28 제거** D1 PATCH 완료

## Last Completions (2026-06-13) — OneNote 663개 갭 전량 복원 완료

- **617개 신규 fetch**: 6회 토큰 갱신 반복. `--no-images` + fast pre-check(onenote_id 검증) 최적화
- **migrate**: src=2227 → dst=2256 (101%) PASS ✅
- **D1 인덱스**: 2262개 완료 (실패 0)
- **검색 확인**: Traffic & Banking ✅ + banking 쿼리 결과 2개
- **버그 수정**: 401 즉시 abort, fast pre-check onenote_id 교차검증, --no-images 플래그
- **/review**: HIGH-2 pre-check 불일치 버그 수정 완료

## Last Completions (2026-06-09~10) — 하네스 강화 + Cortex 버그

- 슬래시 커맨드 Analytics 의무화 훅 + 4대 Cortex 버그 수정 + workout 3중 보호 시스템

## Next Tasks

### High Priority
- [ ] **파레트 carry/month 수정 브라우저 직접 검증** — 6/7월 새로고침 후 6월 데이터 안 보이는지 + carry 정상 표시 확인 (구조수정 배포됨, Version 37f1776d)
- [ ] **파레트 체크 브라우저 직접 검증** — mergeMonthData done:true 보존 배포됨. 체크 후 탭 이동 → 체크 유지 확인
- [ ] **Vision Board 근접 캡션** — html 카드 proximity 기반 캡션 연결 (사용자 결정 필요)
- [x] **ONENOTE-MIGRATION-SPEC.md 갱신** — 3-type 아키텍처 + docMode 규칙 반영 (2026-06-13)
- [ ] **Confluence 역변환기 + daemon** — 안정화 후 구현 재개
- [ ] **Connectome 수렴 파이프라인 S2 진행** — 옵션 번들 구성. 플레이북: `~/Projects/connectome/.context/convergence-plan.md` (S1 연결 분석 완료 2026-06-13, idea-graph.md 생성됨. 빌드는 S4 창업자 결정 + S5 검증 통과 후)

### Medium Priority
- [x] **verify-data.mjs 자동 호출** — `scripts/cortex-dashboard/deploy.sh` 생성 완료 (2026-06-13)
- [ ] **A-Team OKR 설정** — `/okr`로 6개월 목표 설정
