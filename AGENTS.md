# A-Team — 글로벌 AI 툴킷

모든 프로젝트에서 끌어다 쓰는 글로벌 툴킷. 특정 프로젝트에 종속되지 않는 독립 레포.

- **원본 레포**: `~/Projects/a-team` (canonical)
- **GitHub**: https://github.com/ne0cean/A-Team
- **프로젝트별 사본**: `{project}/A-Team` (서브디렉토리로 참조)
- **현재 상태**: `.context/CURRENT.md` 항상 최신

## 주요 디렉토리

- `.claude/commands/` — 슬래시 커맨드 원본 (70+개)
- `.context/` — CURRENT.md (작업 상태), SESSIONS.md (이력), DECISIONS.md
- `governance/` — 규칙/워크플로우/스킬
- `scripts/` — 자동화 스크립트
- `templates/` — 신규 프로젝트 스캐폴드
- `docs/` — 레슨런드 (docs/INDEX.md로 on-demand 참조)
- `lib/` — 공유 TypeScript 라이브러리
- `test/` — Vitest 테스트 (531 PASS 유지)

## 작업 원칙

- 변경사항은 반드시 이 레포에서 작업 후 push
- 프로젝트 사본에서 작업한 경우 즉시 push → 원본 pull로 동기화
- 명령어 배포: `bash scripts/install-commands.sh` → `~/.claude/commands/`

## 완성 선언 규칙

"완성됐습니다", "구현 완료", "done" 등 완료 선언은 반드시 테스트 증거를 첨부해야 한다.

| 상황 | 최소 요건 |
|------|-----------|
| 기존 테스트 있음 | 테스트 실행 후 결과(pass/fail 수) 첨부 |
| 새 로직 추가 | 핵심 케이스 테스트 1개 이상 추가 + 실행 결과 첨부 |
| 리팩토링 | 기존 테스트 실행 결과 첨부 |
| 스크립트/설정 변경 | 실행 결과 또는 검증 커맨드 출력 첨부 |

예외: 테스트가 구조적으로 불가한 경우 → "테스트 없음, 이유: ___" 명시 필수.

## Available Commands

세션/워크플로우 관리: `vibe`, `pickup`, `end`, `zzz`, `resume`, `rc`

기획/설계: `office-hours`, `prd`, `blueprint`, `plan-ceo`, `plan-eng`, `prioritize`, `intel`, `thinking-partner`

구현/품질: `tdd`, `investigate`, `cso`, `pmi`, `review`, `ship`, `benchmark`, `adversarial`, `craft`, `land`

마케팅/콘텐츠: `marketing`, `marketing-generate`, `marketing-social`, `marketing-publish`, `marketing-repurpose`, `card-news`, `yt`, `intel`

디자인: `design-audit`, `design-brief`, `design-generate`, `design-score`, `design-thumbnail`, `ppt`, `frontend-design`

운영/관리: `okr`, `incident`, `insights`, `retro`, `board`, `legal-check`, `daily-brief`, `dashboard`, `capability`

A-Team 관리: `absorb`, `improve`, `cold-review`, `autoresearch`, `doc-sync`

커맨드 상세: `.claude/commands/<name>.md` 참조.

## 현재 Phase

- Phase 0-2 완료 (메타 인프라 + BI + 인텔리전스)
- Phase 1 BI 진입 가능
- 인프라 모라토리엄 중 — 제품 출시 전 새 커맨드/에이전트 빌드 금지
- 상세: `.context/CURRENT.md`
