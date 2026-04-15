# AUTORESEARCH-PLAN — 자동 진행 상태 머신

> 사용자 지시 (2026-04-15): "시일에 따라 자동 수행. 별도 명령 없이. 세션 시작 시 알림."
>
> 이 문서는 `/autoresearch` 도입 경로를 phase로 관리한다. **세션 시작 시 Claude가 이 문서를 읽고 현재 phase와 다음 액션을 사용자에게 알린다.** 명시적 거부가 없으면 gate 조건에 따라 자동 진행.

---

## Current Phase: **Phase 2 (파일럿) 대기**

- **Last Updated**: 2026-04-15
- **Next Action**: `/office-hours` 대상으로 autoresearch baseline + 3~5 experiments
- **Gate**: 사용자 세션에서 "시작"/"go"/"실행"/묵시적 OK 중 하나 + settings.json permissions 확인
- **Blocker**: `~/.claude/settings.json`의 `permissions.allow`에 다음 엔트리 필요 — 없으면 자율 루프가 매 Edit마다 승인 요청해서 깨진다:
  ```json
  "Edit(.claude/commands/**)", "Write(.claude/commands/**)",
  "Edit(governance/skills/**)", "Write(governance/skills/**)"
  ```

---

## 세션 시작 시 Claude 동작 (의무)

**세션이 시작되면** (`/vibe` 또는 자동 `SessionStart` 훅 후) Claude는:

1. `.context/AUTORESEARCH-PLAN.md` (이 파일) 읽음
2. 현재 phase 상태 확인 후 **첫 응답에서 한 블록으로 사용자에게 알림**:

```
🔬 Autoresearch Plan: [current phase]
   Next: [next_action]
   Gate: [gate_condition]
   진행하시겠습니까? (y / skip / 나중에)
```

3. 사용자 응답에 따라:
   - "y" / "go" / "시작" / "진행" / 묵시적 OK → 해당 phase 자동 실행
   - "skip" / "나중에" / "no" → phase 유지, 다음 세션에 재알림
   - "멈춰" / "취소" / "ABORT" → phase를 `ABORTED`로 표시, 자동 알림 중단

4. 알림 후 **사용자가 다른 주제를 꺼내면 그것을 우선**. Autoresearch는 백그라운드 알림일 뿐.

---

## Phase State Machine

### Phase 1 — INTEGRATION ✅ COMPLETE (2026-04-15)

**What**: jangpm-meta-skills 통합. `/autoresearch` + `/blueprint` + reflect IMP.

**Evidence**:
- Commit chain: `c6885ed` → `2297f39` → `465abd1`
- 파일 존재: `.claude/commands/autoresearch.md`, `governance/skills/autoresearch/*.md` (7)
- Skill tool 등록 확인

---

### Phase 2 — PILOT ⏳ ACTIVE (대기 중)

**What**: `/office-hours` 커맨드를 autoresearch로 최적화. 실측 개선폭 측정.

**Inputs**:
- Target: `.claude/commands/office-hours.md`
- Test inputs 5개 (researcher 권고):
  1. "AI 요약 SaaS 팔고 싶은데 어떻게 시작할까요?" (시장검증 기본)
  2. "주말에 폐기 소재 재활용 매칭 앱 해볼 생각이에요. 어떤 기술 스택?" (해커톤 엣지)
  3. "뭔가 좋은 도구 만들고 싶은데 아이디어가 없어요." (모호 요청)
  4. "기존 앱 온보딩 개선 — 사용자 5명, 분석 도구 없음" (프로덕트 개선)
  5. "팀 2명, 예산 $50k/월, 3개월 MVP — B2B SaaS 빌더" (복합 제약)
- Evals 6개 (50% Tier 1, 50% Tier 3 comparative) — 상세는 `governance/skills/autoresearch/eval-guide.md` 준수해 실행 시 생성

**Budget**:
- 실험 수: 10~15회
- 예상 API 호출: 약 90회 (Sonnet)
- 예상 비용: $15~25
- 예상 기간: 2~3일 (자율 루프)

**Execution Protocol**:
1. `~/.claude/settings.json` permissions 확인 (없으면 사용자에게 추가 요청)
2. `/autoresearch` 호출, step 0~5 수행
3. 첫 3 experiments는 human review (사용자 자리에 있으면)
4. 이후 auto 모드 전환, `NEVER STOP` 준수하되 A-Team `autonomous-loop.md` 6 강제 조항 우선
5. 완료 조건: 95%+ pass rate 3회 연속 OR 15 experiments 도달 OR 예산 $25 도달

**Gate to Phase 3**:
- `.autoresearch/office-hours/results.json`에 최종 score 기록됨
- baseline → final delta 측정 가능

