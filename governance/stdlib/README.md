# governance/stdlib — A-Team 코딩 컨벤션 라이브러리

> ralph-claude-code specs/stdlib 패턴 흡수 (ralph C, 2026-06-01)
> 목적: A-Team 전체에서 일관된 코딩 표준을 단일 위치에서 참조

## 인덱스

| 파일 | 내용 |
|------|------|
| [agent-patterns.md](agent-patterns.md) | 에이전트 파일 작성 표준 (slug, frontmatter, 출력 형식) |
| [commit-format.md](commit-format.md) | 커밋 메시지 포맷 (type, NOW/NEXT/BLOCK) |
| [error-handling.md](error-handling.md) | 에러/상태 처리 패턴 (BLOCKED, NEEDS_CONTEXT, DONE) |

## 사용 방법

새 에이전트/커맨드/스크립트를 작성할 때 이 디렉토리의 표준을 따른다.
`/pmi` 실행 시 stdlib 준수 여부를 점검 항목에 포함한다.

## 관련 파일

- 에이전트 목록: `.claude/agents/`
- 커맨드 목록: `.claude/commands/`
- 스킬 인덱스: `governance/skills/SKILL-INDEX.md`
