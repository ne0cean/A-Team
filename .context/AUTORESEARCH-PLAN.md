# AUTORESEARCH-PLAN — Shadow Mode (자동 트리거 + 지속 평가)

> 사용자 지시 (2026-04-15): "테스트 기간 동안 내가 명시적으로 말하지 않아도, 맥락에 맞게 자동으로 트리거링 되고, 네가 성능을 계속 평가해야해. 그래야 완전 통합 여부와 수준을 결정하지."
>
> 이 문서는 **shadow mode**로 autoresearch의 통합 가치를 실제 사용 데이터로 검증한다. 사용자 명시 호출 없이, tracked 커맨드가 실제 사용될 때마다 자동 로깅 + 자기 평가 + 주기 판정.

---

## Status

**Mode**: `SHADOW-TRACKING` (active)
**Started**: 2026-04-15
**Decision ETA**: 2026-05-13 (4주 후) 또는 20+ sessions 축적 시 조기 판정

---

## 원칙 — 자동 트리거 + 지속 평가

A-Team 세션에서 **tracked command**(아래 명시)가 호출될 때마다:

1. Claude는 해당 커맨드 실행 완료 후 **자동으로**:
   - `.autoresearch/_shadow/<name>/log.jsonl`에 사용 로그 append
   - `governance/skills/autoresearch/shadow-evals.yaml`의 해당 커맨드 eval suite로 **self-scoring**
   - 점수 + 메타데이터 로그에 기록

2. 세션 시작 시 (첫 응답 이전) **자동으로**:
   - 모든 tracked 커맨드의 log.jsonl 확인
   - 7일 이상 경과한 집계 없으면 weekly-report.md 갱신
   - 자동 판정 조건 충족 시 Phase 전환 알림

3. 집계 데이터가 조건 충족 시 **자동 판정 제안**:
   - 최소 3주 + 커맨드별 15+ runs 축적
   - 4주 rolling avg delta 계산 후 Phase 4A/4B/4C 자동 분기 제안

---

## Tracked Commands (초기 3개)

| Command | 선택 근거 | 예상 주간 호출 | baseline 전략 |
|---------|-----------|--------------|--------------|
| `/office-hours` | 자주 사용, 구조화 출력 (Tier 1 eval 용이), 낮은 리스크 | 5~10회 | 첫 3회는 baseline 측정 (변경 없음) |
| `/blueprint` | 최근 통합, 사용 패턴 미지, validator로 Tier 1 자동 가능 | 2~5회 | 첫 3회는 baseline |
| `/plan-eng` | 성숙한 커맨드, 품질 개선 여지 측정 기준 | 2~5회 | 첫 3회는 baseline |

추적 범위는 점진 확대 가능. `AUTORESEARCH-PLAN.md`의 이 섹션을 수정해 추가/제거.

---

## 자동 트리거 프로토콜 (Claude 의무)

### Trigger 1: Tracked command 사용 감지 (PostToolUse-like)

사용자가 명시적(`/office-hours ...`) 또는 맥락적(Claude가 해당 스킬 트리거)으로 tracked 커맨드를 사용할 때:

**Claude의 자동 동작** (커맨드 완료 직후, 사용자 응답 전):
1. `.autoresearch/_shadow/<name>/` 디렉토리 없으면 생성
2. `log.jsonl`에 엔트리 1줄 append:
   ```json
   {"ts":"2026-04-15T10:30:00Z","command":"office-hours","input_first_30":"AI 요약 SaaS 팔고 싶은데...","session_id":"s-abc","git_commit":"5585cc4","self_score":{"binary_pass":4,"binary_total":5,"binary_rate":0.8,"comparative_note":"구체적 질문 1단계 좋음, 3단계 대안 다양성 보통"},"duration_turns":6}
   ```
3. 로깅은 **사용자에게 드러내지 않는다** (나레이션 금지 원칙 준수). 로그가 기록됐다는 사실을 별도 언급하지 말 것.
4. 로그 append에 실패해도 커맨드 결과 제공을 방해하지 않음 (graceful degrade).

### Trigger 2: 세션 시작 시 집계 + 판정

세션 시작 첫 응답 작성 직전:

1. `.autoresearch/_shadow/` 디렉토리 존재 확인. 없으면 스킵.
2. 각 tracked 커맨드 폴더에 대해:
   a. `weekly-report.md` 마지막 집계 날짜 확인 (없으면 "never")
   b. ≥ 7일 경과 OR 새 엔트리 ≥ 10건 → 집계 실행:
      - 해당 주간 runs 수
      - 평균 binary_pass_rate
      - 주요 failing eval (최다 fail)
      - 트렌드 화살표 (이전 주 대비 ↑/→/↓)
   c. 결과를 `weekly-report.md` 상단에 추가
3. **판정 조건 충족 시** 사용자에게 한 블록으로 알림:
   ```
   🔬 Autoresearch Shadow: [command] 판정 준비 완료
      4주 평균 binary: [X]% (baseline [Y]%, delta [+Z]%p)
      제안: Phase 4[A/B/C] — [설명]. 지금 적용할까요?
   ```

### Trigger 3: Eval suite drift 감지 (자체 보호)

매 10회 로깅마다 Claude는:
1. 최근 10 log 엔트리의 binary_pass_rate 확인
2. 만약 모든 엔트리가 100% 또는 모두 0% → **eval이 차별하지 못함** (False positive 위험)
3. 이 경우 `.autoresearch/_shadow/<name>/DRIFT-WARNING.md` 작성 + 다음 세션 시작 시 사용자에게 알림:
   ```
   ⚠️ [command] eval suite 재설계 필요 — 최근 10회 모두 [100%/0%]. 구분력 상실.
   ```

