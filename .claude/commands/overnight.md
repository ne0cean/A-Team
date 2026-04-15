---
description: /overnight — 밤새 자율 작업 큐 세팅 (RESUME.md + launchd 검증 + 리셋 대비) 한 번에
---

# /overnight — 밤새 자율 작업 세팅 원스탑

**용도**: 사용자가 자러 가기 직전 한 줄로 야간 작업 준비. RESUME.md 작성 + launchd 검증 + 토큰 리셋 대비까지 자동.

**한 줄 호출로 전부**:
- 사용자 태스크를 구조화해 `.context/RESUME.md` 에 큐잉
- launchd 플래그/lock 상태 검증
- 토큰 리셋 자동 감지 활성 확인
- 금지 사항 자동 주입 (파괴적 작업/설계 결정 등)
- 사용자에게 "이 태스크 N개, 내일 아침 예상 M건 완료, 문제시 /pickup" 1줄 요약

## 사용법

```
/overnight <자연어 태스크 or 'auto'>
```

**예시**:
- `/overnight CURRENT.md Next Tasks 중 코드 작업만 우선 처리` → 안전한 태스크 자동 필터
- `/overnight design-smell-detector 남은 3 rule (RD-03, PL-01, PL-02) 구현` → 명시 태스크 큐잉
- `/overnight auto` → CURRENT.md 에서 "안전" heuristic 맞는 것 자동 선별

## Step 1 — 태스크 수집 & 안전 필터

### 1A. auto 모드
CURRENT.md `## Next Tasks` 섹션 파싱. 다음 조건 모두 충족하는 항목만:
- 체크되지 않은 `[ ]` 항목
- **안전 키워드** 포함: `rule`, `rule 구현`, `test`, `doc`, `refactor`, `lint`, `cleanup`
- **불안전 키워드** 제외: `prod`, `deploy`, `force`, `drop`, `migrate`, `설계`, `decision`, `선택`, `파일럿`, `실전`, `UI 샘플`
- `--check` 가능한가? (`npm test`, `tsc --noEmit`, `grep count` 가능한가)

### 1B. 명시 태스크
사용자가 자연어로 준 태스크. 그대로 Task 1로 등록.

### 1C. 무인 실행 가능 판정
각 태스크에 대해:
- [ ] 설계 결정 필요? → **제외**
- [ ] 외부 API 키/승인 필요? → **제외**
- [ ] 파괴적 (force push, DB migration, production deploy)? → **제외**
- [ ] 검증 명령 (`--check`) 존재? → **포함**

제외된 태스크는 출력에 "⚠️ skipped: reason"으로 보고.

## Step 2 — RESUME.md 작성

```markdown
---
created_at: <ISO8601>
reason: overnight-queue
status: in_progress
mode: sleep
contract: governance/rules/autonomous-loop.md v2026-04-15 (조항 1-7)
narration_budget_bytes: 500
session_goal: "<한 줄 요약>"
next_reset_at: "unknown (probe 기반 자동 감지)"
---

## 실행 계약

launchd 가 2분마다 probe. 리셋 감지 시 자동 실행. 다음 **의무**:

1. `governance/rules/autonomous-loop.md` Read (조항 1-7)
2. 질문 금지, 나레이션 금지 (조항 6)
3. 각 태스크 완료 = commit + push + Completed 섹션 update
4. `npm test` + `tsc --noEmit` 미통과 시 revert, 다음 태스크
5. 모든 태스크 완료 시 RESUME.md `status: completed`

## ❌ 금지 사항

- 설계 결정 필요 태스크
- `/sleep.md`, `orchestrator.md` 등 핵심 인프라 수정
- 파괴적 작업 (force push, branch delete, prod deploy)
- `--dangerously-skip-permissions` 플래그 사용 (2026-04-15 사건)
- `/autoresearch` 실행 (사용자 판단)

## ✅ Tasks

### T1. <task name>
- **근거**: <CURRENT.md line or 사용자 명시>
- **검증 (--check)**: `<cmd>`
- **완료 기준**: <구체적 목표>

### T2. ...

## Completed (launchd 재개 시 중복 금지)
(비어있음)

## Commits This Cycle
(비어있음)

## Resume
```
/pickup
```
```

