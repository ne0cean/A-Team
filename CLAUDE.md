# A-Team — Claude Code 핵심 규칙

> 프로젝트 컨텍스트·커맨드 목록: **AGENTS.md** | 상세 규칙: **governance/rules/** (TRIGGER-INDEX.md 온디맨드)

## 데이터 보호 (절대 금지)
`cortex/areas/life/ritual-routine/` 파일 전체 replace·삭제 금지. 수정 전 .bak 필수.
YYYY-MM.json / standing-orders.json / day-frames.json / vision-roadmap.json — 덮어쓰기 금지.

## 세션 진입 (의무)
- `/vibe`: 신규 | `/pickup`: 재개 | `/zzz`: 자율모드 | `/resume`: 리셋 후 재개
- RESUME.md dirty 또는 git dirty → `/pickup` 자동 분기

## 사용자 메시지 전량 응답 의무
모든 메시지 acknowledge 필수. 작업 중이라도 "처리 예정" 명시 후 완료까지 추적.
메시지 무시 = Truth Contract 위반과 동급.

## TodoWrite 의무
새 지시 수신 즉시 pending 추가. in_progress 정확히 1개.
"완료" 기준 미충족(테스트 실패·부분 구현·미해결 에러) = completed 불가.

## Task AC 의무
수정 파일 2개+ / "추가·수정·마이그레이션·동기화" 패턴 → 구현 전 AC 작성 필수.
AC를 `~/.claude/current-task-ac.txt`에 저장 → ac-verifier hook이 자동 차단.
VERIFY CMD 실행 후 모든 [ ] → [x] 전환 후에만 완료 선언. 상세: `governance/rules/task-ac.md`

## 진실 계약 (상시)
"완료/push/실행" = tool output 확인 후에만. 말로만 예고 금지.
의심 시 `/vigil` 로 교차 검증. 상세: `governance/rules/truth-contract.md`

## 모델 적정성 (매 요청 후)
Opus 조건: 신규 아키텍처 / 3개+ 옵션 비교 / 5개+ 파일 강한 의존성
그 외 → 첫 줄: "Sonnet으로 충분. 전환할까요?" 상세: `governance/rules/model-allocation.md`
서브태스크 요약/번역/포맷 → `llm "질문"` (Groq 70B 무료). 코드·보안·설계는 Anthropic만.

## 자율 모드
"자동/밤새/ralph/풀자동" → `governance/rules/autonomous-loop.md` 먼저 Read.
"auto-pilot/자율주행/끝까지 알아서" → `governance/rules/auto-pilot.md` 먼저 Read.

## 빌드 완료 시 품질 게이트
변경 3+ 파일 → Haiku adversarial 자동. 보안 패턴 → CSO mini-scan.
상세: `governance/rules/quality-pipeline.md`

## 슬래시 커맨드 Analytics 의무
모든 슬래시 커맨드 첫 번째 액션: Analytics 로깅 (`node scripts/log-event.mjs command_start name=X`) 스킵 금지.
커맨드 파일에 `Analytics:` 라인 있으면 **무조건 먼저 실행**. 슬래시 커맨드 게이트 hook이 자동 주입.

## UI 배포 완료 선언 조건
`wrangler deploy` 완료 후: ui-inspector 에이전트 또는 브라우저 스크린샷으로 시각 확인 필수.
curl 200 / ok:true = 완료 증거 아님. 화면에 기능이 작동해야 완료.

## 마이그레이션 완료 조건 (절대 원칙)
`migrate-onenote-html.mjs --apply` 실행 후 반드시: `node scripts/verify-migration.mjs`
verify PASS 후에만 "완료" 선언 가능. fetch 완료 ≠ migration 완료.
SECTION_MAP 미포함 섹션은 무음 스킵 — 신규 소스 섹션 추가 시 SECTION_MAP coverage 먼저 확인.

## 원본 소스 참조 의무 (마이그레이션/복원)
"마이그레이션/가져와/복원/이전" 작업: 원본 소스 파일 반드시 읽은 후 작업 시작.
원본 미확인 상태 배포 = Truth Contract 위반.

## 커맨드 자동 제안
작업 패턴 감지 시 1줄 제안. 전체 테이블: **AGENTS.md** (이 파일에 넣지 말 것).
Autoresearch shadow: tracked 커맨드 완료 후 `.autoresearch/_shadow/<name>/log.jsonl` 조용히 로깅.
