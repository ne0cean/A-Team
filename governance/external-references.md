# External References — 외부 자원 흡수 이력

> a-team이 외부 영상/레포/표준/문서에서 흡수한 모든 인사이트의 단일 진실 공급원(SSOT).
> 새 외부 자원을 코드/룰에 반영할 때마다 이 파일에 1 row 추가.

## 등록 룰

1. **언제 추가**: 외부 자원에서 영감/패턴/사양을 a-team 코드 또는 룰에 반영했을 때
2. **무엇을 추가**: 출처 URL + 한 줄 요약 + 반영 위치 + 라이선스 + 흡수 일자
3. **누락 금지**: 커밋 메시지에만 적고 이 파일에 안 적으면 시간이 지나며 출처 추적 불가
4. **doc-sync 검증**: `/doc-sync` 실행 시 코드의 "영상 영감/Inspired by/출처" 키워드와 이 파일을 cross-check

## Active References

### 영상 (YouTube)

| 일자 | 제목 / 채널 | URL | 핵심 인사이트 | 반영 위치 | 라이선스 |
|------|-----------|-----|------------|---------|---------|
| 2026-04-28 | Anthropic Multi-Agent Harness Design (3-step Planner-Generator-Evaluator) | https://www.youtube.com/watch?v=ZDKUsneXgpE | GAN 영감 격리 — Generator는 Evaluator 평가 룰을 모름 | `.claude/agents/orchestrator.md` Phase 2.7 원칙 1 + `.claude/agents/reviewer.md` 격리 원칙 | Anthropic 공식 (인용 자유) |
| 2026-04-28 | "코드가 복잡해지는 진짜 이유, 범인은 관계다" / Array's DevBook | https://www.youtube.com/watch?v=NSkk3wkZINg | ECS 철학 — 시스템(에이전트) 간 직접 호출 금지, 공유 데이터로만 통신 | `.claude/agents/orchestrator.md` Phase 2.7 원칙 2 | YouTube TOS (인용) |
| 2026-05-01 | "구글이 사양 공개한 design.md 정체" / Maker Evan | https://www.youtube.com/watch?v=w33YxZ7auZs | DESIGN.md 표준 인지 + 8 카테고리 구조 + 3단계 적용법 | `.claude/agents/designer.md` Step 0 + `.claude/commands/vibe.md` Step 0.66 + `governance/design/gate.md` 우선순위 | YouTube TOS (인용) |

### GitHub Repositories

| 일자 | 레포 | URL | 흡수한 것 | 반영 위치 | 라이선스 |
|------|------|-----|---------|---------|---------|
| 2026-05-01 | google-labs-code/design.md | https://github.com/google-labs-code/design.md | DESIGN.md 사양 (8 카테고리: Overview/Colors/Typography/Layout/Elevation/Shapes/Components/Do's-Don'ts), W3C DTCG 표준 | `.claude/agents/designer.md` Step 0 (전체 구조 인지) | Apache 2.0 |
| 2026-04-28 | rtk-ai/rtk | https://github.com/rtk-ai/rtk | Rust Token Killer — CLI proxy로 Bash 출력 60-90% 압축 | 글로벌 `~/.claude/settings.json` PreToolUse Bash 훅 + `/opt/homebrew/bin/rtk` 심볼릭링크 | (rtk 자체 라이선스) |
| 2026-04-15 | byungjunjang/jangpm-meta-skills | https://github.com/byungjunjang/jangpm-meta-skills | autoresearch + blueprint 메타 스킬 | `.claude/commands/autoresearch.md` + `.claude/commands/blueprint.md` (A-Team 규격으로 포팅) | MIT |
| (history) | karpathy/autoresearch | (autoresearch 원본 방법론) | Karpathy식 프롬프트 자동 최적화 루프 | `governance/skills/autoresearch/` | MIT |
| (history) | gstack | (외부 설계 문서 저장 표준) | `~/.gstack/projects/[프로젝트]-[날짜].md` 형식 — office-hours 산출물 저장 위치 | `.claude/commands/office-hours.md` + `.claude/commands/plan-ceo.md` | (외부 표준) |
| (history) | bkit (P2) | (외부 4모듈 라이브러리) | circuit-breaker / state-machine / gate-manager / self-healing 패턴 차용 | `lib/` 다수 (advisor-breaker, state machine 등 153 tests 확장) | (라이선스 확인 필요) |
| (history) | anthropics/anthropic-tools | https://github.com/anthropics/anthropic-tools | browse 스킬 dist 바이너리 참조 | `.claude/commands/browse.md` | (Anthropic 공식) |
| 2026-04-15 | gitroomhq/postiz-app | https://github.com/gitroomhq/postiz-app | 멀티플랫폼 소셜 발행 (22+ 플랫폼) | `governance/skills/marketing/stacks/starter.md` + `.claude/commands/marketing-publish.md` | (postiz 자체) |
| 2026-04-15 | EnesCinr/twitter-mcp | https://github.com/EnesCinr/twitter-mcp | X/Twitter 직접 제어 MCP | `governance/skills/marketing/README.md` 추천 | (twitter-mcp 자체) |
| 2026-04-15 | stickerdaniel/linkedin-mcp-server | https://github.com/stickerdaniel/linkedin-mcp-server | LinkedIn 직접 제어 MCP | `governance/skills/marketing/README.md` 추천 | (linkedin-mcp 자체) |

