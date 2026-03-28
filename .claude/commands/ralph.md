---
description: Ralph Loop 자율 개발 데몬 — 잠든 새벽에 코드 태스크를 자율 반복 실행
---

Ralph Loop 데몬을 관리합니다.
사용자가 입력한 인수를 확인하여 **즉시 실행**합니다. 확인 질문 없이 바로 실행합니다.

## A-Team 스크립트 경로 탐색 (공통)

```bash
ATEAM_SCRIPTS=""
for candidate in \
  "$HOME/tools/A-Team/scripts" \
  "$HOME/Desktop/Projects/A-Team/A-Team/scripts" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/A-Team/scripts" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/scripts"; do
  [ -f "$candidate/ralph-daemon.mjs" ] && ATEAM_SCRIPTS="$candidate" && break
done
if [ -z "$ATEAM_SCRIPTS" ]; then
  echo "❌ ralph-daemon.mjs를 찾을 수 없습니다. A-Team 경로를 확인하세요."
  exit 1
fi
DAEMON="$ATEAM_SCRIPTS/ralph-daemon.mjs"
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PID_FILE="$REPO_ROOT/.research/ralph-daemon.pid"
STATE_FILE="$REPO_ROOT/.research/ralph-state.json"
```

---

### start "task" [옵션] — 데몬 시작

옵션:
- `--check "cmd"` — 완료 판정 bash 명령 (예: `"npm test"`, `"npm run lint && npm test"`)
- `--model haiku|sonnet|opus` — 모델 선택 (기본: sonnet)
- `--max N` — 최대 반복 횟수 (기본: 20)
- `--budget N` — 예산 상한 달러 (기본: 5.00)

**실행 순서:**

1. 이미 실행 중이면 중단

```bash
if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "⚠️  Ralph 데몬이 이미 실행 중입니다. /ralph stop 후 재시작하세요."
  exit 1
fi
```

2. `.research/` 디렉토리 생성

```bash
mkdir -p "$REPO_ROOT/.research"
```

3. **Write 도구로** `ralph-state.json` 생성 (사용자 인수를 파싱하여 JSON 작성)

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
  "status": "running",
  "startedAt": <현재 epoch ms>
}
```

4. 데몬 백그라운드 시작

```bash
cd "$REPO_ROOT"
nohup node "$DAEMON" \
  >> "$REPO_ROOT/.research/ralph-daemon.log" 2>&1 &
# PID는 daemon 내부 writePid()가 관리 — shell에서 중복 작성하지 않음
sleep 1  # daemon이 PID 파일 쓸 시간 확보
echo "✅ Ralph Loop 시작됨"
echo "   태스크: <task>"
echo "   모델: <model> | 최대: <max>회 | 예산: $<budget>"
echo ""
echo "   /ralph status  — 진행 상황 확인"
echo "   /ralph log     — 실시간 로그"
echo "   /ralph stop    — 중단"
```

---

### stop — 데몬 종료

```bash
if [ ! -f "$PID_FILE" ]; then
  echo "실행 중인 Ralph 데몬 없음"
else
  node "$DAEMON" stop
fi
```

---

### status — 현재 상태 확인

```bash
cd "$REPO_ROOT" && node "$DAEMON" status
```

---

### log [N] — 로그 확인 (기본 최근 30줄)

```bash
LOG_FILE="$REPO_ROOT/.research/ralph-daemon.log"
N=${1:-30}
if [ -f "$LOG_FILE" ]; then
  tail -n "$N" "$LOG_FILE"
else
  echo "로그 파일 없음: $LOG_FILE"
fi
```

---

### notes — 진행 기록 확인

```bash
PROGRESS="$REPO_ROOT/.research/ralph-progress.md"
if [ -f "$PROGRESS" ]; then
  cat "$PROGRESS"
else
  echo "진행 기록 없음 (Ralph Loop 실행 후 생성됨)"
fi
```

---

## 사용 예시

```
# 자기 전에:
/ralph start "백엔드 API 에러 핸들링 완성" --check "npm test" --max 15 --budget 3

/ralph start "테스트 커버리지 80%로 높이기" --check "npm run test:coverage" --model haiku --max 20

/ralph start "README 초안 작성" --max 5 --budget 1

# 아침에 일어나서:
/ralph status
/ralph notes
```

## 태스크 작성 가이드

Ralph는 **기계가 검증 가능한 목표**가 있어야 동작합니다.

**좋은 태스크 (검증 가능):**
```
"모든 API 엔드포인트에 에러 핸들링 추가, npm test 통과"  --check "npm test"
"테스트 커버리지 80% 이상으로"                          --check "npm run test:cov"
"TypeScript strict 모드 에러 0개"                       --check "npx tsc --noEmit"
"ESLint 에러 전부 수정"                                 --check "npm run lint"
"README.md에 API 문서 작성 (엔드포인트 5개 이상)"        --check "grep -c '###' README.md | grep -q '[5-9]'"
```

**나쁜 태스크 (모호/주관적 — Ralph에 부적합):**
```
"코드를 깔끔하게 리팩토링해줘"     → 완료 기준 없음
"좋은 UI 만들어"                   → 미적 판단 필요
"성능 최적화"                      → 구체적 메트릭 없음
"보안 취약점 수정"                 → 자동 검증 불가
```

**팁:** 태스크가 모호하면 `--check` 명령을 먼저 정하고, 그에 맞는 태스크를 역으로 작성하세요.

## 비용 최적화 가이드

| 작업 유형 | 권장 모델 | 예상 비용 |
|---------|---------|--------|
| 단순 수정 (lint, 포맷) | haiku | $0.20-0.50 |
| 일반 구현, 리팩토링 | sonnet (기본) | $0.50-2.00 |
| 복잡한 설계, 아키텍처 | opus | $2.00-5.00 |
