# A-Team Optimization Research — {WEEK_TAG} (Template)

> **이 파일은 매주 `scripts/weekly-research.sh`가 복사해서 시작점으로 사용.**
> `{WEEK_TAG}` 를 실제 주차(예: `2026-W16`)로 치환.

## Goal
A-Team 효율성 **강화(not 대체)** — 이번 주 최신 프레임워크·워크플로우·하네스 엔지니어링 중 기존 강점을 침해하지 않고 실증적으로 개선을 증명한 후보만 수용.

## Meta-Principle
> **Earned Integration** — 이론적 수용 금지. Baseline 벤치마크를 이긴 후보만 통과.

## Protected Assets (P1–P8)
1. P1 9-subagent thin-wrapper 아키텍처
2. P2 bkit 4모듈 (circuit-breaker/state-machine/gate-manager/self-healing)
3. P3 PIOP 프로토콜
4. P4 Hooks 자동화
5. P5 `.context/CURRENT.md` 세션 연속성
6. P6 Sovereignty 모델 (8원칙)
7. P7 TDD discipline
8. P8 Thin wrapper 슬래시 커맨드

## Selection Criteria (8개 AND)
1. Maturity (≥1k GitHub star or 2+ production case)
2. A-Team 호환
3. 컨텍스트 비용 ≤ 2%
4. 라이선스 (MIT/Apache/BSD or Anthropic)
5. 검증 가능성 (TDD or 시각 검증)
6. 강화 입증 ("P_n을 Y 방식으로 보강" 명시)
7. 대체 아님
8. Opt-in 가능

## Categories (14개)

### Core (C1–C7)
- C1 Multi-agent 오케스트레이션
- C2 Claude-native 하네스
- C3 컨텍스트 엔지니어링
- C4 추론/워크플로우 패턴
- C5 Eval/검증
- C6 Tool use / MCP
- C7 OSS 에이전트 레포 마이닝

### Add-on (A1–A7)
- A1 멀티모델 라우팅
- A2 Failure mode taxonomy
- A3 Observability/Telemetry
- A4 Security / Prompt injection
- A5 Benchmark 방법론
- A6 Non-AI 도구 위임
- A7 Cross-project state sharing

## Benchmark Suite (B1–B6)
이전 주 `BASELINE.md` 재사용 or 재측정.

## Metrics
- M1 Token 소비 (30%)
- M2 Wall-clock 시간 (20%)
- M3 Tool call 횟수 (15%)
- M4 Correctness (25%)
- M5 Regression (10%)

## Performance Gate (G5)
- G5-a 최소 1개 메트릭 ≥ 15% 개선
- G5-b 모든 메트릭 ≤ 5% 악화
- G5-c M4 ≥ baseline (퇴행 금지)
- G5-d B1–B6 중 4개 이상 개선
- G5-e σ < mean × 0.1

## Pipeline
Stage 0 → 0.5 → 1 → 2 → 3 → 4 → 5 → 5.5 → 5.6 → 5.7 → 6 → 7 → 8 → 9 → 10

## Decision Gates
- G1: Short-list에 P1–P8 침해만 → 범주 재정의
- G2: 상위 후보 전부 XL effort → 사용자 확인 대기
- G3: 3회 연속 새 후보 0개 → 종료
- G4: A-Team 외부 변경 감지 → 중단
- G5: Performance Gate

## Resumability
- SSOT: `RESUME_STATE.md`
- 토큰 소진 시 자연 재개 (스케줄 폴링 아님)

## Progress Log
(매 iteration 기록)

### Iteration 0 — {BOOTSTRAP_DATE}
- 폴더 스캐폴딩
- 템플릿 복사
- 이전 주 참조: {PREV_WEEK}
