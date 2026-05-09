# Orchestration v2 — Multi-Model Speed & Quality Engine

> **Status**: 설계 완료, Pattern A 실험으로 불가 확인 → Pattern C 우선 구현
> **Created**: 2026-05-09
> **Based on**: 4개 병렬 리서치 에이전트 결과 통합
> **Goal**: 비용 절감이 아닌 **속도 + 품질 극대화**

## Why v2?

v1은 완전 실패했다:
- orchestrator.md 0회 호출
- 로컬 모델 라우팅 0%
- CLAUDE.md 규칙 무시됨
- 만든 모니터링/리포트 코드 전부 빈 데이터

**근본 원인**: "Claude에게 부탁" 방식. 구조적 강제력 없음.

## Core Insight

| | 단일 모델 | v2 멀티모델 |
|---|---|---|
| 단순 응답 | Claude 2-5s | Groq **80ms** (25x 빠름) |
| 품질 검증 | 없음 | 합의 기반 (Star Chamber) |
| 장애 대응 | rate limit → 멈춤 | 자동 fallback |
| 비용 | 100% Anthropic | 단순 작업 $0 |

**핵심 가치 순서: 속도 > 품질 > 비용**

## Architecture

```
                    ┌─────────────────────────┐
                    │      Claude Code        │
                    │   (Main Session)        │
                    └─────┬──────┬──────┬─────┘
                          │      │      │
                 ┌────────┘      │      └────────┐
                 ▼               ▼               ▼
        ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
        │ Pattern A    │ │ Pattern B   │ │ Pattern C    │
        │ Pre-emption  │ │ Dispatch    │ │ Command      │
        │ (자동)       │ │ (반자동)    │ │ (100% 제어)  │
        └──────┬───────┘ └──────┬──────┘ └──────┬───────┘
               │                │                │
               ▼                ▼                ▼
        ┌─────────────────────────────────────────────┐
        │           Groq / Ollama / MCP                │
        │  80ms TTFT │ 276 tok/s │ $0 │ 무중단        │
        └─────────────────────────────────────────────┘
```

## Pattern A: Pre-emptive Completion (자동, 0 사용자 개입)

Claude가 Agent 호출하려 할 때 **훅이 Groq를 먼저 실행**.

```
1. Claude → Agent("요약해줘") 시도
2. PreToolUse 훅 발동:
   a. 프롬프트 분류 (bash, 0ms)
   b. 단순 작업 → Groq API 호출 (200ms)
   c. systemMessage로 결과 반환
3. Claude가 systemMessage 확인:
   "Pre-computed (Groq 70B, 180ms): [요약 결과]"
4. Claude 판단:
   - 충분 → Agent 호출 취소, Groq 결과 사용 (2-5s 절약)
   - 부족 → Agent 정상 진행 (200ms 추가 지연뿐)
```

### 실험 결과 (2026-05-09)

| 메커니즘 | 상태 | 근거 |
|----------|------|------|
| `updatedInput` | ❌ 버그 (Agent에서 무시) | GitHub #39814 |
| `additionalContext` | ❌ 미구현 | GitHub #19432, NOT_PLANNED |
| `systemMessage` | ❌ **UI 전용, 모델에 안 보임** | 직접 실험 확인 — 훅 발동 확인했으나 모델 컨텍스트에 미주입 |

**Pattern A는 현재 Claude Code에서 불가능. PreToolUse로 모델에 정보를 전달하는 작동하는 채널이 없음.**
향후 `additionalContext` 구현되면 재검토.

### 분류기 설계

```bash
# 코드/설계/보안 → 패스스루 (Groq 시도 안 함)
if echo "$PROMPT" | grep -qiE \
  'refactor|implement|fix|bug|security|architect|설계|구현|수정|review|test'; then
  echo '{}'
  exit 0
fi

# 단순 작업만 Groq 선점
# → 요약, 포맷, 번역, 변환, 목록, 정리, 분류
```

**분류 정확도 vs 비용**: 키워드 기반은 간단하지만 충분.
오분류 시 최악: Groq가 쓸모없는 답 생성 (200ms 낭비) + Claude가 무시하고 Agent 진행.
위험도 = 0 (품질 영향 없음, 시간만 200ms 추가).

### 속도 이득 계산

```
Agent 14회/일 기준:
- 단순 작업 ~8회: Groq 선점 성공 → 각 2-5s 절약 = 16-40s 절약
- 복잡 작업 ~6회: Groq 선점 실패 → 각 200ms 추가 = 1.2s 추가
- 순이득: 15-39초/일 속도 향상 + 8회 무료 처리
```

