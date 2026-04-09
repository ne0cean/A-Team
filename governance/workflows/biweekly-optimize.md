---
description: 2주 주기 A-Team 정기 최적화. /vibe→실행→/end 전체 트리거 체인의 건강도를 7축 평가 후 자동 최적화 수행.
trigger: 격주 실행 (마지막 실행일로부터 14일 경과 시 /vibe Step 0.5에서 자동 감지)
---

# Biweekly A-Team Optimization Protocol

> `/vibe`와 `/end`만이 시스템의 입구와 출구다.
> 그 사이의 모든 것은 **트리거 체인**으로 연결된다.
> 이 프로토콜은 그 체인의 건강도를 정기 점검한다.

---

## 0. 실행 시점 판단

```bash
# 마지막 최적화 날짜 확인
LAST=$(grep -m1 'biweekly-optimize' .context/SESSIONS.md 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | tail -1)
TODAY=$(date +%Y-%m-%d)
# 14일 이상 경과 시 실행, 아니면 스킵
```

수동 실행: `/optimize --biweekly`

---

## 1. 트리거 체인 맵 (Trigger Chain Map)

아래 전체 체인에서 **끊어진 링크**를 탐지한다.

### 1.1 `/vibe` → 실행 체인 (입구)

```
/vibe
 ├─ 0.3 Daily Tip ──→ governance/reference/daily-tips.md [READ]
 ├─ 0.5 PIOP 감지 ──→ /optimize ──→ governance/workflows/post-integration.md
 │                      └─ Phase 1~5 ──→ lib/*.ts 연결 검증
 ├─ 0.7 학습 로드 ──→ lib/learnings.ts (searchLearnings)
 │                  └─→ lib/instinct.ts (shouldApply)
 ├─ 0.8 Pending ────→ improvements/pending.md [READ, A-Team only]
 ├─ 1   컨텍스트 ──→ .context/CURRENT.md + DECISIONS.md + memory/MEMORY.md
 ├─ 2   분류 ──────→ .context/GEMINI_TASKS.md [WRITE]
 ├─ 3   모드 ──────→ orchestrator (🟡/🔴/🟣 시)
 │                  └─→ 직접 실행 (🟢 시)
 ├─ 3.5 Ralph ─────→ /ralph start 또는 /re pipeline
 └─ 3.7 Auto Mode ─→ (안내만, 트리거 없음)
```

### 1.2 orchestrator 실행 체인 (허브)

```
orchestrator
 ├─ Phase 0 ──→ governance/rules/preamble.md [READ]
 │             └─→ lib/hook-flags.ts (shouldRunHook)
 ├─ Phase 1 ──→ .context/CURRENT.md + CLAUDE.md [READ]
 ├─ Phase 2 ──→ 에이전트 라우팅:
 │   ├─ researcher (haiku)
 │   ├─ coder (sonnet) ─→ PostToolUse 훅 ─→ ui-inspector [UI 파일 시]
 │   │                  └─→ lib/quality-gate.ts + lib/config-protection.ts
 │   ├─ reviewer (sonnet) ─→ lib/coverage-audit.ts
 │   │                     ├─→ lib/confidence.ts
 │   │                     ├─→ lib/adversarial.ts
 │   │                     └─→ lib/gate-manager.ts
 │   ├─ architect (opus)
 │   ├─ judge (opus) ─── [MoA 불일치 시만]
 │   ├─ ui-inspector (sonnet)
 │   └─ guardrail (haiku) ─── [coder 완료 후]
 ├─ Phase 3 ──→ PARALLEL_PLAN.md [WRITE]
 │   └─ 3.5 ──→ lib/worktree.ts + scripts/dispatch.sh
 │   └─ 3.7 ──→ lib/learnings.ts (searchLearnings → prior_learnings 주입)
 ├─ Phase 4 ──→ 에이전트 실행
 │             └─→ lib/circuit-breaker.ts (실패 추적)
 │             └─→ lib/self-healing.ts (자동 복구)
 │             └─→ lib/state-machine.ts (phase 전환 추적)
 └─ Phase 5 ──→ CURRENT.md 갱신
     └─ 5.5 ──→ scripts/merge-dispatch.sh
     └─ 5.7 ──→ PIOP (새 파일 생성 시)
```

### 1.3 `/end` → 종료 체인 (출구)

