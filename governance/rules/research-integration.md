# Research Integration — Researcher 결과 컨텍스트 통합 규칙

> SSOT: researcher 에이전트 결과를 메인 컨텍스트에 효율적으로 통합하는 방법론

## 원칙

1. **요약만 흡수** — 전체 리서치 결과를 컨텍스트에 붓지 않는다. 핵심 인사이트 3-5줄로 요약.
2. **액션 연결** — 모든 리서치 결과는 구체적 Next Action과 연결된다.
3. **중복 방지** — 이미 MEMORY.md나 CURRENT.md에 있는 정보 재수집 금지.

## 통합 패턴

### Researcher → Orchestrator
```
researcher 결과 수신 후:
1. insights[] 추출 → 3줄 이내 요약
2. action_items[] → CURRENT.md Next Tasks에 추가
3. references[] → memory/research-refs.md에 저장 (컨텍스트 비우기)
```

### 중복 방지 체크
```bash
grep -i "키워드" memory/MEMORY.md ~/.claude/memory/MEMORY.md 2>/dev/null | head -3
```
이미 있으면 리서치 생략 → 기존 내용 활용.

## Trigger 조건
- researcher 에이전트 호출 결과 수신 시
- `/autoresearch` 완료 시
- 외부 API/문서 조회 결과를 컨텍스트에 통합할 때

---
**Last updated**: 2026-06-04
