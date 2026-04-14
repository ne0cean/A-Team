# A-Team Optimization Research — 2026-04 (v2)

## Goal
A-Team 효율성 **강화(not 대체)** — 최신 멀티에이전트 프레임워크·워크플로우·하네스 엔지니어링 중 **기존 강점을 침해하지 않고 실증적으로 개선을 증명한 후보**만 수용.

## Meta-Principle
> **Earned Integration** — 이론적 수용 금지. Baseline 벤치마크를 이긴 후보만 통과.

## Protected Assets (절대 침해 금지, P1–P8)
1. **P1** 9-subagent thin-wrapper 아키텍처 (메인 컨텍스트 90%+ 절감)
2. **P2** bkit 4모듈 (circuit-breaker/state-machine/gate-manager/self-healing, 153 tests)
3. **P3** PIOP 프로토콜 (Ralph Loop 실전 연동)
4. **P4** Hooks 자동화 (pre/post tool use, UI Auto-Inspect)
5. **P5** `.context/CURRENT.md` 세션 연속성 + Mirror/Handoff
6. **P6** Sovereignty 모델 (`governance/rules/ateam-sovereignty.md`)
7. **P7** TDD discipline (153 tests)
8. **P8** Thin wrapper 슬래시 커맨드 (~350B/커맨드 제약)

## Selection Criteria (8개 AND 조건)
1. Maturity — production 사용 사례 (≥1k GitHub star or 실전 후기 2건+)
2. A-Team 호환 — `lib/`, `.claude/agents/`, `governance/`, hooks 구조 유지
3. 컨텍스트 비용 — 메인 세션 토큰 증가 ≤ 2%
4. 라이선스 — MIT/Apache/BSD or Anthropic 공식
5. 검증 가능성 — TDD 또는 시각 검증 가능
6. **강화 입증** — "P_n을 Y 방식으로 보강한다" 명시 가능
7. **대체 아님** — 기존 자산 교체/폐기 요구 금지
8. **Opt-in 가능** — 기본 비활성, 선택적 활성화

## Categories (14개)

### Core (C1–C7)
- C1 Multi-agent 오케스트레이션 (LangGraph, CrewAI, AutoGen 0.4+, Swarm, Agno, smolagents)
- C2 Claude-native 하네스 2026 (Claude Agent SDK, hooks, skills, MCP, subagents)
- C3 컨텍스트 엔지니어링 (프롬프트 캐싱, 압축, 핸드오프, 메모리)
- C4 추론/워크플로우 패턴 (ReAct, Reflexion, Self-Refine, DSPy, STORM, Plan-and-Solve)
- C5 Eval/검증 (promptfoo, braintrust, ragas, property-based agent testing)
- C6 Tool use / MCP 2026 (동적 스킬 로딩, tool registry, sandboxed exec, worktree 격리)
- C7 OSS 에이전트 레포 마이닝 (claude-flow, principal, bmad, 기타)

### Add-on (A1–A7)
- A1 멀티모델 라우팅 (Opus/Sonnet/Haiku 자동 선택)
- A2 Failure mode taxonomy (context poisoning, infinite loops, hallucinated tools)
- A3 Observability/Telemetry (langfuse, OpenLLMetry)
- A4 Security / Prompt injection 방어
- A5 Benchmark 방법론 (효율성 측정 프레임워크)
- A6 Non-AI 도구 위임 (ast-grep, tree-sitter, LSP)
- A7 Cross-project state sharing

## Benchmark Suite (B1–B6, BASELINE_SPEC.md 참조)
| ID | 타입 | 목적 |
|----|-----|------|
| B1 | Small fix (≤50 LOC) | 빠른 반복 |
| B2 | TDD feature | RED→GREEN→REFACTOR 준수 |
| B3 | Multi-file refactor | 컨텍스트 관리 |
| B4 | UI + 시각 검증 | 훅 파이프라인 |
| B5 | Research synthesis | 서브에이전트 오케스트레이션 |
| B6 | Root cause debug | 추론 체인 |

