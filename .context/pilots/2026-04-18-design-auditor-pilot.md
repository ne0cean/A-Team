# Design Auditor LLM Critique 실전 테스트

**일시**: 2026-04-18
**목표**: PL-01 (tone mismatch) + PL-02 (missing personality) LLM critique 동작 검증
**서브에이전트**: `.claude/agents/design-auditor.md` (Haiku 모델)

---

## 테스트 셋업

**의도적 위반 샘플**:
- 파일: `.context/pilots/design-samples/critique-test/landing.tsx`
- 톤 선언: `tone: luxury` (`.design-override.md`)
- 실제 코드:
  - `font-mono`, `bg-yellow-300`, `border-4 border-black`, `uppercase` ← brutalist 패턴
  - 7개 동일 카드 (4 features + 3 benefits) ← 위계 없음

**예상 결과**:
- Static detector: 거의 통과 (className 문자열 깊이 감지 한계)
- PL-01 LLM critique: VIOLATION (luxury tone vs brutalist code)
- PL-02 LLM critique: VIOLATION (no hierarchy, repeated cards)
- 최종 passed: false (ship gate)

---

## 실행 결과

### Static Detector
- score: 100/100 (violations 0)
- ⚠️ **알려진 한계**: className 문자열 안의 brutalist 패턴(border-4 + harsh colors) 감지 못함
  - 디텍터는 CSS 변수, 폰트 stack 등 명시적 패턴만 검사
  - JSX className aggregation의 시각적 의미는 LLM critique 영역

### LLM Critique 결과

#### PL-01: Tone Mismatch — ✅ DETECTED
```
declared_tone: luxury
expected: rounded curves, subtle motion, ample whitespace, refined typography
actual: bg-yellow-300 (harsh), border-4 black (aggressive), uppercase tracking-tighter, no rounded-*
verdict: HIGH severity violation
fix: rounded-lg/2xl 추가, border-4 제거, muted palette, serif/타이틀 케이스
```

#### PL-02: Missing Personality — ✅ DETECTED
```
page_structure: 7 cards (4 feature + 3 benefit)
card_pattern: 모두 .border-4.border-black.p-6.bg-white
hierarchy: 크기/색상/레이아웃 차이 0
verdict: HIGH severity violation
fix: 카드별 크기/색상 변화, 비대칭 그리드, 섹션별 고유 스타일
```

### 최종 판정

```json
{
  "passed": false,
  "score": 72,
  "threshold": 70,
  "gate_context": "ship",
  "violations": ["PL-01", "PL-02"]
}
```

---

## 검증 결과

| 기준 | 결과 |
|------|------|
| Static detector 실행 + 결과 반환 | ✅ |
| PL-01 LLM critique violation 감지 | ✅ |
| PL-02 LLM critique violation 감지 | ✅ |
| 최종 passed=false (gate ship) | ✅ |
| 수정 제안 구체성 | ✅ (구체적 Tailwind 클래스 + 디자인 원칙 명시) |
| Analytics 기록 | ✅ |

---

## 발견된 개선 사항

### 🟡 Static Detector className 매칭 한계
**증상**: JSX `className="border-4 border-black bg-yellow-300"` 같은 문자열 내 패턴을 감지 못함

**원인**: 정적 디텍터는 다음 패턴만 검사
- CSS 변수 (`--color-primary: #...`)
- 폰트 stack (`font-family: 'Inter'`)
- 명시적 CSS 속성 (`color: ...`, `font-size: ...`)

**개선 방향**:
- Tailwind class string 분석 룰 신규 (className의 색상/크기/모양 클래스 집계)
- 우선순위: P3 (LLM critique가 잘 보완하므로)

### 🟢 LLM Critique 정확도 우수
PL-01/PL-02 둘 다 명확한 근거와 함께 감지. Haiku 모델로도 충분.

### 🟡 Score 산출 로직 검토 필요
Static detector가 100을 반환했는데 최종 score 72.
LLM critique가 추가하는 score deduction의 명시적 정의 필요.

**개선 방향**:
- `lib/design-config.json`에 LLM critique severity score 명시
- PL-01/PL-02 HIGH violation 각각 score deduction (예: -14점)
- 우선순위: P2

---

## 결론

**Design Auditor LLM critique 파이프라인 정상 작동**:
- Static-first 원칙 준수
- 회색지대(PL-01/PL-02) LLM critique 정확
- ship 게이트 차단 동작 확인

**다음 액션**:
- Static detector className 분석 강화 (P3)
- Score 산출 로직 명시화 (P2)
- 실제 프로덕션 UI 1개로 회귀 테스트 (TBD)
