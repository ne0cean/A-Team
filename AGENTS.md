# A-Team — 글로벌 AI 툴킷

모든 프로젝트에서 끌어다 쓰는 글로벌 툴킷. 특정 프로젝트에 종속되지 않는 독립 레포.

- **원본 레포**: GitHub `https://github.com/ne0cean/A-Team` (canonical)
- **GitLab 프로젝트**: 각 프로젝트의 로컬 사본만 갱신, `A-Team` 본진은 옮기지 않음
- **프로젝트별 사본**: `{project}/A-Team` (서브디렉토리로 참조)
- **현재 상태**: `.context/CURRENT.md` 항상 최신

## 주요 디렉토리

- `.claude/commands/` — 슬래시 커맨드 원본 (74개)
- `.context/` — CURRENT.md (작업 상태), SESSIONS.md (이력), DECISIONS.md
- `governance/` — 규칙/워크플로우/스킬
- `scripts/` — 자동화 스크립트
- `templates/` — 신규 프로젝트 스캐폴드
- `docs/` — 레슨런드 (docs/INDEX.md로 on-demand 참조)
- `lib/` — 공유 TypeScript 라이브러리
- `test/` — Vitest 테스트

## 작업 원칙

- `A-Team` 본진은 GitHub 유지, GitLab-only 프로젝트가 있어도 본진을 옮기지 않는다.
- GitLab 프로젝트는 프로젝트 원격을 그대로 유지하고, `A-Team`은 로컬 사본으로 소비한다.
- 변경사항은 반드시 이 레포에서 작업 후 push
- 프로젝트 사본에서 작업한 경우 즉시 push → 원본 pull로 동기화
- 명령어 배포: `bash scripts/install-commands.sh` → `~/.claude/commands/`

## 완성 선언 규칙

완료 선언("완성됐습니다", "done" 등)은 반드시 테스트 증거를 첨부해야 한다.

| 상황 | 최소 요건 |
|------|-----------|
| 기존 테스트 있음 | 테스트 실행 후 결과(pass/fail 수) 첨부 |
| 새 로직 추가 | 핵심 케이스 테스트 1개 이상 추가 + 실행 결과 첨부 |
| 리팩토링 | 기존 테스트 실행 결과 첨부 |
| 스크립트/설정 변경 | 실행 결과 또는 검증 커맨드 출력 첨부 |

예외: 테스트가 구조적으로 불가한 경우 → "테스트 없음, 이유: ___" 명시 필수.

<!-- AUTO-GENERATED: do not edit below this line -->

## Available Commands

### 세션/워크플로우
- `vibe` — 세션 시작 — 컨텍스트 로드 + 태스크 분류 + 즉시 실행
- `pickup` — 세션 재개 기본 진입점 — 상황 자동 감지 후 경량 복구 또는 /vibe 분기
- `end` — 세션 종료 — 상태 갱신, 빌드 검증, 커밋, push (+ 선택: Research Mode)
- `zzz` — 풀 오토 수면 모드 (하던 작업을 이어서 계속, 토큰 리셋 자동 이어받기)
- `resume` — 리셋 후 작업 재개 (시점 무관, 주간/단기 중단 대비)
- `rc` — 리모트 컨트롤 핸드오버 — 디바이스 간 작업 컨텍스트를 심리스하게 이어줍니다
- `handoff` — 모델 전환 핸드오프 — 현재 맥락을 저장하고 새 AI로 전달할 프롬프트 생성
- `sync` — Auto-Sync 데몬 관리 — 백그라운드 자동 저장/커밋 시작·정지·상태 확인
- `daily-brief` — 일간 성장 브리핑 — 외부 트렌드 크롤링 + 내부 진단 + 자동 적용

