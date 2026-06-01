# Paperclip 심층 분석 — 추가 cherry-pick 후보

> 작성: 2026-06-01 | 담당: researcher 에이전트
> 기존 4패턴 cherry-pick 이후 추가 발굴 (신규 7개 + ralph 3개)

---

## 기존 cherry-pick 4패턴 (확정)

| # | 패턴 | 상태 |
|---|------|------|
| 1 | Activity Log + Cost Event | 로드맵 작성 완료 |
| 2 | Heartbeat Run 추적 | 로드맵 작성 완료 |
| 3 | Atomic Checkout | 로드맵 작성 완료 |
| 4 | Skills 디렉토리 메타데이터 | 로드맵 작성 완료 |

---

## 신규 발견 — Paperclip 7개

### 패턴 5: Heartbeat 9-Step 실행 프로토콜

- **출처**: `skills/paperclip/SKILL.md`
- **내용**: 에이전트가 깨어날 때마다 9단계 고정 절차 수행
  1. 신원확인 GET /api/agents/me
  2. 승인 후속처리
  3. 할당 조회 (inbox-lite)
  4. 작업 선택 (in_progress > in_review > todo 우선순위)
  5. 체크아웃 POST
  6. 컨텍스트 이해 (heartbeat-context)
  7. 작업 실행
  8. 상태 업데이트
  9. 위임 (필요시 서브태스크 생성)
- **Scoped-wake fast path**: `PAPERCLIP_TASK_ID` 있으면 Step 5부터 바로 진입
- **A-Team 현재 상태**: /pickup이 상태 스캔을 하지만 이 수준의 9단계 프로토콜 없음
- **적용 가능성**: HIGH | **난이도**: 쉬움 (체크리스트화)
- **적용 방향**: /pickup 커맨드를 9단계 체크리스트로 구조화 (API 없이도 파일 기반으로 가능)

---

### 패턴 6: Goal Ancestry 추적

- **출처**: `doc/PRODUCT.md`
- **내용**: 모든 태스크가 상위 목표까지 역추적 가능한 연결고리 유지
  - "나는 X를 조사한다 → Y가 필요하기 때문에 → $2K 매출이 필요하기 때문에 → 회사 목표"
  - task의 `goal` 필드와 `parent` 필드로 구현
- **A-Team 현재 상태**: CURRENT.md는 현재 상태를 기록하지만 WHY 계보 추적 없음
- **적용 가능성**: HIGH | **난이도**: 쉬움
- **적용 방향**: CURRENT.md에 `goal_ancestry` 섹션 추가. Next Tasks 항목에 상위 목표 연결

---

### 패턴 7: 에이전트 고용 승인 게이트

- **출처**: `skills/paperclip-create-agent/SKILL.md`
- **내용**: 새 에이전트 생성 시 9단계 거버넌스 워크플로우
  - 기존 패턴 비교 → 드래프트 작성 → 품질 검토 → POST /api/.../agent-hires → 승인 대기
  - 허가 없이는 어떤 에이전트도 다른 에이전트를 고용 불가
- **A-Team 현재 상태**: 에이전트 정의 파일은 있지만 고용/생성 승인 게이트 없음
- **적용 가능성**: LOW | **난이도**: 어려움 (API 의존)
- **적용 방향**: 보류 (API 서버 없이 재구현 시 오버헤드 큼)

---

### 패턴 8: Slug 기반 이식 가능 에이전트 신원

- **출처**: `docs/companies/companies-spec.md`
- **내용**: 에이전트 간 참조에 DB ID 대신 slug 사용. 외부 스킬은 commit hash로 고정(immutable pinning) + sha256 무결성 검증
- **A-Team 현재 상태**: 파일명 기반 참조, 공식 slug 시스템 없음
- **적용 가능성**: MEDIUM | **난이도**: 보통
- **적용 방향**: 에이전트 파일에 `slug:` 메타데이터 추가. 외부 스킬 참조 시 커밋 해시 핀

---

### 패턴 9: PARA 메서드 3레이어 메모리

