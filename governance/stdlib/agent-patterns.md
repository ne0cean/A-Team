# Agent Patterns — 에이전트 작성 표준

## Frontmatter 필수 필드

```yaml
---
name: <slug>            # kebab-case, 파일명과 일치
description: <한 줄>    # 역할 + 언제 호출 + 무엇을 반환 (3요소)
tools: Read, Bash, ...  # 필요한 최소 도구만
model: sonnet           # sonnet | opus | haiku (기본: sonnet)
---
```

## Slug 규칙

- kebab-case만 사용: `dd-analyzer`, `cherry-pick-planner`
- 동사형 금지: `analyze` (X) → `analyzer` (O)
- 접미사: 분석 = `-analyzer`, 기획 = `-planner`, 감사 = `-auditor`, 리뷰 = `-reviewer`

## Description 3요소

```
<역할>. <언제 호출>. <무엇을 반환>.
```

예:
```
DD(Due Diligence) 레포 구조 분석 에이전트.     ← 역할
/dd 커맨드 Step 1에서 호출.                    ← 언제
기술 스택, 기술부채, 커뮤니티 건강도를 정량화해 01-linebylne-report.md로 출력.  ← 반환
```

## 출력 형식 표준

에이전트는 반드시 구조화된 출력을 반환한다:

```json
{
  "status": "DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT",
  "summary": "한 줄 요약",
  "files_modified": ["경로1", "경로2"],
  "evidence": "완료 증거 (테스트 결과, 파일 확인 등)",
  "risks": ["잠재적 위험 1", "잠재적 위험 2"],
  "next_steps": ["다음 단계 1", "다음 단계 2"]
}
```

## 도구 최소화 원칙

| 작업 유형 | 최소 도구 |
|----------|----------|
| 탐색 전용 | `Read, Glob, Grep` |
| 실행 포함 | `Read, Bash, Glob, Grep` |
| 파일 생성 | `Read, Write, Edit` |
| 전체 권한 | `Read, Write, Edit, Bash, Glob, Grep` |

Bash는 시스템 명령이 필요한 경우에만. Read/Glob/Grep 먼저.

## 에이전트 책임 범위

- 에이전트는 **자신의 역할 범위**만 수행한다
- 판단 전용 에이전트: 코드 수정 금지 (adversarial, cso, reviewer, judge)
- 구현 에이전트: 빌드 검증까지 완료 후 반환 (coder, tdd)
- 리서치 에이전트: 코드 수정 금지, 구조화 결과만 반환 (researcher, architect)

## AGENT_STATUS 블록 (자율 모드)

자율 루프(`/zzz`, `/ralph`) 내에서 에이전트 완료 시 마지막 출력에 포함:

```
---AGENT_STATUS---
TASKS_COMPLETED: [완료 항목들]
FILES_MODIFIED: [수정 파일들]
TESTS_STATUS: PASS N / SKIP / UNKNOWN
WORK_TYPE: implementation | research | governance | documentation
EXIT_SIGNAL: CONTINUE | BLOCKED | DONE
RECOMMENDATION: [다음 액션 제안]
---END_STATUS---
```
