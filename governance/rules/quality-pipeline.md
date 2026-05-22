# Quality Pipeline — 3-Layer 자동 품질 파이프라인

> SSOT: 개발 품질 자동화 규칙. Claude와 인간 각각의 책임 명시.
> 관련: coding-safety.md (코드 안전), CLAUDE.md (오케스트레이션)

## 설계 원칙

1. **인간은 의도를, AI는 검증을** — 인간이 "뭘 만들지" 결정, AI가 "제대로 만들었는지" 자동 검증
2. **시그널 기반 자동 전환** — 인간의 한 마디가 방법론을 결정. 명시 호출 불필요
3. **Shift-Left** — 버그 발견 시점이 늦을수록 비용 10x. 가능한 한 빨리 잡음
4. **Zero-Trust Build** — "잘 된 것 같다"는 증거가 아님. 증거 = 통과한 테스트

---

## Layer 1: 빌드 중 자동 (인간 개입 0)

코드 작성과 동시에 실행. Claude가 자동 판단.

| 트리거 | 자동 실행 | 비용 |
|--------|----------|------|
| 파일 저장/수정 후 | tsc --noEmit + lint | 0 |
| 새 함수/모듈 export 생성 | 테스트 파일 존재 확인. 없으면 생성 제안 | 0 |
| UI 파일 변경 | design-auditor (PostToolUse 훅) | $ |
| 보안 민감 패턴 감지 | CSO 경량 스캔 자동 (아래 상세) | $ |
| 5+ 파일 변경 누적 | PMI Phase 1 자동 (integration map) | $ |
| 커밋 전 | vitest + wiring integrity (pre-commit) | 0 |

### 보안 민감 패턴 자동 감지

다음 패턴이 변경 파일에 포함되면 `/end` 시 CSO 경량 리뷰 자동 트리거:

```
auth, login, session, token, jwt, oauth, password, credential,
crypto, encrypt, decrypt, hash, secret, key, cert,
payment, billing, charge, stripe, paypal,
sql, query, exec, eval, innerHTML, dangerouslySetInnerHTML,
cors, origin, cookie, csrf, xss, sanitize,
admin, role, permission, privilege, sudo, root
```

감지 시 `/end` Step 3.9에서 Haiku CSO mini-scan 자동 실행.

---

## Layer 2: 커밋/세션 종료 시 자동 (인간은 결과만 확인)

`/end` 실행 시 자동 수행. 인간은 요약 1줄 확인.

| 트리거 | 자동 실행 | 비용 |
|--------|----------|------|
| 변경 파일 3+ | Adversarial mini-review (Haiku) | $ |
| 보안 패턴 감지됨 | CSO mini-scan (Haiku) | $ |
| 신규 lib/agents/governance 파일 | PIOP Phase 1 (이미 Step 3.7) | $ |
| push 직전 | CI (GitHub Actions: tsc + vitest) | 0 |

---

## Layer 3: 인간 판단 필수 (자동화 불가)

AI가 대체할 수 없는 인간 고유 판단 영역.

| 시점 | 인간 행동 | 소요 | 이유 |
|------|----------|------|------|
| 작업 지시 시 | 시그널 단어 한 마디 (아래 표) | 5초 | 방법론 선택은 비즈니스 맥락 의존 |
| 기능 완성 직후 | "쓸 사람 입장에서 말이 돼?" | 30초 | 사용자 가치 판단 |
| `/end` 리뷰 결과 | "OK" 또는 "이 부분 다시" | 30초 | 최종 승인 |
| 주 1회 | `/cold-review` 결과 읽기 | 5분 | 구조적 부채 감지 |
| 월 1회 | `/board` 결과 읽기 | 10분 | 전략 드리프트 |

---

## 개발 방법론 시그널 사전

인간이 작업 지시에 **시그널 단어**를 포함하면 Claude가 자동으로 해당 방법론 적용.
명시 호출(`/tdd` 등) 불필요. 시그널 없으면 기본 빌드.

### 품질 강화 시그널

| 시그널 (인간이 말하는 것) | 자동 적용 방법론 | Claude 행동 |
|--------------------------|-----------------|-------------|
| "실패하면 Y여야 해", "X면 에러" | **Contract-First** | 타입 + 실패 테스트 먼저 → 구현 |
| "확실히 맞아야 해", "절대 깨지면 안 돼" | **TDD + Mutation** | Red-Green-Refactor + Stryker/변형 검증 |
| "이상한 입력도 버텨야 해", "엣지 케이스" | **Property-Based Testing** | fast-check로 랜덤 불변조건 검증 |
| "지금 출력 그대로 유지해", "회귀 방지" | **Golden Master / Snapshot** | 현재 출력 스냅샷 → 변경 시 diff |
| "보안 중요", "인증", "결제" | **Security-First** | CSO 사전 스캔 + OWASP 체크리스트 |

