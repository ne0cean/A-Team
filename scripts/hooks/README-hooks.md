# A-Team Claude Code Hooks

Claude Code 훅 디렉터리. `~/.claude/settings.json`에 등록해 사용.

---

## 훅 목록

### post-bash-diagnostic.sh
- **종류**: PostToolUse:Bash
- **역할**: Bash 실패 시 관련 진단 플레이북 자동 서페이싱
- **출력**: stderr에 플레이북 경로/섹션 안내

### ac-impact-injector.sh
- **종류**: PostToolUse:Write|Edit
- **역할**: `current-task-ac.txt` 저장 시 impact.mjs 결과로 RISK 등급 자동 주입
- **출력**: `hookSpecificOutput.additionalContext`에 RISK 등급 메시지

### chain-suggester.sh
- **종류**: PostToolUse
- **역할**: 완료된 작업 패턴 감지 후 다음 커맨드 자동 제안

### aci-syntax-validator.py
- **종류**: PreToolUse:Edit|Write
- **역할**: 파일 편집 직전 AST 구문 검증 — 오류 있으면 편집 차단
- **검증 대상**:

| 확장자 | 검증 방법 | Write 차단 | Edit 차단 |
|--------|-----------|------------|-----------|
| `.py` | `ast.parse()` | 구문 오류 시 | false positive 방지 위해 통과 |
| `.js` `.mjs` `.cjs` | `node --check` | 구문 오류 시 | 통과 |
| `.ts` `.tsx` `.jsx` | bracket 균형 체크 | 명백한 불균형 시 | 통과 |
| `.json` | `json.loads()` | 파싱 오류 시 | 통과 |
| `.sh` | `bash -n` | 구문 오류 시 | 통과 |
| 기타 | — | 통과 | 통과 |

- **안전 원칙**:
  - Edit는 부분 코드라 false positive 방지를 위해 대부분 통과
  - 훅 자체 예외(crash) 시 항상 통과 — 에이전트 작업을 막지 않음
  - `node_modules`, `.git`, `vendor`, `dist`, `build` 경로 자동 스킵
  - 타임아웃: 3초

#### settings.json 등록 예시
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /Users/noir/Projects/a-team/scripts/hooks/aci-syntax-validator.py"
          }
        ]
      }
    ]
  }
}
```

---

## 훅 프로토콜

### PreToolUse
- stdin: `{"tool_name": "...", "tool_input": {...}}`
- stdout block: `{"decision": "block", "reason": "..."}`
- stdout passthrough: 아무것도 출력 안 함

### PostToolUse
- stdin: `{"tool_name": "...", "tool_input": {...}, "tool_response": {...}}`
- stdout: `{"hookSpecificOutput": {"additionalContext": "..."}}` 또는 빈 출력
