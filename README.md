# A-Team — 멀티 에이전트 팀 운영 레퍼런스

> ClawTeam(HKUDS) 분석 기반 + gstack 통합 + Phase 14 최적화 (RFC-001~007).
> **에이전트가 망치지 않게 (Harness), 맥락을 잃지 않게 (Mirror), 할 일을 놓치지 않게 (TODO)**

## 📚 빠른 네비게이션

- **[USER_GUIDE.md](USER_GUIDE.md)** — 사용자 가이드
- **[MIGRATION.md](MIGRATION.md)** — Phase 14 RFC 마이그레이션 가이드 (opt-in 활성화)
- **[docs/HISTORY.md](docs/HISTORY.md)** — 방법론·이론·스킬 전체 히스토리 (Phase 0-14)
- **[docs/INDEX.md](docs/INDEX.md)** — 레슨런드 on-demand 인덱스
- **[governance/rules/ateam-sovereignty.md](governance/rules/ateam-sovereignty.md)** — **8원칙 (필독)**
- **[governance/rules/truth-contract.md](governance/rules/truth-contract.md)** — **거짓말 금지 (필독)**

---

## 핵심 3가지

| 기능 | 하는 일 | 당신이 할 것 |
|------|---------|------------|
| **Harness** | 위험 명령 차단, 빌드 실패 시 세션 종료 불가 | 자동 작동 |
| **Context** | `.context/CURRENT.md`로 세션 간 상태 보존 | `/vibe`로 시작, `/end`로 닫기 |
| **25개 커맨드** | 아이디어→계획→구현→검증→배포 전 사이클 커버 | 아래 워크플로우 참고 |

---

## 빠른 시작

```bash
# 1. A-Team 최신화 및 설치
cd ~/tools/A-Team && git pull && bash scripts/install-commands.sh

# 2. 프로젝트 초기화 (context + memory + harness + 25개 커맨드 자동 설치)
# A-Team 저장소가 ~/tools/A-Team 에 있다고 가정합니다.
bash ~/tools/A-Team/templates/init.sh my-project ~/tools/A-Team

# 3. 세션 시작
/vibe   # 컨텍스트 로드 + 중단점 파악 + 즉시 실행
```

이것만으로 `.context/`, `memory/`, `.claude/hooks/` (Harness 4종), 서브에이전트 5종, `~/.claude/commands/` 25개 전역 커맨드가 설치된다.

---

## 전체 워크플로우

```
아이디어    → /office-hours         (전제 검증, 범위 발견)
계획 검증   → /plan-ceo → /plan-eng → /autoplan
구현        → orchestrator          (A-Team 멀티에이전트 조율)
디버깅      → /investigate          (근본 원인 분석)
브라우저    → /browse → /qa         (헤드리스 자동화 + 8카테고리 QA)
성능        → /benchmark            (도구 자동감지, 기준선 추적)
보안        → /adversarial → /cso   (4관점 적대적 + OWASP/STRIDE)
문서        → /doc-sync             (Drift Score 측정 + 자동 수정)
PR          → /review → /ship       (수동 사전검토 + 자동 검증 파이프라인)
배포 검증   → /land                 (헬스체크 + 스모크 + 롤백 준비도)
회고        → /retro                (git 기반 주기적 분석)
```

---

## 슬래시 커맨드 (25개)

### 세션 관리
| 커맨드 | 설명 |
|--------|------|
| `/vibe` | 세션 시작 — A-Team 업데이트 확인 → 컨텍스트 로드 → 즉시 실행 |
| `/end` | 세션 종료 — CURRENT.md 갱신 → 빌드 검증 → 커밋 |
| `/pickup` | 토큰 소진 후 작업 재개 |
| `/handoff` | 모델 전환 핸드오프 |
| `/retro` | git 기반 주기적 회고 보고서 |

### 개발 워크플로우
| 커맨드 | 설명 |
|--------|------|
| `/investigate` | 체계적 근본 원인 분석 (버그 디버깅 전용) |
| `/review` | 수동 Pre-Landing 7단계 리뷰 파이프라인 |
| `/ship` | PR 생성 전 자동 검증 파이프라인 (테스트→doc-sync→리뷰→버전→PR) |
| `/land` | 배포 후 신뢰도 검증 — 헬스체크 + 스모크 테스트 + 롤백 준비도 |
| `/adversarial` | 공격자 시각 4관점 적대적 코드 리뷰 |
| `/cso` | OWASP Top 10 + STRIDE 8단계 보안 감사 (read-only) |
| `/benchmark` | 성능 기준선 시스템 — 도구 자동감지, 회귀 자동 감지 |
| `/doc-sync` | 문서 Drift 감지 & 동기화 (상시 감지, ship 시점 아님) |
| `/browse` | 브라우저 자동화 — ARIA @ref 기반 (browse 바이너리 필요) |
| `/qa` | 8카테고리 웹앱 QA + 헬스 스코어 (browse 바이너리 필요) |

