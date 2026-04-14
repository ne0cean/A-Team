# Executive Summary — A-Team Optimization Research (2026-04)

**Author**: Architect Agent
**Date**: 2026-04-14
**Scope**: Stage 0 → Stage 7 (RFC 작성 완료, Prototype 이전)
**Audience**: 프로젝트 소유자 (아침 리뷰용)

---

## ⚠️ Earned Integration Disclaimer

이 문서의 모든 수치는 **RFC 설계 단계 추정**. 실제 수용은 Stage 5.5 prototype + Stage 5.6 A/B 측정 후 **G5 (+ RFC-007의 G6) gate 통과 시에만** 확정. `final/ADVERSARIAL_REVIEW.md` 19 findings 반영 완료.

## TL;DR

- **무엇을**: 14개 범주(C1–C7 + A1–A7)에서 최신 멀티에이전트 프레임워크·컨텍스트 엔지니어링·Eval·MCP·보안 기술 ~100개 후보를 surveyed.
- **얼마나 통과**: Selection Criteria 8개 AND 조건 통과 7개 → **RFC 7건 작성 완료**, 9개 거부, 3개 재심사 보류.
- **추정 효과 (실측 전)**: **M1 토큰 -30~50% 범위**, **M4 Correctness +2~5pp**, 월 API 비용 **$22.5k → ~$15k (약 33% 절감 projection)**, Prompt Injection ASR **>50% → <2%** (Microsoft 2025 논문 기반, 자체 측정 미완).
- **⚠️ 단순 합산 금지**: 개별 RFC의 M1 절감치는 overlap 있음. 실측 전까지 "추정" 명시.

---

## 1. 리서치 범위

| 축 | 값 |
|----|---|
| 범주 | 14개 (Core C1–C7, Add-on A1–A7) |
| Survey 후보 | ~100개 (round-1 7개 보고서) |
| Deep-dive | 7개 (round-3 DD-01~06 + security) |
| RFC 작성 | 7건 (RFC-001~007) |
| Baseline 보호 자산 | P1–P8 (9-subagent, bkit, PIOP, Hooks, CURRENT.md, Sovereignty, TDD, Thin-wrapper) |
| Selection Criteria | 8개 AND 조건 (Maturity, 호환성, 토큰비용≤2%, 라이선스, 검증가능성, 강화입증, 대체아님, Opt-in) |

**Meta-Principle**: *Earned Integration* — 이론적 수용 금지, Baseline 대비 증명된 개선만 통과.

---

## 2. 최종 수용 후보 (ACCEPT) — RFC 7건

| RFC | 후보 | 강화 대상 | 기대 효과 |
|-----|------|----------|----------|
| **001** | Anthropic Prompt Caching | P5 (CURRENT.md 연속성) | 반복 컨텍스트 재사용, **M1 -35%** |
| **002** | Handoff Compression (Mirror→Delta) | P5 (세션 핸드오프) | 핸드오프 페이로드 **-74%**, wake-up 지연 감소 |
| **003** | ToolSearch + Artifact Cache | P1/P4/P8 (thin-wrapper + hooks) | Tool discovery cost ↓, 산출물 재사용으로 중복 호출 제거 |
| **004** | Classical Tools (ast-grep, tree-sitter, LSP) | P4/P8 (hooks + 서브에이전트) | LLM 대신 결정론적 도구 위임, **M1 -20~30%**, M4 ↑ |
| **005** | promptfoo + Langfuse (self-hosted) | P4/P6/P7 (TDD + Sovereignty) | Eval gate 자동화, **M4 +2~5pp**, 호출 그래프 observability |
| **006** | Cascade + Budget Routing (Opus→Sonnet→Haiku) | P2/P3 (bkit + PIOP) | 모델 자동 라우팅, **M1 -32~43%**, 월 비용 33% 절감 |
| **007** | Spotlighting + Worktree Isolation | P4/P5/P6 (hooks + Sovereignty) | Prompt injection ASR **>50% → <2%**, tool exec 격리 |

**공통 특성**: 8개 Criteria 모두 통과, P1–P8 중 1개 이상 강화, 기존 자산 교체 없음, 기본 비활성(Opt-in) 가능.

---

## 3. 거부 후보 (REJECT) — 9건 + 보류 3건