```
/end
 ├─ 1   CURRENT.md 갱신 ──→ .context/CURRENT.md [WRITE]
 ├─ 2   SESSIONS.md 로그 ─→ .context/SESSIONS.md [APPEND]
 ├─ 3   빌드 검증 ────────→ npm run build / test
 ├─ 3.5 세션 데이터 저장 ─→ lib/learnings.ts (logLearning)     ←─┐
 │                        ├─→ lib/cost-tracker.ts (getSummary)    │ 피드백 루프
 │                        ├─→ lib/analytics.ts (logEvent)         │ (다음 /vibe 0.7로)
 │                        └─→ lib/eval-store.ts (save)          ←─┘
 ├─ 3.7 PIOP 검사 ────────→ governance/workflows/post-integration.md Phase 1
 ├─ 4   커밋 ──────────────→ git commit
 ├─ 5   시각 검증 ─────────→ (프론트엔드 시)
 ├─ 6   Push ──────────────→ git push
 └─ 7   Research Mode ────→ /re start (선택)
```

### 1.4 피드백 루프 (순환 연결)

```
/end Step 3.5 learnings.logLearning() ───→ /vibe Step 0.7 learnings.searchLearnings()
/end Step 3.5 analytics.logEvent()    ───→ (현재 소비자 없음) ⚠️
/end Step 3.5 eval-store.save()       ───→ (현재 소비자 없음) ⚠️
/end Step 3.5 cost-tracker.getSummary()──→ SESSIONS.md (간접)
/end Step 3.7 PIOP Phase 1            ───→ /vibe Step 0.5 PIOP 재감지
/improve (외부 프로젝트)              ───→ /vibe Step 0.8 pending 감지
```

---

## 2. 7축 평가 기준

### 축 1: 트리거 체인 완전성 (Chain Completeness)
> 모든 모듈이 /vibe 또는 /end에서 시작하는 경로로 도달 가능한가?

```bash
# 모든 lib 모듈의 참조 체인 검증
for mod in lib/*.ts; do
  name=$(basename "$mod" .ts)
  refs=$(grep -rl "$name" .claude/ governance/ 2>/dev/null | wc -l)
  echo "$refs refs → $name"
done | sort -n
```

- 0 refs = **고아** (즉시 연결 또는 제거)
- 1 ref = **단일 의존점** (리스크 평가)
- 2+ refs = 정상

**점수**: (연결된 모듈 수 / 전체 모듈 수) × 100

### 축 2: 계위 일관성 (Hierarchy Consistency)
> vibe → orchestrator → agents → libs 계층 구조가 지켜지는가?

검증 항목:
- [ ] commands가 lib를 직접 호출하지 않고 agents를 통하는가? (예외: vibe/end의 저비용 직접 호출은 허용)
- [ ] agents가 다른 agents를 직접 호출하지 않는가? (orchestrator만 라우팅)
- [ ] lib 모듈 간 순환 의존이 없는가?
- [ ] governance/rules은 agents에서만 참조되는가?

**점수**: (위반 없는 항목 수 / 4) × 100

### 축 3: 토큰 효율성 (Token Efficiency)
> 세션당 자동 로드되는 토큰이 최소인가?

```bash
# 매 세션 자동 로드 크기
wc -w .claude/commands/vibe.md              # 입구
wc -w .claude/agents/orchestrator.md        # 허브 (조건부)
wc -w .claude/commands/end.md               # 출구
# 총합 및 이전 대비 변화 계산
```

타겟:
| 파일 | 타겟 | 초과 시 |
|------|------|--------|
| vibe.md | < 800 words | 외부화 |
| orchestrator.md | < 1000 words | MoA처럼 분리 |
| end.md | < 500 words | 스텝 통합 |
| 에이전트 전체 | < 8000 words | thin 래퍼 전환 |
| 커맨드 전체 | < 8000 words | 서브에이전트 위임 |

**점수**: (타겟 이내 항목 수 / 5) × 100

### 축 4: 연쇄 효율성 (Cascade Efficiency)
> 트리거에서 실행까지 홉 수가 적정한가?

최대 허용 홉:
- 사용자 요청 → 실제 코드 수정: **≤ 4홉**
  (vibe → orchestrator → coder → 결과)
- 선택 항목 도달: **≤ 2홉**
  (vibe → 조건 체크 → 스킵)

**측정**: 각 lib 모듈까지의 최단 홉 수 계산
```
/vibe → orchestrator → reviewer → lib/confidence.ts = 3홉 ✅
/vibe → orchestrator → ??? → lib/state-machine.ts = ? 홉
```

홉 > 4인 모듈 = **과도한 깊이** (단축 또는 직접 연결 검토)
홉 0인 모듈 = **미연결** (고아)

**점수**: (4홉 이내 모듈 수 / 전체) × 100

### 축 5: 피드백 루프 폐합율 (Feedback Loop Closure)
> /end에서 저장한 데이터가 다음 /vibe에서 실제로 소비되는가?

