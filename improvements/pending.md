# A-Team Improvements — Pending

---

## Done — 2026-06 (이번 세션)

- [x] **Playwright ARIA API deprecated 수정** — `page.accessibility.snapshot()` → `page.ariaSnapshot()` (`scripts/browser/snapshot.js`, `flow.js`)
- [x] **flow.js --url 플래그 버그 수정** — --url이 navigate에 미사용 → auto-prepend goto 로직 추가
- [x] **qa 에이전트 browse 의존성 제거** — browse 데몬 → Playwright 스크립트 직접 호출로 교체 (`.claude/agents/qa.md`)
- [x] **3-Tier Knowledge Architecture 구축** — `governance/patterns/` 4개 + `governance/diagnostics/` 2개 + `/vibe` domain detection gate 추가
- [x] **내부 스킬 vs Glance MCP 비교 검토** — 결론: 정적 QA는 내부 스킬로 충분, Glance는 동적 탐색용

---

역류/등록된 개선사항 후보. `/improve apply` 또는 `/absorb` 스캔 결과로 등록.

(buggy 초기 스캔 결과 제거됨. 다음 /absorb 또는 주간 launchd fire 시 재등록.)

---

## Cold Review 개선안 — 2026-05-03

출처: `/cold-review` 월간 구조 감사
발견 시점: 2026-05-03
총 7개 영역 분석 → P0 2건 / P1 3건 / P2 2건

### ⏳ P0 긴급

- [ ] **P0-1: Analytics tracking 복구** — 예상: 2시간
  - 문제: 커맨드별 사용 기록이 analytics.jsonl에 저장 안 됨. 55개 중 54개 사용 0회로 표시.
  - 액션:
    1. 대표 커맨드 5개 (vibe/end/ship/optimize/cold-review) 실행 시 analytics emit 검증
    2. `scripts/log-event.mjs` 호출 경로가 각 커맨드에 wired 되어 있는지 확인
    3. session_start/session_end는 작동 중 → 다른 이벤트 타입도 같은 패턴 적용
  - 근거: Phase 0 완료 판정했으나 실제로 작동 안 함. 모든 데이터 기반 판단 불가능.
  - 파일: `.claude/commands/*.md`, `scripts/log-event.mjs`

- [ ] **P0-2: Test commit 비율 10% 목표** — 예상: 반나절
  - 문제: 최근 30일 test 커밋 1% (3건). feature 41% (77건)인데 테스트는 77:3 비율.
  - 액션:
    1. 다음 5개 feature 커밋마다 test 커밋 1개 강제
    2. `/tdd` 커맨드 실제 사용 의무화 (현재 사용 0회)
    3. CI에서 coverage threshold 추가 (현재 측정만 하고 block 안 함)
  - 근거: 458 tests 존재하나 신규 기능에 테스트 추가율 낮음. 회귀 리스크.
  - 파일: `.github/workflows/ci.yml`, `.claude/commands/tdd.md`

### ⏳ P1 중요

- [ ] **P1-1: 에이전트 수 감축 23 → 20 이하** — 예상: 30일 후 (데이터 수집 필요)
  - 문제: 상한선 20개인데 23개 (115% 초과).
  - 액션:
    1. Analytics 복구 후 30일간 호출 0회 에이전트 식별
    2. 0회 에이전트 중 3개 archive 또는 병합
  - 근거: 지금 정리하면 추측 기반. 사용 데이터로 판단 필요.
  - 선행: P0-1 완료 필수

- [ ] **P1-2: 자율 루프 첫 실사용 또는 제거** — 예상: 1회 야간 시도
  - 문제: Ralph/zzz 20+ 커밋, 사용 0회 (또는 기록 누락).
  - 액션:
    1. 다음 주 중 1회 `/zzz` 실제 발사 + 결과 기록
    2. 실패 시 → 다음 Phase에서 제거 검토
  - 근거: E2E 검증 없이 외출한 전력. 실사용 증명 필요.
  - 파일: `.claude/commands/zzz.md`, `.context/RESUME.md`