### 라이선스/주권 위반
- **Agno** — MPL-2.0 copyleft, P6 Sovereignty 위반
- **Mem0** — SaaS 의존, 주권 모델 파괴

### P1 대체 위협 (Criteria 7 위반)
- **Letta / MemGPT** — thin-wrapper 교체 요구, 9-subagent 구조 붕괴

### SaaS Cluster (P6 위반)
- **Braintrust, LangSmith (SaaS), Phoenix (클라우드), Helicone, Datadog** — 주권/비용/이식성 모두 부적합
  - 단, **Langfuse self-hosted**는 통과 (RFC-005)

### 검증 실패 (Criteria 3, 토큰 폭증)
- **Self-Consistency** — N배 샘플링, 메인 컨텍스트 증가 >2%
- **Tree of Thoughts** — 동일 사유, B1/B2 ROI 부정적

### 이식성/스택 불일치
- **Pydantic-AI** — Python 전용, A-Team TypeScript 스택 비호환

### 재심사 대기 (Edge-case, Round 5 재평가)
- **CrewAI** — 일부 패턴(Task delegation)은 유용하나 전체 프레임워크는 과잉
- **DSPy** — 프롬프트 최적화 원리는 매력적이지만 실행 비용 미검증
- **BMAD** — 구조는 참고 가치, 하지만 현 A-Team과 중복 기능 과다

전체 거부 근거는 `final/REJECTED.md` 참조.

---

## 4. 예상 집합 효과 (Aggregated Impact)

| 지표 | Baseline | 예상 (v2) | Δ |
|------|---------|-----------|---|
| **M1** 토큰 (main+sub) | 1.00x | 0.50~0.60x | **-40~50%** (overlap 제거 후 합산) |
| **M4** Correctness | baseline | +2~5pp | promptfoo gate + classical tools |
| **월 API 비용** (Sonnet 1B tokens) | $22,500 | ~$15,000 | **-33%** |
| **Prompt Injection ASR** | >50% | <2% | **-96%** (Spotlighting + Worktree) |
| **Observability** | 부재 | 호출 그래프 + trace | Langfuse self-hosted |
| **Wake-up latency** | baseline | -30~40% | Handoff delta compression |

**검증 조건**: Stage 5.5 Prototype → Stage 5.6 A/B 벤치 → Stage 5.7 Performance Gate (G5-a~e) 통과 시에만 정식 수용.

---

## 5. Integration Roadmap 요약

상세는 `final/INTEGRATION_ROADMAP.md` + `final/PRIORITY_MATRIX.md`. 요약:

- **Wave 1 (2026-04 말)**: RFC-001 (Prompt Caching), RFC-002 (Handoff Compression), RFC-007 (Security) — 저위험·고영향
- **Wave 2 (2026-05)**: RFC-004 (Classical Tools), RFC-005 (promptfoo + Langfuse) — Gate 인프라
- **Wave 3 (2026-05 말~2026-06)**: RFC-003 (ToolSearch + Artifact), RFC-006 (Cascade + Budget Routing) — 구조적 최적화, Wave 1/2 메트릭 검증 후 진입

각 Wave는 worktree 격리 → A/B bench → Performance Gate → Holistic Stage 9 순.

---

## 6. 이번 리서치에서 얻은 구조적 교훈

2026-04-14 세션 운영 중 **구조적 드리프트**가 드러났고, 그 결과 A-Team 거버넌스에 4개 규칙이 추가되었음.

1. **Survey Before Invent** (`governance/rules/ateam-first.md`) — A-Team 자체 자원을 먼저 스캔하지 않고 외부 후보부터 찾는 안티패턴 차단.
2. **Truth Contract** (`governance/rules/truth-contract.md`) — "테스트했다/벤치했다"는 진술은 증거 링크 없으면 무효. 자기-검증 프로토콜.
3. **Autonomous Loop Contract** (`governance/rules/autonomous-loop.md`) — Ralph Loop 자율 실행 시 체크포인트·로그·중단조건 필수.
4. **Session Preflight** (`scripts/session-preflight.sh`) — 세션 시작 시 A-Team 자원 인벤토리(에이전트/스킬/훅/규칙) 자동 출력.

