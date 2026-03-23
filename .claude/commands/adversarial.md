# /adversarial — 적대적 코드 리뷰

코드를 **공격자 시각**으로 검토한다. "이게 맞는가"가 아니라 "이걸 어떻게 깨는가".
모델에 무관하게 동작 — Claude 자체로 실행, 외부 모델 불필요.

## `/review`와의 차이

| `/review` | `/adversarial` |
|---|---|
| 코드 품질, 버그, 스타일 | 악용 경로, 논리 결함, 경계 돌파 |
| "올바르게 작성됐는가" | "어떻게 무너뜨릴 수 있는가" |
| 일반 PR 리뷰 | 보안 민감 코드, 큰 diff, 릴리즈 전 |

## 언제 사용하나
- 인증/권한/결제 코드 변경 시
- 500줄 이상 큰 diff
- "이게 진짜 안전한가" 확신이 필요할 때
- `/cso` 전 빠른 사전 스크리닝으로

---

## 4가지 공격 관점 (순서대로 실행)

### 관점 1: 입력 조작자 (Input Abuser)
모든 입력 경로를 찾아 경계를 테스트한다:

```
- 타입 혼동: 숫자 필드에 문자열 / 배열에 객체
- 크기 극단값: 빈 문자열, 10MB 문자열, 음수, MAX_INT
- 인코딩 공격: %00, \n, Unicode 정규화, NULL 바이트
- 반복: 동일 요청 1000번 → 상태 오염?
```

각 입력 경로에 대해: **실제로 어떤 일이 일어나는가?**

### 관점 2: 권한 경계 돌파자 (Privilege Escalator)
인증/권한 로직에서 우회 경로를 찾는다:

```
- 직접 객체 참조: /api/users/[id] → id를 다른 사용자로?
- 권한 체크 위치: 비즈니스 로직 전에 있는가, 후에?
- 상태 경쟁: 권한 체크와 실행 사이의 시간 창
- 역할 혼동: admin 기능이 user 토큰으로 접근 가능?
```

### 관점 3: 로직 뒤집기 (Logic Inverter)
비즈니스 로직의 가정을 반대로 뒤집는다:

```
- "항상 양수"라고 가정한 값에 음수 입력
- "이 순서로만 호출"되는 API를 역순으로
- "한 번만 실행"되는 작업을 중복 실행
- "완료 후"에만 가능한 작업을 미완료 상태에서
```

### 관점 4: 부작용 수확자 (Side-Effect Harvester)
의도하지 않은 정보 누출과 상태 변경을 찾는다:

```
- 에러 메시지에 내부 경로/스택 트레이스 포함?
- 타이밍 차이로 존재 여부 추측 가능?
- 로그에 민감 정보 기록?
- 실패한 요청도 부분적으로 상태 변경?
```

---

## 실행 방식

### 단독 실행 (기본)
Claude가 4가지 관점을 순서대로 실행:
```
/adversarial                    ← 현재 브랜치 전체
/adversarial src/auth/          ← 특정 경로
/adversarial --depth 2          ← 2개 관점만 (빠른 스크리닝)
```

### 강화 실행 (가능한 경우)
```bash
# Gemini CLI 사용 가능하면 교차 검증
which gemini 2>/dev/null && echo "교차 검증 활성화"

# Codex CLI 사용 가능하면
which codex 2>/dev/null && echo "Codex 교차 검증 활성화"
```

가용한 모델을 자동 감지해 교차 검증. 없으면 Claude 단독으로 충분히 수행.

---

## 출력 형식

각 발견마다 **공격 시나리오** 필수:

```
### [HIGH] 직접 객체 참조 — src/api/orders.ts:34

공격 시나리오:
  Alice(user_id=1)가 /api/orders/2에 GET 요청 →
  Bob의 주문 내용이 그대로 반환됨.

근거:
  `Order.findById(req.params.id)` — user_id 필터 없음

수정:
  `Order.findOne({ _id: req.params.id, userId: req.user.id })`
```

---

## 완료 출력
```json
{
  "status": "DONE | DONE_WITH_CONCERNS",
  "perspectives_run": 4,
  "findings": {
    "critical": 0,
    "high": 1,
    "medium": 3
  },
  "exploit_scenarios": ["[시나리오 목록]"],
  "recommend_cso": false
}
```

`critical` 발견 시 → `recommend_cso: true` + `/cso` 실행 강력 권고

## 원칙
- 방어자 시각 완전 배제 — 오직 공격자 관점
- 이론적 취약점이 아닌 실제 익스플로잇 가능한 것만
- "아마 안전함" 금지 — 코드로 증명하거나 취약하다고 판정
- `/cso`의 간소화 버전이 아님 — 논리 공격에 특화, /cso는 시스템 전체 감사
