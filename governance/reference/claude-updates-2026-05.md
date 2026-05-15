# Claude Updates — May 2026

> 출처: https://github.com/anthropics/claude-code/releases + https://www.anthropic.com/news/claude-opus-4-7
> 수집일: 2026-05-16

## Claude Code v2.1.142 (2026-05-14)

### 새 기능
- **terminalSequence 훅 필드**: hook JSON output에 `terminalSequence` 필드 추가. 컨트롤 터미널 없이도 데스크톱 알림·윈도우 타이틀·벨 소리 emit 가능. A-Team 훅에서 활용 가능.
- **CLAUDE_CODE_PLUGIN_PREFER_HTTPS**: GitHub 플러그인 소스를 SSH 대신 HTTPS로 클론. SSH 키 없는 환경 호환성 향상.
- **ANTHROPIC_WORKSPACE_ID**: workload identity federation용 env var. 토큰을 특정 워크스페이스로 스코핑.
- **claude project purge [path]**: 프로젝트의 모든 Claude Code 상태(transcript, task, file history, config) 삭제.
- **/model picker 개선**: `ANTHROPIC_BASE_URL`이 호환 게이트웨이를 가리킬 때 `/v1/models` 엔드포인트에서 모델 목록 조회.

### A-Team 적용 포인트
- `terminalSequence` 훅 필드 → 향후 훅에서 진행 상황 알림 구현 시 참고.
- `ANTHROPIC_WORKSPACE_ID` → 멀티 워크스페이스 환경에서 auto-switch 개선 가능성.

---

## Claude Opus 4.7 (API: `claude-opus-4-7`, 2026-04-16 GA)

### 스펙
| 항목 | 값 |
|------|-----|
| API ID | `claude-opus-4-7` |
| 가격 | 입력 $5/M · 출력 $25/M (4.6과 동일) |
| 컨텍스트 | 1M tokens (장문 프리미엄 없음) |
| 이미지 | 최대 2,576px / 3.75MP (이전 대비 3x+) |

### 주요 변경
- **xhigh 노력 레벨**: `high`와 `max` 사이 신규 레벨. Claude Code 기본값이 전 플랜 `xhigh`로 상향.
- **코딩 성능**: 내부 93-task 벤치 기준 4.6 대비 13% 향상. 4.6/Sonnet이 못 푸는 태스크 해결.
- **instruction following 대폭 향상**: 이전 버전 대비 프롬프트 재튜닝 필요할 수 있음.
- **파일시스템 기반 메모리**: 멀티 세션 작업에서 컨텍스트 유지 개선.
- **토크나이저 변경**: 동일 입력 → 1.0–1.35× 더 많은 토큰. 비용 추정 재계산 필요.

### Task Budgets (공개 베타)
- 긴 agentic 실행에서 Claude의 토큰 소비를 가이드하는 새 API 파라미터.
- `/zzz` 장시간 자율 실행 시 비용 제어에 직접 활용 가능.

### A-Team CLAUDE.md 모델 테이블 업데이트 필요
현재 CLAUDE.md에 `claude-opus-4-6`이 명시된 경우 → `claude-opus-4-7`로 이전 고려.

---

## Advisor Tool (베타)
- Anthropic Platform 네이티브 beta feature: `anthropic-beta: advisor-tool-2026-03-01` 헤더 필요.
- A-Team advisor tool 보류 태스크(CURRENT.md)와 연계 가능. API 크레딧 확보 후 재검토.
