# A-Team Docs — Lessons Learned Index

> **사용법**: 버그/문제 발생 시 키워드로 grep → 해당 문서만 읽기
> 세션 시작 시 이 파일만 로드. 본문은 on-demand.
> `grep -i "키워드" A-Team/docs/INDEX.md`

---

| 파일 | 제목 | 키워드 |
|------|------|--------|
| `00-getting-started.md` | 시작 가이드 | 새 프로젝트, 신규, 시작, Tier 선택, 빠른 시작, 셋업, init, 매뉴얼 |
| `01-role-partitioning.md` | 역할 분할 원칙 | 에이전트 역할, 도메인 분리, 레벨 분리, 병렬 작업 충돌, 파일 소유권 |
| `02-conflict-prevention.md` | 파일 충돌 방지 | 동시 편집, merge conflict, 파일 잠금, 충돌 방지, PARALLEL_PLAN |
| `03-model-selection.md` | 모델 선택 가이드 | Opus vs Sonnet vs Haiku, 모델 배정, 비용 최적화, 태스크 분류, Gemini |
| `04-coordination-protocol.md` | 에이전트 간 조율 프로토콜 | 비동기 조율, 파일 기반 통신, 에이전트 핸드오프, CURRENT.md, 상태 동기화 |
| `05-mcp-servers.md` | MCP 서버 가이드 | MCP, 외부 도구 연동, 오케스트레이션 확장, 메모리 서버, 브라우저 자동화 |
| `06-build-methodology.md` | 빌드 방법론 | 5-Phase 개발, 계획→구현→검증, CI/CD, 빌드 실패, 배포 전략 |
| `07-clawteam.md` | ClawTeam 통합 가이드 | ClawTeam CLI, 자동화 레이어, 에이전트 3명+, 장기 프로젝트 |
| `08-orchestration-patterns.md` | 오케스트레이션 이론 | 시스템 아키텍처, 패턴 설계, 계층 구조, 에이전트 설계 |
| `09-production-strategy.md` | 프레임워크 선택 & 운영 | 도구 선택, 실전 운영, 프레임워크 비교, 프로덕션 |
| `10-claude-code-subagents.md` | Claude Code 서브에이전트 | 서브에이전트 구현, 에이전트 프롬프트, 즉시 실행, 코드 없는 멀티에이전트 |
| `11-integration-guide.md` | A-Team + Vibe-Toolkit 통합 | 통합 가이드, Vibe 규칙, 실행 엔진, 운영 원칙, 셋업 |
| `12-harness-engineering.md` | 하네스 엔지니어링 | Hook 설정, 자동화 게이트, 빌드 검증, 위험 명령 차단, 민감 파일 보호 |
| `13-context-continuity-protocol.md` | 맥락 지속성 프로토콜 (CC Mirror) | 컨텍스트 소실, 토큰 소진, 모델 교체, 핸드오프, CURRENT.md 보존, CC Mirror |
| `14-mobile-development.md` | 모바일 개발 가이드 | 모바일, 폰 개발, Claude 앱, Antigravity, 이동 중 개발 |
| `15-tdd-methodology.md` | TDD 방법론 — Claude Code 통합 | TDD, Red-Green-Refactor, Vitest, Playwright, Superpowers, Mutation Testing, 테스트 드리프트 방지 |
| `16-project-tiers.md` | 프로젝트 Tier 시스템 | NANO, STANDARD, PRO, DDD, 클린 아키텍처, Bounded Context, /craft, 업그레이드 경로, 프로젝트 규모 |
| `17-integration-evaluation-framework.md` | 통합 평가 프레임워크 | 프레임워크 도입, 멀티에이전트, 평가 기준, 토큰 효율, 장애 복원, 거버넌스, 벤치마크, CrewAI, LangGraph, OpenAI Agents SDK |
| `18-multi-agent-orchestration-research.md` | 멀티 에이전트 오케스트레이션 리서치 | 오케스트레이션, 수동 분기, 터미널 분기, OpenHands, Mato, CAO, Plandex, 마이그레이션, 토큰 소진 |
| `19-adoption-plan.md` | 멀티 에이전트 패턴 단계적 도입 계획 | MixtureOfAgents, 3-tier Guardrail, 체크포인팅, SOP, Phase 1/2/3, 파일별 조치, orchestrator 강화, 도입 설계 |
| `20-parallel-processing-landscape.md` | 병렬 처리 도구 & 프로젝트 종합 가이드 | 서브에이전트, 멀티에이전트, 스웜, 오케스트레이션, Superset IDE, Claude Squad, ComposioHQ, Multiclaude, Gas Town, git worktree, tmux, agentmaxxing, 케이스별 선택, 병렬 처리 |

---

## 문제 유형별 빠른 참조

| 문제 상황 | 참고 문서 |
|-----------|-----------|
| 처음 시작, 어떻게 쓰나 | `00` |
| 에이전트끼리 파일 덮어씀 | `01`, `02` |
| 어떤 모델 써야 할지 모름 | `03` |
| 에이전트 결과 전달이 안 됨 | `04` |
| MCP 서버 연동 에러 | `05` |
| 빌드/배포 실패 | `06`, `12` |
| 에이전트 3명+ 조율 복잡 | `07`, `08` |
| Hook이 작동 안 함 | `12` |
| 토큰 소진 후 컨텍스트 날아감 | `13` |
| 모바일에서 작업 이어받기 | `14` |
| TDD 루프, 테스트 드리프트, Vitest/Playwright 설정 | `15` |
| 프로젝트 규모 선택, DDD 적용 시점 | `16` |
| 새 프레임워크/도구 도입 평가 | `17` |
| 멀티 에이전트 조율, 수동 터미널 분기 효율 | `18` |
| MoA/Guardrail/체크포인팅 도입 계획, 파일별 설계 | `19` |
| 병렬 처리 도구 선택, 에이전트 수별 최적 도구, agentmaxxing | `20` |