---

## Phase State Machine

### Phase 1 — INTEGRATION ✅ COMPLETE (2026-04-15)
커맨드 2개 배포 + validator + IMP 등록.

### Phase 2 — SHADOW-TRACKING ⏳ ACTIVE (2026-04-15 ~)

**What**: Tracked 커맨드가 실제 사용될 때마다 자동 로깅 + self-eval. 사용자 트리거 불필요.

**Baseline 측정**:
- 각 tracked 커맨드의 최초 3회 사용분이 **자동 baseline**이 됨
- 이 기간에 커맨드 파일은 수정 금지 (baseline 오염 방지)
- 3회 후 baseline_binary_pass_rate 자동 계산 → `_shadow/<name>/baseline.json`에 고정

**Ongoing 측정**:
- 4회째부터는 "post-baseline" 측정치
- 주간 rolling avg vs baseline으로 delta 계산

**완료 조건 (Phase 2 → Phase 3 전환)**:
- 경과 ≥ 3주 AND 누적 runs ≥ 15 (커맨드당)
- OR 경과 ≥ 6주 (어느 조건)
- OR 사용자 "지금 판정해" 명시적 요청

### Phase 3 — AUTO-DECISION (자동 전환, 비용 없음)

**What**: Phase 2 데이터를 자동 분석 + 판정 제안.

**Decision logic** (커맨드별 독립):
```
avg_delta = mean(week_N-3 ... week_N-0) - baseline_pass_rate

if avg_delta >= 15%p:   → Level 1 제안 (해당 커맨드만)
if 5 <= avg_delta < 15: → Toolbox-only 확인
if avg_delta < 5:       → Low-priority 확인
```

전체 tracked 커맨드 3개 중 2개 이상이 +15%p → **Level 2 (통합 파이프라인)** 제안 가능.
단 하나만 +15 → 해당 커맨드만 Level 1.

**출력**:
- `.autoresearch/_shadow/DECISION-REPORT.md` 작성
- 세션 시작 알림에 판정 + 제안 표시

### Phase 4 — EXECUTE (사용자 확인 후)

각 커맨드별 독립:
- **4A Level 1 통합**: 해당 커맨드의 품질 회귀 감지를 `/craft` 또는 `/ship`에 훅킹 (사용자 확인 필요)
- **4B Toolbox-only**: shadow mode 유지 또는 중단, 도구박스에 보관
- **4C Low-priority**: shadow mode 중단, 도구박스 보관

**완료 후**: 이 문서의 `Mode`를 `DECIDED` 또는 `DISMISSED`로 업데이트.

---

## 데이터 위치

```
.autoresearch/_shadow/                      (gitignored — 로컬 실험 데이터)
├── _TEMPLATE.md                           (seed, 참고용)
├── office-hours/
│   ├── log.jsonl                          (모든 사용 로그)
│   ├── baseline.json                       (최초 3회 측정)
│   ├── weekly-report.md                    (주간 집계)
│   └── DRIFT-WARNING.md                   (eval drift 시)
├── blueprint/                              (동일 구조)
├── plan-eng/                               (동일 구조)
└── DECISION-REPORT.md                      (Phase 3 판정)

governance/skills/autoresearch/
└── shadow-evals.yaml                      (tracked 커맨드 eval suites — 커밋됨)
```

---

## Self-Scoring 편향 관리

Claude가 자기 평가하는 구조의 편향 위험:
- **과대평가** (self-serving bias): Claude가 자기 출력을 관대하게 채점
- **과소평가** (calibration drift): 완벽주의 기준으로 낮게 채점

**완화 방법**:
1. eval suite는 **Tier 1-2 50%+ deterministic** 강제 (`shadow-evals.yaml` 설계 시)
2. 매 10회 drift 감지 (Trigger 3) — 100%/0% 일색이면 eval 재설계
3. 월 1회 사용자 sanity check: "최근 shadow 판정 맞나요?" 확인 — 필요 시 eval 보정
4. Phase 3 판정 시 **단일 커맨드 +15%p**가 아닌 **3개 중 2개 이상 +15%p**를 Level 2 조건으로 (n=1 노이즈 방지)

---

## 사용자 오버라이드

- **shadow mode 즉시 중단**: 이 문서의 `Mode`를 `PAUSED`로 변경
- **tracked 확장**: `Tracked Commands` 표에 행 추가 (Claude가 다음 세션부터 감지)
- **eval 수정**: `governance/skills/autoresearch/shadow-evals.yaml` 직접 편집
- **판정 강제**: `/autoresearch shadow-decision` (future skill) 또는 직접 "지금 판정해"

---

## Phase Log

| Phase | 상태 | 시작 | 완료 | 결과 |
|-------|------|------|------|------|
| 1 INTEGRATION | ✅ DONE | 2026-04-15 | 2026-04-15 | 커맨드 2 + validator |
| 2 SHADOW-TRACKING | ⏳ ACTIVE | 2026-04-15 | — | — |
| 3 AUTO-DECISION | ⬜ | — | — | — |
| 4 EXECUTE | ⬜ | — | — | — |

---

## References

- 설계 문서: `governance/experimental/jangpm-integration-design.md`
- Shadow eval suites: `governance/skills/autoresearch/shadow-evals.yaml`
- 통합 커맨드: `.claude/commands/autoresearch.md`
- 원본 방법론: [Karpathy autoresearch](https://github.com/karpathy/autoresearch) (MIT)
