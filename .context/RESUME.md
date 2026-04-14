---
created_at: 2026-04-15T06:05:00+09:00
reason: user-out-of-token
status: in_progress
mode: sleep
next_reset_at: 2026-04-16T03:00:00+09:00
next_wakeup_scheduled: 2026-04-16T03:02:00+09:00 (launchd com.ateam.sleep-resume)
contract: governance/rules/autonomous-loop.md v2026-04-15 (강제 조항 1-6, 특히 조항 6 나레이션 금지)
narration_budget_bytes: 500
session_goal: "design-smell-detector 나머지 9 static rule 중 안전한 것 구현 (deterministic, --check=npm test 검증 가능)"
---

## 실행 계약 (자동 재개 시 준수)

launchd 가 깨우면 **자율 모드 진입**. 다음 필수:
1. `governance/rules/autonomous-loop.md` **먼저 Read** (6개 강제 조항)
2. 질문 금지, 나레이션 금지 (조항 6). 출력 예산 ≤500 bytes
3. 각 Task 완료 = commit + push + 이 파일 Completed 섹션 update
4. `npm test` + `tsc --noEmit` 통과 못하면 해당 Task revert, 다음으로
5. 모든 Task 완료 or 한계 도달 시 RESUME.md `status: completed` 설정

## ❌ 금지 사항 (중요)

- `/autoresearch` 실행 금지 (사용자가 위험 판단)
- `/sleep.md` 수정 금지 (크리티컬 경로)
- `/craft.md`, `/ship.md`, `/review.md`, `/qa.md` 수정 금지 (이미 통합 완료)
- `.claude/agents/orchestrator.md` 수정 금지 (마지막 세션에서 업데이트 완료, 추가 수정 시 회귀 위험)
- 실 UI 프로젝트 파일럿 금지 (사용자 확인 필요)
- jangpm-integration-design.md 실행 금지 (사용자 승인 대기)
- 파괴적 작업 (force push, branch delete, prod deploy) 금지

## ✅ Tasks (질문 없이 완료 가능)

각 Task는 독립적. 실패 시 해당 Task revert, 다음 진행. 전부 `lib/design-smell-detector.ts` + `test/design-smell-detector.test.ts` + `governance/design/anti-patterns.md` 3 파일만 touch.

### T1. RD-01 Long Line Length rule
- **구현**: `lib/design-smell-detector.ts` 에 `ruleRD01()` 추가
  - 감지: `<p>` / `<div>` / `<article>` 등 텍스트 컨테이너 (직접 텍스트 자식 포함)에 `max-width` 스타일 부재 + 부모 폭 960px 이상
  - 실용적 축소: JSX/CSS에서 `max-width` 또는 Tailwind `max-w-*` 부재 + 긴 텍스트 경고 (content.length > 300 chars 휴리스틱)
  - Severity: LOW
  - Fix: `max-width: 65ch` or Tailwind `max-w-prose`
- **Test**: 2 assertions (감지 case + 통과 case)
- **Check**: `npm test -- --run test/design-smell-detector.test.ts`
- **Commit**: `feat(design): RD-01 long line length static rule + 2 tests`

### T2. RD-05 Heading Hierarchy Skip rule
- **구현**: `ruleRD05()` — HTML/JSX 에서 heading 태그 추출 (`<h[1-6]>` 정규식) → 순서 파싱 → level 2+ 점프 감지
  - 예: h1 → h3 (level 2 skip) → violation
  - Severity: MEDIUM
  - Fix: 순차 heading 구조
- **Test**: 3 assertions (h1→h3 감지, h1→h2→h3 통과, h2→h4 감지)
- **Commit**: `feat(design): RD-05 heading hierarchy skip rule + 3 tests`

### T3. A11Y-05 Form Field Without Label rule
- **구현**: `ruleA11y05()` — `<input>` / `<select>` / `<textarea>` 중 다음 조건 **전부** 미충족 시 violation:
  - `id=` 속성 + `<label for=>` 매치
  - 부모 `<label>` 태그로 래핑
  - `aria-label` 또는 `aria-labelledby` 속성
  - `type="hidden"` 은 예외
  - Severity: HIGH (a11y, 비협상)
