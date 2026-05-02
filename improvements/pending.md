# A-Team Improvements — Pending

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