- **출처**: `skills/para-memory-files/SKILL.md`
- **내용**:
  - Layer 1: 지식 그래프 (`$AGENT_HOME/life/` — PARA 분류, `summary.md` + `items.yaml` 원자적 사실)
  - Layer 2: 일별 노트 (`YYYY-MM-DD.md` — 연대기 타임라인)
  - Layer 3: 묵시적 지식 (`MEMORY.md` — 사용자 패턴/선호)
  - "사실은 삭제하지 않는다: `status:superseded` + `superseded_by`로 대체"
- **A-Team 현재 상태**: Layer 3(MEMORY.md)만 있음. Layer 1, 2 없음
- **적용 가능성**: MEDIUM | **난이도**: 보통
- **적용 방향**: Layer 1(items.yaml 원자적 사실) + Layer 2(일별 노트) selective 도입

---

### 패턴 10: 1차 블로커 연결

- **출처**: `skills/paperclip/SKILL.md`
- **내용**: 블로킹 시 `blockedByIssueIds` 필드로 구조화된 의존성 선언. HTTP 409(다른 에이전트 소유) 수신 시 절대 재시도 않음
- **태스크 상태 라이프사이클**: `backlog → todo → in_progress → in_review → done/cancelled`, 별도로 `blocked`
- **A-Team 현재 상태**: CURRENT.md Blockers 섹션에 텍스트로 기록, 자동 의존성 해소 없음
- **적용 가능성**: HIGH | **난이도**: 쉬움
- **적용 방향**: CURRENT.md Blockers를 `- [blocked_by: #이슈ID] 설명` 형식으로 구조화

---

### 패턴 11: QA 루프 아키텍처

- **출처**: `doc/PRODUCT.md`
- **내용**: 엔지니어 에이전트 → QA 에이전트 → 검토 체크포인트. `in_review` 상태가 QA 대기열 역할. 순차 10단계 각 95% 정확도 → 최종 60%로 하락하는 문제를 QA 게이트로 차단
- **A-Team 현재 상태**: /qa 커맨드 있지만 태스크 상태 전환으로 QA 강제하는 구조 없음
- **적용 가능성**: MEDIUM | **난이도**: 보통
- **적용 방향**: orchestrator Phase에 `in_review` 상태 추가. /qa 커맨드를 상태 전환 게이트로 연결

---

### 패턴 12: 예산 스코핑 + 하드스톱

- **출처**: GitHub README
- **내용**: 에이전트별/프로젝트별/목표별/이슈별/모델별 예산 정책. 80% 소진 시 경고, 100% 시 하드스톱 + 큐된 작업 자동 취소. 관리 에이전트가 팀원 간 리소스 재배분 가능
- **A-Team 현재 상태**: 비용 추적 있지만 자동 하드스톱/재배분 없음
- **적용 가능성**: LOW | **난이도**: 어려움 (PostgreSQL 의존)
- **적용 방향**: 보류 (파일 기반 경량 재구현 가능하나 오버헤드 큼)

---

## 신규 발견 — ralph-claude-code 3개

### 패턴 A: Circuit Breaker (3상태 자동전환)

- **출처**: `lib/circuit_breaker.sh`
- **내용**: CLOSED / HALF_OPEN / OPEN 3상태. 진행 없음 3회, 동일 오류 5회, 권한 거부 2회 시 OPEN. 30분 쿨다운 후 자동 HALF_OPEN 전환. JSON 상태 파일 + 이력 파일로 추적
- **A-Team 현재 상태**: zzz 토큰 한계 재개 있지만 3상태 Circuit Breaker 없음
- **적용 가능성**: HIGH | **난이도**: 보통 (bash → 이식)
- **적용 방향**: zzz/autonomous-loop에 Circuit Breaker 통합. `.cb_state.json` 파일 기반 구현

---

### 패턴 B: RALPH_STATUS 구조화 블록 확장

- **출처**: `templates/PROMPT.md`
- **내용**: `---RALPH_STATUS---` 블록에 다음 필드 포함
  - `TASKS_COMPLETED_THIS_LOOP`, `FILES_MODIFIED`, `TESTS_STATUS`
  - `WORK_TYPE`, `EXIT_SIGNAL`, `RECOMMENDATION`
