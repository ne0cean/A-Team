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