### Phase 14 Optimization Research — Wave 1-3 외부 흡수 (2026-04-14)

| 일자 | 레포/도구 | URL | 흡수한 것 | 반영 위치 (RFC) | 라이선스 |
|------|---------|-----|---------|---------------|---------|
| 2026-04-14 | Anthropic Prompt Caching | (Anthropic API) | 5분 TTL 캐시 활용으로 토큰 비용 -50% | RFC-001 (Prompt Caching) | Anthropic 공식 |
| 2026-04-14 | Handoff Compression 패턴 | (외부 리서치) | 세션 핸드오프 시 컨텍스트 압축 | RFC-002 (Handoff Compression) | (외부 패턴) |
| 2026-04-14 | Anthropic ToolSearch (deferred tools) | (Claude Code 공식) | 도구 스키마 지연 로딩 | RFC-003 (ToolSearch) | Anthropic 공식 |
| 2026-04-14 | Classical Tools 패턴 | (외부 리서치) | 결정론적 도구 우선 + LLM은 critique | RFC-004 (Classical Tools) | (외부 패턴) |
| 2026-04-14 | promptfoo | https://github.com/promptfoo/promptfoo | eval 템플릿 b1-b6 차용 | RFC-005 (promptfoo templates) | MIT |
| 2026-04-14 | Cascade Routing + Budget Tracker | (외부 리서치) | 모델 캐스케이드 + 비용 한도 | RFC-006 (Cascade + Budget Tracker) — `lib/cost-tracker.ts` | (외부 패턴) |
| 2026-04-14 | Spotlighting Defense | (보안 리서치) | Prompt injection 방어 (3 phase) | RFC-007 (Spotlighting Phase S+M+L) | (외부 패턴) |
| 2026-04-14 | langchain-ai/langgraph | https://github.com/langchain-ai/langgraph | 멀티에이전트 오케스트레이션 패턴 비교 | `docs/research/2026-04-optimization/round-1/C1-orchestration.md` (조사만, 직접 흡수 X) | MIT |
| 2026-04-14 | crewaiinc/crewai | https://github.com/crewaiinc/crewai | 동상 | 동상 | MIT |
| 2026-04-14 | pydantic/pydantic-ai | https://github.com/pydantic/pydantic-ai | 동상 | 동상 | MIT |
| 2026-04-14 | huggingface/smolagents | https://github.com/huggingface/smolagents | 동상 | 동상 | Apache 2.0 |
| 2026-04-14 | agno-agi/agno | https://github.com/agno-agi/agno | 동상 | 동상 | (확인 필요) |
| 2026-04-14 | openai/swarm | https://github.com/openai/swarm | 동상 | 동상 | MIT |
| 2026-04-14 | stanfordnlp/dspy | https://github.com/stanfordnlp/dspy | 프롬프트 최적화 패러다임 | 조사만 (autoresearch와 비교) | MIT |
| 2026-04-14 | langfuse/langfuse | https://github.com/langfuse/langfuse | 평가/관찰성 도구 비교 | `docs/research/.../C5-A3-eval-obs.md` | MIT |
| 2026-04-14 | UKGovernmentBEIS/inspect_ai | https://github.com/UKGovernmentBEIS/inspect_ai | 동상 | 동상 | MIT |
| 2026-04-14 | traceloop/openllmetry | https://github.com/traceloop/openllmetry | 동상 | 동상 | Apache 2.0 |
| 2026-04-14 | Giskard-AI/giskard-oss | https://github.com/Giskard-AI/giskard-oss | 동상 | 동상 | Apache 2.0 |

### Top 10 외부 리서치 — 야간 자율 흡수 (2026-04-15)

| 출처 | 흡수 패턴 | 반영 위치 |
|------|---------|---------|
| frankbria + Anthropic SDK + LiteLLM | Probe exponential backoff (5s→25s→125s + Retry-After 헤더) | `scripts/sleep-resume.sh` |
| Boucle 사례 ($48/day 폭주) | 시간당 비용 cap 패턴 | `scripts/ralph-daemon.mjs` `maxBudgetPerHour: $3.00` |
| (외부 리서치 종합) | PID lock + Quality Gates 4-stage | `scripts/quality-gate-stage2.sh` + governance/rules/quality-gates.md |

상세: `.research/notes/2026-04-15-overnight-autonomous-research.md` (900+ lines)

### 외부 도구 (CLI 설치)

