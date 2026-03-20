# 글로벌 슬래시 명령어 관리

`~/.claude/commands/`에 설치되는 전역 명령어 목록입니다.
`project-scaffold.sh` 실행 시 자동 설치됩니다.

---

## 명령어 목록

| 명령어 | 파일 | 설명 |
|--------|------|------|
| `/vibe` | `vibe.md` | 세션 시작 — A-Team 업데이트 확인 → 컨텍스트 로드 → 즉시 실행 |
| `/end` | `end.md` | 세션 종료 — CURRENT.md 갱신 → 빌드 검증 → 커밋 |
| `/prjt` | `prjt.md` | 전체 프로젝트 현황 조회 |
| `/repos` | `repos.md` | GitHub 레포 목록 조회 |
| `/todo` | `todo.md` | 빠른 메모 관리 |

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
