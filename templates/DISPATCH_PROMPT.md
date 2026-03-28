# 디스패치 미션 — {AGENT_NAME}

> A-Team orchestrator가 자동 생성한 프롬프트입니다.
> 당신은 독립 터미널의 git worktree에서 실행 중입니다.
> 다른 에이전트가 동시에 다른 worktree에서 작업 중일 수 있습니다.

---

## 미션

{TASK_DESCRIPTION}

## 프로젝트 컨텍스트

- 프로젝트: {PROJECT_NAME}
- 메인 워킹 디렉토리: {MAIN_DIR}
- 메인 브랜치: {MAIN_BRANCH}
- 작업 브랜치: dispatch/{AGENT_NAME}
- PARALLEL_PLAN: {PLAN_PATH}

---

## 파일 소유권 (엄격 준수)

### 수정 가능 (내 소유)
{OWNED_FILES}

### 읽기 전용 (참조만 가능)
{READONLY_FILES}

### 수정 금지 (다른 에이전트 소유)
{FORBIDDEN_FILES}

> 소유권 위반 시 머지 충돌 발생. 반드시 준수할 것.

---

## 완료 기준 (DoD)

{DOD_CHECKLIST}

---

## 거버넌스 규칙

- 파일 전체 읽기 → 수정 → 빌드 검증 (순서 변경 금지)
- 빌드 명령: `{BUILD_COMMAND}`
- 빌드 실패 2회 → BLOCKED 상태로 중단, 체크포인트 저장
- 보안 키워드(auth/crypto/sql/token) 관련 수정 → DONE_WITH_CONCERNS
- 과도한 추상화 금지 — 요청된 것만 구현
- 기존 코드 스타일 100% 따름

---

## 완료 시 자동 행동 (반드시 순서대로 실행)

### Step 1: 빌드 검증
```bash
{BUILD_COMMAND}
```

### Step 2: 소유 파일만 스테이징 + 커밋
```bash
git add {OWNED_FILES_GLOB}
git commit -m "{COMMIT_TYPE}: {COMMIT_SUMMARY}

NOW: {COMMIT_NOW}
NEXT: orchestrator 머지 대기
BLOCK: 없음
FILE: {OWNED_FILES_SHORT}"
```

### Step 3: 완료 시그널 생성
```bash
touch {SIGNAL_PATH}
```

### Step 4: 완료 보고
아래 JSON 형식으로 최종 출력 후 세션을 종료합니다:
```json
{
  "task_id": "{TASK_ID}",
  "agent": "{AGENT_NAME}",
  "status": "DONE | DONE_WITH_CONCERNS | BLOCKED",
  "summary": "[한 문장 요약]",
  "files_modified": ["[파일 목록]"],
  "build_result": "passed | failed",
  "branch": "dispatch/{AGENT_NAME}",
  "signal": "{SIGNAL_PATH}"
}
```

---

## BLOCKED 시 행동

빌드 2회 실패 또는 진행 불가 시:
1. 현재 상태 커밋 (WIP)
2. 체크포인트 저장:
```bash
bash {MAIN_DIR}/A-Team/scripts/checkpoint.sh save {TASK_ID} {AGENT_NAME} blocked "재개 시 [구체적 재개 지점]"
```
3. 완료 시그널 대신 블록 시그널:
```bash
echo "BLOCKED: [사유]" > {SIGNAL_DIR}/{AGENT_NAME}.blocked
```
4. BLOCKED JSON 출력 후 세션 종료
