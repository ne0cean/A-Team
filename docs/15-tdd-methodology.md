# 15. TDD 방법론 — Claude Code 통합 가이드

> 핵심 3원칙: **Superpowers 패턴** + **Vitest/Playwright 스택** + **MCP로 단계 강제**

---

## 스택 기준 (2026)

| 용도 | 도구 | 비고 |
|------|------|------|
| 단위/통합 (JS/TS) | **Vitest** | Jest 대체, ESM/TS 기본 지원 |
| E2E | **Playwright** | 78.6k★, Cypress 대체 |
| Python | pytest + Hypothesis | property-based 병행 |
| 커버리지 보완 | Stryker (JS) / PIT (Java) | Mutation Testing — 커버리지 100%보다 유의미 |

---

## Red-Green-Refactor 루프 (Superpowers 패턴)

[obra/superpowers](https://github.com/obra/superpowers) 94.3k★ 에서 검증된 패턴.
Claude Code 단일 에이전트는 구현이 테스트 논리에 "침투"되는 드리프트 위험 → **단계를 명시적으로 강제**한다.

```
1. RED   → 테스트 먼저 작성 + 실행 → 반드시 실패 확인
2. GREEN → 최소 구현으로 통과
3. REFACTOR → SOLID/DRY 기준 정리, 재실행 통과 확인
```

**Claude Code 강제 방법**: `/tdd` 커맨드 (아래 참조) 또는 CLAUDE.md에 명시:

```markdown
## TDD 규칙
테스트 없이 구현 시작 금지.
각 단계(Red/Green/Refactor)마다 bash로 테스트 실행하고 결과 확인 후 다음 단계로.
```

---

## Claude Code + TDD 실전 패턴

### 드리프트 방지
- 테스트가 "source of truth" — 구현보다 먼저, 더 구체적으로
- 단계별 `bash` 실행으로 Claude가 결과를 인지하게 강제
- 대형 기능은 `/tdd` 커맨드로 분리된 단계 실행

### 태스크 명세에 완료 기준 포함 (06-build-methodology.md 연동)

```markdown
## 완료 기준 (DoD)
- [ ] 실패 테스트 먼저 존재 (Red 확인)
- [ ] 최소 구현으로 통과 (Green 확인)
- [ ] npm run test 전체 통과
- [ ] npm run build 통과
```

### Vitest 최소 설정

```bash
npm install -D vitest @vitest/ui
```

```json
// package.json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

### Playwright 최소 설정

```bash
npm init playwright@latest
```

```json
// package.json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## 언제 Mutation Testing을 쓰나

- 커버리지가 80%+ 임에도 버그가 계속 발견될 때
- 테스트 스위트의 "진짜 품질"이 의심될 때
- CI 속도 여유 있을 때 (느림 주의)

```bash
# JS/TS
npx stryker run

# Java
mvn test-compile org.pitest:pitest-maven:mutationCoverage
```

---

## 안티패턴

| 패턴 | 결과 |
|------|------|
| 구현 먼저, 테스트 나중 | 테스트가 구현을 검증하지 않고 복사 |
| Red 단계 건너뜀 | 테스트가 항상 통과 → 가짜 안도감 |
| 커버리지 100% 집착 | 시간 낭비, Mutation Testing으로 대체 |
| E2E 먼저 | 느리고 피드백 루프 길어짐 — 단위 → 통합 → E2E 순서 |
| Claude에게 "테스트도 같이 짜줘" | 드리프트 — 테스트와 구현 분리 지시 필수 |