### 계획 & 설계
| 커맨드 | 설명 |
|--------|------|
| `/office-hours` | 아이디어 검증 & 설계 발견 (코드 작성 전 단계) |
| `/autoplan` | CEO→디자인→엔지니어링 자동 검토 파이프라인 + 6원칙 자동 결정 |
| `/plan-ceo` | 전제 도전, 범위 분석, 실패 모드 테이블 |
| `/plan-eng` | 아키텍처 다이어그램, 테스트 커버리지 맵, 구현 로드맵 |

### 프로젝트 관리
| 커맨드 | 설명 |
|--------|------|
| `/prjt` | 전체 프로젝트 현황 조회 |
| `/repos` | GitHub 레포 목록 조회 |
| `/todo` | 빠른 메모 관리 |
| `/sync` | Auto-Sync 데몬 관리 |
| `/re` | Research Mode 관리 |

---

## 자동 안전 장치 (Harness)

`.claude/hooks/`에 설치된 훅이 항상 자동 실행됩니다:

| 훅 | 역할 |
|----|------|
| `pre-bash.sh` | `rm -rf *`, `git push --force` 등 위험 명령 즉시 차단 |
| `pre-write.sh` | `.env`, SSH 키, git 내부 파일 수정 차단 |
| `stop-check.sh` | 세션 종료 전 빌드 검증 — 빌드 실패 시 종료 불가 |
| `subagent-dod.sh` | 서브에이전트 완료 기준(DoD) 검증 + 상태코드 파싱 |
| `careful-check.sh` | 리스크 스코어 기반 위험 명령 감지 (**opt-in**: `.careful` 파일 생성 시 활성화) |

`careful-check.sh` 활성화:
```bash
touch .careful   # 프로젝트 루트에 생성 → 리스크 스코어 40+ 시 확인 요청
```

---

## 에이전트 5종

"이 작업을 A-Team으로 처리해줘" → orchestrator가 자동 분배

| 에이전트 | 역할 | 모델 |
|---------|------|------|
| orchestrator | 총괄 (계획→배분→취합) | Sonnet |
| researcher | 조사 전문 (읽기만, 코드 수정 금지) | Haiku |
| coder | 구현/수정 | Sonnet |
| reviewer | 품질 검증 (2-Pass: Critical→Informational) | Sonnet |
| architect | 설계/아키텍처 | Opus |

모든 에이전트 상태코드 표준화: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`

---

## 구성 문서

| 파일 | 내용 |
|------|------|
| [`PROTOCOL.md`](PROTOCOL.md) | 전체 문서 맵 + 7단계 프로토콜 |
| [`governance/rules/preamble.md`](governance/rules/preamble.md) | 공통 원칙 단일 파일 (상태코드 + 6가지 자동결정 원칙) |
| [`docs/commands/README.md`](docs/commands/README.md) | 슬래시 커맨드 상세 목록 |
| [`docs/commands/CHANGELOG.md`](docs/commands/CHANGELOG.md) | 커맨드 변경 이력 |
| [`docs/08-orchestration-patterns.md`](docs/08-orchestration-patterns.md) | TAO루프 / Supervisor / Swarm 패턴 |
| [`docs/12-harness-engineering.md`](docs/12-harness-engineering.md) | 훅/안전장치 상세 |

### 템플릿

| 파일 | 용도 |
|------|------|
| [`templates/init.sh`](templates/init.sh) | 통합 프로젝트 초기화 (Harness + 25개 커맨드 포함) |
| [`templates/settings.json`](templates/settings.json) | Claude Code 설정 템플릿 |
| [`templates/PARALLEL_PLAN.md`](templates/PARALLEL_PLAN.md) | 병렬 태스크 플랜 템플릿 |

---

## 설계 철학

1. **에이전트가 에이전트를 만든다** — 리더가 서브에이전트를 동적 조율
2. **파일 기반 통신** — Zero dependency, 원자적 쓰기로 경합 없음
3. **수치 없는 판단 금지** — benchmark/doc-sync/adversarial 모두 점수화
4. **상태코드 기반 에스컬레이션** — BLOCKED 수신 시 자동 차단, 사람에게 위임
5. **6가지 자동 결정 원칙** — 완전성/보이는건고친다/실용적/DRY/명시적/행동편향

---

## ClawTeam 추가 (선택)

ClawTeam은 각 에이전트를 독립 tmux 세션 + git worktree에서 실행합니다.
단순 멀티에이전트 협업에는 Claude Code 서브에이전트 모드로 충분합니다.

```bash
pip install clawteam        # Python 3.10+, tmux, git 필요
clawteam team spawn-team my-team -n leader
clawteam spawn --team my-team --agent-name worker1 --task "인증 모듈 구현"
clawteam board attach my-team
```
