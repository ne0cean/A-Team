# A-Team Docs — Lessons Learned Index

> **사용법**: 버그/문제 발생 시 키워드로 grep -> 해당 문서만 읽기
> 세션 시작 시 이 파일만 로드. 본문은 on-demand.
> `grep -i "키워드" ~/tools/A-Team/docs/INDEX.md`
> 개념별 상세 위치는 `CONCEPT-INDEX.md` 참조.

---

| 파일 | 제목 | 키워드 |
|------|------|--------|
| `00-getting-started.md` | 시작 가이드 | 새 프로젝트, 신규, 시작, Tier 선택, 빠른 시작, 셋업, init |
| `01-role-partitioning.md` | 역할 분할 원칙 | 에이전트 역할, 도메인 분리, 레벨 분리, 파일 소유권 |
| `02-conflict-prevention.md` | 파일 충돌 방지 | 동시 편집, merge conflict, 파일 잠금, PARALLEL_PLAN |
| `03-model-selection.md` | 모델 선택 가이드 | Opus vs Sonnet vs Haiku, 모델 배정, 비용 최적화, Gemini |
| `04-coordination-protocol.md` | 에이전트 간 조율 | 비동기 조율, 파일 기반 통신, 핸드오프, CURRENT.md |
| `05-mcp-servers.md` | MCP 서버 가이드 | MCP, 외부 도구 연동, 메모리 서버, 브라우저 자동화 |
| `06-build-methodology.md` | 멀티에이전트 빌드 & 운영 | 5-Phase, ClawTeam, 계획->구현->검증, 파일 소유권 |
| `08-orchestration-patterns.md` | 오케스트레이션 패턴 & 실전 운영 | Supervisor, MoA, 2축 분류, 6가지 패턴, TAO, SOP, 프레임워크 비교 |
| `10-claude-code-subagents.md` | Claude Code 서브에이전트 | 서브에이전트, 에이전트 프롬프트, 즉시 실행 |
| `11-integration-guide.md` | A-Team 통합 가이드 | 통합, Vibe 규칙, 실행 엔진, 운영 원칙 |
| `12-harness-and-hooks.md` | 하네스 & 훅 계층 | Hook, 자동화 게이트, 빌드 검증, Tier 0~4, SessionStart, PreCompact, Stop, 데몬 |
| `13-context-continuity-protocol.md` | 맥락 지속성 (CC Mirror) | 컨텍스트 소실, 토큰 소진, 핸드오프, CURRENT.md 보존 |
| `14-mobile-development.md` | 모바일 개발 가이드 | 모바일, Claude 앱, Antigravity, 이동 중 개발 |
| `15-tdd-methodology.md` | TDD 방법론 | TDD, Red-Green-Refactor, Vitest, Playwright, Superpowers |
| `16-project-tiers.md` | 프로젝트 Tier 시스템 | NANO, STANDARD, PRO, DDD, 클린 아키텍처 |
| `17-tools-and-frameworks.md` | 도구 평가 & 병렬 처리 | 7차원 평가, CrewAI, LangGraph, Superset, Claude Squad, agentmaxxing, 케이스별 선택 |
| `19-adoption-plan.md` | 도입 계획 (아카이브) | MoA, Guardrail, 체크포인팅, SOP, Phase 1/2/3 |
| `HISTORY.md` | **전체 히스토리 (Phase 0-14)** | ClawTeam, Vibe-Toolkit, gstack Wave 1-4, Ralph/PIOP, bkit, Thin-wrapper, UI Auto-Inspect, Unified Advisor, CSO, Optimization Research, Sovereignty/Truth Contract |

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
| 에이전트 3명+ 조율 복잡 | `06`, `08` |
| Hook 작동 안 함, 훅 계층 이상 | `12` |
| 토큰 소진 후 컨텍스트 날아감 | `13` |
| 모바일에서 작업 이어받기 | `14` |
| TDD 루프, 테스트 설정 | `15` |
| 프로젝트 규모 선택, DDD | `16` |
| 새 도구/프레임워크 도입 평가 | `17` |
| 병렬 처리 도구 선택, agentmaxxing | `17` |
| MoA/Guardrail/체크포인팅 도입 | `19` |
