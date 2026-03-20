---
description: 모델 전환 핸드오프 — 현재 맥락을 저장하고 새 AI로 전달할 프롬프트 생성
---

모델 전환(토큰 소진 / 다른 AI로 전환)을 준비합니다. 즉시 실행합니다.

## 실행 순서

### 1. 핸드오프 스크립트 탐색
```bash
ATEAM=$(git rev-parse --show-toplevel 2>/dev/null)/A-Team
[ -d "$ATEAM" ] || ATEAM=~/tools/A-Team
SCRIPT="$ATEAM/scripts/model-exit.sh"
```

스크립트 존재하면:
```bash
bash "$SCRIPT"
```

스크립트 없으면 아래를 직접 실행:

### 2. 현재 상태 커밋
변경된 파일이 있으면:
```bash
git add -A
git commit -m "sync: model handoff $(date '+%Y-%m-%d %H:%M')"
```

### 3. 핸드오프 프롬프트 생성
`.context/HANDOFF_PROMPT.txt` 파일을 생성:
```
# 컨텍스트 핸드오프 — [날짜/시간]

이전 세션에서 이어받은 작업입니다. 아래 맥락을 읽고 즉시 재개하세요.

## 최근 커밋 (last 3)
[git log --oneline -3 결과]

## 현재 프로젝트 상태 (CURRENT.md 요약)
[.context/CURRENT.md 상단 60줄]

## 지시
1. 위 맥락을 정독하세요.
2. git status + git log --oneline -5 로 현재 상태를 확인하세요.
3. CURRENT.md의 Next Tasks 최우선 항목을 즉시 시작하세요.
4. 브리핑 없이 바로 실행하세요.
```

### 4. 클립보드 복사
```bash
# macOS
command -v pbcopy  && cat .context/HANDOFF_PROMPT.txt | pbcopy
# Linux
command -v xclip   && cat .context/HANDOFF_PROMPT.txt | xclip -selection clipboard
# Windows Git Bash
command -v clip.exe && cat .context/HANDOFF_PROMPT.txt | clip.exe
```

### 5. 완료 보고
파일 경로와 클립보드 복사 성공 여부를 출력합니다.
새 AI에서 `Ctrl+V` (또는 `Cmd+V`)로 붙여넣기 후 전송하세요.