- [ ] **P1-3: missing-capability friction 해소** — 예상: 30분
  - 문제: friction-log에서 `missing-capability` 3회 반복.
  - 액션:
    1. `.context/friction-log.jsonl` 읽고 어떤 capability가 3번 막았는지 파악
    2. 해당 capability를 다음 우선순위로 상향 (roadmap 재조정)
  - 근거: 같은 종류 갭이 3번 작업 방해 = 우선순위 재고 필요.
  - 파일: `.context/friction-log.jsonl`, `.context/team-roadmap.md`

### ⏳ P2 장기

- [ ] **P2-1: governance/skills/design 커맨드 연결** — 예상: 30분
  - 문제: governance/skills/design/ 존재하나 실행 가능한 `.claude/commands/design.md` 없음.
  - 액션: 커맨드 생성 또는 기존 design-* 커맨드로 alias
  - 파일: `.claude/commands/design.md` (신규)

- [ ] **P2-2: 커맨드 인지 부하 측정 → archive 검토** — 예상: 30일 후
  - 문제: 커맨드 55개 (상한 60개에 92%). 사용 빈도 데이터 없어 정리 불가.
  - 액션:
    1. Analytics 복구 후 사용 빈도 top 20 추출
    2. 나머지 35개는 archive 검토 (30일 사용 0회 기준)
  - 근거: 복잡도 증가 중이나 활용도 불명.
  - 선행: P0-1 완료 필수


- ⏳ **IMP-20260508-CARD** /card-news 스킬 — 인스타 카드뉴스 8장 자동 생성 (HTML→PNG). 출처: 짐코딩. P2. .research/notes/2026-05-08-card-news-automation.md

---

## Cold Review 개선안 — 2026-06-02

### P0 긴급
- [ ] **커맨드 87→60개 이하 감축** — 사용 기록 0 + 6개월 미사용 커맨드 archived/로 이동 (30분)
- [ ] **에이전트 32→20개 이하 감축** — 중복/미사용 에이전트 정리 (1시간)
- [ ] **Analytics hook 설치** — settings.json PreToolUse에 log-event 자동 호출 등록. 커맨드별 수동 호출 의존 구조 폐기 (1시간)
- [ ] **zzz/ralph 실사용 검증** — sleep-resume.sh --add-dir 호환 수정 후 1회 실제 야간 실행 (반나절)

### P1 중요
- [ ] **미연결 스킬 7개 처리** — sse-endpoint/termux-remote/add-provider/e2e-test/upgrade/auto-sync/ui-inspect → 커맨드 연결 또는 삭제 (1시간)
- [ ] **marketing.performance-marketing 첫 구현** — friction-log 2회 반복, score 29 최우선 갭 (반나절)

### P2 장기
- [ ] **커밋 타입 규칙 강제** — Pre-commit hook으로 타입 없는 커밋 차단 (30분)

---

## /absorb 스캔 — 2026-06-08

스캔: 3 프로젝트 (kb-real-estate, trading, Dev Projects)
발견: NEW 4 / DIFF 6
분류: GLOBAL 1 / UNCLEAR 1 / LOCAL 4 (스킵)
등록: 2건

### IMP-20260608-01 — research-prompts.mjs (from kb-real-estate)
- **날짜**: 2026-06-08
- **출처**: `/absorb` 스캔 (kb-real-estate 프로젝트)
- **타입**: DIFF
- **분류**: GLOBAL
- **경로**: `~/Documents/kb-real-estate/scripts/research-prompts.mjs`
- **자동 판정**: GLOBAL — 프로젝트명 하드코딩 없음, 일반 패턴
- **내용 요약**: `loadProjectConfig()` 함수 추가 — `.research/project.json` → CLAUDE.md → CURRENT.md 순서로 프로젝트 컨텍스트를 자동 감지해 카테고리 프롬프트를 프로젝트에 맞게 적응. A-Team 버전은 daemon-utils.mjs 의존 구조, kb-real-estate 버전은 standalone 자동 적응.
- **액션 후보**:
  - [ ] `loadProjectConfig` 패턴을 A-Team `research-prompts.mjs`에 머지 (project.json 우선, CLAUDE.md fallback)
  - [ ] A-Team 버전의 daemon-utils 의존성 유지하면서 config auto-detect만 이식
  - [ ] 거부 (daemon-utils 모듈화 방향이 더 나음)
- **상태**: ⏳ pending