| 일자 | 도구 | 설치 경로 | 용도 | 명령 |
|------|------|---------|------|------|
| 2026-04-28 | yt-dlp 2026.3.17 | `~/Library/Python/3.14/bin/yt-dlp` | YouTube 자막/오디오/영상 다운로드 | `pip3 install --user --break-system-packages yt-dlp` |
| 2026-04-28 | ffmpeg 8.0.1 | `/opt/homebrew/bin/ffmpeg` | 영상 키프레임 추출 | (사전 설치) |
| 2026-04-28 | rtk 0.38.0 | `~/.local/bin/rtk` (+ `/opt/homebrew/bin/rtk` 심볼릭) | LLM 토큰 압축 프록시 | `sh /tmp/rtk-install.sh` |

### 디자인 레퍼런스 (역엔지니어링 흡수)

10개 production brand의 디자인 시스템을 역엔지니어링해 `governance/design/refs/*.md`로 흡수 (2026-04-15).

| 브랜드 | 카테고리 | 흡수 부분 |
|--------|---------|---------|
| Linear | editorial | 톤 · 컴포넌트 anti-patterns |
| Stripe | editorial | 동상 |
| Claude (Anthropic) | editorial | 동상 |
| Notion | editorial | 동상 |
| Vercel | bold-typographic | 동상 |
| Raycast | soft-pastel | 동상 |
| Arc Browser | soft-pastel | 동상 |
| Figma | playful | 동상 |
| Rauno.me | brutalist | 동상 |
| Bloomberg | brutalist (data-dense 극단) | 동상 |

**디자인 거인 (영향)**:
| 인물 | 흡수 부분 |
|------|---------|
| Dieter Rams | 기능주의 미학 — `governance/skills/design/README.md` |

### 외부 패턴 (출처 미상이지만 명시 차용)

| 패턴 | 차용 위치 | 출처 |
|------|---------|------|
| reflect Parallel-Consolidate (Parallel Analysis → Duplicate Checker → Dynamic Options) | `.claude/commands/retro.md` | jangpm-meta-skills/reflect (IMP-20260415-01) |

### 표준/스펙

| 일자 | 표준 | URL | 흡수 부분 | 반영 위치 |
|------|------|-----|---------|---------|
| 2026-05-01 | W3C DTCG (Design Token Community Group) | https://www.designtokens.org/ | 디자인 토큰 표준 — DESIGN.md가 따름 | `.claude/agents/designer.md` Step 0 인지 |
| (history) | OWASP Top 10 + STRIDE | (보안 표준) | 위협 모델링 8단계 | `.claude/agents/cso.md` |
| (history) | WCAG 2.1 (AA/AAA) | (a11y 표준) | 색상 대비 + 키보드 접근성 | `governance/design/gate.md` + `lib/design-smell-detector.ts` RD-03 |

### 블로그 포스트 / 공식 문서

| 일자 | 제목 / 출처 | URL | 인사이트 | 반영 위치 |
|------|-----------|-----|--------|---------|
| 2026-04-28 | Anthropic Engineering — Harness Design for Long-Running Apps | https://www.anthropic.com/engineering/harness-design-long-running-apps | 3-step Planner-Generator-Evaluator + 파일 기반 통신 | `.claude/agents/orchestrator.md` Phase 2.7 |
| 2026-05-01 | Stitch DESIGN.md open-source / Google Blog | https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/ | DESIGN.md 오픈소스 공개 (2026-04-21) 배경 | `.claude/agents/designer.md` Step 0 |

## Deferred (반영 보류 — Low Priority)

| 자원 | URL | 보류 사유 | 트리거 조건 |
|------|-----|---------|-----------|
| Playwright MCP Evaluator | (영상 #1 영감) | 새 에이전트/MCP 통합 필요 | qa.md 업그레이드 작업 시 |
| Generator→Evaluator 스프린트 루프 명시화 | (영상 #1 영감) | orchestrator 큰 구조 변경 | 현재 ad-hoc 구조가 한계 도달 시 |
| /design-md 슬래시 커맨드 | (영상 #3 영감) | 별도 워크플로우 빌드 필요 | DESIGN.md 첫 작성 케이스 발생 시 |
| design-auditor DESIGN.md 토큰 위반 룰 | (DESIGN.md 표준) | 정적 룰 추가 작업 | 외부 프로젝트에서 DESIGN.md 사용 시 |
| DESIGN.md ↔ .design-override.md 양방향 변환 | (DESIGN.md 표준) | CLI 도구 흡수 검토 | 파이프라인 연결 필요 시 |

## 사용법

### 새 외부 자원 흡수 시
1. 코드/룰에 반영 후 이 파일에 row 추가 (적절한 섹션)
2. 커밋 메시지에 `external-references.md`도 포함
3. doc-sync 자동 검증 통과 확인

### 출처 추적 시
1. 코드에서 "영감/Inspired by/출처" 키워드 grep
2. 이 파일 매칭 row 확인
3. URL/라이선스 필요시 직접 참조

### 라이선스 검증
- Apache 2.0 / MIT — 자유 인용 + 코드 흡수 OK
- YouTube TOS — 인용 + 핵심 아이디어 차용 OK (전체 transcript 재배포는 X)
- Anthropic 공식 — 영감 자유, 코드는 별도 라이선스 확인 필요