## Step 3 — Infra 검증

### 3A. launchd 상태
```bash
launchctl list | grep com.ateam.sleep-resume || {
  echo "⚠️ launchd not loaded. Installing..."
  bash scripts/install-sleep-cron.sh install "every 2m"
}
```

### 3B. Lock 파일 정리
```bash
rm -f ~/.ateam-sleep-locks/last-success ~/.ateam-sleep-locks/running.pid
```

### 3C. Claude CLI 인증 확인
```bash
claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3
# 기대: "Hello" 또는 "ok" 응답
# 실패: "hit your limit" / "not authenticated" → 경고 출력
```

### 3D. Git 상태
```bash
# uncommitted changes 있으면 경고
git status --short
[ -z "$(git status --short)" ] || echo "⚠️ Uncommitted changes. overnight 세션이 이들을 덮어쓸 수 있음."
```

## Step 4 — 요약 출력

```
🌙 Overnight 세팅 완료 (2026-04-15 22:30 KST)

📋 큐잉된 태스크: N건
   T1. <summary>
   T2. <summary>
   ...
   ⚠️ Skipped: M건 (설계 결정 필요 X건, prod 변경 Y건 등)

🔧 Infra:
   ✅ launchd loaded (매 2분 probe)
   ✅ Lock 정리됨
   ✅ Claude CLI 인증 OK
   [⚠️] Uncommitted changes (있으면)

⏰ 예상 동작:
   - 토큰 리셋 2분 이내 자동 감지
   - 각 태스크 완료마다 commit+push
   - 실패 2회 연속 시 자동 중단 (조항 7 조항 5)

🌅 아침에 돌아오면:
   - /vibe (Step 0.6 이 RESUME.md 감지)
   - git log --oneline <last-commit>..HEAD
   - tail ~/Library/Logs/ateam-sleep-resume.log

안전히 다녀오세요. 🌙
```

## Step 5 — 실패 모드 처리

### 5A. Infra 중 하나라도 실패
- launchd 설치 실패 → 사용자 수동 `bash scripts/install-sleep-cron.sh install "every 2m"` 안내
- Claude CLI 인증 실패 → `/web-setup` 또는 `claude login` 안내 후 세팅 중단
- Git repo 아님 → overnight 불가, 중단

### 5B. 태스크 0건 (auto 모드에서 안전한 태스크 없음)
- "큐잉할 안전한 태스크가 없습니다. 명시 태스크로 /overnight <설명> 또는 CURRENT.md 에 추가 후 재시도"

### 5C. RESUME.md 이미 status=in_progress
- "이미 진행 중인 큐 있음. 덮어쓸까요? /overnight --force"

## 통합 포인트

### /vibe Step 0.6 (기존)
RESUME.md status=in_progress 감지 → /pickup 제안 (이미 반영됨)

### /end Step 3.7
세션 종료 시 uncommitted + /overnight 미실행 → "자러 간다면 /overnight 실행?" 제안

### /pickup (기존)
launchd 또는 사용자가 재개 시점에 RESUME.md 읽고 순차 실행 (이미 반영됨)

## 원칙

1. **자동 안전 필터**: 사용자가 위험한 태스크 실수로 넣어도 대부분 걸러짐
2. **실행 계약 강제 주입**: autonomous-loop.md 조항 1-7 매번 복붙
3. **단일 진입**: 한 줄로 전부. RESUME.md 수동 편집 불필요
4. **검증 우선**: infra 문제 있으면 세팅 자체 중단 (false reassurance 방지)
5. **솔직한 한계**: launchd catch-up 은 laptop awake 기준. 장기 shutdown 대비 안내
