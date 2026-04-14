---
created_at: 2026-04-14T21:58:00+09:00
reason: proactive
next_reset_at: 2026-04-15T03:00:00+09:00
session_goal: "A-Team Design Subsystem Phase 1-3 구축 — AI smell 차단 + 토큰 효율 극대 + 기존 툴 유기 통합"
---

## Session Context

**요청 원문**: AI 냄새 + 디자인 퀄리티 페인포인트 해결. 랄프 모드로 Phase 1-3 전부 + 최종 파이프라인까지 자동 진행.

**설계 원칙**:
1. 비-UI 작업엔 오버헤드 0 (gate heuristic)
2. 2-tier (static AST detector 먼저, LLM critique는 회색지대만)
3. Opt-out (`.design-override.md` or `design: off`)
4. Circuit breaker 공유 (advisor-breaker 패턴)
5. learnings 피드백 루프 (`logDesignOutcome`)
6. analytics observability (`event: 'design_audit'`)
7. a11y는 tone과 독립 (비협상)

**리서치 근거**: `.research/notes/2026-04-14-design-subsystem-deep-dive.md`

---

## Completed

- [x] `.research/notes/2026-04-14-design-subsystem-deep-dive.md` — Top 10 리소스 심층 분석
- [x] 메모리 인덱스 업데이트
- [x] Phase 1a governance/design/ 5개 md
  - `governance/design/gate.md` (107 lines) — UI 감지 + opt-out + a11y 비협상
  - `governance/design/tone-first.md` (88 lines) — 11 tones + anti-generic hard ban
  - `governance/design/variants.md` (137 lines) — 3 axes + 7 presets + tone×variant 매트릭스
  - `governance/design/components.md` (189 lines) — 20 core components + 6 principles
  - `governance/design/anti-patterns.md` (217 lines) — 24 detection rules + 점수 체계
- [x] `.claude/commands/resume-on-reset.md` — 리셋 시점 자동 재개 인프라

## In Progress

- [ ] Phase 1b — orchestrator.md에 Design Brief phase 주입 + commit

## Next Tasks (우선순위)

1. **Phase 1b** — orchestrator.md Phase 2.2 뒤에 "Design Gate" 단계 삽입. vibe.md Step 0.6 RESUME 감지. `.claude/agents/ui-inspector.md`에 anti-pattern 24 rule 연동. 첫 커밋.
2. **Phase 2a** — `lib/design-smell-detector.ts` (22 deterministic rule AST/정규식 감지) + `lib/design-config.json` (breaker + 감지 설정) + `test/design-smell-detector.test.ts`
3. **Phase 2b** — `.claude/agents/designer.md` + `.claude/agents/design-auditor.md` + `analytics.ts` (`event: 'design_audit'` 타입 추가) + `learnings.ts` (`logDesignOutcome()` 함수 추가)
4. **Phase 2c** — `.claude/commands/qa.md` 에 `--design` 모드 + `.claude/commands/craft.md`에 Design Brief 주입 + `.claude/commands/ship.md` / `.claude/commands/review.md` 머지 전 게이트 연동 + 두 번째 커밋
5. **Phase 3** — `governance/design/refs/` (주요 브랜드 5-10개 DESIGN.md 요약 포팅) + `governance/design/reasoning.json` (UI/UX Pro Max 도메인 룰 축약) + 세 번째 커밋
6. **최종 파이프라인** — `/optimize` (PIOP) → `/benchmark --diff` → `/doc-sync` → `/cso`
7. **세션 종료** — CURRENT.md 갱신 + SESSIONS.md 로그 + push

## Files Touched This Session

- `.research/notes/2026-04-14-design-subsystem-deep-dive.md` (신규)
- `/Users/noir/.claude/projects/-Users-noir-Projects-a-team/memory/MEMORY.md` (신규)
- `/Users/noir/.claude/projects/-Users-noir-Projects-a-team/memory/project_design_subsystem.md` (신규)
- `governance/design/gate.md` (신규)
- `governance/design/tone-first.md` (신규)
- `governance/design/variants.md` (신규)
- `governance/design/components.md` (신규)
- `governance/design/anti-patterns.md` (신규)
- `.claude/commands/resume-on-reset.md` (신규)
- `.context/RESUME.md` (신규, this file)

## Resume Command

다음 턴 첫 줄에 실행 (사용자 개입 없을 시 크론이 자동 fire):
```
/pickup
```

`/pickup` 없을 경우 수동으로: ".context/RESUME.md 읽고 In Progress부터 이어서 작업 계속. 랄프 모드."

## Commits This Session

(아직 없음 — Phase 1b 끝나고 첫 커밋 예정)

## 주의사항

- **커밋 체인 규칙**: Phase 1 / Phase 2 / Phase 3 각각 별도 커밋. 각 커밋 전 `npm test` + `tsc --noEmit` 통과 필수
- **랄프 모드**: 사용자 확인 없이 계속 진행. 막히면 우회 방안 찾아 자동 진행
- **기존 성능 보장**: 새 모듈은 on-demand 로드, 기존 에이전트/명령어에 부담 추가 금지
- **토큰 효율**: 각 design md는 on-demand. gate.md만 orchestrator에 prepend (~800 tok).
- 리서치 원본은 `.research/notes/2026-04-14-design-subsystem-deep-dive.md` 참조
