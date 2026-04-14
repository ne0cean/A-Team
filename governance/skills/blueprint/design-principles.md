# Design Principles for Agentic Systems

## Folder Structure

```
/project-root
  ├── CLAUDE.md                        # Main agent instructions
  ├── /.claude
  │   ├── /skills/<skill-name>
  │   │   ├── SKILL.md
  │   │   ├── /scripts                 # Deterministic tools
  │   │   └── /references              # (optional) domain knowledge, API guides
  │   └── /agents/<subagent-name>
  │       └── AGENT.md
  ├── /output                          # Artifacts
  └── /docs                            # (optional) reference documents
```

## Agent vs Script Responsibility

| Agent handles directly | Script handles |
|------------------------|----------------|
| Classification, decision-making, priority judgment | File I/O, data parsing |
| Quality evaluation, qualitative analysis | External API calls |
| Context-based inference | Iteration, aggregation |
| Natural language generation/summarization | Static analysis, test execution |

## Validation Patterns

Every workflow step must define success criteria. Choose validation type by output nature:

| Validation type | Applies to | Example |
|-----------------|-----------|---------|
| **Schema validation** | Structured outputs | Required fields present, type check |
| **Rule-based** | Quantitative criteria | Item count, character count, required sections |
| **LLM self-validation** | Qualitative outputs | Summary quality, tone, completeness |
| **Human review** | High-risk final outputs | External documents, decisions |

## Failure Handling

| Pattern | When to use |
|---------|-------------|
| **Auto retry** | Validation failure is simple omission/format error (specify max retries) |
| **Escalation** | High judgment uncertainty or ambiguous criteria → ask human |
| **Skip + log** | Optional step with no flow impact → record reason in log |

## Agent Structure Choice

**Single agent** (default):
- Workflow is simple and instructions are short

**Sub-agent separation** (when needed):
- Context window optimization required — instructions too long to always load
- Clearly distinct independent task blocks requiring different domain knowledge

## Sub-agent Design Rules

- CLAUDE.md (main agent) acts as orchestrator
- Sub-agents must NOT call each other directly — coordinate through main
- AGENT.md must specify: role, trigger condition, input/output, referenced skills

## Data Transfer Patterns

| Pattern | When to use |
|---------|------------|
| **File-based** | Data is large or structured → `/output/step1_result.json` |
| **Prompt inline** | Data is small and simple |

Recommendation: Store intermediate outputs in `/output/` and pass only file paths.

## Skill vs Sub-agent

| Skill | Sub-agent |
|-------|-----------|
| Tool/function unit (small) | Role/responsibility unit (large) |
| Shareable across multiple agents | Specific to one workflow |
| Examples: `file-parser`, `api-caller` | Examples: `code-reviewer`, `report-generator` |

## A-Team 커맨드 생성 표준

블루프린트로 설계된 시스템이 커맨드/에이전트를 포함한다면, 구현 단계에서 **A-Team 표준 커맨드** 형식을 따른다.

### A-Team 표준 커맨드의 규격

- **frontmatter**: `description:` 1줄 필수. Claude Code가 `Skill` tool 목록에 자동 등록
- **파일 위치**:
  - 슬래시 커맨드: `.claude/commands/<name>.md`
  - 서브에이전트: `.claude/agents/<name>.md`
- **배포**: `bash scripts/install-commands.sh` — `~/.claude/commands/`에 symlink 생성 → 모든 프로젝트에서 글로벌 호출 가능
- **Progressive disclosure**: 커맨드 본문 500줄 이내. 대용량 참조는 `governance/skills/<name>/*.md`로 분리해 on-demand 로드
- **자율 모드 준수**: 자율 루프를 포함하는 커맨드는 `governance/rules/autonomous-loop.md`의 6 강제 조항 준수를 서두에 명시

### 설계서에 포함할 내용

블루프린트 문서의 **구현 스펙 > 스킬/스크립트 목록** 또는 별도 섹션에 아래 내용을 명시:

```markdown
## A-Team 표준 커맨드 규칙

이 설계서에 정의된 모든 커맨드는 A-Team 표준 형식으로 작성할 것:
1. 파일 위치: `.claude/commands/<name>.md` (슬래시 커맨드) 또는 `.claude/agents/<name>.md` (서브에이전트)
2. frontmatter: `description:` 1줄 — Claude Code `Skill` tool 자동 등록용
3. 배포: `bash scripts/install-commands.sh` 실행으로 `~/.claude/commands/`에 symlink
4. 대용량 참조는 `governance/skills/<name>/*.md`로 분리 → on-demand 로드
5. 자율 루프 포함 시 `governance/rules/autonomous-loop.md` 6 강제 조항 준수 명시
```
