# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.

## In Progress Files
(없음)

## Last Completions (2026-03-28)
- `docs/20-parallel-processing-landscape.md` — 병렬 처리 도구 종합 가이드 + 2축 분류 체계 섹션
- `docs/08-orchestration-patterns.md` — 2축 분류 체계 (조율 방식 × 격리 수준) + 6패턴 결정 트리
- `.claude/agents/orchestrator.md` — Phase 2.0 패턴 자동 선택 + Phase 3.5 디스패치 + Phase 5.5 머지
- `templates/PARALLEL_PLAN.md` — 오케스트레이션 패턴 + 멀티터미널 디스패치 섹션
- `templates/DISPATCH_PROMPT.md` — 에이전트별 자립형 프롬프트 템플릿 (NEW)
- `scripts/dispatch.sh` — worktree 셋업 + 터미널 명령어 생성 (NEW)
- `scripts/merge-dispatch.sh` — 디스패치 결과 머지 + 정리 (NEW)
- `.claude/commands/vibe.md` — Step 4.5 실행 모드 판단 + Step 5 Opus/Gemini 분리 실행
- `governance/workflows/vibe.md` — 실행 모드 판단 동기화
- `scripts/*.sh` — 전체 실행 권한(+x) 복구 (10개)

## Next Tasks
- [ ] 멀티터미널 디스패치 실전 테스트 (2-agent dispatch → merge end-to-end)
- [ ] scripts/checkpoint.sh 실전 테스트 (실제 BLOCKED 시나리오)
- [ ] orchestrator MoA 모드 실전 시나리오 테스트
- [ ] commands(27) vs workflows(7) 비대칭 정리 (MEDIUM 이슈)
- [ ] 각 프로젝트에서 A-Team을 pull해서 쓰는 워크플로우 표준화

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
- 최신 커밋: a109745 — /vibe 실행 모드 판단 + 멀티터미널 디스패치

## 정합성 감사 (2026-03-28)
- 전체 점수: 88%
- docs/INDEX.md: 21개 전수 일치 (100%)
- 상호참조: orchestrator → rules/templates/scripts 전부 존재 (98%)
- 에이전트 정의: 5개 완전 (100%)
- HIGH 이슈: scripts +x 권한 → 수정 완료
- MEDIUM 이슈: commands/workflows 비대칭 (향후 개선)
