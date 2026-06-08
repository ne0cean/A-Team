---
description: 세션 디브리핑 — 오늘의 학습 구조화 + 다음 세션 Pre-flight Gate 설정
---

> Analytics: `node scripts/log-event.mjs command_start name=debrief` — 실행 시작 시 반드시 호출

복잡한 세션 후 학습을 구조화하고 다음 세션이 올바른 컨텍스트로 시작할 수 있도록 Pre-flight Gate를 설정한다.

---

## Step 1 — 세션 데이터 수집

```bash
node scripts/log-event.mjs command_start name=debrief 2>/dev/null || true

# 오늘 커밋 내역
git log --oneline --since="24 hours ago" 2>/dev/null | head -20

# 이번 세션에 수정된 파일
git diff HEAD~5..HEAD --name-only 2>/dev/null | sort -u | head -30

# 새로 추가된 레슨/메모리
git diff HEAD~5..HEAD -- "**MEMORY.md" "**lessons*" 2>/dev/null | head -40

# 미완료 AC 확인
cat ~/.claude/current-task-ac.txt 2>/dev/null | grep "\- \[ \]" | head -10 || echo "미완료 AC 없음"
```

---

## Step 2 — 세션 분석 (4개 차원)

다음 4가지 관점에서 이번 세션을 분석한다:

### 2-A. 무엇이 잘못됐나 (실수·회귀·재작업)
- 롤백/revert된 작업
- 같은 파일을 반복 수정한 패턴
- 사용자 좌절 표현이 있었던 지점
- 데이터 손실 또는 설정 충돌

### 2-B. 무엇을 새로 배웠나 (레슨)
- 이번 세션에 추가된 MEMORY.md 항목
- 새로 발견한 함정/패턴
- 해결한 구조적 문제

### 2-C. 무엇이 미완료인가 (이어받을 작업)
- Next Tasks에 남은 항목
- 미완료 AC
- BLOCK 상태 이슈

### 2-D. 다음 세션을 위한 전제조건 (Pre-flight Gate)
- 다음 세션 시작 전 반드시 확인해야 할 것들
- 주의해야 할 위험 포인트
- 필요한 사전 실행 명령

---

## Step 3 — Pre-flight Gate 생성

분석 결과를 바탕으로 다음 세션의 Pre-flight Gate를 작성한다.

**형식**:
```markdown
## Pre-flight Gate — YYYY-MM-DD (debrief)
- [ ] [이번 세션 실수에서 나온 주의사항]
- [ ] [미완료 작업 중 다음 세션 첫 번째 확인 항목]
- [ ] [위험 포인트 — 작업 전 검증 필요]
```

**작성 기준**:
- 각 항목은 구체적이고 검증 가능해야 함 ("확인" → "명령어 X 실행 결과 확인")
- 3~6개 항목 (너무 많으면 무시됨)
- 완료된 항목은 `[x]`로 표시

---

## Step 4 — CURRENT.md 업데이트

기존 Pre-flight Gate 섹션을 새 것으로 교체한다.

```bash
# CURRENT.md 맨 위 (## Status 앞)에 Pre-flight Gate 삽입
# 기존 Pre-flight Gate 섹션은 덮어쓴다
```

**CURRENT.md 위치**: `.context/CURRENT.md` (없으면 스킵)

---

## Step 5 — 레슨 → 훅 커버리지 체크

이번 세션에서 새 레슨이 MEMORY.md에 추가됐으면:

1. 해당 레슨을 강제하는 훅/게이트가 `~/.claude/settings.json`에 있는지 확인
2. 없으면 제안:
```
⚙️ 레슨 '[레슨명]' — 강제 훅 없음
   제안: hooks에 패턴 추가 검토 (/update-config)
```

---

## Step 6 — 요약 출력

```
## 디브리핑 완료 — YYYY-MM-DD

### 이번 세션 핵심 실수
1. [실수 1]
2. [실수 2]

### 새로 배운 것
- [레슨 1]
- [레슨 2]

### Pre-flight Gate (다음 세션 시작 전 확인)
→ CURRENT.md에 저장됨

### 다음 첫 번째 작업
[CURRENT.md Next Tasks 최상위 항목]
```

---

## 자동 트리거 조건 (end.md Step 6.74 참조)

end.md가 다음 2개 이상 감지 시 `/debrief` 실행을 제안한다:
- 롤백/revert 커밋 1개 이상
- POSTMORTEM 파일 생성
- 새 레슨 이번 세션 추가
- 사용자 좌절 표현 3회 이상
- 같은 파일 5회+ 반복 수정
