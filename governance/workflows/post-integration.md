---
description: 메이저 통합 이후 자동 실행되는 최적화 프로토콜. 새 모듈/스킬의 기존 코드 융합, 유기적 연계, 트리거링, 토큰 비용 최적화를 수행한다.
trigger: 메이저 업데이트 완료 시 자동 (lib/ 또는 .claude/agents/ 에 새 파일 추가, 또는 기존 에이전트 구조 변경 시)
---

# Post-Integration Optimization Protocol (PIOP)

메이저 통합 후 **자동으로** 실행되는 5-Phase 최적화 프로토콜.
목표: 새로 추가된 코드가 기존 시스템과 유기적으로 연결되고, 불필요한 토큰 소비 없이 동작하도록 보장한다.

---

## 트리거 조건 (자동 감지)

다음 중 하나 이상 충족 시 PIOP 자동 실행:
1. `lib/` 에 새 `.ts` 파일 추가 (새 모듈)
2. `.claude/agents/` 에 새 `.md` 파일 추가 또는 구조적 변경 (새 에이전트)
3. `governance/workflows/` 또는 `governance/rules/` 에 새 파일 추가
4. `.claude/commands/` 에 새 커맨드 추가
5. 사용자가 명시적으로 `/optimize` 호출

**감지 방법**: `git diff --name-only HEAD~1..HEAD` 또는 세션 중 변경 파일 추적.
**스킵 조건**: 변경이 문서만(docs/, *.md 주석)이거나 테스트만(test/)인 경우 Phase 1만 실행하고 종료.

---

## Phase 1: Integration Map (연결 지도)

**목표**: 새 모듈이 기존 시스템의 어디에 연결되어야 하는지 맵핑.

```
1. 변경된 파일 목록 수집
   git diff --name-only HEAD~{N}..HEAD | grep -E '\.(ts|md|mjs|sh)$'

2. 각 새 파일에 대해:
   a. 파일의 export 목록 추출 (lib/*.ts → 함수/클래스/타입)
   b. 기존 파일 중 이 export를 사용해야 할 후보 식별
   c. 연결 매트릭스 생성:

   NEW MODULE          → SHOULD CONNECT TO          STATUS
   ─────────────────────────────────────────────────────────
   lib/learnings.ts    → reviewer.md (학습 기록)     ✅ 연결됨
   lib/learnings.ts    → orchestrator.md (MoA 학습)  ❌ 미연결
   lib/confidence.ts   → reviewer.md (점수 부여)     ✅ 연결됨
   lib/confidence.ts   → judge.md (판정 신뢰도)      ❌ 미연결
   lib/analytics.ts    → vibe.md (세션 시작 기록)    ❌ 미연결
```

3. 미연결 항목을 Phase 2 작업 목록으로 전달.

---

## Phase 2: Cross-Module Wiring (유기적 연계)

**목표**: 미연결 모듈 간 연결 코드 삽입.

### 연계 패턴 카탈로그

| 패턴 | 언제 적용 | 예시 |
|------|----------|------|
| **Import-and-Call** | lib 모듈 → agent/command에서 호출 | reviewer가 confidence.classifyFinding() 호출 |
| **Data Flow** | 모듈 A의 출력이 모듈 B의 입력 | learnings → confidence 교정 → learnings 재기록 |
| **Event Trigger** | 특정 조건 시 모듈 자동 호출 | 리뷰 완료 → analytics.logEvent() 자동 기록 |
| **Context Injection** | 에이전트 프롬프트에 모듈 결과 주입 | orchestrator가 learnings 검색 결과를 에이전트에 주입 |
| **Feedback Loop** | 모듈 출력이 자기 자신의 다음 입력에 영향 | confidence 교정 → learnings → 다음 리뷰 신뢰도 향상 |

### 실행 방법
각 미연결 항목에 대해:
1. 적절한 패턴 선택
2. **최소 침습 원칙**: 기존 코드에 최소한의 변경으로 연결
3. 연결 코드 삽입 (에이전트 .md의 경우 프롬프트 텍스트 추가, lib의 경우 import 추가)
4. 연결 후 빌드 검증 (`npm run build && npm run test`)

