# 글로벌 슬래시 명령어 관리

`~/.claude/commands/`에 설치되는 전역 명령어 목록입니다.
`project-scaffold.sh` 실행 시 자동 설치됩니다.

---

## 명령어 목록

### 세션 관리
| 명령어 | 파일 | 설명 |
|--------|------|------|
| `/vibe` | `vibe.md` | 세션 시작 — A-Team 업데이트 확인 → 컨텍스트 로드 → 즉시 실행 |
| `/end` | `end.md` | 세션 종료 — CURRENT.md 갱신 → 빌드 검증 → 커밋 |
| `/pickup` | `pickup.md` | 토큰 소진 후 작업 재개 |
| `/handoff` | `handoff.md` | 모델 전환 핸드오프 |
| `/retro` | `retro.md` | 주기적 회고 보고서 (git 기반 분석) |

### 개발 워크플로우
| 명령어 | 파일 | 설명 |
|--------|------|------|
| `/investigate` | `investigate.md` | 체계적 근본 원인 분석 — 버그 디버깅 전용 |
| `/review` | `review.md` | 수동 Pre-Landing 7단계 리뷰 파이프라인 |
| `/ship` | `ship.md` | PR 생성 전 완전 검증 파이프라인 |
| `/land` | `land.md` | 배포 후 신뢰도 검증 — 헬스체크 + 스모크 테스트 |
| `/adversarial` | `adversarial.md` | 공격자 시각 4관점 적대적 코드 리뷰 |
| `/cso` | `cso.md` | OWASP + STRIDE 보안 감사 (read-only) |
| `/benchmark` | `benchmark.md` | 성능 기준선 시스템 — 회귀 자동 감지 |
| `/doc-sync` | `doc-sync.md` | 문서 Drift 감지 & 동기화 |
| `/browse` | `browse.md` | 브라우저 자동화 — ARIA @ref 기반 (browse 바이너리 필요) |
| `/qa` | `qa.md` | 8카테고리 웹앱 QA + 헬스 스코어 (browse 바이너리 필요) |

### 훅 (자동 실행)
| 훅 | 파일 | 설명 |
|---|---|---|
| careful-check | `careful-check.sh` | 리스크 스코어 기반 위험 명령 감지 (opt-in: `.careful` 파일) |

### 계획 & 설계
| 명령어 | 파일 | 설명 |
|--------|------|------|
| `/office-hours` | `office-hours.md` | 아이디어 검증 & 설계 발견 (코드 전 단계) |
| `/autoplan` | `autoplan.md` | CEO→디자인→엔지니어링 자동 검토 파이프라인 |
| `/plan-ceo` | `plan-ceo.md` | CEO 시각 전략/범위/리스크 검토 |
| `/plan-eng` | `plan-eng.md` | 아키텍처/테스트/성능/보안 엔지니어링 검토 |

### 프로젝트 관리
| 명령어 | 파일 | 설명 |
|--------|------|------|
| `/prjt` | `prjt.md` | 전체 프로젝트 현황 조회 |
| `/repos` | `repos.md` | GitHub 레포 목록 조회 |
| `/todo` | `todo.md` | 빠른 메모 관리 |
| `/sync` | `sync.md` | Auto-Sync 데몬 관리 |
| `/re` | `re.md` | Research Mode 관리 |

---

## `/vibe` 상세

**목적**: 세션 시작 원스톱 커맨드. 컨텍스트 탑재 후 즉시 작업 실행.

**실행 순서**:
0. A-Team 레포 업데이트 확인 (새 커밋 있으면 pull)
1. `.context/CURRENT.md` + `DECISIONS.md` + `memory/MEMORY.md` 정독
2. `git status` + `git log --oneline -5`로 중단점 파악
3. `.research/notes/` 새 노트 확인 및 브리핑 (없으면 스킵)
4. 한 문장 브리핑 후 즉시 실행

**자율 작업 원칙**: 읽기/탐색은 승인 없이 진행, 분석→수정→검증 묶어서 실행

---

## `/end` 상세

**목적**: 세션 종료 체크리스트. 문서 갱신 → 빌드 → 커밋.

**실행 순서**:
1. `CURRENT.md` 4개 섹션 갱신 (In Progress / Last Completions / Next Tasks / Blockers)
2. `SESSIONS.md` 로그 추가
3. 프로젝트 빌드 검증
4. NOW/NEXT/BLOCK 형식 커밋
5. 프론트엔드 작업 시 URL 보고
6. (선택) Research Mode 데몬 시작 여부 확인

---

## 버전 관리

명령어 변경 시 `CHANGELOG.md`에 기록하고 커밋하세요.
버전 형식: `vYYYY-MM-DD`
