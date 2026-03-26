# A-Team 시작 가이드

> 새 프로젝트부터 프로덕션 제품까지 — 5분 안에 셋업.

---

## 빠른 시작

### 1. 새 프로젝트 시작

```bash
cd my-new-project
bash /path/to/A-Team/templates/init.sh "my-project" /path/to/A-Team
```

**또는 `/vibe`로 자동 감지:**
새 디렉토리에서 `/vibe` 실행 시 프로젝트 구조가 없으면 자동으로 Tier를 물어봅니다.

---

## Tier 선택 가이드

| | NANO | STANDARD | PRO |
|-|------|----------|-----|
| **대상** | 토이/실험 | MVP/사이드 | 판매 제품 |
| **기간** | 하루~1주 | 1주~3개월 | 장기 운영 |
| **에이전트** | 1명 | 2~3명 병렬 | 역할 전문화 |
| **구조** | 평평한 src/ | features/ 폴더 | DDD 계층 |
| **TDD** | 경고만 | 강제 | 블로킹 |

### 언제 업그레이드?
- **NANO → STANDARD**: 파일 10개 초과 또는 협업자 추가
- **STANDARD → PRO**: 유료 사용자 발생 또는 팀 2명+

---

## 일상 워크플로우

### 세션 시작
```
/vibe
```
→ A-Team 업데이트 확인 → 컨텍스트 로드 → 신규 프로젝트 감지 → 즉시 실행

### 기능 개발

**NANO / STANDARD:**
```
/vibe "로그인 기능 추가해줘"
```

**PRO (품질 보장):**
```
/craft "결제 모듈 추가"
```

### TDD (자동 또는 수동)

50줄+ 기능은 자동 적용됩니다. 수동으로 강제하려면:
```
/tdd
```

**Red-Green-Refactor 순서 준수:**
1. 테스트 먼저 작성 → 실패 확인 (RED)
2. 최소 구현 → 통과 (GREEN)
3. 리팩토링 → 재통과 (REFACTOR)

### 세션 종료
```
/end
```
→ CURRENT.md 갱신 → 빌드 검증 → 커밋 → push

---

## 커맨드 빠른 참조

### 필수 (매일)
| 커맨드 | 용도 |
|--------|------|
| `/vibe` | 세션 시작. 컨텍스트 로드 + 신규 프로젝트 감지 |
| `/end` | 세션 종료. 문서 갱신 + 빌드 + 커밋 |
| `/tdd` | TDD 루프 강제 |

### 개발
| 커맨드 | 용도 |
|--------|------|
| `/craft` | PRO Tier 품질 파이프라인 |
| `/investigate` | 버그 근본 원인 분석 |
| `/review` | PR 머지 전 코드 리뷰 |
| `/ship` | PR 생성 전 전체 검증 |

### 품질
| 커맨드 | 용도 |
|--------|------|
| `/cso` | 보안 감사 (OWASP + STRIDE) |
| `/adversarial` | 공격자 시각 코드 리뷰 |
| `/benchmark` | 성능 기준선 측정 |
| `/qa` | 웹앱 체계적 QA |

### 프로젝트 관리
| 커맨드 | 용도 |
|--------|------|
| `/prjt` | 전체 프로젝트 현황 |
| `/pickup` | 토큰 소진 후 재개 |
| `/handoff` | 모델 전환 핸드오프 |
| `/retro` | 주기적 회고 |

---

## Tier별 활성 기능

| 기능 | NANO | STANDARD | PRO |
|------|:----:|:--------:|:---:|
| /vibe | ✅ | ✅ | ✅ |
| /tdd (경고) | ✅ | | |
| /tdd (강제) | | ✅ | |
| /tdd (블로킹) | | | ✅ |
| AGENTS.md | | ✅ | ✅ |
| PARALLEL_PLAN | | ✅ | ✅ |
| DDD 계층 구조 | | | ✅ |
| /craft | | | ✅ |
| CONTRACTS.md | | | ✅ |

---

## PRO Tier 구조 참고

```
src/
  {bounded-context}/
    domain/          ← 비즈니스 규칙 (architect 전용)
    application/     ← Use Case (coder)
    infrastructure/  ← 외부 의존성 (coder)
    ports/           ← 인터페이스 (architect 전용)
.context/
  CURRENT.md
  CONTRACTS.md       ← Bounded Context 간 약정
  EVENTS.log         ← 이벤트 스트림
```

→ 상세: `docs/16-project-tiers.md`

---

## 도움말

| 상황 | 참조 문서 |
|------|----------|
| Tier 선택 고민 | `docs/16-project-tiers.md` |
| TDD 언제 써야 하나 | `docs/15-tdd-methodology.md` |
| 에이전트 역할 분할 | `docs/01-role-partitioning.md` |
| 파일 충돌 문제 | `docs/02-conflict-prevention.md` |
| 토큰 소진 대처 | `docs/13-context-continuity-protocol.md` |
| 전체 문서 인덱스 | `docs/INDEX.md` |