- **A-Team 현재 상태**: `---END---` 마커 사용하지만 필드가 부족함
- **적용 가능성**: HIGH | **난이도**: 쉬움 (포맷 추가)
- **적용 방향**: governance/rules/autonomous-loop.md의 종료 마커를 RALPH_STATUS 필드 수준으로 확장

---

### 패턴 C: specs/stdlib 코딩 컨벤션 라이브러리

- **출처**: `docs/user-guide/02-understanding-ralph-files.md`
- **내용**: `specs/stdlib/` 디렉토리 — 에이전트가 매 루프 참조하는 팀 코딩 컨벤션 라이브러리 (에러 핸들링, 로깅, 공통 유틸리티, 테스트 패턴)
- **A-Team 현재 상태**: `governance/skills/`에 SKILL.md 있지만 코딩 컨벤션을 stdlib 형태로 구조화하지 않음
- **적용 가능성**: MEDIUM | **난이도**: 쉬움 (디렉토리 추가)
- **적용 방향**: `governance/stdlib/` 디렉토리 신설. 에이전트 자동 참조 설정

---

## Paperclip × ralph 교집합 패턴

| 교집합 | Paperclip 구현 | ralph 구현 | A-Team 적용 |
|--------|---------------|-----------|------------|
| 루프 복구 | Heartbeat 9-Step | Circuit Breaker | 둘 다 적용 시 루프 구조 강화 |
| 진행 차단 | budget hard-stop | Circuit Breaker OPEN | ralph 버전이 즉시 이식 가능 |
| 완료 신호 | issue 상태 전환 | RALPH_STATUS 블록 | 둘 다 도입해 이중 검증 |

---

## 우선 적용 순위 (즉시 실행 가능한 것부터)

| 순위 | 패턴 | 난이도 | 가치 | 비고 |
|------|------|--------|------|------|
| 1 | **ralph 패턴 B**: RALPH_STATUS 블록 확장 | 쉬움 | HIGH | ---END--- 마커 확장만으로 완료 |
| 2 | **패턴 6**: Goal Ancestry 추적 | 쉬움 | HIGH | CURRENT.md 섹션 추가 |
| 3 | **패턴 10**: 블로커 구조화 | 쉬움 | HIGH | CURRENT.md 포맷 변경 |
| 4 | **ralph 패턴 A**: Circuit Breaker lite | 보통 | HIGH | zzz 루프 안정성 대폭 향상 |
| 5 | **패턴 5**: Heartbeat 9-Step | 쉬움 | MEDIUM | /pickup 체크리스트화 |
| 6 | **패턴 9**: PARA 메모리 Layer 1+2 | 보통 | MEDIUM | Layer3은 이미 MEMORY.md |
| 7 | **ralph 패턴 C**: stdlib | 쉬움 | MEDIUM | governance/stdlib/ 신설 |
| 8 | **패턴 11**: QA 루프 | 보통 | MEDIUM | orchestrator 수정 필요 |

---

## 알려진 버그/리스크

- **Paperclip Issue #2037**: 로컬 스킬 임포트 시 `scripts/`와 `references/`가 API에 노출 안 되는 버그 (2026-03 미해결) — Paperclip 스킬 시스템 그대로 채택 시 영향받음
- **패턴 7, 12**: PostgreSQL API 서버 의존 — 파일 기반 재구현 시 오버헤드 큼, 보류 권장
- **ralph Circuit Breaker**: bash 전용 — JS/Python 에이전트 포팅 필요

---

## 참고 소스

- Paperclip SKILL.md: https://github.com/paperclipai/paperclip/blob/master/skills/paperclip/SKILL.md
- Paperclip PRODUCT.md: https://github.com/paperclipai/paperclip/blob/master/doc/PRODUCT.md
- ralph lib/circuit_breaker.sh: `external/ralph-claude-code/lib/circuit_breaker.sh`
- ralph templates/PROMPT.md: `external/ralph-claude-code/templates/PROMPT.md`
