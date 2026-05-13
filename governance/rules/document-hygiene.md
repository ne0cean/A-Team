# Document Hygiene — 문서 비대화 방지 규칙

> 모든 문서는 작은 단위로 쪼개져서 필요 시에만 로드. 퍼포먼스 손실 0.

## 원칙

1. **즉시 로드 파일은 작게** — 매 세션 자동 로드되는 파일(CURRENT.md, CLAUDE.md)은 200줄 이하
2. **On-demand 트리거링** — 상세 가이드는 별도 파일, 필요할 때만 Read
3. **완료 항목 즉시 이관** — `[x]` 체크리스트는 SESSIONS.md로 이동, CURRENT.md에 잔류 금지
4. **퍼포먼스 = 토큰** — 불필요한 문서 로드 = 돈 낭비 + 품질 저하 (Dumb Zone 진입 가속)

## 상한선

| 파일 유형 | 상한 | 위반 시 |
|-----------|------|---------|
| CURRENT.md | 200줄 | Last Completions 2주 초과분 → SESSIONS.md 이관 |
| CLAUDE.md | 200줄 | 상세 → governance/rules/ 참조 링크 |
| 커맨드 (.claude/commands/) | 1200 words | 핵심만 남기고 → governance/skills/{name}/detail.md |
| 에이전트 (.claude/agents/) | 1500 words | orchestrator만 예외. 나머지 → governance/ 참조 |
| Governance rules | 1500 words | 분할 또는 on-demand Read |

## On-demand 패턴

```markdown
# 나쁜 예 (커맨드에 800줄 인라인)
Step 3: 다음 가이드를 따라 실행...
(200줄 상세 설명)

# 좋은 예 (핵심 + 참조)
Step 3: `Read governance/skills/autoresearch/eval-guide.md` 후 실행
```

## 검증 시점

- `/pmi` Phase 4 — 메이저 통합 후 자동 체크
- `/end` — CURRENT.md 줄 수 확인 (200줄 초과 시 경고)
- `/cold-review` — 월간 전체 문서 크기 감사

## CURRENT.md 위생

- Last Completions: 최근 2주만 유지
- `[x]` 완료 항목: 즉시 삭제 (SESSIONS.md에 기록됨)
- 완료 Phase: 1줄 요약으로 축약
- 완료된 설계 제안: 삭제 (설계 문서 자체가 아카이브)