## Metrics (5개, 가중치)
- **M1** Token 소비 (main+sub), 30%
- **M2** Wall-clock 시간, 20%
- **M3** Tool call 횟수, 15%
- **M4** Correctness (0/0.5/1), 25%
- **M5** Regression (lower=better), 10%

## Performance Gate (G5)
- G5-a 최소 1개 메트릭 ≥ **15% 개선**
- G5-b 모든 메트릭 ≤ **5% 악화** (vs 원본 baseline)
- G5-c M4 ≥ baseline (correctness 퇴행 금지)
- G5-d B1–B6 중 **4개 이상**에서 개선
- G5-e 각 벤치 3회 반복, σ < mean × 0.1

**전부 만족 → 수용. 하나라도 미달 → `REJECTED.md`.**

## G7 — No Regression Across Versions (신설, 2026-04-14)

**버전 간 퇴행 금지 — 새 통합이 이전 수용 버전 대비 성능을 깎으면 Reject.**

### 정의
- 각 Wave 완료 후 git tag `v-wave-N` 생성 + `PERFORMANCE_LEDGER.md`에 B1–B6 전 메트릭 기록
- 다음 Wave 착수 시 **baseline = 이전 Wave의 tag**
- 원본 baseline뿐 아니라 **모든 이전 수용 버전** 대비 regression 금지

### G7 조건 (전부 충족)
- **G7-a**: Wave N의 모든 메트릭 ≥ Wave N-1 (단, 1% 노이즈 허용)
- **G7-b**: M4 Correctness 절대 하락 금지 (0% 허용치)
- **G7-c**: 각 이전 Wave 대비 B1–B6 개별 벤치 regression 없음 (5개 Wave 누적 비교)
- **G7-d**: 개별 RFC가 다른 수용된 RFC의 기능을 훼손하지 않음 (통합 테스트)
- **G7-e**: `PERFORMANCE_LEDGER.md`에 Wave별 수치 시계열 기록 + 회귀 감지 자동화

### 측정 방식
Wave 2 A/B 벤치 예시:
```
Baseline Run: git checkout v-wave-1 → B1–B6 × 3 runs 측정
Candidate Run: Wave 2 RFC 적용 → B1–B6 × 3 runs 측정
비교: 모든 메트릭이 Wave 1 수준 유지 or 개선 확인 후 수용
```

### Rollback 트리거
- G7 미달 시: 해당 Wave의 통합 즉시 롤백
- 재진입 조건: 원인 분석 + RFC 수정 + 재측정

### Stage 9 Holistic에도 적용
Stage 9는 **모든 수용 RFC 집합 재최적화**인데, 이때도 G7 준수 필수. 집합 최적화 과정에서 개별 RFC 성능 퇴행 발견 시 해당 최적화 단계 reject.

### Meta-Principle 연계
"Earned Integration + No Regression": 수용은 개선 증명만으로 부족, **기존 수용분 유지/개선도 함께 증명**해야 최종 수용.

## Pipeline

```
Stage 0   Manifest + Sovereignty 확정
Stage 0.5 Baseline 벤치 (B1–B6 × 현 A-Team) ← just-in-time (Stage 5.5 직전)
Stage 1   범주별 목록 수집 (C1–C7 + A1–A7, 7 researchers)
Stage 2   Selection Criteria 필터
Stage 3   Protected Assets (P1–P8) 매핑
Stage 4   Deep-dive (short-list)
Stage 5   RFC 작성
Stage 5.5 Prototype 통합 (worktree 격리)
Stage 5.6 A/B 벤치 (baseline vs candidate)
Stage 5.7 Performance Gate 판정
Stage 6   Priority Matrix (통과 후보만)
Stage 7   Final 문서 (EXECUTIVE_SUMMARY, ROADMAP, PRIORITY, REJECTED)
Stage 8   A-Team commit + push
Stage 9   ★ Holistic Optimization — 수용된 모든 후보의 유기적 연계 + 자동 트리거링 + 퍼포먼스·토큰 트리밍
Stage 10  ★ Weekly Auto-Research Protocol — 매주 동일 파이프라인 자동 실행 (Eternal Growth)
```