## Pattern B: Dispatch Daemon (배치/긴 작업용)

파일시스템 기반 비동기 디스패치. Git 연동 가능.

```
┌─────────────────┐          ┌──────────────────┐
│  Claude Code     │  write   │  dispatch daemon  │
│                  │────────▶│  (상시 실행)       │
│                  │          │                  │
│  dispatch        │  read    │  분류 → 라우팅    │
│  "요약해"        │◀────────│  Groq/Ollama/둘다 │
└─────────────────┘          └──────────────────┘
```

### 인터페이스

```bash
# 기본 (Groq 70B)
dispatch "이 파일 요약" < file.txt

# 모델 지정
dispatch -m local "JSON 변환" < data.csv

# Racing (Groq + Ollama 동시, 빠른 쪽 채택)
dispatch --race "번역해" < doc.md

# Consensus (둘 다 실행, 합의)
dispatch --consensus "코드 리뷰" < auth.ts
```

### Racing 패턴 (속도 극대화)

```
dispatch --race "질문"
  ├── Groq API (200ms)  ─────── 먼저 도착 → 채택
  └── Ollama local (1-5s) ──── 나중 도착 → 폐기

  결과: 항상 가장 빠른 응답 사용
  Groq 장애 시: Ollama가 자동 fallback
```

### Consensus 패턴 (품질 극대화)

```
dispatch --consensus "리뷰해"
  ├── Groq 70B ──── 응답 A
  └── Ollama 32B ── 응답 B

  합의: 둘 다 같은 이슈 지적 → 높은 신뢰도
  불일치: Claude가 최종 판단

  Mozilla Star Chamber 패턴:
  "3개 독립 모델이 같은 문제를 지적하면 거짓 양성 확률 극히 낮음"
```

### Git 기반 원격 디스패치 (확장)

```
Claude → git push (task branch)
  → GitHub Actions / 로컬 daemon 감지
  → Groq/Ollama 처리
  → git push (result branch)
Claude → git pull (결과 머지)
```

**장점**: 영속성, 감사 이력, 원격 머신 실행 가능, 장애 복구.

## Pattern C: Command Pipeline (100% 제어)

슬래시 커맨드 내부에 llm 파이프라인을 명시적으로 하드코딩.

### 예시: /marketing-repurpose

```markdown
## Step 1: Groq로 15개 포맷 초안 생성 (병렬, 총 3s)
각 포맷별로 `dispatch "블로그를 [포맷]으로 변환"` 실행.
15개 동시 실행 → Groq가 각 200ms → 전체 ~3초.

## Step 2: Claude가 검수 (품질 게이트)
초안 15개를 읽고 품질 점수 매김.
80점 이상: 채택. 미만: Claude가 재작성.

## Step 3: 결과 저장
content/social/ 에 저장.
```

**현재 방식**: Claude가 15개 전부 직접 생성 → 15 × 3s = **45초**
**v2 방식**: Groq 15개 병렬 3초 + Claude 검수 5초 = **8초** (5.6x 빠름)

### 적용 대상 커맨드

| 커맨드 | 생성 부분 | llm 적용 | 예상 속도 향상 |
|--------|----------|----------|---------------|
| /marketing-repurpose | 15개 포맷 변환 | 전부 llm | 5-6x |
| /marketing-generate | 블로그 초안 | llm 초안 + Claude 검수 | 2-3x |
| /intel brief | 데이터 합성 | llm 요약 + Claude 통합 | 2x |
| /card-news | 8장 텍스트 | llm 생성 + Claude 편집 | 3-4x |
| /marketing-social | 플랫폼별 변환 | 전부 llm | 4-5x |

## Pattern D: MCP Tool (mcp__llm__ask)

Claude가 자발적으로 호출 가능한 도구. 재시작 후 활성화.

```
Claude: mcp__llm__ask({
  prompt: "이 에러 로그 요약해",
  model: "groq-free"
})
→ Groq 70B → 200ms → 결과
```

**CLAUDE.md 규칙 강화**:
```
mcp__llm__ask 사용 의무 조건:
1. "이 작업의 출력이 틀려도 1분 안에 알 수 있는가?" → YES면 mcp__llm__ask
2. 요약, 포맷 변환, 번역, 로그 해석 → 반드시 mcp__llm__ask
3. 코드 생성, 보안, 아키텍처 → 절대 금지
```

