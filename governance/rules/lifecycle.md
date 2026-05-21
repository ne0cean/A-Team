---
trigger: 새 커맨드/에이전트 추가 시 / /cso 실행 시 / 커맨드 수 80개 초과 감지 시
keywords: lifecycle, zombie, 상한선, deprecated, 커맨드 수
---

# Command & Agent Lifecycle 규칙

## 상한선

| 자산 | 상한선 | 초과 시 |
|------|--------|---------|
| 슬래시 커맨드 (`~/.claude/commands/`) | **80개** | /cso Axis 4 CRITICAL + zombie 감사 의무 |
| 서브에이전트 (`.claude/agents/`) | **20개** | /cso 경고 |

> **조정 근거 (2026-05-21)**: 원래 60개 설정 당시 대비 기능 범위 확장 (마케팅·디자인·운영 모듈 추가).
> 커맨드는 세션 자동 로드 대상이 아니므로 토큰 직접 비용 없음. 유지보수 부담이 실제 위험.
> 현재 74개 → 80개를 새 하드 상한으로. **이사회 모라토리엄 (2026-05-13~) 기간 중 신규 추가 금지**.
> 모라토리엄 해제 시 zombie 감사 선행 후에만 추가 허용.

현재 커맨드 수 확인: `ls ~/.claude/commands/*.md | wc -l`

## 새 자산 추가 조건 (GATE)

새 커맨드 또는 에이전트 PR 전 반드시 확인:

1. **대체 대상**: "이것이 대체하거나 흡수하는 기존 자산은?" → 없으면 추가 이유 명시
2. **트리거 조건**: TRIGGER-INDEX.md에 1줄 등록 완료여야 머지 가능
3. **description**: 에이전트는 50자 이상 명확한 description 필수

## Lifecycle 상태

```
active → deprecated → archived
```

- **active**: 사용 중
- **deprecated**: 30일 이상 analytics.jsonl 호출 기록 없음 → /cso가 zombie 목록에 포함
- **archived**: deprecated 후 다음 /optimize 사이클에서 .archive/ 이동

## Zombie 커맨드 처리

/cso Axis 4에서 zombie 목록 생성 후:
1. CURRENT.md Next Tasks에 "zombie 커맨드 N건 검토" 등록
2. 사용자 confirm 후 archive 또는 부활

## 자동 체크 시점

- `/cso` 실행 시 (Axis 4)
- `/optimize --biweekly` 실행 시
- `/pmi` Phase 3 Trigger Audit 시