### 구조/규모 시그널

| 시그널 | 자동 적용 방법론 | Claude 행동 |
|--------|-----------------|-------------|
| "큰 리팩토링", "전면 교체" | **Strangler Fig** | 새 코드로 감싸고 점진 이관. 한 번에 안 바꿈 |
| "프로토타입", "빠르게 확인" | **Spike & Stabilize** | 최소 구현 → 동작 확인 → 테스트로 고정 |
| "처음부터", "새 프로젝트" | **Walking Skeleton** | 최소 E2E 파이프라인 먼저 → 살 붙이기 |
| "아직 미완성인데 배포" | **Feature Flags** | 플래그로 감싸서 안전 배포 |
| "이 부분만 먼저", "점진적으로" | **Incremental Delivery** | 슬라이스 단위 완성 (수직 슬라이스) |

### 검증 시그널

| 시그널 | 자동 적용 방법론 | Claude 행동 |
|--------|-----------------|-------------|
| "성능 괜찮아?", "느려" | **Benchmark-Driven** | `/benchmark` 기준선 측정 + 비교 |
| "다른 방법은?", "비교해봐" | **ADR (Architecture Decision Record)** | 옵션 매트릭스 + 트레이드오프 문서화 |
| "의존성 정리", "결합도" | **Fitness Functions** | 의존성 깊이/순환 참조/결합도 자동 측정 |
| "이거 맞아?", "검증해봐" | **Approval Testing** | 현재 출력 제시 → 인간 approve → 기준선 |

### 시그널 없을 때 (기본 모드)

시그널 없는 일반 구현 요청은 **기본 품질 경로**:
1. 구현
2. 기존 테스트 통과 확인
3. Layer 1 자동 검증 (lint + type + wiring)
4. `/end` 시 Layer 2 자동 리뷰

---

## 인간 체크리스트 (세션별)

```
세션 시작:
  /pickup 또는 /vibe

작업 지시 (시그널 포함 권장):
  "X 만들어"                    → 기본 모드
  "X 만들어. 실패하면 Y여야 해"  → Contract-First 자동
  "X 만들어. 확실히 맞아야 해"   → TDD + Mutation 자동
  "X 리팩토링. 큰 변경이야"     → Strangler Fig 자동

빌드 중:
  (개입 불필요 — Layer 1 자동)

완료 확인:
  /end → 리뷰 결과 30초 확인 → "OK" 또는 수정 요청

정기 점검:
  주 1회: /cold-review 읽기 (5분)
  월 1회: /board 읽기 (10분)
```

---

## 방법론 상세 레퍼런스

### Contract-First Development
- 입출력 계약(타입 + 실패 조건)을 먼저 정의
- 구현은 계약을 채우는 것
- TypeScript: 타입 정의 → 실패 테스트 → 구현 → 통과

### Property-Based Testing
- 구체적 예시 대신 "모든 입력에 대해 성립하는 속성" 검증
- 도구: fast-check (JS/TS)
- 예: `fc.assert(fc.property(fc.string(), s => decode(encode(s)) === s))`

### Mutation Testing
- 코드를 일부러 변형(+를 -로, true를 false로)
- 테스트가 변형을 잡지 못하면 → 테스트가 약한 것
- 도구: Stryker (JS/TS)

### Golden Master / Snapshot Testing
- 현재 정상 출력을 스냅샷으로 저장
- 이후 변경 시 diff → 의도된 변경인지 확인
- 도구: vitest snapshot, jest snapshot

### Strangler Fig Pattern
- 기존 코드를 한 번에 교체하지 않음
- 새 코드로 감싸고(wrapper), 하나씩 이관
- 이관 완료 후 wrapper 제거

### Spike & Stabilize
- 1단계: 최소 프로토타입 (테스트 없이, 빠르게)
- 2단계: 동작 확인 후 테스트로 고정 (stabilize)
- 프로토타입 코드를 버리지 않고 테스트로 잠금

### Walking Skeleton
- 전체 파이프라인을 최소 기능으로 관통
- DB → API → UI 한 줄씩 → E2E 동작 확인
- 그 후 각 층에 살 붙이기

### Fitness Functions
- 아키텍처 건강을 자동 수치화
- 측정: 순환 의존성 수, 모듈 결합도, 빌드 시간
- CI에서 자동 실행, 임계값 초과 시 경고

### ADR (Architecture Decision Record)
- 결정 배경 + 고려 옵션 + 선택 이유 문서화
- 형식: `## 상태: 채택 / 맥락 / 결정 / 결과`
- 나중에 "왜 이렇게 했지?" 방지
