# 슬래시 명령어 변경 이력

---

## v2026-03-23 — gstack 통합 Wave 4 (완성)

### 신규 명령어 (재설계 포함)
- `/review` — 수동 7단계 Pre-Landing 리뷰 (reviewer 에이전트와 역할 분리)
- `/land` — 배포 후 헬스체크 + 스모크 테스트 + 롤백 준비도 (단순 머지 아님)
- `/adversarial` — 모델 무관 4관점 적대적 리뷰 (입력조작/권한돌파/로직반전/부작용수확)
- `/doc-sync` — 문서 Drift Score 측정 + 자동 수정 (ship 시점 아닌 상시 감지)
- `/benchmark` — 도구 자동 감지 성능 기준선 시스템 (browse 없이도 동작)

### 신규 훅
- `careful-check.sh` — 리스크 스코어러 (0-100점 계산, 40+: ask, 20+: warn, opt-in)

### 전체 워크플로우 (완성)
```
아이디어    → /office-hours
계획 검증   → /plan-ceo → /plan-eng → /autoplan
구현        → orchestrator
디버깅      → /investigate
브라우저    → /browse → /qa
성능        → /benchmark
보안        → /adversarial → /cso
문서        → /doc-sync
PR          → /review → /ship
배포 검증   → /land
회고        → /retro
```

---

## v2026-03-23 — gstack 통합 Wave 3

### 신규 명령어 (브라우저 자동화)
- `/browse` — ARIA @ref 기반 헤드리스 Chromium 자동화 (browse 바이너리 필요)
- `/qa` — 8카테고리 웹앱 QA + 헬스 스코어 + 원자적 수정

### init.sh 업데이트
- browse 바이너리 자동 감지 + 설치 안내 추가

### 전체 완성 워크플로우
```
아이디어 → /office-hours → /plan-ceo → /plan-eng
→ orchestrator(구현) → /browse /qa(검증) → /cso(보안) → /ship(PR)
```

---

## v2026-03-23 — gstack 통합 Wave 2

### 신규 명령어 (계획 & 설계)
- `/autoplan` — CEO→디자인→엔지니어링 자동 검토 파이프라인, 6원칙 자동 결정
- `/plan-ceo` — 전제 도전, 범위 분석, 실패 모드 테이블
- `/plan-eng` — 아키텍처 다이어그램, 테스트 커버리지 맵, 구현 로드맵
- `/cso` — OWASP Top 10 + STRIDE 8단계 보안 감사 (read-only)

### 권장 워크플로우 (코드 전 단계)
`/office-hours` → `/plan-ceo` → `/plan-eng` → orchestrator → `/ship`

---

## v2026-03-23 — gstack 통합 Wave 1

### 신규 명령어
- `/investigate` — 체계적 근본 원인 분석. researcher가 아닌 전용 디버깅 스킬
- `/ship` — PR 생성 전 완전 검증 파이프라인 (테스트→리뷰→버전→PR)
- `/retro` — git 기반 주기적 회고 보고서 (.context/retros/ 스냅샷 저장)
- `/office-hours` — 코드 작성 전 아이디어 검증 (스타트업/빌더 모드)

### 에이전트 업그레이드 (gstack 원칙 통합)
- **전 에이전트**: 상태 코드 표준화 (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT)
- **reviewer**: 2-Pass 구조 (Critical → Informational), 증거 기반 판정 원칙, AUTO-FIX 허용
- **orchestrator**: preamble.md 로드 추가, 라우팅에 `/investigate` 분리, 6가지 자동 결정 원칙
- **researcher**: 3회 가설 실패 → BLOCKED 에스컬레이션, 버그 분석은 investigate로 명시
- **coder**: 상태 코드 표준화

### 신규 거버넌스
- `governance/rules/preamble.md` — 공통 원칙 단일 파일 (상태코드 + 에스컬레이션 + 6원칙)

### 훅 업그레이드
- `templates/hooks/subagent-dod.sh` — 상태 코드 파싱 추가 (BLOCKED 수신 시 차단)

### Conductor 조사 결과
- conductor.build = 외부 유료/클로즈드 제품. gstack의 conductor.json은 87바이트 껍데기
- **A-Team의 ClawTeam 기반 오케스트레이션이 명백히 우위** — 채택 불필요

---

## v2026-03-20

### `/vibe` — 전면 복원 (Turbo One-Stop Start)
- A-Team 업데이트 자동 확인 단계 추가 (0번)
- DECISIONS.md, memory/MEMORY.md 정독 추가
- Research Mode 노트 확인 단계 추가 (.research/notes/)
- 자율 작업 원칙 4개 명시

### `/end` — 전면 복원
- CURRENT.md 4개 섹션 상세 갱신 명시
- 빌드 커맨드 범용화 (connectome 전용 제거)
- Research Mode 선택 활성화 단계 추가

### 관리 체계
- A-Team `.claude/commands/`를 단일 소스로 지정
- `project-scaffold.sh`에서 `~/.claude/commands/`로 자동 설치
- `docs/commands/README.md` + `CHANGELOG.md` 추가

---

## v2026-03-19 (초기)

### `/vibe` — 최초 생성
- CURRENT.md 정독
- git status + log
- 한 줄 브리핑

### `/end` — 최초 생성
- CURRENT.md + SESSIONS.md 갱신
- 빌드 검증
- 커밋
