---
description: 세션 시작 — 컨텍스트 로드 후 즉시 작업 실행 (Turbo One-Stop Start)
---

세션을 시작합니다.

0. **A-Team 업데이트 확인** — `~/tools/A-Team/`에서 원격 변경사항을 확인합니다:
   ```bash
   cd ~/tools/A-Team && git fetch origin && git log HEAD..origin/master --oneline 2>/dev/null
   ```
   - 새 커밋이 있으면: `git pull origin master`로 최신화하고 변경된 파일 목록을 한 줄로 요약합니다
   - 변경사항 없으면 이 단계를 건너뜁니다

1. `.context/CURRENT.md`, `.context/DECISIONS.md`(있으면), `memory/MEMORY.md`(있으면)를 정독하여 맥락을 탑재합니다.

2. `git status` + `git log --oneline -5`로 마지막 중단 지점을 파악합니다.

3. **Research Mode 노트 확인** — `.research/notes/` 디렉토리를 확인합니다:
   ```bash
   find "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/notes" -name "*.md" -newer "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.context/CURRENT.md" 2>/dev/null | sort -r | head -10
   ```
   - 새 노트가 있으면: 카테고리별로 핵심 발견과 제안을 요약 브리핑합니다
   - 브리핑 형식: "[카테고리] — 핵심 발견 N개, 주요 제안: [1-2줄 요약]"
   - 브리핑 후 "어떤 제안을 이번 세션에서 적용할까요?" 라고 묻습니다
   - 노트가 없으면 이 단계를 건너뜁니다

4. 브리핑은 한 문장으로 축약합니다: "마지막으로 [X] 상태. [첫 번째 태스크] 시작합니다."

5. 사용자가 리서치 내용 적용을 원하면 해당 태스크를 우선 실행합니다.
   원하지 않으면 CURRENT.md의 Next Tasks 최우선 항목을 즉시 시작합니다.

자율 작업 원칙:
- 안전한 탐색/읽기 작업은 승인 없이 진행
- [분석 → 수정 → 검증] 흐름을 한 번에 묶어서 실행
- 실패 시 즉시 질문하지 않고 원인 파악 후 재시도 (최대 2회)
- 모호한 부분만 최소한으로 질문