- **Test**: 4 assertions (각 3가지 패스 방법 + fail case)
- **Commit**: `feat(design): A11Y-05 form field without label rule + 4 tests`

### T4. LS-02 Absolute Positioning Overuse rule
- **구현**: `ruleLS02()` — 단일 컴포넌트(정규식으로 JSX 파일 내 한 블록 추정) 내 `position: absolute` + `absolute` 클래스 합계 3개 이상 + flex/grid 없음
  - Severity: LOW
  - Fix: flex/grid 사용, absolute는 overlay/badge만
- **Test**: 2 assertions (3개 absolute 감지, 2개+flex 통과)
- **Commit**: `feat(design): LS-02 absolute positioning overuse rule + 2 tests`

### T5. LS-03 Fixed Height on Text Containers rule
- **구현**: `ruleLS03()` — `<p>`/`<h[1-6]>`/`<span>` 에 `height:\s*\d+px` (절대 고정, `min-height` 아님)
  - Severity: LOW
  - Fix: `min-height` or 자연 흐름
- **Test**: 2 assertions (감지 + min-height 통과)
- **Commit**: `feat(design): LS-03 fixed height on text containers + 2 tests`

### T6. AI-07 Hero-Features-CTA Template Signal rule
- **구현**: `ruleAI07()` — signal만 감지 (최종 판정은 LLM critique):
  - 같은 파일에 순서대로: `<section>` with `<h1>` + CTA button → `grid-cols-3` with 3+ similar cards → `<section>` with centered CTA
  - Signal 감지만, full detection 아님
  - Severity: MEDIUM (polish — signal trigger)
- **Test**: 2 assertions (triad 감지, 단일 section 통과)
- **Commit**: `feat(design): AI-07 hero-features-CTA template signal + 2 tests`

### T7. anti-patterns.md 업데이트
- 위 T1-T6 완료 후 마지막에 실행
- anti-patterns.md 제목 "15 static 구현 + 9 로드맵" → "21 static 구현 + 3 로드맵" 수정
- 구현된 rule 번호 목록 갱신
- **Commit**: `docs(design): anti-patterns.md — 21 static rule 구현 반영`

### T8. (옵션) CURRENT.md 갱신
- T1-T7 모두 성공 시 CURRENT.md Next Tasks 에서 "나머지 9 static rule 구현" 항목 제거
- Last Completions 에 결과 기록
- **Commit**: `chore: CURRENT.md — design-smell-detector 21 static rule 완성 반영`

## 종료 조건

- 전부 완료 → 이 파일 `status: completed` → CURRENT.md update → commit/push
- 3 Task 연속 실패 → `status: blocked` + 실패 원인 기록 → 아침에 사용자 확인 대기
- 토큰 한계 근접 감지 → 현재 Task 완료 후 commit/push + 다음 Task 남기고 종료 (다음 launchd fire 시 이어받음)

## Completed (자동 재개 시 중복 금지)

(launchd 발화 시 이 섹션에 기록됨. 현재 비어있음.)

## Commits This Cycle

(launchd 발화 시 각 Task 완료 커밋 hash 기록)

## Resume Command

launchd 가 자동으로 `scripts/sleep-resume.sh` 실행. 실패 시 사용자 수동:
```
/pickup
```

## Notes

- 현재 시각: 2026-04-15 06:05 KST
- 사용자 외출, 토큰 소진 임박
- launchd `com.ateam.sleep-resume` 매일 03:02 KST fire (`launchctl list | grep com.ateam.sleep-resume` 확인됨)
- 다음 fire: **2026-04-16 03:02 KST**
- 오늘 밤은 사용자 복귀 여부 모름 — launchd가 내일 새벽 자동 재개
- 각 Task 범위가 작아서 토큰 예산 충분 ($5 max 내 전부 처리 가능)
- 실패 시 revert 안전 (git log 참조)
