---
description: 세션 종료 — 상태 갱신, 빌드 검증, 커밋, push (+ 선택: Research Mode)
---

다음 순서대로 세션을 마무리합니다.

## Step 1 — CURRENT.md 갱신
`.context/CURRENT.md`를 갱신한다 (없으면 스킵):
- `In Progress Files` → `(없음)` 으로 비우기
- `Last Completions` → 방금 완료한 작업 추가 (날짜 포함)
- `Next Tasks` → 다음 할 일 업데이트
- `Blockers` → 현재 막힌 점 기록

## Step 2 — SESSIONS.md 로그 추가
`.context/SESSIONS.md`에 오늘 세션 항목 추가 (없으면 스킵):
```
## [YYYY-MM-DD] 세션 제목

**완료**: ...
**이슈**: ...
**빌드**: ✅/❌
```

## Step 3 — 빌드 검증
프로젝트 타입을 자동 감지하여 실행:
```bash
[ -f package.json ]   && npm run build
[ -f Cargo.toml ]     && cargo test
[ -f pyproject.toml ] && pytest
[ -f go.mod ]         && go test ./...
[ -f Makefile ]       && make test
```
빌드 스크립트 없으면 eslint / tsc --noEmit 등 정적 분석 실행.
빌드 실패 시 → 수정 후 재시도 (최대 2회). 2회 실패 시 BLOCK에 기록 후 계속 진행.

## Step 3.5 — 세션 데이터 저장 (자동)
세션 중 발견된 학습/비용/사용 데이터를 자동 저장:
- **Learnings**: 세션 중 발견한 pattern/pitfall이 있으면 `lib/learnings.ts` logLearning()으로 기록
- **Cost + Analytics 통합**: 세션 비용 요약을 analytics에도 기록 (`lib/cost-tracker.ts` getSummary() → `lib/analytics.ts` logEvent() with event='session_cost'):
  ```
  summary = costTracker.getSummary()
  logEvent({ skill: 'session', event: 'session_cost', repo: projectSlug,
    totalCostUsd: summary.totalCostUsd, callCount: summary.callCount,
    preCheckSkipRate: summary.preCheckSkipRate,
    advisorCallAvg: summary.advisorCallAvg, cacheHitRate: summary.cacheHitRate }, analyticsFile)
  ```
- **Analytics**: 사용한 스킬 목록을 `lib/analytics.ts` logEvent()로 기록
- **Evals**: 세션 중 테스트/빌드 결과가 있으면 `lib/eval-store.ts` save()로 저장 (다음 세션에서 비교 가능)

## Step 3.7 — Post-Integration 검사 (자동)
이 세션 중 `lib/*.ts`, `.claude/agents/*.md`, `governance/` 에 새 파일이 생성되었는지 확인:
```bash
git diff --cached --name-only --diff-filter=A 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' || true
git diff --name-only --diff-filter=A 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' || true
```
감지되면: PIOP Phase 1 (Integration Map) 실행.
- 미연결 항목 발견 시: 즉시 Phase 2 연결 수행 (빌드 검증 포함)
- 또는 복잡하면: CURRENT.md의 Next Tasks에 `/optimize` TODO 등록

## Step 4 — 커밋
빌드 성공 시 커밋:
```
[type]: 요약

NOW: 방금 완료한 것
NEXT: 다음 할 일
BLOCK: 막힌 점 (없으면 없음)
```

## Step 5 — 시각적 검증 (프론트엔드 작업 시)
프론트엔드 파일 수정 있으면:
- 로컬 개발 서버 URL 제공 (예: http://localhost:5173)
- 프로덕션 URL 보고 (있으면)

## Step 6 — 원격 Push
커밋이 있으면 **항상 즉시 실행**:
```bash
git push origin main
```

## Step 7 — (선택) Research Mode
자리를 오래 비울 예정이면 "Research Mode를 시작할까요?" 질문.
원하면: `/re start`
