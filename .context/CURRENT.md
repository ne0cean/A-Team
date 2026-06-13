# CURRENT — A-Team 글로벌 툴킷

## Pre-flight Gate — 2026-06-13 (debrief)
- [ ] **파레트 체크 브라우저 직접 검증** — mergeMonthData done:true 보존 로직 배포됨. 체크 → 다른 탭 갔다옴 → 체크 유지되는지 확인
- [ ] **D1 직접 수정 전 필수**: "사용자 브라우저 열려있나?" 확인 → 열려있으면 닫은 후 진행
- [ ] **D1 수정 완료 = 브라우저 시각 확인**: `POST ok:true` / API 데이터 정합만으로 완료 선언 금지. 브라우저 새로고침 후 직접 확인.
- [ ] **carry 검증 = 누락 + 순서 둘 다**: 누락 0개여도 ORDER 다르면 화면 달라 보임. D[n][0..7] == D[n-1][0..7] 확인.
- [ ] **체크 날아간다는 신고**: 코드 보기 전에 `GET /api/month`로 실제 done 상태 먼저 확인
- [ ] 자격증명 확인 순서: 작업 전 `.env.*` / `cortex/.onenote-token.json` 먼저 grep — 사용자에게 발급 요청 전 필수
- [ ] 파레트 Worker 수정 시 `merge.js` 먼저 확인 — done:true 보존 로직, _unchecked 플래그 이해 후 수정

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
- [ ] **파레트 체크 브라우저 직접 검증** — mergeMonthData done:true 보존 배포됨. 체크 후 탭 이동 → 체크 유지 확인
- [ ] **Vision Board 근접 캡션** — html 카드 proximity 기반 캡션 연결 (사용자 결정 필요)
- [x] **ONENOTE-MIGRATION-SPEC.md 갱신** — 3-type 아키텍처 + docMode 규칙 반영 (2026-06-13)
- [ ] **Confluence 역변환기 + daemon** — 안정화 후 구현 재개
- [ ] **Connectome 수렴 파이프라인 S2 진행** — 옵션 번들 구성. 플레이북: `~/Projects/connectome/.context/convergence-plan.md` (S1 연결 분석 완료 2026-06-13, idea-graph.md 생성됨. 빌드는 S4 창업자 결정 + S5 검증 통과 후)

### Medium Priority
- [ ] **verify-data.mjs 자동 호출** — wrangler deploy 후 자동 실행
- [ ] **A-Team OKR 설정** — `/okr`로 6개월 목표 설정
