# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.

## In Progress Files
(없음)

## Last Completions (2026-03-30)
- **Auto Mode 통합 + 보안 강화**
  - `scripts/daemon-utils.mjs` — `getPermissionMode()`: auto 우선, 캐시, 허용목록 검증, `buildClaudeEnv()` 위험 env 제거(NODE_OPTIONS 등 6개), `safePath()` 경계 수정
  - `scripts/ralph-daemon.mjs` — auto mode 전환 + `checkCommand` freeze (런타임 명령 주입 차단)
  - `scripts/research-daemon.mjs` — auto mode + 공유 유틸 통합 + `maybeStartRalph()` env 명시 전파
  - `scripts/dispatch.sh` — auto 기본 + 허용목록 검증 + 변수 인용 + `export CLAUDE_PERMISSION_MODE`
  - `.claude/commands/vibe.md` — Step 3.7 Auto Mode 활성화 안내
  - `governance/workflows/vibe.md` — Permission Mode 단계(Step 5) ���가
  - `/review` 적대적 리뷰: CRITICAL 2 + HIGH 3 + MEDIUM 4 전량 수정

## Previous Completions (2026-03-28)
- **Ralph Loop 자율 개발 데몬 구현** (NEW)
  - `scripts/ralph-daemon.mjs` — 5레이어 비용 최적화 (pre-check, stall detection, lean context, model tiering, budget cap)
  - `scripts/ralph-prompts.mjs` — per-iteration lean context 빌더 + AGENTS.md 학습 축적
  - `scripts/daemon-utils.mjs` — 공통 유틸 추출 (atomicWriteJSON, findClaude, safePath)
  - `.claude/commands/ralph.md` — `/ralph` 글로벌 커맨드 (start/stop/status/log/notes)
  - 별도 브랜치 안전장치 (`ralph/YYYY-MM-DD-<slug>` 자동 생성)
- **Research → Ralph 파이프라인**
  - `research-daemon.mjs` 확장: 리서치 완료 후 `ralph-state.json` pending 감지 → Ralph 자동 시작
  - `/re pipeline "task"` 원스탑 커맨드 추가
  - 리서치 노트 → Ralph 프롬프트 자동 연결
- **`/vibe` Step 3.5** — 주간 세션 시 야간 Ralph 태스크 자동 제안
- **코드 리뷰 + 최적화**: HIGH 3건 + MEDIUM 7건 + LOW 3건 전량 수정
  - atomic write (renameSync), pipeline race condition 롤백, 하드코딩 경로 제거, spawn timeout, 경로 트래버설 방지 등

## Next Tasks
- [ ] Ralph Loop 실전 테스트 (A-Team JSDoc 추가 — haiku, max 5, budget 1)
- [ ] Research → Ralph 파이프라인 e2e 테스트 (connectome 서브넷 감지)
- [ ] 멀티터미널 디스패치 실전 테스트 (2-agent dispatch → merge e2e)
- [ ] scripts/checkpoint.sh 실전 테스트 (BLOCKED 시나리오)
- [ ] orchestrator MoA 모드 실전 테스트

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