## Stage 9 — Holistic Optimization 상세
수용된 후보(N개)가 정식 통합된 후 **전체 관점에서 최적화 패스**:

1. **유기적 연계 (Cross-wiring)**
   - 수용 후보 간 중복 기능 탐지 → 통합
   - 에이전트 ↔ 스킬 ↔ 훅 ↔ lib 간 호출 그래프 시각화
   - 죽은 코드 / 쓰이지 않는 agent / 중복 wrapper 제거

2. **자동 트리거링 (Auto-routing)**
   - `description` 기반 자연어 매칭으로 slash 없이도 에이전트 자동 호출되는지 검증
   - PreToolUse/PostToolUse hooks 누락 포인트 식별
   - Tier 2/3 에이전트 (haiku/sonnet) 자동 게이트 확인

3. **퍼포먼스·토큰 트리밍**
   - 메인 컨텍스트 로드 문서(CLAUDE.md, MEMORY.md, CURRENT.md) 50줄 제약 재점검
   - 서브에이전트 system prompt 압축
   - 프롬프트 캐싱 활용률 측정 + 개선
   - 복합 벤치마크 (B1–B6 전체) → **v2 vs v1 비교**, 개선치 `PERFORMANCE_LEDGER.md`에 기록

4. **체크포인트**: Stage 9 종료 후 B1–B6 재실행 → baseline 대비 집합적 개선 수치 확정

## Stage 10 — Weekly Auto-Research Protocol (Eternal Growth)
A-Team이 끊임없이 성장하도록 **매주 자동 리서치**:

1. **트리거**: 매주 월요일 03:00 KST (cron 또는 GitHub Actions)
2. **파이프라인**: 이번 리서치와 동일 (Stage 0.5 → 8), 단 자동 실행
3. **격리**: 매 실행마다 `docs/research/YYYY-WW/` 폴더로 분리
4. **자동 PR**: Performance Gate 통과 후보만 A-Team master에 PR 자동 생성
5. **Human Gate**: PR 머지는 반드시 사용자 수동 승인 (자동 머지 금지)
6. **Drift 감지**: 이전 주 수용 후보가 다음 주 새 후보와 충돌하면 alert
7. **구현 산출물** (Stage 10에서 작성):
   - `scripts/weekly-research.sh` — 엔트리포인트
   - `.github/workflows/weekly-research.yml` — GH Actions 스케줄
   - `governance/workflows/eternal-growth.md` — 프로토콜 명세
   - `docs/research/_template/` — 매주 재사용될 템플릿

## Decision Gates

## Decision Gates
- **G1** Short-list에 P1–P8 침해만 → 범주 재정의
- **G2** 상위 3개 전부 XL effort → 사용자 확인 대기
- **G3** Ralph 3회 연속 새 후보 0개 → 조사 종료, Final 점프
- **G4** A-Team에 예상 외 변경 발견 → 즉시 중단
- **G5** Performance Gate (위 참조)

## Resumability
- **SSOT**: `RESUME_STATE.md`
- **Checkpoint 규칙**: iteration 시작 시 read, 끝날 때 write (원자적)
- **Wake-up**: ScheduleWakeup dynamic loop, 25–30분 간격
- **토큰 소진 시**: 다음 wake-up이 recovery 윈도우로 자동 이월

## Progress Log

### Iteration 0 — 2026-04-13 Kickoff
- 폴더 스캐폴딩 완료
- MANIFEST v1 → v2 (Performance Gate, Resumability, Stage 9 Holistic, Stage 10 Weekly)
- `governance/rules/ateam-sovereignty.md` 신규 생성 (6원칙)
- Next: RESUME_STATE 생성, BASELINE_SPEC 작성, Stage 1 kickoff