이 4개는 **리서치 결과물**이자 **리서치 방법론 자체의 개선**이다. Stage 10 Weekly Auto-Research가 지속 작동하려면 이 규칙이 선행돼야 함.

---

## 7. 사용자 액션 아이템

| # | 항목 | 결정 필요 |
|---|------|---------|
| 1 | **RFC-001/002/007 (Wave 1) 승인** | Yes/No — 승인 시 Stage 5.5 Prototype 착수 |
| 2 | **/ralph 데몬 상시 도입** | Ralph Loop를 백그라운드 상주 모드로 전환할지 결정 |
| 3 | **Weekly Auto-Research 프로토콜 활성** | Stage 10 `scripts/weekly-research.sh` + GitHub Actions 월요 03:00 KST 가동 여부 |
| 4 | **Langfuse self-hosted 인프라** | Docker 단일 인스턴스로 기동할지, 별도 VM인지 결정 |
| 5 | **재심사 보류 3건 (CrewAI/DSPy/BMAD)** | Round 5 재평가 트리거 시점 (현: Wave 2 종료 후) |

---

## 8. 산출물 파일 트리

```
docs/research/2026-04-optimization/
├── MANIFEST.md                    # 전체 계획 + Meta-Principle
├── BASELINE_SPEC.md               # B1–B6 벤치마크 정의
├── RESUME_STATE.md                # SSOT checkpoint
├── round-1/                       # Survey (7 reports, ~100 후보)
│   ├── C1-orchestration.md
│   ├── C2-claude-native.md
│   ├── C3-A7-context.md
│   ├── C4-A5-workflows-benchmark.md
│   ├── C5-A3-eval-obs.md
│   ├── C6-A6-tools-mcp.md
│   └── C7-A1-A2-A4-combined.md
├── round-2/                       # Shortlist + Strength mapping
│   ├── shortlist-reviewed.md
│   └── strength-mapping.md
├── round-3/                       # Deep-dive (6 reports)
│   ├── DD-01-caching-handoff.md
│   ├── DD-02-toolsearch-artifact.md
│   ├── DD-03-classical-tools.md
│   ├── DD-04-eval-obs.md
│   ├── DD-05-cost-routing.md
│   └── DD-06-security-isolation.md
├── round-4/                       # Prototype plan
├── rfc/                           # 7 RFCs
│   ├── RFC-001-002.md             # Prompt Caching + Handoff Compression
│   ├── RFC-003-toolsearch-artifact.md
│   ├── RFC-004-classical-tools.md
│   ├── RFC-005-eval-obs.md
│   ├── RFC-006-cost-routing.md
│   └── RFC-007-security-isolation.md
└── final/                         # ← 본 문서 포함
    ├── EXECUTIVE_SUMMARY.md
    ├── INTEGRATION_ROADMAP.md
    ├── PRIORITY_MATRIX.md
    └── REJECTED.md
```

---

## 9. 커밋 이력

| SHA | 단계 |
|-----|------|
| `aadf13e` | Round 1 — 7 surveys 커밋 |
| `a772f46` | Round 2 — shortlist + strength mapping |
| `14ffd5a` | Round 3 — deep-dive 6건 |
| `ee7fd96` | Round 4 — RFC 7건 |
| `c6e9388` | Governance 개선 (ateam-first / truth-contract / autonomous-loop / session-preflight) |

다음 커밋 예정: **Stage 7 final 문서 4건** (본 Executive Summary + Roadmap + Priority Matrix + Rejected).

---

## 닫는 말

이번 리서치는 "최신 기술을 많이 도입"이 목표가 아니라 **"A-Team의 기존 강점 P1–P8을 침해하지 않고 증명 가능한 개선만 수용"** 이 목표였다. 그 결과:

- 100개 후보 → 7개 통과 (통과율 ~7%)
- 수용된 7개는 전부 **기존 자산 보강형**이며, 대체형은 모두 거부됨
- 통과 후보만으로 **M1 -40~50%, 월 비용 -33%, ASR -96%** 라는 유의미한 기대 효과 확보
- 리서치 방법론 자체도 4개 거버넌스 규칙으로 강화됨

**다음 의사결정 포인트**: Wave 1 (RFC-001/002/007) 승인 → Prototype 착수. 사용자 승인을 기다립니다.
