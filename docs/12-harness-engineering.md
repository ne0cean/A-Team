# 하네스 엔지니어링 가이드

> "The model contains the intelligence; the harness makes that intelligence useful."
> — Anthropic Engineering

## 핵심 개념

**하네스 엔지니어링 = AI 에이전트를 위한 결정론적 제어 레이어**

Claude Code의 훅 시스템을 활용해 LLM이 *선택*하는 것이 아니라 *항상 보장*되는 동작을 만든다. 불안정한 프롬프트 의존성 없이 품질과 안전을 시스템 수준에서 보장한다.

---

## 아키텍처 다이어그램

```
사용자 요청
    ↓
[UserPromptSubmit Hook]  ← 컨텍스트 주입 (선택)
    ↓
Claude 처리
    ↓
[PreToolUse Hook]        ← 실행 전 검증 (차단/허용/수정)
    ├─ Bash → pre-bash.sh   : 위험 명령 차단
    └─ Write|Edit → pre-write.sh : 민감 파일 보호
    ↓
도구 실행
    ↓
[PostToolUse Hook]       ← 실행 후 반응 (빌드 플래그 등)
    ↓
Claude 완료 신호
    ↓
[Stop Hook]              ← 완료 게이트 (빌드 검증 필수)
    └─ stop-check.sh : npm run build 강제 실행
    ↓
세션 종료
    ↓
[Notification Hook]      ← 감사 로그 (session.log)
```

---

## 훅 이벤트 전체 목록

| 이벤트 | 타이밍 | 주요 용도 | 차단 가능 |
|--------|--------|-----------|---------|
| `PreToolUse` | 도구 실행 전 | 보안 검사, 파일 소유권 검증 | ✅ |
| `PostToolUse` | 도구 실행 후 | 빌드 플래그, 로그 기록 | ❌ |
| `Stop` | 세션 종료 시도 시 | 빌드 검증, 완료 확인 | ✅ |
| `SubagentStop` | 서브에이전트 종료 시 | 서브에이전트 DoD 검증 | ✅ |
| `Notification` | Claude 알림 시 | 감사 로그 | ❌ |
| `SessionStart` | 세션 시작 시 | 환경 감지, 컨텍스트 로드 | ❌ |
| `UserPromptSubmit` | 사용자 입력 시 | 컨텍스트 주입, 프롬프트 강화 | ✅ |
| `PreCompact` | 컨텍스트 압축 전 | 중요 상태 저장 | ❌ |

---

## 현재 구현된 훅

### 1. `pre-bash.sh` — 위험 명령 차단 (PreToolUse/Bash)
**차단 패턴:**
- `rm -rf /`, `rm -rf ~`, `rm -rf *` — 재귀 삭제
- `git reset --hard` — 작업 유실 위험
- `git push --force`, `git push origin main` — 강제 푸시
- `DROP TABLE`, `DROP DATABASE` — DB 삭제
- `mkfs`, `dd if=` — 디스크 포맷/덮어쓰기
- `:(){ :|:& };:` — Fork 폭탄

**경고 패턴 (차단 없이 메시지):**
- `git push`, `npm publish`, `vercel deploy`, `railway up`

### 2. `pre-write.sh` — 민감 파일 보호 (PreToolUse/Write|Edit)
**절대 차단:**
- `.env`, `.env.local`, `.env.production` — 환경변수
- `id_rsa`, `id_ed25519`, `*.pem` — SSH/SSL 키
- `credentials.json`, `secrets.json` — 인증 파일
- `.git/` 내부 — git 내부 구조

**주의 메시지 (허용):**
- `auth*`, `middleware*`, `crypto*`, `jwt*`, `token*` 포함 파일

**PARALLEL_PLAN.md 소유권 검사:**
- 활성 플랜 존재 시 에이전트 파일 소유권 알림

### 3. `stop-check.sh` — 빌드 검증 게이트 (Stop)
**동작:**
1. `git diff`로 변경된 JS/TS/CSS 파일 감지
2. 클라이언트 변경 → `vibe_here/client/`에서 `npm run build` 실행
3. 서버 변경 → `node --check server.js` 실행
4. 빌드 실패 → `exit 2` → 에러를 Claude에 전달 → 수정 유도 → 재시도

**결과:**
- ✅ 빌드 통과 → 세션 정상 종료
- ❌ 빌드 실패 → Claude가 에러 수신 → 수정 → 다시 Stop → 재검증

### 4. `notify-log.sh` — 감사 로그 (Notification)
- 모든 알림을 `.claude/session.log`에 타임스탬프와 함께 기록

---

## 훅 출력 포맷

### 차단 (exit 2)
```bash
printf '{"decision":"block","reason":"설명"}\n' >&2
exit 2
```

### 허용 + 메시지 주입 (exit 0)
```bash
printf '{"systemMessage":"Claude에게 전달할 메시지"}\n'
exit 0
```

### 도구 입력 수정 (PreToolUse only)
```bash
printf '{"hookSpecificOutput":{"permissionDecision":"allow","updatedInput":{"field":"new_value"}}}\n'
exit 0
```

---

## 신규 프로젝트에 훅 적용

`init.sh`가 `.claude/hooks/`를 자동 복사합니다:

```bash
bash A-Team/templates/init.sh my-project ./A-Team
```

**또는 수동 복사:**
```bash
mkdir -p .claude/hooks
cp A-Team/templates/hooks/*.sh .claude/hooks/
cp A-Team/templates/settings.json .claude/settings.json
```

---

## 고급 패턴 (확장 가능)

### UserPromptSubmit — 컨텍스트 자동 주입
```json
{
  "UserPromptSubmit": [{
    "matcher": "*",
    "hooks": [{"type": "command", "command": "bash .claude/hooks/inject-context.sh", "timeout": 3}]
  }]
}
```

```bash
# inject-context.sh: CURRENT.md 요약을 프롬프트에 자동 추가
STATUS=$(head -5 .context/CURRENT.md 2>/dev/null)
printf '{"systemMessage":"현재 프로젝트 상태:\\n%s"}\n' "$STATUS"
```

### SubagentStop — 서브에이전트 DoD 검증
```json
{
  "SubagentStop": [{
    "matcher": "*",
    "hooks": [{"type": "prompt", "prompt": "서브에이전트가 완료했는지 확인. PARALLEL_PLAN.md의 DoD 체크리스트를 모두 달성했는지 검토. 미완료 항목이 있으면 block.", "timeout": 30}]
  }]
}
```

### SessionStart — 자동 환경 감지
```json
{
  "SessionStart": [{
    "matcher": "*",
    "hooks": [{"type": "command", "command": "bash .claude/hooks/session-init.sh", "timeout": 10}]
  }]
}
```

---

## 레퍼런스

| 소스 | 링크/설명 |
|------|----------|
| Anthropic 공식 가이드 | Effective Harnesses for Long-Running Agents |
| disler/claude-code-hooks-mastery | 실전 훅 패턴 모음 |
| disler/claude-code-hooks-multi-agent-observability | 멀티에이전트 관찰 |
| coleam00/your-claude-engineer | 완전한 소프트웨어 엔지니어 하네스 |
| hesreallyhim/awesome-claude-code | 훅/스킬/에이전트 큐레이션 |
| Harness Engineering 101 (muraco.ai) | 하네스 엔지니어링 입문 |
