# Baseline Benchmark Spec — B1–B6

> A-Team의 현재 효율성 측정 기준. 후보의 A/B 테스트에 재사용.

## Design Principles
- **Self-contained**: 외부 레포 의존 없음 (연결체 등 타 프로젝트 건드리지 않음)
- **Synthetic**: 합성 태스크 — 매번 동일 입력 → 동일 기대 출력
- **Reproducible**: 명시된 입력/기대결과로 3회 반복 가능
- **Scoped**: 각 벤치 ≤ 30분 상한 (hard timeout)

---

## B1 — Small Fix (≤50 LOC)

### Task
아래 코드에 버그 2개 있음. 찾아 고치고 단위 테스트 3개 작성.

```typescript
// lib/email-validator.ts (buggy)
export function isValidEmail(email: string): boolean {
  if (!email) return true;           // Bug 1: 빈 문자열 허용
  const parts = email.split("@");
  return parts.length > 1;            // Bug 2: a@b@c 허용
}
```

### Expected
- 두 버그 모두 수정
- `email-validator.test.ts` 3+ cases (valid, empty, double-@)
- 전체 변경 ≤ 50 LOC

### Measurement
- M1 토큰: main+subagent 총합
- M2 시간: 첫 tool call ~ 마지막 tool call
- M3 tool calls 수
- M4 correctness: 버그 2개 수정 + 테스트 pass = 1.0, 1개만 = 0.5, 없으면 0
- M5 regression: 해당 없음 (신규 파일)

---

## B2 — TDD Feature (Token Bucket Rate Limiter)

### Task
TDD 사이클로 `lib/rate-limiter.ts` 구현:
- Token bucket 알고리즘 (capacity, refillRate)
- `allow(): boolean` 메서드
- RED → GREEN → REFACTOR 엄수

### Expected
- 테스트 파일 먼저 작성, 실행 시 **실패 확인**
- 구현 추가, 테스트 통과
- 최소 5 test cases (capacity 소진, refill 대기, 동시성 N/A 단일스레드)
- `npm test`로 green 확인

### Measurement
- M4 correctness: TDD 순서 준수 + 전체 테스트 green = 1.0
- M4 TDD 위반(구현 먼저) → 0.5
- M3 tool calls 수 (Write/Bash/Edit)

---

## B3 — Multi-File Refactor (500 LOC+, 4 files)

### Task
아래 단일 파일 300-line 스파게티를 4개 모듈로 분리:
```
src/monolith.ts (300 LOC, mixed concerns)
→ src/config.ts, src/parser.ts, src/validator.ts, src/reporter.ts
```
(구체 코드는 Baseline 실행 직전 생성하거나 A-Team `test/fixtures/monolith.ts` 사용)

### Expected
- 4파일 분리 완료
- 원본 모든 기능 보존 (기존 테스트 통과)
- 각 모듈 단일 책임 원칙 준수
- import 경로 업데이트

### Measurement
- M4 correctness: 기존 테스트 pass + 4모듈 분리 = 1.0
- M5 regression: 깨진 테스트 개수
- M1 토큰: 컨텍스트 관리 효율 핵심 지표

---

## B4 — UI Feature + Visual Verification

### Task
React 컴포넌트 `ToggleButton.tsx` 생성:
- props: `checked: boolean`, `onChange`
- dark mode 스타일 (prefers-color-scheme)
- before/after 스크린샷 자동 캡처 (기존 hooks 사용)

### Expected
- 컴포넌트 생성
- PostToolUse hook이 시각 diff 자동 생성
- `.agent/screenshots/` 에 before/after 저장

### Measurement
- M4 correctness: 컴포넌트 동작 + 시각 diff 파일 존재 = 1.0
- M3 tool calls: hook 포함 총 횟수
- 테스트 환경이 Playwright 설치되지 않은 경우 **skip**

---

## B5 — Research Synthesis (병렬 서브에이전트)

### Task
"3개의 MCP 서버 구현체 비교" — 각 후보를 병렬 리서처 3개에 배분, 결과 취합.

### Expected
- 3개 서브에이전트 병렬 호출
- 각 결과 300자 이내 요약
- 메인이 비교표 생성

### Measurement
- M1: 메인 컨텍스트 오염도 (서브 결과를 메인에 그대로 퍼 담지 않기)
- M4: 비교표에 3개 후보 전부 기재 + 최소 3개 속성 비교 = 1.0

---

## B6 — Root Cause Debug

### Task
아래 스택 트레이스 + 로그 제공, 근본 원인 식별 + 수정안 제시:
```
TypeError: Cannot read property 'map' of undefined
  at renderList (component.tsx:42)
  at render (component.tsx:15)
  [logs show API returned 500 but client didn't handle]
```
관련 코드 스니펫 제공 → 원인 진단 + fix 제안 (구현은 선택).

### Expected
- 근본 원인 식별 (API 에러 미처리 + fallback 없음)
- 수정 방향 제시 (defensive default or guard)
- 유사 패턴 탐지 제안

### Measurement
- M4: 근본 원인 정확 + 수정 타당 = 1.0
- M2 시간: 진단 속도

---

## Run Protocol

각 벤치 실행 순서:
1. Worktree 격리: `git worktree add ~/tmp/ateam-bench-<B#>-<N>` (N=반복 회차)
2. Start timestamp 기록 (Bash `date +%s`)
3. Task 실행 (Claude Code 세션 또는 서브에이전트)
4. End timestamp 기록
5. 산출물 검증 (Expected 대비)
6. M1–M5 측정 → `PERFORMANCE_LEDGER.md`에 append
7. Worktree 삭제

**반복**: 각 벤치 3회 → 평균 + 표준편차. σ/mean > 0.1이면 추가 1회 더.

## Scoring Formula
```
CompositeScore = 0.3·norm(M1⁻¹) + 0.2·norm(M2⁻¹) + 0.15·norm(M3⁻¹) + 0.25·M4 + 0.10·norm(M5⁻¹)
```
(M1/M2/M3/M5는 낮을수록 좋음 → 역수 + 정규화. M4는 그대로 0–1.)

범위: 0–100. 100 = 이론적 최적, baseline은 측정 후 예를 들어 62점.

## Baseline 수치 기록 위치
`round-2/BASELINE.md` 에 B1–B6 × 3회 원본 데이터 + 평균 + 복합점수.

## Candidate A/B 수치 기록 위치
`round-3/benchmark-<candidate>.md` — baseline 대비 델타 명시.

## Gate 재확인
- G5-a ≥ 15% 개선 (어느 메트릭이든)
- G5-b ≤ 5% 악화 (모든 메트릭)
- G5-c M4 ≥ baseline
- G5-d 6개 중 4개 이상 개선
- G5-e σ/mean < 0.1
