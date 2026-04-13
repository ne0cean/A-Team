# Stage 9 — Holistic Optimization Plan

> 7개 RFC가 Wave 1–3로 통합 완료된 **이후** 전체 관점에서 재최적화. 개별 RFC Gate 통과는 필요조건, 집합적 조화는 별개.

---

## Trigger (언제 실행하나)

다음 조건 **전부** 충족 시 Stage 9 진입:
- Wave 1 전체 정식 머지 (RFC-001, 002, 005, 007-S)
- Wave 2 최소 2개 이상 머지
- 7일 soak 무 regression
- 집합 벤치 (B1–B6 × all RFCs active) 1회 실행 완료

---

## 목표

1. **유기적 연계 (Cross-wiring)**
2. **자동 트리거링 (Auto-routing 검증)**
3. **퍼포먼스·토큰 트리밍 (집합 최적화)**
4. **집합 벤치마크 (v2 vs v1)**

---

## Task 1 — 유기적 연계

### 중복 기능 탐지
수용된 후보 간 기능 겹침 후보:
- **RFC-003 ToolSearch + RFC-006 Budget-Aware Tool Routing**
  - 둘 다 tool 선별 담당 → 순서 정의 필요
  - ToolSearch가 먼저 로드 → Budget이 cost 추정 → 실행
  - 문서: `governance/workflows/tool-routing-pipeline.md` 신설

- **RFC-005 promptfoo + RFC-007 Spotlighting**
  - promptfoo eval에 untrusted input 들어가면 spotlighting 적용?
  - 결정: eval 입력은 테스트용 합성 데이터이므로 spotlight 불필요. **명시 문서화**.

- **RFC-001 Prompt Caching + RFC-002 Handoff Compression**
  - Handoff 결과물이 다음 세션에서 캐시 대상 → 순서: compress → cache
  - CLAUDE.md 1h cache + compressed HANDOFF 5min cache 중첩 설계

### 호출 그래프 시각화
Langfuse(RFC-005)의 trace 데이터로:
- 어느 subagent가 어느 tool을 얼마나 호출하는가
- 중복 경로 탐지
- Bottleneck 시각화

**출력**: `final/CALL_GRAPH_v2.md` (mermaid + 핫스팟 테이블)

### 죽은 코드 / 쓰이지 않는 agent 제거
- Wave 1–3 후 사용되지 않는 기존 agent 식별
- 0회 호출되는 skill/command 제거
- `scripts/audit-unused.sh` 작성 (미래 자동화)

---

## Task 2 — 자동 트리거링 검증

### Description 기반 자연어 매칭
`.claude/agents/*.md` description 품질 감사:
- Claude가 task description만 보고 올바른 agent 자동 선택하는가?
- 과소 매칭 (필요한데 안 불림) 케이스 로그
- 과대 매칭 (불필요한데 불림) 케이스 로그

### Hook 누락 포인트 식별
Langfuse trace에서:
- PreToolUse/PostToolUse가 안 걸린 tool call 검출
- 누락된 훅 패턴 정리 후 추가

### Tier 2/3 자동 게이트
- cascade routing(RFC-006) 활성 시:
  - Haiku tier-2 실제 60% 분포 도달하는가?
  - Over-escalation (Sonnet으로 넘어가는 비율 과다) 감지
- 미달 시 confidence threshold 조정

---

## Task 3 — 퍼포먼스·토큰 트리밍

### 메인 컨텍스트 로드 문서 재점검
**50줄 제약 준수 여부 확인**:
- CLAUDE.md: 50줄 이하?
- MEMORY.md: 인덱스만, 본문 분리?
- CURRENT.md: 히스토리 분리 유지?

위반 시 축소 + 분리.

### 서브에이전트 system prompt 압축
- 9 subagent 각각의 system prompt 토큰 수 측정
- 불필요한 중복 제거
- Per-agent 전용 지시만 유지

### 프롬프트 캐싱 활용률 측정
RFC-001 완료 후:
- cache_read_input_tokens / total_input_tokens 비율
- 목표: 세션 2+ 에서 >70%
- 미달 시 캐시 블록 경계 조정

### 복합 벤치마크
**B1–B6 전체 × 모든 RFC 활성** vs **baseline**:
- M1 집합 절감 %
- M4 집합 개선 pp
- 월 API 비용 projection

결과 → `final/PERFORMANCE_LEDGER_v2.md`:
- Baseline (pre-RFC): 100%
- Wave 1 완료: ~75%
- Wave 2 완료: ~60%
- Wave 3 완료: ~50% (목표 M1 -40~50%)

---

## Task 4 — Checkpoint Bench

Stage 9 종료 조건:
- 복합 B1–B6 3회 반복, σ<mean×0.1
- Baseline 대비 집합적 M1 개선 >30% (최소), >40% (목표)
- M4 regression 0
- 모든 cross-wiring 문서화 완료

미달 시 원인 분석 → 개별 RFC 재조정 → 재측정.

---

## Implementation Phases

### Phase 9.1 (Wave 1+2 완료 후, 2일)
- 중복 기능 명시적 정의 (문서 3개)
- `governance/workflows/tool-routing-pipeline.md`
- 호출 그래프 1차 추출

### Phase 9.2 (Wave 3 완료 후, 3일)
- Dead code 감사 + 제거
- System prompt 압축
- 자동 트리거링 검증

### Phase 9.3 (최종, 2일)
- 복합 B1–B6 측정 × 3 repeats
- `PERFORMANCE_LEDGER_v2.md`
- Final retrospective

**총 ~7일** (Wave 3 종료 후 순차).

---

## 산출물

- `final/CALL_GRAPH_v2.md` — 호출 그래프 + 핫스팟
- `final/PERFORMANCE_LEDGER_v2.md` — baseline vs v2 전 수치
- `governance/workflows/tool-routing-pipeline.md` — ToolSearch + Budget 순서
- `governance/rules/eval-untrusted-policy.md` — promptfoo+Spotlight 정합
- `scripts/audit-unused.sh` — 죽은 코드 자동 감사

---

## 성공 판정 (Stage 9 Gate)

| Metric | 목표 |
|--------|-----|
| 집합 M1 절감 | ≥40% (개별 합산 -overlap) |
| 집합 M4 개선 | ≥+3pp |
| Cache read 비율 (세션 2+) | >70% |
| Auto-triggering 정확도 | >90% correct agent selection |
| Dead code 제거 | ≥5% 라인 감소 |
| Cross-RFC 갈등 | 0 unresolved |

모두 통과 → v2 stable 태그. 미달 → 각 Task로 재진입.

---

## Related
- RFC-001~007 (선행 완료 필수)
- `final/INTEGRATION_ROADMAP.md` (Wave 1–3 계획)
- `governance/rules/autonomous-loop.md` (Stage 9 실행 시 계약)
- `governance/rules/truth-contract.md`

**Note**: Stage 9는 이번 밤샘 리서치 scope 외. Wave 1–3 실제 통합 완료 후 별도 세션에서 진행.
