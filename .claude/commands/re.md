---
description: Research Mode 관리 — 자율 리서치 에이전트 시작/정지/상태 확인
---

Research Mode 데몬을 관리합니다.
사용자가 입력한 인수를 확인하여 해당 작업을 **즉시 실행**합니다. 인수 없으면 status를 실행합니다.

**자율 실행 원칙:**
- 확인 질문 없이 바로 실행
- 결과만 간결하게 보고
- 브리핑(notes/브리핑) 시 자동으로 최신 노트를 읽어 요약 출력

### start — 데몬 백그라운드 시작

```bash
PID_FILE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/daemon.pid"
if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "데몬이 이미 실행 중입니다 (PID: $(cat $PID_FILE))"
else
  mkdir -p $(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research
  nohup node $(git rev-parse --show-toplevel 2>/dev/null || pwd)/scripts/research-daemon.mjs \
    >> $(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/daemon.log 2>&1 &
  echo $! > "$PID_FILE"
  echo "Research Mode 시작됨 (PID: $!)"
  echo "30분 유휴 감지 후 자율 리서치 사이클이 시작됩니다."
fi
```

### stop — 데몬 종료

```bash
node $(git rev-parse --show-toplevel 2>/dev/null || pwd)/scripts/research-daemon.mjs stop
```

### status — 현재 상태 확인

```bash
node $(git rev-parse --show-toplevel 2>/dev/null || pwd)/scripts/research-daemon.mjs status
```

### notes — 최근 연구 노트 목록 및 자동 브리핑

```bash
find $(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/notes -name "*.md" -type f | sort -r | head -20
```

목록 출력 후 **가장 최신 노트 5개를 자동으로 읽어 카테고리별 핵심 발견을 브리핑**합니다.
별도 질문 없이 즉시 실행합니다.

### once [카테고리|all] — 단일 사이클 또는 전체 순환

카테고리: frontend, backend, ux-ui, product, marketing, market, security, all

```bash
node $(git rev-parse --show-toplevel 2>/dev/null || pwd)/scripts/research-daemon.mjs --once [카테고리]
node $(git rev-parse --show-toplevel 2>/dev/null || pwd)/scripts/research-daemon.mjs --once all
```

- 단일: 지정 카테고리 1사이클 실행 후 종료
- all: 예산 소진 또는 전체 순환 완료까지 연속 실행

비용: 사이클당 최대 $0.50 / 세션 최대 $3.50 / 사이클 간 2분 대기
