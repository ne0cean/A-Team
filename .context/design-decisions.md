# Design Decisions

## 2026-05-30 Cortex-Confluence Sync

- **결정**: Cortex JSON을 SSOT로, Confluence를 VDI 접근용 미러로 사용. 단일 Node.js 데몬이 양방향 실시간 동기화
- **대안**: (1) Confluence를 SSOT로 (기각: Claude Code/Dashboard/git 이력 단절) (2) GitLab 위키 미러 (기각: to-do 편집 UX 열악) (3) 전체 Cortex 미러 (기각: 1차 스코프 과대)
- **근거**: 로컬이 자동화 중심(Claude Code + Dashboard + git), VDI는 외부망 차단으로 Confluence만 접근 가능, 혼자 사용이라 팀 공유 불필요
- **참조**: `blueprint-cortex-confluence-sync.md`
