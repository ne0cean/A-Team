# /tdd — TDD Red-Green-Refactor 루프

Red-Green-Refactor 단계를 강제하는 TDD 실행 커맨드.
구현 전 반드시 실패 테스트를 먼저 만들고 bash로 확인한다.

## 실행 방식

다음 순서를 **단계별로 멈추면서** 진행한다. 다음 단계로 넘어가기 전 반드시 테스트 실행 결과를 확인한다.

---

### STEP 1 — RED (테스트 먼저)

구현할 기능을 한 문장으로 정의하고, 그 기능을 검증하는 테스트를 **먼저** 작성한다.

- 테스트 파일 생성 (아직 구현 없음)
- `npm run test` 또는 `npx vitest run` 실행
- **반드시 실패해야 한다** — 통과하면 테스트가 잘못된 것

```
[RED 확인] 테스트가 실패했는가? → YES면 다음 단계
```

---

### STEP 2 — GREEN (최소 구현)

테스트를 통과시키는 **최소한의 구현**만 작성한다. 완벽하게 짜지 않아도 된다.

- 구현 파일 작성/수정
- `npm run test` 재실행
- **모든 테스트가 통과해야 한다**

```
[GREEN 확인] 테스트가 통과했는가? → YES면 다음 단계
```

---

### STEP 3 — REFACTOR (정리)

구현을 개선한다. 테스트는 손대지 않는다.

- 중복 제거, 네이밍 개선, SOLID 원칙 적용
- `npm run test` 재실행 — 여전히 통과해야 함
- `npm run build` 확인

```
[REFACTOR 확인] 리팩토링 후에도 테스트 통과하는가? → YES면 완료
```

---

## 스택 참고
- JS/TS 단위: Vitest (`npx vitest run`)
- E2E: Playwright (`npx playwright test`)
- 상세: `docs/15-tdd-methodology.md`