규칙 준수 강제력은 없지만, Pattern A (Pre-emption)가 자동 보완.

## Implementation Priority (Pattern A 불가 반영)

```
Phase 1 (즉시): Pattern C — 주요 커맨드 llm 파이프라인
  - dispatch CLI wrapper (race/consensus 지원)
  - /marketing-repurpose에 llm 통합
  - 속도 벤치마크 (before/after)
  ★ 유일하게 100% 제어 가능한 경로

Phase 2 (1일): Pattern B — Dispatch daemon
  - daemon.mjs (fswatch + Groq/Ollama 라우팅)
  - launchd 등록 (상시 실행)
  - Claude 선택 의존 — CLAUDE.md 규칙 + 사용 편의로 유도

Phase 3 (선택): Pattern D — MCP 통합
  - Claude Code 재시작 후 mcp__llm__ask 확인
  - CLAUDE.md 규칙 강화
  - Claude 선택 의존 — 보조적 경로

Phase BLOCKED: Pattern A — PreToolUse 선점
  - systemMessage: UI 전용, 모델 컨텍스트 미주입 (실험 확인)
  - additionalContext: 미구현 (GitHub #19432, NOT_PLANNED)
  - updatedInput: Agent에서 무시 (GitHub #39814)
  - 재검토 조건: additionalContext 구현 시
```

## Metrics & Monitoring

### 측정 대상

| 지표 | 목표 | 현재 |
|------|------|------|
| Groq 선점 성공률 | >50% | 0% |
| 평균 응답 속도 | -30% | baseline |
| 무료 처리 비율 | >30% | 0% |
| 품질 점수 (Star Chamber) | >=현재 | baseline |
| rate limit 도달 빈도 | -50% | baseline |

### 자동 수집

SubagentStart/Stop 훅 (이미 설치됨) + dispatch 로깅 + orchestration-report.mjs 확장.

## Risk Mitigation

| 리스크 | 확률 | 대응 |
|--------|------|------|
| Groq API 장애 | 낮음 | timeout 3s → 빈 응답 → Agent 정상 진행 |
| 훅 지연 누적 | 중간 | PreToolUse 1개만 → 200ms 상한 |
| 분류기 오탐 | 낮음 | 코드/보안은 무조건 패스스루. 오탐 시 Agent 정상 진행 |
| Groq rate limit | 낮음 | 14,400/일 한도. 14회/일 사용으로는 0.1% |
| Claude가 systemMessage 무시 | 중간 | Pattern B/C가 보완 (구조적 강제) |
| 품질 저하 | 극히 낮음 | Claude가 심판. 불합격 시 Agent 진행 |

## References

### Production Systems
- [RouteLLM](https://github.com/lm-sys/RouteLLM) — ICLR 2025, 85% cost reduction at 95% quality
- [LiteLLM](https://github.com/BerriAI/litellm) — 100+ provider gateway, production-grade
- [Claude Code Router](https://github.com/musistudio/claude-code-router) — Claude Code 멀티모델 지원
- [Claude Code Mux](https://github.com/9j/claude-code-mux) — Rust 기반 프록시 + failover
- [Semantic Router](https://github.com/aurelio-labs/semantic-router) — 임베딩 기반 sub-ms 분류

### Research
- [MoA](https://arxiv.org/html/2406.04692v1) — Mixture of Agents, AlpacaEval 65.1%
- [Star Chamber](https://blog.mozilla.ai/the-star-chamber-multi-llm-consensus-for-code-quality/) — 멀티 LLM 합의 코드 리뷰
- [Cascade Routing](https://arxiv.org/html/2410.10347v1) — 3-tier 라우팅, 70-80% Tier 1 처리
- [SpecExec](https://www.together.ai/blog/specexec) — 10.6x 추론 속도 향상
- [Groq Benchmarks](https://groq.com/blog/artificialanalysis-ai-llm-benchmark-doubles-axis-to-fit-new-groq-lpu-inference-engine-performance-results) — 80ms TTFT

### Claude Code Constraints
- [PreToolUse updatedInput bug](https://github.com/anthropics/claude-code/issues/39814) — Agent에서 무시됨
- [additionalContext not implemented](https://github.com/anthropics/claude-code/issues/19432) — NOT_PLANNED
- [Hook latency](https://github.com/ruvnet/ruflo/issues/1530) — 11 hooks = +13s
