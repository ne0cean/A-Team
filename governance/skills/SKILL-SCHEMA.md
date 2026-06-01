# SKILL-SCHEMA — 스킬 메타데이터 표준

> Paperclip Phase 4 흡수 (2026-06-01)
> 목적: `.claude/agents/`, `.claude/commands/`, `governance/skills/` 전체에 일관된 메타데이터 표준 적용

## Frontmatter 표준 (에이전트 파일)

```yaml
---
name: <slug>
description: <한 줄 설명>
tools: Read, Bash, Glob, Grep
model: sonnet
# 선택 필드 (SKILL-INDEX 자동 파싱용)
category: engineering | operations | marketing | design | intelligence | governance
trigger: manual | auto | hook
complexity: low | medium | high
---
```

## Frontmatter 표준 (커맨드 파일)

```yaml
---
description: /커맨드명 — 한 줄 설명
# 선택 필드
category: engineering | operations | marketing | design | intelligence | governance
complexity: low | medium | high
---
```

## Category 정의

| 카테고리 | 설명 | 예시 |
|---------|------|------|
| `engineering` | 코드 작성, 리뷰, 빌드, 테스트 | coder, tdd, reviewer, benchmark |
| `operations` | 배포, 모니터링, 인프라, 세션 관리 | vibe, pickup, end, zzz, incident |
| `marketing` | 콘텐츠, SNS, 발행, 분석 | marketing-generate, card-news |
| `design` | UI/UX, 디자인 감사, 비주얼 | design-auditor, designer |
| `intelligence` | 시장 조사, 경쟁사, 페르소나 | intel, researcher |
| `governance` | 규칙, 거버넌스, 보안, M&A | cso, adversarial, legal-check, dd |

## Complexity 정의

| 레벨 | 기준 |
|------|------|
| `low` | 단일 작업, 1-2분 완료, 단순 파일 읽기/쓰기 |
| `medium` | 2-5개 파일, 5-15분, 에이전트 1-2개 |
| `high` | 멀티에이전트, 15분+, 외부 호출, 복잡한 판단 |

## Trigger 정의

| 트리거 | 설명 |
|--------|------|
| `manual` | 사용자가 직접 호출 (`/커맨드` 또는 키워드) |
| `auto` | 패턴 감지 시 CLAUDE.md 자동 제안 |
| `hook` | PostToolUse/PreToolUse/Stop 훅으로 자동 실행 |

## verify-skill-index.mjs 검증 규칙

1. `.claude/agents/*.md` — `name:` 필드 존재 확인
2. `.claude/commands/*.md` — `description:` 필드 존재 확인
3. `governance/skills/SKILL-INDEX.md` — 모든 agents + commands 등록 여부
4. 미등록 파일 → drift 보고
5. category/complexity 미기재 → warning (error 아님)
