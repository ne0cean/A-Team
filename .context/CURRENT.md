# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.

## In Progress Files
(없음)

## Last Completions (2026-03-27)
- `.claude/commands/tdd.md`, `craft.md` — 누락 커맨드 배포 수정
- `scripts/install-commands.sh` — orphan 감지 가드 추가
- `docs/17-integration-evaluation-framework.md` — 7차원 통합 평가 프레임워크
- `docs/18-multi-agent-orchestration-research.md` — 멀티 에이전트 오케스트레이션 리서치
- `docs/19-adoption-plan.md` — 멀티 에이전트 패턴 단계적 도입 계획 (파일 단위 설계)
- `governance/rules/guardrails.md` — 3-tier Guardrail 규약 (Input/Tool/Output)
- `governance/rules/checkpointing.md` — LangGraph 체크포인팅 파일 기반 구현 규약
- `.claude/agents/orchestrator.md` — MixtureOfAgents 모드 + 체크포인트 관리 추가
- `.claude/agents/reviewer.md` — 3-tier Guardrail 구조 명확화
- `docs/08-orchestration-patterns.md` — MoA(패턴4) + SOP(패턴5) 추가
- `templates/PARALLEL_PLAN.md` — Guardrail 체크 + MoA 설정 + 체크포인트 섹션
- `scripts/checkpoint.sh` — 체크포인트 save/load/list/archive 스크립트

## Next Tasks
- [ ] scripts/checkpoint.sh 실전 테스트 (실제 BLOCKED 시나리오)
- [ ] Phase 2: .context/checkpoints/ 초기화 + 실전 운용
- [ ] orchestrator MoA 모드 실전 시나리오 테스트
- [ ] 각 프로젝트에서 A-Team을 pull해서 쓰는 워크플로우 표준화
- [ ] connectome/A-Team → ~/tools/A-Team 단방향 동기화 규칙 명문화

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
- 최신 커밋: 2c0caa3 — Phase 1 멀티 에이전트 패턴 통합
