#!/usr/bin/env bash
# chain-suggester.sh — Stop 훅: 마지막 커맨드 감지 → 다음 체인 스텝 제안
# ~/.claude/settings.json Stop hooks에 등록됨
#
# 작동 원리:
# 1. Stop 이벤트 → analytics.jsonl에서 마지막 실행 커맨드 파악
# 2. governance/skill-chains.yaml에서 trigger_after 매칭
# 3. .context/chain-state.json으로 현재 체인 위치 추적
# 4. 다음 스텝을 stdout으로 출력 → Claude additionalContext로 주입

INPUT=$(cat)

# 프로젝트 루트 탐지 (cwd 우선, fallback: git)
CWD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null)
[ -z "$CWD" ] && exit 0

# a-team 레포에서만 작동
CHAINS_FILE="$CWD/governance/skill-chains.yaml"
[ -f "$CHAINS_FILE" ] || exit 0

# pyyaml 없으면 스킵
python3 -c "import yaml" 2>/dev/null || exit 0

ANALYTICS="$CWD/.context/analytics.jsonl"
STATE_FILE="$CWD/.context/chain-state.json"

# 마지막으로 실행된 커맨드 감지 (최근 30줄에서)
LAST_CMD=""
if [ -f "$ANALYTICS" ]; then
  LAST_CMD=$(tail -30 "$ANALYTICS" | python3 -c "
import sys, json
cmds = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if d.get('event') == 'command_start':
            name = d.get('properties', {}).get('name', '')
            if name:
                cmds.append(name)
    except:
        pass
if cmds:
    print(cmds[-1])
" 2>/dev/null)
fi

[ -z "$LAST_CMD" ] && exit 0

# chain-state.json 읽기 (없으면 빈 상태)
SUGGESTION=$(python3 - <<PYEOF
import yaml, json, sys, os
from datetime import datetime, timezone

chains_file = '$CHAINS_FILE'
state_file = '$STATE_FILE'
last_cmd = '$LAST_CMD'

try:
    with open(chains_file) as f:
        data = yaml.safe_load(f)
    chains = data.get('chains', []) if data else []
except Exception as e:
    sys.exit(0)

# 현재 활성 체인 상태 로드
state = {}
if os.path.exists(state_file):
    try:
        with open(state_file) as f:
            state = json.load(f)
    except:
        pass

active_chain_id = state.get('active_chain', '')
current_step = state.get('current_step', 0)

# 1) 활성 체인이 있으면 다음 스텝 제안
if active_chain_id:
    for chain in chains:
        if chain['id'] != active_chain_id:
            continue
        steps = chain.get('steps', [])
        # last_cmd가 현재 스텝과 일치하면 진행
        if current_step < len(steps) and steps[current_step] == last_cmd:
            new_step = current_step + 1
            if new_step < len(steps):
                next_cmd = steps[new_step]
                # state 갱신
                state['current_step'] = new_step
                state['completed_steps'] = steps[:new_step]
                with open(state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                completed = ' ✓ → '.join([f'/{s}' for s in steps[:new_step]])
                remaining = ' → '.join([f'/{s}' for s in steps[new_step:]])
                total = len(steps)
                print(f"[Mesh] {chain['name']} — Step {new_step}/{total-1} 완료")
                print(f"       {completed} ✓  →  {remaining}")
                print(f"       다음 권장: /{next_cmd}")
            else:
                # 체인 완료
                state.pop('active_chain', None)
                state.pop('current_step', None)
                state.pop('completed_steps', None)
                with open(state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                print(f"[Mesh] {chain['name']} 체인 완료! 모든 스텝 실행됨.")
        sys.exit(0)

# 2) 새 체인 시작 가능 여부 확인
matched = []
for chain in chains:
    trigger_after = chain.get('trigger_after', [])
    if last_cmd in trigger_after:
        steps = chain.get('steps', [])
        # last_cmd가 steps 안에 있으면 그 다음부터, 없으면 처음부터
        if last_cmd in steps:
            idx = steps.index(last_cmd)
            if idx < len(steps) - 1:
                matched.append((chain, idx + 1))
        else:
            if steps:
                matched.append((chain, 0))

if not matched:
    sys.exit(0)

# 가장 첫 번째 매칭만 출력 (중복 방지)
chain, next_idx = matched[0]
steps = chain.get('steps', [])
next_cmd = steps[next_idx]

# 새 체인 state 기록
new_state = {
    'active_chain': chain['id'],
    'current_step': next_idx,
    'completed_steps': steps[:next_idx],
    'started_at': datetime.now(timezone.utc).isoformat()
}
with open(state_file, 'w') as f:
    json.dump(new_state, f, indent=2)

done_part = ' ✓ → '.join([f'/{s}' for s in steps[:next_idx]]) if next_idx > 0 else ''
todo_part = ' → '.join([f'/{s}' for s in steps[next_idx:]])

print(f"[Mesh] '{last_cmd}' 완료 → {chain['name']} 체인")
if done_part:
    print(f"       {done_part} ✓  →  {todo_part}")
else:
    print(f"       체인: {todo_part}")
print(f"       다음 권장: /{next_cmd}")
PYEOF
)

[ -n "$SUGGESTION" ] && echo "" && echo "$SUGGESTION"
exit 0
