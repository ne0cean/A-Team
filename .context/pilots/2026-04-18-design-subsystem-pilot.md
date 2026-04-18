# Design Subsystem 실전 파일럿

**일시**: 2026-04-18
**목표**: 3개 톤별 샘플 UI 생성 → design-smell-detector 검증
**샘플**: Linear (editorial) / Stripe (minimal) / Rauno (brutalist)

---

## 결과 (after fix)

| 톤 | 파일 | 스코어 | 판정 |
|----|------|--------|------|
| Linear | `linear/dashboard.tsx` | 100/100 | ✅ CRAFT-READY |
| Stripe | `stripe/checkout.tsx` | 100/100 | ✅ CRAFT-READY |
| Rauno | `rauno/notes.html` | 80/100 | 🟡 SHIP-OK |

---

## 발견 사항

### 🔴 버그 발견 + 수정 (이 세션에서 해결)

**A11Y-05 JSX false positive**:
- 증상: `<label htmlFor="email">` + `<input id="email">` 패턴이 violation으로 잘못 감지
- 원인: 디텍터가 HTML `for=`만 매칭하고 JSX `htmlFor=`는 무시
- 수정: `lib/design-smell-detector.ts` `labelForPattern` 정규식에 `(?:for|htmlFor)` 추가
- 검증: 2 신규 테스트 추가, 61 tests PASS

수정 후 Stripe 70 → 100 점.

### 🟡 알려진 한계

**Rauno 톤의 RD-04 warnings (4건)**:
- 11-12px 모노스페이스 폰트가 RD-04 tiny body text로 감지됨
- 실제로는 brutalist 톤의 의도된 정보 밀도
- 디텍터가 톤을 모르므로 일률 기준 적용
- **개선 방향**: `.design-override.md`에 tone declaration이 있을 때
  - editorial tone → 14px 기준
  - brutalist tone → 11px 허용 (mono 한정)
  - playful tone → 13px 기준
- 우선순위: P3 (현재는 LOW severity로 ship 차단 안 함)

### 🟢 잘 작동한 것

1. **다양한 톤 표현 가능** — 같은 디텍터가 monochrome editorial, clean minimal, raw brutalist 모두 평가
2. **톤별 특징 보존** — 디텍터가 "이건 잘못됐다"가 아니라 "이건 일반 기준에 어긋난다" 수준의 신호 제공
3. **점수 체계가 합리적** — Linear/Stripe perfect, Rauno만 의도된 LOW warning

---

## 검증 데이터

```bash
$ npx tsx .context/pilots/design-samples/run-detector.mjs
LINEAR     score 100/100  ✅ CRAFT-READY
STRIPE     score 100/100  ✅ CRAFT-READY  (after htmlFor fix)
RAUNO      score 80/100   🟡 SHIP-OK    (intentional small mono)

$ npx vitest run test/design-smell-detector.test.ts
Tests  61 passed (61)  (was 59 → +2 for htmlFor fix tests)
```

---

## 산출물

- `linear/dashboard.tsx` — Linear 스타일 프로젝트 대시보드
- `stripe/checkout.tsx` — Stripe 스타일 결제 폼
- `rauno/notes.html` — Rauno 스타일 필드 노트
- `run-detector.mjs` — 자동 실행 스크립트
- `detector-results.json` — 상세 결과 (각 violation 위치 + match)

---

## 다음 단계

1. ✅ 정적 디텍터 검증 완료
2. ⏭️ design-auditor LLM critique 테스트 (PL-01 tone mismatch / PL-02 missing personality)
3. 향후: tone-aware threshold 시스템 구축 (P3)
