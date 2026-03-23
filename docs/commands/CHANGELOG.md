# 슬래시 명령어 변경 이력

---

## v2026-03-23 — gstack 통합 업데이트

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