| /end 저장 | /vibe 소비 | 상태 |
|-----------|-----------|------|
| learnings.logLearning | learnings.searchLearnings (0.7) | ✅ 폐합 |
| analytics.logEvent | ??? | ❌ 미폐합 |
| eval-store.save | ??? | ❌ 미폐합 |
| cost-tracker.getSummary | SESSIONS.md (간접) | 🟡 약한 폐합 |
| PIOP Phase 1 | /vibe 0.5 재감지 | ✅ 폐합 |

**점수**: (폐합 루프 수 / 전체 저장 포인트 수) × 100

### 축 6: 퍼포먼스 (Performance)
> 빌드와 테스트가 안정적인가?

```bash
npm run build && npm run test
```

- 테스트 통과율
- 테스트 실행 시간 (목표: < 3초)
- 이전 대비 테스트 수 변화

**점수**: (통과 테스트 / 전체 테스트) × 100

### 축 7: Dead Path 비율 (Dead Path Ratio)
> 정의됐지만 실제로 실행되지 않는 코드 경로의 비율

검출 방법:
- agents에서 참조하지만 실제 lib에 없는 함수
- lib에 export됐지만 어디서도 import하지 않는 함수
- commands 중 agents description에서 라우팅되지 않는 것
- governance/rules 중 orchestrator Phase 0에서 로드하지 않는 것

```bash
# lib export → 참조 확인
for f in lib/*.ts; do
  name=$(basename "$f" .ts)
  exports=$(grep -cE '^export' "$f")
  refs=$(grep -rl "$name" .claude/ governance/ 2>/dev/null | wc -l)
  [ "$refs" -eq 0 ] && echo "DEAD: $name ($exports exports, 0 refs)"
done
```

**점수**: (1 - Dead Path 수 / 전체 경로 수) × 100

---

## 3. 최적화 실행

### 3.1 점수 계산 및 보고

```
═══════════════════════════════════════════════════════
BIWEEKLY A-TEAM HEALTH REPORT — {YYYY-MM-DD}
═══════════════════════════════════════════════════════

축 1: 트리거 체인 완전성    {점수}/100  (이전: {N})  {↑↓}
축 2: 계위 일관성           {점수}/100  (이전: {N})  {↑↓}
축 3: 토큰 효율성           {점수}/100  (이전: {N})  {↑↓}
축 4: 연쇄 효율성           {점수}/100  (이전: {N})  {↑↓}
축 5: 피드백 루프 폐합율    {점수}/100  (이전: {N})  {↑↓}
축 6: 퍼포먼스              {점수}/100  (이전: {N})  {↑↓}
축 7: Dead Path 비율        {점수}/100  (이전: {N})  {↑↓}

종합 점수:  {평균}/100  등급: {S/A/B/C/D}
═══════════════════════════════════════════════════════
```

등급 기준:
- **S** (95+): 최적 상태. 유지만
- **A** (85-94): 우수. 미세 조정
- **B** (70-84): 양호. 1~2개 축 개선 필요
- **C** (50-69): 주의. 구조적 문제 존재
- **D** (<50): 위험. /vibe→/end 체인 대규모 수리 필요

### 3.2 자동 수정 (점수 < 85인 축)

| 축 | 자동 수정 |
|----|----------|
| 1 (체인) | 고아 모듈 → 가장 적합한 agent에 연결 |
| 2 (계위) | 위반 참조를 올바른 계층으로 이동 |
| 3 (토큰) | 초과 파일 → on-demand 외부화 |
| 4 (연쇄) | 4홉 초과 → 직접 연결 단축 |
| 5 (루프) | 미폐합 저장점 → /vibe에 소비 로직 추가 |
| 6 (성능) | 실패 테스트 수정, 느린 테스트 최적화 |
| 7 (Dead) | Dead Path → 제거 또는 연결 |

### 3.3 결과 기록

1. `.context/SESSIONS.md`에 `[biweekly-optimize]` 항목 추가
2. `improvements/done.md`에 수행한 최적화 기록
3. `lib/eval-store.ts`로 7축 점수 저장 (다음 실행 시 비교)
4. `lib/learnings.ts`로 발견 패턴 기록

---

## 4. /vibe 연동

`/vibe` Step 0.5에서 biweekly 감지를 추가:
```
마지막 biweekly-optimize로부터 14일 이상 경과?
  → YES: "🔄 정기 최적화 시점입니다. 실행합니다." → 이 워크플로우 실행
  → NO: 스킵
```

---

## 5. 핵심 원칙

- **/vibe에서 도달할 수 없는 코드는 존재하지 않는 것과 같다**
- **/end에서 저장하고 /vibe에서 꺼내지 않는 데이터는 낭비다**
- **계위를 뛰어넘는 호출은 기술 부채다**
- **4홉을 넘는 체인은 깨지기 쉬운 체인이다**
- **모든 최적화는 빌드/테스트 통과 후에만 확정한다**
