# 🏗️ A-Team 브리핑 — 사용자 가이드

AI 에이전트를 팀처럼 조직해서 프로젝트를 수행하는 프레임워크입니다.
혼자 일하든 여러 에이전트를 돌리든, 이 툴킷이 품질 보장 + 맥락 보존 + 안전 장치를 제공합니다.

---

## 📌 핵심 3가지

| 기능 | 하는 일 | 당신이 할 것 |
|------|---------|------------|
| **Harness** | AI가 위험한 명령 실행 차단, 빌드 안 되면 세션 종료 불가 | 아무것도 안 해도 자동 작동 |
| **Context** | 세션 간 상태 보존 (`.context/CURRENT.md`) | `/vibe`로 시작, `/end`로 닫기 |
| **커맨드** | 아이디어→계획→구현→검증→배포 전 사이클 커버 | 아래 워크플로우 참고 |

---

## 🚀 자주 쓸 명령어

```bash
# 새 프로젝트 시작 (모든 것을 한 방에 설치)
bash A-Team/templates/init.sh my-project ./A-Team

# 세션 관리
/vibe    # 세션 시작 — 컨텍스트 로드 + 중단점 파악 + 즉시 실행
/end     # 세션 종료 — CURRENT.md 갱신 → 빌드 검증 → 커밋

# TODO 관리
/todo                                            # 대기 목록 보기
bash A-Team/scripts/todo.sh add "기능 구현" "프로젝트명"
bash A-Team/scripts/todo.sh done "기능 구현"

# 프로젝트 현황
/prjt    # 프로젝트별 요약

# 모델 전환 (토큰 한도 도달 시)
/handoff    # 현재 맥락 저장 + 새 AI 전달용 프롬프트 생성
```

---

## 🔄 전체 워크플로우

```
아이디어    →  /office-hours          전제 검증, 범위 발견
계획 검증   →  /plan-ceo → /plan-eng → /autoplan
구현        →  orchestrator           A-Team 멀티에이전트 조율
디버깅      →  /investigate           근본 원인 분석 (버그 전용)
브라우저    →  /browse → /qa          헤드리스 자동화 + 8카테고리 QA
성능        →  /benchmark             도구 자동감지, 기준선 추적
보안        →  /adversarial → /cso    4관점 적대적 + OWASP/STRIDE
문서        →  /doc-sync              Drift Score 측정 + 자동 수정
PR          →  /review → /ship        수동 사전검토 + 자동 검증 파이프라인
배포 검증   →  /land                  헬스체크 + 스모크 + 롤백 준비도
회고        →  /retro                 git 기반 주기적 분석
```

---

## 🛡️ 자동 안전 장치

`.claude/hooks/`에 설치된 훅이 항상 자동 실행됩니다:

| 훅 | 역할 |
|----|------|
| `pre-bash.sh` | `rm -rf *`, `git push --force` 등 위험 명령 즉시 차단 |
| `pre-write.sh` | `.env`, SSH 키, git 내부 파일 수정 차단 |
| `stop-check.sh` | 세션 종료 전 빌드 검증 — 빌드 실패 시 종료 불가 |
| `subagent-dod.sh` | 서브에이전트 완료 기준(DoD) 검증 + BLOCKED 자동 차단 |
| `careful-check.sh` | 리스크 스코어 기반 위험 명령 감지 (**opt-in**) |

`careful-check.sh` 활성화:
```bash
touch .careful   # 프로젝트 루트에 생성 — 리스크 40+ 시 확인 요청
```

---

## 🤖 에이전트 5종

**"이 작업을 A-Team으로 처리해줘"** → orchestrator가 알아서 분배

| 에이전트 | 역할 | 모델 |
|---------|------|------|
| orchestrator | 총괄 (계획→배분→취합) | Sonnet |
| researcher | 조사 전문 (읽기만, 저비용) | Haiku |
| coder | 구현/수정 | Sonnet |
| reviewer | 품질 검증 (2-Pass: Critical→Informational) | Sonnet |
| architect | 설계/아키텍처 | Opus |

모든 에이전트 공통 상태코드: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`

---

## 📂 문서 구조

| 상황 | 읽을 문서 |
|------|---------|
| 전체 워크플로우 이해 | `PROTOCOL.md` (7단계 프로세스) |
| 커맨드 상세 목록 | `docs/commands/README.md` |
| 커맨드 변경 이력 | `docs/commands/CHANGELOG.md` |
| 에이전트 역할 분담 | `docs/01 ~ docs/04` |
| 병렬 작업 설계 | `docs/08` (오케스트레이션 패턴) |
| 훅/안전장치 상세 | `docs/12` (하네스 엔지니어링) |
| 맥락 보존 원리 | `docs/13` (Context Mirror 프로토콜) |
| 폰에서 개발하기 | `docs/14` (모바일 개발 가이드) |
| 공통 원칙 단일 소스 | `governance/rules/preamble.md` |

---

## 💡 한 줄 요약

> **A-Team = "에이전트가 망치지 않게 (Harness) + 맥락을 잃지 않게 (Context) + 전 사이클을 커버하는 25개 커맨드"**
