# CURRENT — A-Team 글로벌 툴킷

## Status
글로벌 AI 개발 툴킷. 독립 레포로 관리되며 모든 프로젝트에서 참조.

## In Progress Files
(없음)

## Last Completions (2026-03-28)
- 훅 계층 재구성: SessionStart[startup/resume] 자동화 (/vibe + /pickup 대체)
- 토큰 최적화: orchestrator.md 70% 축소 (287→87줄), vibe.md 52% 축소 (101→49줄)
- governance/rules 통합: preamble.md에 coding-safety + sync-and-commit + turbo-auto 부록화
- governance/workflows/vibe.md 16줄로 압축
- 모델 추천 강화: /vibe Step 3에 태스크별 모델 안내 추가
- `docs/21-hook-hierarchy.md` — 5-Tier 자동화 아키텍처 문서 (NEW)

## Next Tasks
- [ ] 멀티터미널 디스패치 실전 테스트 (2-agent dispatch → merge e2e)
- [ ] scripts/checkpoint.sh 실전 테스트 (BLOCKED 시나리오)
- [ ] orchestrator MoA 모드 실전 테스트
- [ ] 각 프로젝트에서 A-Team pull 워크플로우 표준화

## Blockers
없음

## 배포 현황
- GitHub: https://github.com/ne0cean/A-Team (master)
- 글로벌 커맨드: ~/.claude/commands/ (install-commands.sh로 배포)
