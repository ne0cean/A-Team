# /plan-ceo — CEO 시각 계획 검토

제품/기능 계획을 CEO 시각으로 검토한다. 전략적 전제를 도전하고, 범위 drift를 잡고, 실패 모드를 식별한다.
`/office-hours` 다음, `/plan-eng` 이전에 사용.

---

## Phase 1: 계획 파일 로드

우선순위:
1. 명시적으로 지정된 파일 (`/plan-ceo path/to/plan.md`)
2. `.context/`의 최근 계획 파일
3. `~/.gstack/projects/`의 최근 설계 문서

없으면 → `NEEDS_CONTEXT: 검토할 계획 파일을 지정해주세요`

---

## Phase 2: 전제 도전

계획의 핵심 전제를 추출하고 각각 도전한다:

```
전제 1: [계획이 가정하는 것]
  → 근거: [있는가? 없는가?]
  → 리스크: [전제가 틀렸을 때 결과]
  → 판정: 검증됨 / 취약 / 위험
```

전제가 취약/위험이면 → AskUserQuestion으로 확인 후 진행

---

## Phase 3: 범위 분석

**"NOT in scope" 강제 정의**
계획에 명시되지 않은 것 중 오해할 수 있는 항목을 목록화:
```
이번에 하지 않는 것:
- [항목 A] — 왜 제외하는가
- [항목 B] — 언제 할 것인가
```

**범위 drift 감지**
계획의 핵심 목표와 무관한 작업이 포함되어 있으면 플래그.

---

## Phase 4: 실패 모드 테이블

| 실패 시나리오 | 확률 | 영향 | 감지 방법 | 복구 계획 |
|---|---|---|---|---|
| [시나리오 A] | 높음/중간/낮음 | 크다/중간/작다 | [어떻게 알 수 있나] | [대응] |

최소 3개 실패 모드 식별 필수.

---

## Phase 5: 검토 리포트 저장

계획 파일 하단에 추가:
```markdown
## CEO 검토 리포트
날짜: [YYYY-MM-DD]
검토자: CEO 에이전트

### 전제 검증
[결과]

### NOT in scope
[목록]

### 실패 모드
[테이블]

### 판정: APPROVED | APPROVED_WITH_CONCERNS | NEEDS_REVISION
```

---

## 완료 출력
```json
{
  "status": "DONE | DONE_WITH_CONCERNS | BLOCKED",
  "verdict": "APPROVED | APPROVED_WITH_CONCERNS | NEEDS_REVISION",
  "critical_risks": ["[즉시 해결 필요]"],
  "next": "/plan-eng 실행 권장"
}
```

## 원칙
- 긍정적 편향 금지 — 계획의 약점을 찾는 것이 목적
- 근거 없는 전제는 반드시 플래그
- 판정 후 `/plan-eng` 실행 권장
