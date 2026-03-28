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

### pipeline "task" [--check "cmd"] [--model haiku|sonnet|opus] [--max N] [--budget N] — Research → Ralph 파이프라인

리서치 완료 후 자동으로 Ralph Loop 실행을 연계합니다.

**실행 순서:**

1. Ralph 태스크를 `pending` 상태로 `ralph-state.json`에 등록 (Write 도구)

파일 경로: `{REPO_ROOT}/.research/ralph-state.json`

```json
{
  "task": "<사용자가 입력한 task>",
  "checkCommand": "<--check 값, 없으면 null>",
  "model": "<haiku|sonnet|opus, 기본 sonnet>",
  "maxIterations": <--max 값, 기본 20>,
  "budgetCapUsd": <--budget 값, 기본 5.00>,
  "currentIteration": 0,
  "stallCount": 0,
  "totalCostUsd": 0,
  "status": "pending",
  "startedAt": null,
  "researchNotes": null
}
```

`status: "pending"`이 핵심 — 리서치 데몬이 사이클 완료 후 이 상태를 감지하면 자동으로 Ralph 데몬을 시작합니다.

2. 리서치 데몬 시작 (기존 start와 동일)

```bash
PID_FILE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/daemon.pid"
if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "데몬이 이미 실행 중입니다 (PID: $(cat $PID_FILE))"
else
  mkdir -p $(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research
  nohup node $(git rev-parse --show-toplevel 2>/dev/null || pwd)/scripts/research-daemon.mjs \
    >> $(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/daemon.log 2>&1 &
  echo $! > "$PID_FILE"
  echo "✅ Research → Ralph 파이프라인 시작됨 (PID: $!)"
  echo "   리서치 완료 후 Ralph Loop 자동 전환됩니다."
fi
```

3. 완료 보고

```
✅ 파이프라인 등록 완료
   1단계: Research (유휴 감지 후 자동 시작)
   2단계: Ralph Loop (리서치 완료 후 자동 전환)
   태스크: <task>
   모델: <model> | 최대: <max>회 | 예산: $<budget>
```

### 사용 예시 (자기 전 원스탑)

```
/re pipeline "같은 서브넷 사용자 감지 + Web Push 유도 구현" \
  --check "npm run build" --max 15 --budget 3
```

→ 유휴 감지 → 7카테고리 리서치 → 리서치 완료 → Ralph 자동 시작 → 코드 구현 반복
