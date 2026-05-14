# Best-in-Class Gap Analysis — 2026-05-15

## 현재 위치: 60-65% (업계 최상위 대비)

## 이미 최상위

| 영역 | 근거 |
|------|------|
| Context engineering | CURRENT.md + /compact + RTK + 세션 분리 |
| Cost awareness | RTK hooks + Groq/Ollama 라우팅 + 모델 규칙 |
| 3-tier guardrails | Input + Tool + Output 훅 체인 |
| Shadow eval + drift detection | log.jsonl + 자동 경고 |
| Prompt injection defense | RFC-007 Spotlighting |
| 자율 운영 인프라 | /zzz + CB + auto-switch (경쟁자 0) |

## CRITICAL 갭 (1위 확정에 필수)

### 1. 자기개선 루프 미완 (Phase 0.5)
설계: capability-growth-engine.md (7 컴포넌트)
미구현: gap-sensor.ts, gap-priority.mjs 실 동작 안 함
의미: "수동 성장" vs "자동 성장"의 분기점. Meta HyperAgents, Stanford AutoAgent가 이미 구현.

### 2. Trajectory Evaluation 부재
현재: shadow eval = 최종 출력만 평가
필요: 어떤 경로로 도달했는가 (중간 단계 품질)
근거: Anthropic 내부 — trajectory eval이 20-40% 더 많은 회귀 감지

### 3. FSM Verification Gate 없음
현재: 에이전트가 검증 단계를 건너뛸 수 있음
필요: 상태 전이 강제 (Draft → Verified → Committed)
근거: IEEE Spectrum — silent failure가 AI agent #1 실패 원인

## HIGH 갭

### 4. Specification Drift 감지
에이전트가 원래 목표에서 이탈하는 것 감지 없음

### 5. JSON 상태 파일
Anthropic 권고: "models less frequently corrupt structured data"
CURRENT.md(Markdown) → CURRENT.json 병행 필요

### 6. 인간 캘리브레이션 루프
shadow eval의 자기 채점 편향 방어 체계 없음

## 흡수 소스

| 소스 | 흡수 대상 |
|------|----------|
| Anthropic harness 패턴 | JSON 상태, init.sh, probe-based eval |
| DeepEval | trajectory evaluation, pass@k/pass^k |
| IEEE/arXiv | FSM Verification gate, Saga rollback |
| Meta HyperAgents | persistent memory, self-modification |
| MindStudio Dreaming | 세션 회고 → 메모리 자동 큐레이션 |
| RouteLLM (ICLR 2025) | 85% 비용 절감 라우팅 |

## 1위 로드맵

| 기간 | 작업 | 효과 |
|------|------|------|
| 1주 | Phase 0.5 루프 닫기 | 수동→자동 성장 |
| 2주 | Trajectory eval + FSM gate | 신뢰성 최상위 |
| 1개월 | CURRENT.json + Dreaming 패턴 | Anthropic 수준 |
| 3개월 | 실전 검증 (Connectome 빌드) | "이걸로 만든 제품" 증명 |
