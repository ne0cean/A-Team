# MoA (Mixture of Agents) 실행 가이드

> orchestrator Phase 2.0에서 ❺ 판정 시 또는 "최선 방안/옵션 비교/아키텍처 결정" 키워드 시 자동 활성화.
> 토큰 3×layers배. 핵심 설계 결정 + 정답 불명확 시에만 사용.

## MoA 설정
```
max_rounds: 3          # 최대 반복 레이어 수 (기본 3, 단순 질문은 2)
consensus_threshold: 2  # N/3 전문가 동의 시 합의 인정
early_stop: true        # 합의 도달 시 남은 라운드 스킵
```

## MoA 실행 플로우 (Multi-Layer)

```
Round 1 (독립 생성):
  researcher ──┐
  architect  ──┼──→ [응답 A, B, C]
  coder      ──┘

Round 2+ (이전 라운드 출력을 컨텍스트로 주입):
  researcher(+Round1 출력) ──┐
  architect (+Round1 출력) ──┼──→ [정제된 응답 A', B', C']
  coder     (+Round1 출력) ──┘

합의 검사 → (합의 미달 && round < max_rounds) → 다음 Round
         → (합의 도달 || round == max_rounds) → Aggregation
```

### Step 1: Round 실행
각 라운드에서 3 전문가를 **병렬** Task로 실행.
- Round 1: 원본 질문만 전달 (독립 생성)
- Round 2+: 원본 질문 + 이전 라운드 전체 응답을 시스템 컨텍스트로 주입

전문가 프롬프트 템플릿 (Round 2+):
```
[MoA Round {n}/{max_rounds}]
원본 질문: {question}

이전 라운드 다른 전문가들의 응답:
1. {prev_response_1}
2. {prev_response_2}
3. {prev_response_3}

위 응답들을 참고하되 맹목적으로 따르지 마라.
틀린 부분은 반박하고, 놓친 부분은 보완하라.
당신의 전문성(researcher/architect/coder)에 기반한 최선의 답변을 제시하라.
```

### Step 2: 합의 검사 (Stall Detection)
각 라운드 완료 후 orchestrator가 3개 응답을 비교:

```
합의 판정 기준:
- 핵심 결정사항(decision)이 동일 → 합의 1점
- 추천 기술/패턴(recommendation)이 동일 → 합의 1점
- 리스크 평가(risks)가 일치 → 합의 1점

consensus_score = 동일 항목 수 / 전체 비교 항목 수
```

**Early Stop 조건** (하나라도 충족 시 루프 종료):
1. `consensus_score >= consensus_threshold/3` → 충분한 합의
2. Round N 응답 == Round N-1 응답 (실질 동일) → Stall 감지, 추가 라운드 무의미
3. `round >= max_rounds` → 최대 라운드 도달

### Step 3: Aggregation (최종 합성)
합의 수준에 따라 분기:

**Case A — 강한 합의 (3/3 동의)**:
orchestrator가 직접 합성. 교집합 추출 → 최종 결정.

**Case B — 다수 합의 (2/3 동의)**:
orchestrator가 합성 + 소수 의견의 리스크를 `dissent_risks`로 기록.

**Case C — 완전 불일치 (합의 실패)**:
**judge** 에이전트 호출 → 근거 강도 비교 판정.
judge가 `ESCALATE` 반환 시 → 사람에게 에스컬레이션.

```
[합성 후 최종 출력]
{
  "moa_result": {
    "rounds_executed": 2,
    "early_stopped": true,
    "consensus_level": "majority",
    "decision": "...",
    "dissent_risks": ["..."],
    "judge_invoked": false
  }
}
```

## MoA 비용 제어 (`lib/cost-tracker.ts` 활용)
- 각 라운드 완료 후 `CostTracker.record()` 로 토큰/비용 기록
- `isOverBudget()` 확인 → 초과 시 남은 라운드 스킵 + 현재까지 결과로 합성
- Round 1: 전문가당 max_tokens 제한 (512)
- Round 2+: 이전 응답 요약본만 주입 (원문 대신 핵심 3줄)
- 단순 비교(옵션 2개): max_rounds=2로 축소
- 복잡한 아키텍처 결정: max_rounds=3 유지