### 기획/설계
- `office-hours`
- `prd`
- `blueprint` — 에이전트/자동화 시스템 설계 문서(
- `autoplan` — 자동 계획 검토 파이프라인
- `plan-ceo`
- `plan-eng`
- `prioritize` — RICE 스코어링 기반 기능 우선순위 자동 매기기
- `intel` — 시장·사용자 인텔리전스 수집 (경쟁사/트렌드/페르소나)
- `thinking-partner` — 사고 파트너 — 복잡한 문제를 질문과 탐색으로 함께 풀어가는 대화 모드
- `webapp-prd`
- `dashboard-prd`

### 구현/품질
- `tdd` — TDD Red-Green-Refactor 루프
- `investigate`
- `cso` — Chief Security Officer 보안 감사
- `pmi`
- `review` — Pre-Landing PR 리뷰 파이프라인
- `ship`
- `benchmark` — 성능 기준선 시스템
- `adversarial` — - 적대적 코드 리뷰
- `craft`
- `land`
- `optimize` — Post-Integration Optimization (PIOP 자동 최적화 실행)
- `qa` — 웹 앱 체계적 QA 테스트
- `ralph` — Ralph Loop — Autonomous AI development with intelligent exit detection

### 마케팅/콘텐츠
- `marketing`
- `marketing-generate`
- `marketing-social`
- `marketing-publish`
- `marketing-repurpose`
- `marketing-analytics`
- `marketing-research`
- `marketing-loop`
- `card-news` — 인스타그램 카드뉴스 8장 자동 생성
- `yt`

### 디자인
- `design-audit`
- `design-brief`
- `design-generate`
- `design-score` — UI/PPT 빌드 후 품질 평가 + 학습 루프
- `design-thumbnail`
- `design-retro`
- `ppt` — 업무용 PPT 자동 생성

### 운영/관리
- `okr` — OKR/KPI 설정·추적·회고 자동화
- `incident` — 장애 감지·진단·복구 자동화
- `insights` — analytics
- `retro`
- `board` — AI 이사회 시뮬레이션
- `legal-check` — 프로젝트 법률 문서 컴플라이언스 검사
- `dashboard` — analytics
- `capability`
- `prjt`
- `issue-triage` — GitHub 이슈 트리아지 — 자동 분류, 우선순위 배정, CURRENT
- `github-review` — GitHub PR 리뷰 — 변경사항 분석 후 reviewer 에이전트 리뷰 + GitHub 코멘트 게시

### 데이터
- `excel-to-csv`
- `csv-clean`
- `data-calc`

### A-Team 관리
- `absorb` — 다른 프로젝트의 로컬 A-Team 개선사항 역류 흡수
- `improve` — 개별 프로젝트에서 A-Team 글로벌 툴킷 개선사항 등록/조회/반영
- `cold-review` — A-Team 냉철한 구조 감사
- `autoresearch` — Karpathy식 프롬프트 자동 최적화 루프
- `doc-sync` — 문서 Drift 감지 & 동기화
- `daily-review` — "[Deprecated → /daily-brief] 어제와 오늘의 변경사항 분석 + 성장 제안"
- `browse` — 브라우저 자동화
- `re` — Research Mode 관리 — 자율 리서치 에이전트 시작/정지/상태 확인

### 기타
- `repos`
- `todo`
## 현재 Phase

- 0 인프라 완료 → **Phase 1 진입 가능** (분석/BI)
- 인프라 모라토리엄 중 — 제품 출시 전 새 커맨드/에이전트 빌드 금지
- 상세: `.context/CURRENT.md`

## 타 에이전트에서 A-Team 커맨드 사용법

Claude Code가 아닌 에이전트(Codex, Gemini, Cursor 등)는 다음 방식으로 A-Team 커맨드를 활용할 수 있다.

### 세션 시작 (vibe 동등)
```
.context/CURRENT.md 파일을 읽어라.
다음 우선순위 작업을 확인하고 이어서 진행하라.
```
자연어 진입:
- `A-Team 세션 시작` → 새 세션 시작, `vibe` 동등
- `A-Team 이어서` → 재개, `pickup` 동등
- `A-Team 종료` → 종료, `end` 동등

GitLab 프로젝트에서의 세션 시작 순서:
1. GitLab 프로젝트 루트로 이동해 `git status -sb`와 `git pull --ff-only`를 먼저 실행한다.
2. 프로젝트 안에 `A-Team/` 로컬 사본이 있으면 그쪽으로 이동하고, 없으면 GitHub 본진에서 A-Team을 1회 체크아웃한다.
3. `A-Team` 루트에서 `bash scripts/vibe-init.sh`를 실행해 현재 상태와 동기화를 확인한다.
4. 그 다음 `.context/CURRENT.md`를 읽고, 필요한 커맨드 파일은 `.claude/commands/<name>.md`에서 연다.
5. 프로젝트 작업은 프로젝트 원격에, A-Team 개선은 A-Team 본진에 각각 커밋한다.

### 커맨드 실행
각 커맨드는 `.claude/commands/<name>.md`에 워크플로우가 기술되어 있다.
해당 파일을 읽고, Claude Code 전용 도구 문법(Read/Bash tool call 등)은 무시하고
**워크플로우 로직**을 네이티브 도구로 따르면 된다.

예시:
```
.claude/commands/blueprint.md 파일을 읽고 그 워크플로우대로 진행해라.
```

### 세션 종료 (end 동등)
```
.context/CURRENT.md의 상태를 업데이트하고, 변경사항을 git commit + push해라.
```

GitLab 프로젝트 세션 종료 원칙:
- 프로젝트 코드 변경은 해당 GitLab 원격으로 push한다.
- A-Team 워크플로우/커맨드/문서는 GitHub 본진으로 push한다.
- 두 저장소를 한 번에 섞지 말고, 변경 단위를 분리해서 커밋한다.

### 커맨드 파일 위치
모든 커맨드: `.claude/commands/` (이 디렉토리가 A-Team의 핵심)
