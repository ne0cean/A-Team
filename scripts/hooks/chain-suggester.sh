#!/usr/bin/env bash
# chain-suggester.sh — Stop 훅: 마지막 커맨드 감지 → 다음 체인 스텝 제안
# ~/.claude/settings.json Stop hooks에 등록됨
#
# 작동 원리 (v2):
# 1. Stop 이벤트 → analytics.jsonl에서 마지막 실행 커맨드 파악
# 2. scripts/mesh-engine.mjs --evaluate 호출 (상태 기반 조건부 라우팅)
# 3. mesh-engine이 chain-state.json 읽기/쓰기 + 조건 평가 처리
# 4. 결과를 stdout으로 출력 → Claude additionalContext로 주입
#
# 패턴 지원: sequential (조건부) | parallel | loop | hierarchical

INPUT=$(cat)

# 프로젝트 루트 탐지 (cwd 우선, fallback: git)
CWD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null)
[ -z "$CWD" ] && exit 0

# a-team 레포에서만 작동
CHAINS_FILE="$CWD/governance/skill-chains.yaml"
[ -f "$CHAINS_FILE" ] || exit 0

ANALYTICS="$CWD/.context/analytics.jsonl"

# nvm/fnm node 경로 탐지
NODE_BIN=$(ls "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)
[ -z "$NODE_BIN" ] && NODE_BIN=$(which node 2>/dev/null)
[ -z "$NODE_BIN" ] && exit 0

ENGINE="$CWD/scripts/mesh-engine.mjs"
[ -f "$ENGINE" ] || exit 0

# 마지막으로 실행된 커맨드 감지 (최근 30줄에서)
LAST_CMD=""
if [ -f "$ANALYTICS" ]; then
  LAST_CMD=$(tail -30 "$ANALYTICS" | python3 -c "
import sys, json
cmds = []
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        d = json.loads(line)
        if d.get('event') == 'command_start':
            name = d.get('properties', {}).get('name', '')
            if name: cmds.append(name)
    except: pass
if cmds: print(cmds[-1])
" 2>/dev/null)
fi

[ -z "$LAST_CMD" ] && exit 0

# mesh-engine.mjs에 위임 (v2: 조건부 라우팅 + 패턴 지원)
SUGGESTION=$("$NODE_BIN" "$ENGINE" --evaluate --cwd "$CWD" --last-cmd "$LAST_CMD" 2>/dev/null)

[ -n "$SUGGESTION" ] && echo "" && echo "$SUGGESTION"
exit 0