### 자동 연계 체크리스트
새 lib 모듈이 추가될 때마다 다음 연결을 검토:

```
[ ] orchestrator.md — 새 모듈을 MoA/에이전트 실행에 활용할 수 있는가?
[ ] reviewer.md — 새 모듈이 리뷰 품질을 높일 수 있는가?
[ ] judge.md — 새 모듈이 판정 정확도를 높일 수 있는가?
[ ] researcher.md — 새 모듈이 리서치 범위/품질을 확장하는가?
[ ] /vibe (session-start) — 세션 시작 시 새 모듈 초기화가 필요한가?
[ ] /end (session-end) — 세션 종료 시 새 모듈 데이터 저장이 필요한가?
[ ] /tdd — 새 모듈이 TDD 루프를 강화하는가?
[ ] /review — 새 모듈이 리뷰 워크플로우에 통합되어야 하는가?
```

---

## Phase 3: Trigger Optimization (트리거 정밀화)

**목표**: 새 기능이 적시에만 호출되고, 불필요한 호출을 방지.

### 3.1 트리거 조건 검증
각 연결된 모듈에 대해:
```
Q1. 이 모듈은 매 세션 호출되어야 하는가, 특정 조건에서만?
    → 매 세션: /vibe의 preamble에 포함
    → 조건부: 트리거 조건을 명시적으로 기술

Q2. 트리거 비용은 얼마인가?
    → 저비용 (파일 읽기, JSONL 파싱): 항상 OK
    → 고비용 (에이전트 호출, 웹 검색): 조건부만

Q3. 트리거 실패 시 전체 워크플로우가 중단되는가?
    → 중단됨: 필수 의존성 → 에러 처리 필수
    → 무시 가능: try-catch로 감싸고 계속 진행
```

### 3.2 트리거 매트릭스 생성
```
MODULE              TRIGGER CONDITION              COST    REQUIRED
────────────────────────────────────────────────────────────────────
learnings.search    세션 시작 (vibe Step 1)         low     optional
learnings.log       리뷰/판정 완료 시              low     optional
confidence.filter   reviewer 출력 후처리           low     required
analytics.log       모든 스킬 실행 시              low     optional
coverage-audit      /tdd 또는 /ship 실행 시        medium  required
eval-store          /ship 실행 시                  high    optional
skill-gen           .tmpl 파일 변경 감지 시         low     required
worktree            dispatch (❸/❹ 패턴) 시         medium  required
```

### 3.3 불필요 트리거 제거
- 동일 세션 내 중복 호출 감지 → 캐시 또는 once 플래그
- 변경 없는 파일에 대한 재검사 방지 → git diff 기반 스킵
- 비활성 모듈의 import 비용 → lazy loading 패턴 적용

---

## Phase 4: Token Cost Optimization (토큰 비용 최적화)

**목표**: 새 통합으로 인한 토큰 비용 증가를 최소화.

### 4.1 에이전트 프롬프트 크기 감사
```
각 에이전트 .md 파일에 대해:
1. 총 토큰 수 측정 (wc -w로 대략 추정, 1 word ≈ 1.3 tokens)
2. 이전 버전 대비 증가량 확인
3. 증가 > 20% 시 경고 플래그

TARGET SIZE:
  researcher.md  < 800 words  (Haiku — 컨텍스트 절약 필수)
  coder.md       < 1200 words (Sonnet)
  reviewer.md    < 1500 words (Sonnet)
  architect.md   < 1200 words (Opus — 비용 높음)
  judge.md       < 1000 words (Opus — 비용 높음)
  orchestrator.md < 2000 words (Sonnet — 마스터 프롬프트)
```

### 4.2 프롬프트 압축 기법
- **On-demand Loading**: 에이전트가 항상 필요하지 않은 섹션은 "필요 시 `governance/rules/X.md` 참조" 로 대체
- **Tier별 Detail Level**: Haiku 에이전트는 핵심만, Opus 에이전트는 상세 허용
- **Example Pruning**: 출력 형식 예시는 1개로 제한 (3개 → 1개)
- **Shared Preamble Extraction**: 공통 규칙은 governance/rules/에 분리, 에이전트별 중복 제거

