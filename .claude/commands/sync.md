---
description: Auto-Sync 데몬 관리 — 백그라운드 자동 저장/커밋 시작·정지·상태 확인
---

Auto-Sync 데몬을 관리합니다. 인수에 따라 즉시 실행합니다. 인수 없으면 status 실행.

**자율 실행 원칙:** 확인 질문 없이 바로 실행, 결과만 간결하게 보고.

### start [interval_seconds] — 데몬 시작 (기본 1800초 = 30분)

A-Team `scripts/auto-sync.sh` 위치를 탐색합니다:
```bash
ATEAM=$(git rev-parse --show-toplevel 2>/dev/null)/A-Team
[ -d "$ATEAM" ] || ATEAM=~/tools/A-Team
SCRIPT="$ATEAM/scripts/auto-sync.sh"
```
스크립트 존재하면:
```bash
nohup bash "$SCRIPT" ${1:-1800} >> "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/sync.log" 2>&1 &
echo $! > "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/sync.pid"
echo "Auto-Sync 시작됨 (PID: $!, 간격: ${1:-1800}초)"
```

### stop — 데몬 종료
```bash
PID_FILE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/sync.pid"
[ -f "$PID_FILE" ] && kill $(cat "$PID_FILE") 2>/dev/null && echo "Auto-Sync 종료됨" || echo "실행 중인 데몬 없음"
```

### status — 현재 상태
```bash
PID_FILE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/sync.pid"
if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "✅ Auto-Sync 실행 중 (PID: $(cat $PID_FILE))"
  tail -5 "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/sync.log" 2>/dev/null
else
  echo "⏹ Auto-Sync 미실행"
fi
```

### once — 즉시 1회 저장/커밋
변경된 파일이 있으면 `sync: manual save [시간]` 메시지로 즉시 커밋합니다.
