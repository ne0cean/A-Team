---
description: analytics.jsonl 집계 → 주간 인사이트 리포트 자동 생성
---

# /insights — 주간 인사이트 파이프라인

## 역할

이 커맨드는 오케스트레이터다. 아래 4단계를 순서대로 실행한다.

## Step 1: 집계 스크립트 실행

```bash
node scripts/insights-aggregate.mjs --weeks-ago 1
```

출력된 JSON을 `.context/insights/.tmp-aggregate.json`에 저장한다.

**Note**: `--weeks-ago 1`은 "지난 완료된 주"를 집계한다. 이번 주는 데이터가 부족하므로 항상 지난 주 리포트 생성.

`.context/insights/` 디렉토리가 없으면 먼저 생성:
```bash
mkdir -p .context/insights
```

## Step 2: 집계 결과 확인

`.tmp-aggregate.json`을 읽고 `total_events` 확인:
- `total_events == 0` → 계속 진행 (에이전트가 "데이터 없음" 리포트 생성)
- JSON 파싱 실패 → 에러 출력 + 종료

## Step 3: insights 서브에이전트 호출

`.claude/agents/insights.md` 에이전트를 호출한다.

입력: `.context/insights/.tmp-aggregate.json` (파일 경로 전달)
에이전트가 리포트 마크다운을 stdout으로 반환한다.

## Step 4: 리포트 저장 + 정리

1. `week` 필드에서 파일명 결정: `.context/insights/YYYY-WW-insights.md`
   - 예: `week: "2026-W18"` → `2026-W18-insights.md`
2. 리포트를 해당 파일에 저장
3. `.tmp-aggregate.json` 삭제
4. 완료 요약 3줄 출력:
   ```
   인사이트 리포트 생성 완료
   파일: .context/insights/YYYY-WW-insights.md
   이벤트 수: N건 | 패턴 플래그: M개
   ```

## 오류 처리

| 상황 | 처리 |
|------|------|
| `node scripts/insights-aggregate.mjs` 실패 | 에러 메시지 출력 + 종료 |
| `.tmp-aggregate.json` 없음 | "집계 실패 — scripts/insights-aggregate.mjs 실행 오류" 출력 + 종료 |
| 에이전트 리포트 생성 2회 실패 | fallback 리포트 저장: "데이터 불충분 — 수동 확인 필요 (YYYY-WW)" |
| 파일 저장 실패 | 에러 로그 + stdout에 리포트 전체 출력 (유실 방지) |

## 자율 모드 준수

`governance/rules/autonomous-loop.md` 강제 조항 준수. 진행 중 질문 금지.
