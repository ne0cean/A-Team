# Commit Format — 커밋 메시지 표준

## 기본 형식

```
[type]: 요약 (50자 이내)

NOW: 이번에 한 것
NEXT: 다음에 할 것
BLOCK: 막힌 것 (있으면)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Type 목록

| type | 언제 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `docs` | 문서만 변경 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정/도구 변경 |
| `governance` | 거버넌스/규칙 문서 변경 |
| `auto` | 자율 모드 자동 커밋 |

## 예시

```
feat: /dd M&A 6단계 실사 커맨드 추가

NOW: 6단계 워크플로우 (line-by-line→시너지→레드팀→tech DD→보안→이사회),
     fast-track 규칙, VERDICT.md 생성, 보안 주의사항 섹션
NEXT: dd-analyzer + cherry-pick-planner 에이전트 생성
BLOCK: 없음

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## 자율 모드 커밋

`/zzz` 또는 `/ralph` 모드에서 자동 생성:

```
auto: [iteration N] <작업 요약>

NOW: 자율 루프 N회차 — [완료 항목]
NEXT: [다음 계획]

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 금지 패턴

```
❌ "fix stuff"               — 너무 막연
❌ "updated files"           — 무엇을?
❌ "WIP"                     — push 전 squash 필수
❌ 50자 초과 요약             — 본문에 넣기
❌ Co-Author 없이 Claude 작업 — 항상 포함
```
