---
mode: zzz
entered_at: 2026-04-20T12:35:16Z
completed_at: 2026-04-20T12:55:00Z
next_reset_at: 2026-04-20T17:35:16Z
contract: autonomous-loop.md v2026-04-15 (강제 조항 1-7)
narration_budget_bytes: 500
status: completed
session_goal: "계정 자동 전환 엔진을 a-team 글로벌로 이식하고 claude-remote는 얇은 PTY 어댑터로 재구성"
---

## In Progress
- [ ] Phase 1 엔진 3/4 작성 완료, trigger.mjs + install-auto-switch-cron.sh 남음

## Completed This Session
- [x] 3e51a69: /zzz·/resume 통합 + refs Quantified Constraints (425 tests PASS)
- [x] 5cc22c0: auto-switch-protocol.md 초안 (Phase 5 재작성 예정)
- [x] scripts/auto-switch/accounts-state.mjs
- [x] scripts/auto-switch/check-usage.mjs
- [x] scripts/auto-switch/swap-keychain.mjs

## Next Immediate Step
scripts/auto-switch/trigger.mjs 작성:
  1. 60s 크론 진입점 (accounts-state + check-usage + swap-keychain 조합)
  2. Telegram 알림 함수 (~/.claude/channels/telegram/access.json의 chat_ids)
  3. 활성 계정 usage ≥96% OR rate_limit 감지 → swap 후보 선정
  4. claude-remote /health ping → 살아있으면 POST /internal/auto-switch 위임
  5. 서버 없으면 Telegram 알림만 (수동 전환 유도)
  6. 10분 쿨다운 (~/.ateam/auto-switch-state.json)

## Plan (Phase별)
1. 엔진 4 mjs + install-auto-switch-cron.sh [진행 중, 75%]
2. trigger.mjs 서버 ping 분기
3. claude-remote POST /internal/auto-switch + 기존 checkAndAutoSwitch 삭제
4. accounts.json 마이그레이션 + backup + 90일 클린업
5. 문서 갱신 (auto-switch-protocol.md / zzz.md / CLAUDE.md)
6. /end drift 감지 + /absorb 자동 제안 강화
7. 테스트 + 검증 + 양쪽 레포 커밋

## Files Touched
- a-team: .claude/commands/zzz.md, resume.md, pickup.md, vibe.md
- a-team: CLAUDE.md
- a-team: governance/rules/auto-switch-protocol.md
- a-team: governance/design/refs/*.md (10개)
- a-team: scripts/auto-switch/{accounts-state,check-usage,swap-keychain}.mjs
- claude-remote: packages/server/src/session.ts (PTY idle 감지)
- claude-remote: packages/server/src/index.ts (auto-switch 로직 — 제거 예정)
- claude-remote: packages/server/src/__tests__/{auto-switch,session-this-sprint}.test.ts

## Resume
`/pickup` 자동 주입됨. In Progress 부터 바로 실행.