### IMP-20260608-02 — setup.sh (from kb-real-estate)
- **날짜**: 2026-06-08
- **출처**: `/absorb` 스캔 (kb-real-estate 프로젝트)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: `~/Documents/kb-real-estate/scripts/setup.sh`
- **자동 판정**: UNCLEAR — A-Team install.sh와 역할 중복 가능성
- **내용 요약**: PreCompact/Stop/PostToolUse 훅을 settings.json에 자동 등록하는 installer. 핵심 패턴: PostToolUse 훅으로 `${CLAUDE_PROJECT_DIR}/.research/last-activity.txt` 타임스탬프 갱신 (Research Mode 유휴 감지). A-Team install.sh와 비교 필요.
- **액션 후보**:
  - [ ] A-Team `install.sh`에 PostToolUse Research Mode 활동 추적 훅 패턴 이식
  - [ ] 독립 스크립트로 `scripts/setup-hooks.sh` 신규 추가
  - [ ] 거부 (A-Team은 Research Mode 미사용)
- **상태**: ⏳ pending

### LOCAL 스킵 목록 (pending 미등록)
- `commands/remo.md` — `/remote-control` 래퍼 1줄. 범용성 없음.
- `commands/research.md` — `re.md` 구버전. A-Team master가 이미 상위 버전.
- `commands/session-end.md` — `end.md` 경량 버전. 프로젝트 특화 (`.context/` 구조 하드코딩).
- `scripts/vibe-init.sh` (DIFF) — kb-real-estate 버전은 옛 vibe-toolkit initializer. A-Team master가 상위.

### IMP-20260614-01 — NEW command MANUAL.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/MANUAL.md
- **설명**: Trading Agent — 사용자 매뉴얼
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-02 — NEW command fund.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/fund.md
- **설명**: /fund — 펀드 의사결정 시스템 원샷
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-03 — NEW command ga-ingest.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/ga-ingest.md
- **설명**: ga-ingest — 해외 트레이딩 소스 수집 + 지식 추출 원스탑
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-04 — NEW command kr-morning.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/kr-morning.md
- **설명**: /kr-morning — 국장 장전 루틴 (08:00~09:00 KST)
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-05 — NEW command kr-swing.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/kr-swing.md
- **설명**: /kr-swing — 국장 비반도체 스윙 후보 발굴
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-06 — NEW command position-check.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/position-check.md
- **설명**: /position-check — 포지션 현황 + 매도 전략 체크
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-07 — NEW command trade-analyze.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/trade-analyze.md
- **설명**: /trade-analyze — 헤지펀드 노트 형식 포지션 분석
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-08 — NEW command us-night.md (from Trading)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (Trading)
- **타입**: NEW
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/Trading/.claude/commands/us-night.md
- **설명**: /us-night — 미장 야간 분석 (국장 마감 후)
- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-09 — DIFF command consolidate.md (from connectome)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (connectome)
- **타입**: DIFF (116 diff lines)
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/connectome/.claude/commands/consolidate.md
- **master 경로**: /Users/noir/Projects/a-team/.claude/commands/consolidate.md
- **액션**: [ ] master 덮어쓰기 | [ ] 일부 머지 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-10 — DIFF command idea.md (from connectome)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (connectome)
- **타입**: DIFF (126 diff lines)
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/connectome/.claude/commands/idea.md
- **master 경로**: /Users/noir/Projects/a-team/.claude/commands/idea.md
- **액션**: [ ] master 덮어쓰기 | [ ] 일부 머지 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-11 — DIFF command inbox.md (from connectome)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (connectome)
- **타입**: DIFF (37 diff lines)
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/connectome/.claude/commands/inbox.md
- **master 경로**: /Users/noir/Projects/a-team/.claude/commands/inbox.md
- **액션**: [ ] master 덮어쓰기 | [ ] 일부 머지 | [ ] 거부
- **상태**: ⏳ pending

### IMP-20260614-12 — DIFF command recall.md (from connectome)
- **날짜**: 2026-06-14
- **출처**: /absorb 스캔 (connectome)
- **타입**: DIFF (68 diff lines)
- **분류**: UNCLEAR
- **경로**: /Users/noir/Projects/connectome/.claude/commands/recall.md
- **master 경로**: /Users/noir/Projects/a-team/.claude/commands/recall.md
- **액션**: [ ] master 덮어쓰기 | [ ] 일부 머지 | [ ] 거부
- **상태**: ⏳ pending
