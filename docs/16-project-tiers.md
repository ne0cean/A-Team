# 16. 프로젝트 Tier 시스템

> 토이 프로젝트부터 판매 가능한 제품까지 — 같은 뼈대, 다른 깊이.

---

## 핵심 원칙: Progressive Enhancement

전환 비용 없는 업그레이드. NANO → STANDARD → PRO는 **폴더 재구성**으로만 가능하며 로직 재작성 없음.

---

## Tier 1 — NANO

**대상**: 토이/실험 (하루~1주)
**에이전트**: 1명
**원칙**: 구조 오버헤드 0

### 구조
```
project/
  src/           ← 평평한 구조
  .context/
    CURRENT.md
  CLAUDE.md
```

### 활성 도구
- `/vibe` — 기본 모드
- TDD gate — 50줄 이상 시 경고만 (블로킹 없음)

### 전환 트리거
파일 10개 초과 또는 협업자 추가 → **STANDARD로 업그레이드**

---

## Tier 2 — STANDARD

**대상**: MVP/사이드 프로젝트 (1주~3개월)
**에이전트**: 2~3명 병렬
**원칙**: 빠른 피처 개발

### 구조
```
project/
  src/
    features/    ← 기능 단위 폴더
      auth/
      todo/
    shared/
  .context/
    CURRENT.md
    SESSIONS.md
  AGENTS.md
  CLAUDE.md
```

### 활성 도구
- `/vibe` + `/tdd` (50줄+/API 시 자동 적용)
- PARALLEL_PLAN.md + 파일 소유권
- PreToolUse 훅 (TDD gate + 위험 명령 차단)

### 전환 트리거
팀 2명+ 또는 유료 사용자 발생 → **PRO로 업그레이드**

---

## Tier 3 — PRO

**대상**: 장기 운영 판매 제품
**에이전트**: 역할 분리 전문화
**원칙**: 품질 보장 + 확장 가능

### 구조
```
project/
  src/
    [bounded-context]/
      domain/              ← architect 전용 (Hook 차단)
        entities/
        value-objects/
        events/
      application/         ← coder 담당
        commands/
        queries/
      infrastructure/
      ports/
  .context/
    CURRENT.md
    SESSIONS.md
    CONTRACTS.md           ← Bounded Context 간 약정
    EVENTS.log             ← 이벤트 스트림
  AGENTS.md
  CLAUDE.md
```

### 활성 도구
- `/vibe --craft` — PO→아키텍트→FE→BE→QA→DevOps 순차 파이프라인
- `/tdd` — 완전 강제 (블로킹)
- 계층별 파일 소유권 Hook
- CONTRACTS.md (Bounded Context 약정)

---

## Tier별 기능 대조표

| 기능 | NANO | STANDARD | PRO |
|------|:----:|:--------:|:---:|
| CURRENT.md | ✅ | ✅ | ✅ |
| /vibe | ✅ | ✅ | ✅ |
| TDD gate | 경고 | 강제 | 블로킹 |
| AGENTS.md | ❌ | ✅ | ✅ |
| /tdd 커맨드 | ❌ | ✅ | ✅ |
| PARALLEL_PLAN | ❌ | ✅ | ✅ |
| DDD 계층 구조 | ❌ | ❌ | ✅ |
| /craft 파이프라인 | ❌ | ❌ | ✅ |
| CONTRACTS.md | ❌ | ❌ | ✅ |

---

## 업그레이드 경로

### NANO → STANDARD
```bash
# src/의 파일들을 features/ 하위로 이동
mkdir -p src/features/core src/shared
# AGENTS.md 작성 (역할 분리 명시)
```

### STANDARD → PRO
```bash
# features/{name}/ → src/{name}/{domain,application,infrastructure}/
# 로직 재작성 없음 — 폴더 재구성만
bash A-Team/templates/init.sh . . --pro-upgrade
```

---

## init.sh로 시작하기

```bash
bash A-Team/templates/init.sh [프로젝트명] [A-Team경로]
# → Tier 선택 프롬프트 자동 표시
```
