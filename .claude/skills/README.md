---
name: skills-index
description: A-Team .claude/skills/ 인덱스 — 재사용 가능한 패턴 모음
---

# A-Team Skills

에이전트가 슬래시 커맨드 없이 직접 참조하는 재사용 패턴 라이브러리.
각 스킬 파일은 독립적이며, 트리거 조건에 따라 자동 또는 수동으로 참조.

## 스킬 인덱스

| 파일 | 설명 | 주요 태그 |
|------|------|----------|
| [git-workflow.md](git-workflow.md) | A-Team 표준 git 커밋 형식 + 브랜치 전략 | git, commit |
| [agent-dispatch.md](agent-dispatch.md) | 서브에이전트 디스패치 + 프롬프트 작성 | agent, parallel |
| [task-ac-pattern.md](task-ac-pattern.md) | Task AC 작성 + VERIFY CMD + 완료 선언 | ac, quality |
| [cloudflare-deploy.md](cloudflare-deploy.md) | Cloudflare Workers/D1 배포 + 시각 검증 | cloudflare, deploy |
| [onenote-migration.md](onenote-migration.md) | OneNote HTML → Markdown 마이그레이션 | onenote, migration |
| [mcp-integration.md](mcp-integration.md) | MCP 서버 통합 + Telegram 봇 패턴 | mcp, telegram |
| [error-recovery.md](error-recovery.md) | 3계층 에러 분류 + 재시도 전략 | error, recovery |
| [context-management.md](context-management.md) | Smart/Dumb Zone + compaction + CURRENT.md | context, token |
| [quality-gate.md](quality-gate.md) | 4-Stage 검증 + CSO scan + UI 시각 검증 | quality, security |
| [analytics-logging.md](analytics-logging.md) | 슬래시 커맨드 의무 로깅 + 이벤트 타입 | analytics, events |

## 기존 스킬 (태스크 특화)

| 디렉토리 | 설명 |
|---------|------|
| [transcript-organizer/](transcript-organizer/SKILL.md) | 녹음 텍스트 자동 구조화 |
| [web-crawler-ocr/](web-crawler-ocr/) | 웹 크롤링 + OCR 처리 |

## 사용법

### 에이전트가 직접 참조

```
"git 커밋 작성 시 → skills/git-workflow.md 참조"
"서브에이전트 디스패치 시 → skills/agent-dispatch.md 참조"
"AC 작성 필요 시 → skills/task-ac-pattern.md 참조"
```

### 슬래시 커맨드에서 참조

커맨드 파일 내에서:
```markdown
**참조**: `.claude/skills/git-workflow.md`
```

### 트리거 조건 요약

| 상황 | 참조 스킬 |
|------|---------|
| 커밋 메시지 작성 | git-workflow.md |
| 파일 2개+ 수정 작업 | task-ac-pattern.md |
| 서브에이전트 호출 | agent-dispatch.md |
| Cloudflare 배포 | cloudflare-deploy.md |
| OneNote 마이그레이션 | onenote-migration.md |
| 에러 발생 | error-recovery.md |
| 컨텍스트 40% 초과 | context-management.md |
| 변경 3+ 파일 커밋 | quality-gate.md |
| 슬래시 커맨드 실행 | analytics-logging.md |

## 파일 형식

모든 스킬 파일은 frontmatter + 4개 섹션:
```
---
name / description / tags
---
# 스킬명
## 언제 사용
## 패턴
## 예시
## 주의사항
```