### 4.3 MoA 비용 제어 검증
MoA 모드 사용 시 토큰 비용 = 3 × (에이전트 프롬프트 + 응답) × 라운드 수.
```
최적화 체크:
[ ] Round 2+ 입력에 이전 응답 전문이 아닌 요약(3줄)만 주입하는가?
[ ] max_rounds가 태스크 복잡도에 맞게 설정되는가? (단순 비교=2, 아키텍처=3)
[ ] Early Stop이 활성화되어 불필요한 라운드를 스킵하는가?
[ ] Judge 호출은 완전 불일치 시에만 발생하는가?
```

### 4.4 Lazy Context 패턴
```typescript
// BAD: 항상 모든 learnings 로드
const learnings = searchLearnings({ ... }); // 매 호출 JSONL 전체 파싱

// GOOD: 필요할 때만 로드
let _learnings: LearningEntry[] | null = null;
function getLearnings() {
  if (!_learnings) _learnings = searchLearnings({ ... });
  return _learnings;
}
```

---

## Phase 5: Validation & Report (검증 및 보고)

### 5.1 통합 검증
```bash
# 빌드 검증
npm run build

# 전체 테스트
npm run test

# 에이전트 프롬프트 크기 검사
for f in .claude/agents/*.md; do
  words=$(wc -w < "$f")
  echo "$f: ${words} words"
done
```

### 5.2 Adversarial + Harness 검증

**Adversarial Verification** (`lib/adversarial.ts`):
- `runAdversarialChecks()` 실행 — 진입점 존재, 쓰레기 파일, 깨진 참조, 컨텍스트 신선도, 에이전트-규칙 중복 검증
- `calculateBiasDelta()` — Score/Confidence/Bias Delta 출력
- Bias Delta >= 5 시 경고 표시

**Harness 성숙도** (`lib/harness-score.ts`):
- 12원칙 점수를 평가하고 L1-L5 등급 출력
- 이전 측정 대비 변화 추적

### 5.3 최적화 보고서
Phase 1-4 결과를 구조화 출력:

```
═══════════════════════════════════════
POST-INTEGRATION OPTIMIZATION REPORT
═══════════════════════════════════════

Integration Map:
  New modules: 3
  Connections established: 7/9 (78%)
  Connections deferred: 2 (reason noted)

Cross-Module Wiring:
  Import-and-Call: 4 connections
  Context Injection: 2 connections
  Event Trigger: 1 connection

Trigger Optimization:
  Triggers defined: 8
  Unnecessary triggers removed: 1
  Lazy loading applied: 2 modules

Token Cost:
  Before: ~8,200 words across agents
  After:  ~7,800 words (-5%)
  MoA cost check: PASS
  Oversized agents: none

Validation:
  Build: PASS
  Tests: 67/67 PASS
  Type check: PASS
═══════════════════════════════════════
```

### 5.4 결과 기록
- `.context/CURRENT.md`에 최적화 완료 기록
- `lib/learnings.ts`로 발견된 패턴/개선사항 자동 기록
- `lib/analytics.ts`로 최적화 실행 이벤트 기록

---

## 자동 실행 통합

### /vibe (세션 시작) 연계
세션 시작 시 변경 감지:
```
Step 0.5 (auto):
  git diff --name-only HEAD~1..HEAD 에서 lib/, .claude/agents/, governance/ 변경 확인
  → 감지되면: "메이저 통합 감지. Post-Integration Optimization 실행합니다."
  → Phase 1-5 자동 수행
```

### /end (세션 종료) 연계
세션 중 새 모듈이 추가된 경우:
```
Step 6.5 (auto):
  세션 중 생성된 lib/*.ts, .claude/agents/*.md 파일 확인
  → 있으면: 커밋 전 PIOP Phase 1 (Integration Map) 실행
  → 미연결 항목 발견 시: 경고 표시 + 다음 세션 TODO로 등록
```

### orchestrator.md 연계
멀티에이전트 실행 완료 후:
```
Phase 5.5 (auto):
  서브에이전트가 새 파일을 생성한 경우
  → PIOP Phase 1 (연결 지도) 자동 실행
  → 미연결 항목을 CURRENT.md의 Next Tasks에 추가
```
