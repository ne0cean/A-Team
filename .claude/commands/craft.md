# /craft — PRO Tier 품질 파이프라인

PRO Tier 전용. 순차 전문 에이전트 파이프라인으로 품질을 보장하며 기능을 구현합니다.
(참고: clean-claude 패턴 기반)

**사용 시점**: 프로덕션에 반영될 기능, 외부 사용자에게 노출될 코드

---

## 파이프라인

각 단계는 이전 단계 산출물을 입력으로 받습니다. 단계를 건너뛰지 않습니다.

### STEP 1 — Specification (Product Owner)

기능 요구사항을 명확한 사양서로 변환합니다.

- 사용자 스토리 작성: "As a [역할], I want [기능], so that [가치]"
- 완료 기준(DoD) 정의: 체크리스트 3개 이상
- `.context/SPEC.md`에 저장

```
[SPEC 확인] 사양서가 작성됐는가? → YES면 다음 단계
```

### STEP 2 — Architecture (Architect)

사양서 기반으로 기술 설계를 결정합니다.

- 영향받는 Bounded Context 식별
- `domain/` 변경사항 설계 (entity, value-object, event)
- `application/` command/query handler 시그니처 정의
- `ports/` 인터페이스 정의
- `.context/DECISIONS.md`에 기록

```
[DESIGN 확인] 인터페이스와 계층이 설계됐는가? → YES면 다음 단계
```

### STEP 3 — Implementation (Coder, 병렬 가능)

설계 기반으로 구현합니다. **TDD 필수 (RED → GREEN → REFACTOR)**.

- 테스트 먼저 작성 → 실패 확인 (RED)
- 최소 구현 → 통과 확인 (GREEN)
- 리팩토링 → 재통과 (REFACTOR)

```
[IMPL 확인] 테스트 통과 + npm run build 성공? → YES면 다음 단계
```

### STEP 4 — Verification (Reviewer/QA)

전체 품질을 검증합니다.

- 커버리지 확인 (목표: 80%+)
- 보안 취약점 스캔
- 성능 회귀 여부 확인
- E2E 테스트 (Playwright)

```
[QA 확인] 커버리지 + 보안 + E2E 통과? → YES면 다음 단계
```

### STEP 5 — Deployment (DevOps)

CI/CD 트리거 및 배포 검증합니다.

- git push → GitHub Actions 트리거
- 배포 URL 확인 (/deploy-check)
- CURRENT.md 갱신

---

## /vibe와 비교

| | /vibe | /craft |
|--|-------|--------|
| 속도 | 빠름 (병렬) | 느림 (순차) |
| 품질 | 가변 | 보장 |
| 적합 | 탐색/MVP | 프로덕션 |
| Tier | ALL | PRO 전용 |

---

## 스택 참고
- 아키텍처: `docs/16-project-tiers.md`
- TDD: `docs/15-tdd-methodology.md`
- 빌드: `docs/06-build-methodology.md`