---

### Phase 3 — ANALYSIS (Phase 2 완료 시 자동)

**What**: 파일럿 결과를 읽고 다음 분기 결정.

**Execution**: 사용자 명령 불필요. Phase 2 완료 감지 즉시 자동 실행.

**Decision Tree**:
```
delta = final_binary_pass_rate - baseline_binary_pass_rate

if delta >= 15:      → Phase 4A (LEVEL 1 INTEGRATION)
if 5 <= delta < 15:  → Phase 4B (TOOLBOX-ONLY)
if delta < 5:        → Phase 4C (LOW-PRIORITY / KEEP AS TOOL)
```

**Deliverable**: 
- `.autoresearch/office-hours/ANALYSIS.md` — 실측 수치 + 판정 + 근거
- `CURRENT.md` 및 이 파일 업데이트 (Phase 4 진입)

---

### Phase 4A — LEVEL 1 INTEGRATION (delta ≥ 15%p)

**What**: autoresearch를 주요 파이프라인(`/craft`, `/ship`, `/end`)의 품질 게이트로 통합.

**Scope** (설계 단계에서 확정):
- `/craft` STEP 2.5 또는 STEP 4에 autoresearch 실측 훅 추가
- `/ship` Step 5.5에 품질 회귀 감지
- `/end` Step 3.5에 세션별 커맨드 품질 스냅샷

**Gate**: 사용자 확인 필요 (통합 범위가 커서 auto-execute 안 함)

**Fallback**: 사용자가 Level 1을 거부하면 Phase 4B로 다운그레이드.

---

### Phase 4B — TOOLBOX-ONLY (5 ≤ delta < 15%p)

**What**: autoresearch를 주요 파이프라인에 통합하지 않고 도구박스에 그대로 유지. 선별적 수동 사용.

**Action**:
- `.context/AUTORESEARCH-PLAN.md` → `STATUS: TOOLBOX-ONLY, COMPLETE` 업데이트
- 세션 시작 알림 중단
- `improvements/pending.md`에 "커맨드별 autoresearch 선별 적용" 가이드 등록 (P3)

---

### Phase 4C — LOW-PRIORITY (delta < 5%p)

**What**: autoresearch의 가성비가 낮다는 실증. 도구박스에 두되 "필요할 때만".

**Action**:
- `.context/AUTORESEARCH-PLAN.md` → `STATUS: LOW-PRIORITY, COMPLETE`
- `CURRENT.md` Next Tasks에서 autoresearch 파일럿 관련 항목 제거
- jangpm 통합의 "실제 가치"를 `done.md`에 기록 (냉정한 평가로 교훈화)

---

## Phase Log

| Phase | 상태 | 시작 | 완료 | 결과 |
|-------|------|------|------|------|
| 1 INTEGRATION | ✅ DONE | 2026-04-15 | 2026-04-15 | 통합 완료, 커맨드 2개 추가 |
| 2 PILOT | ⏳ WAITING | — | — | — |
| 3 ANALYSIS | ⬜ | — | — | — |
| 4 EXECUTE | ⬜ | — | — | — |

---

## Time-based Nudge (강제 진행 없음)

이 plan은 **세션 시작 알림 기반**. 시간 경과로 자동 실행하지 않는다. 이유:
- Phase 2는 $20 비용 + 3일 자율 루프 → 사용자 인지 없이 실행 불가
- Phase 3는 Phase 2 결과 의존 → 선행 필수

예외:
- **2026-05-15까지 Phase 2 진행 안 되면** (한 달 경과), 세션 시작 알림에 "autoresearch 파일럿 보류 중 — 정말 필요한가?" 라는 **재평가 질문** 추가. 사용자가 다시 확인 후 진행 여부 결정.

---

## 사용자 오버라이드

사용자가 언제든지 이 plan을 수동 조정 가능:

- **즉시 취소**: `/autoresearch` 폐기 → 이 파일 삭제 + `.claude/commands/autoresearch.md` 삭제 고려
- **phase 건너뛰기**: 특정 phase를 "SKIP"으로 표시하면 다음 phase로
- **target 변경**: Phase 2의 target을 `/office-hours` 대신 다른 커맨드로

각 오버라이드는 이 문서를 직접 수정.

---

## References

- 설계 문서: `governance/experimental/jangpm-integration-design.md`
- 통합 커맨드: `.claude/commands/autoresearch.md`
- 참조 가이드: `governance/skills/autoresearch/*.md` (7개)
- 원본 방법론: [Karpathy autoresearch](https://github.com/karpathy/autoresearch) (MIT)
