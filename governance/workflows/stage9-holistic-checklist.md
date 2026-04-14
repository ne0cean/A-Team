# Stage 9 Holistic — 실행 체크리스트

> Wave 1-3 통합 완료 후 Stage 9 진입 시 단계별 체크리스트. 문서는 `docs/research/2026-04-optimization/final/STAGE9_HOLISTIC.md`에 근거.

---

## 진입 조건 (Trigger)

- [ ] Wave 1 실측 완료, G5 + G7 통과
- [ ] Wave 2 실측 완료, G5 + G7 통과
- [ ] Wave 3 실측 완료, G5 + G7 통과
- [ ] 7일 soak 무 regression

---

## Phase 9.1 — Cross-Wiring 정의 (Day 1-2)

### 중복 기능 해결
- [ ] `governance/workflows/tool-routing-pipeline.md` 작성
  - RFC-003 ToolSearch 먼저 로드 → RFC-006 Budget-Aware가 cost 추정 → 실행
  - Haiku tier-2 non-deferred fallback 정책 (F5)
- [ ] `governance/rules/eval-untrusted-policy.md` 작성
  - RFC-005 promptfoo input은 합성 테스트 데이터 → spotlight 불필요 명시
- [ ] Cache invalidation 통합 정책
  - RFC-001 cache + RFC-002 handoff 조합 시 mtime 기반 version hash

### 호출 그래프 추출
- [ ] Langfuse (RFC-005) trace 데이터 1주일 수집
- [ ] 핫스팟 테이블 `final/CALL_GRAPH_v2.md` 생성
- [ ] 중복 경로 식별 (어느 subagent가 동일 tool 과호출?)

---

## Phase 9.2 — Dead Code + 자동 트리거링 (Day 3-5)

### Dead Code 감사
- [ ] `scripts/audit-unused.sh` 작성
- [ ] 실행 → `.context/audit-unused.txt` 리포트
- [ ] 0회 호출 agent/skill/command 제거 (backup tag 후)

### Auto-triggering 품질 감사
- [ ] `.claude/agents/*.md` description 품질 점수화
- [ ] Over-matching (불필요 호출) 사례 추출 from Langfuse
- [ ] Under-matching (필요한데 미호출) 사례 추출
- [ ] description 수정 + 재측정

### Prompt Caching 활용률
- [ ] Session 2+ cache_read_input_tokens / total_input_tokens 비율 측정
- [ ] 목표: >70%
- [ ] 미달 시 cache breakpoint 조정

---

## Phase 9.3 — 집합 벤치 + Ledger 갱신 (Day 6-7)

### 복합 B1-B6 실측
- [ ] `node scripts/bench-runner.mjs --tag v-stage9 --runs 5`  (5회로 상향 — F8)
- [ ] baseline = `v-wave-3`
- [ ] G7 verify: `node scripts/verify-g7.mjs v-wave-3 v-stage9`

### Performance Ledger v2
- [ ] `final/PERFORMANCE_LEDGER.md` Stage 9 섹션 기록
- [ ] 집합 M1 개선치 vs 단순 합산 차이 분석 (overlap 실측)
- [ ] Final retrospective 섹션

### 성공 판정 (Stage 9 Gate)
- [ ] 집합 M1 절감 ≥ 40%
- [ ] 집합 M4 개선 ≥ +3pp
- [ ] Cache read 비율 (세션 2+) > 70%
- [ ] Auto-triggering 정확도 > 90%
- [ ] Dead code 제거 ≥ 5% LOC 감소
- [ ] Cross-RFC 갈등 0건

**모두 통과 → `v-stage9-stable` tag 생성 + 릴리스 노트 작성.**

---

## 실패 처리

미달 시 개별 Task로 재진입:
- 집합 M1 미달 → Phase 9.2 dead code 제거 추가
- M4 퇴행 → 원인 RFC 식별 + rollback 또는 조정
- Auto-triggering 낮음 → description 재작성 반복

---

## 산출물 최종 체크

- [ ] `final/CALL_GRAPH_v2.md`
- [ ] `final/PERFORMANCE_LEDGER_v2.md` (or 기존 ledger Stage 9 섹션)
- [ ] `governance/workflows/tool-routing-pipeline.md`
- [ ] `governance/rules/eval-untrusted-policy.md`
- [ ] `scripts/audit-unused.sh`
- [ ] `v-stage9-stable` git tag

---

## Related
- 설계: `docs/research/2026-04-optimization/final/STAGE9_HOLISTIC.md`
- G7 검증: `scripts/verify-g7.mjs`
- Ledger: `docs/research/2026-04-optimization/final/PERFORMANCE_LEDGER.md`
