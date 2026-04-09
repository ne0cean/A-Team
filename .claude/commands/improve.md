---
description: /improve — 개별 프로젝트에서 A-Team 글로벌 툴킷 개선사항 등록/조회/반영
---

어떤 프로젝트에서든 A-Team 글로벌 툴킷에 반영할 개선사항을 등록합니다.

## 모드 판별

인자를 분석하여 모드를 자동 판별:
- `/improve list` → **조회 모드**
- `/improve apply` → **반영 모드**
- `/improve [내용]` → **등록 모드** (기본)

---

## 등록 모드 (기본)

사용자가 입력한 개선사항을 A-Team `improvements/pending.md`에 어펜드한다.

### Step 1 — A-Team 경로 탐색
```bash
# 우선순위: 현재 프로젝트 내 A-Team → 홈 디렉토리
ATEAM=""
[ -d "./A-Team" ] && ATEAM="./A-Team"
[ -d "$HOME/Projects/a-team" ] && ATEAM="$HOME/Projects/a-team"
[ -d "$HOME/tools/A-Team" ] && ATEAM="$HOME/tools/A-Team"
```
찾지 못하면 에러: "A-Team 경로를 찾을 수 없습니다. `~/Projects/a-team` 또는 `./A-Team`에 있어야 합니다."

### Step 2 — 자동 분류
사용자 입력에서 카테고리를 추론:

| 키워드 | 카테고리 |
|--------|----------|
| agent, 에이전트, orchestrator, coder, reviewer | `agent` |
| command, 커맨드, 슬래시, /명령 | `command` |
| lib, 모듈, 함수, 유틸 | `lib` |
| rule, 규칙, governance, 거버넌스 | `governance` |
| doc, 문서, 가이드 | `docs` |
| script, 스크립트, 자동화 | `script` |
| 기타 | `general` |

### Step 3 — 우선순위 추론

| 시그널 | 우선순위 |
|--------|---------|
| 버그, 깨짐, 장애, 긴급 | `P0` |
| 개선, 추가, 필요 | `P1` |
| 아이디어, 나중에, 검토 | `P2` |
| 명시 없음 | `P1` (기본) |

### Step 4 — pending.md에 어펜드

A-Team의 `improvements/pending.md` 파일 끝에 다음 형식으로 추가:

```markdown
### [ID] — 요약 제목
- **날짜**: YYYY-MM-DD
- **출처**: {현재 프로젝트명} ({현재 디렉토리의 basename})
- **카테고리**: {분류 결과}
- **우선순위**: {P0/P1/P2}
- **내용**: {사용자 입력 원문}
- **상태**: ⏳ pending
```

ID 형식: `IMP-{YYYYMMDD}-{순번}` (당일 기존 항목 수 + 1)

### Step 5 — 확인 출력
```
✅ 개선사항 등록 완료
  ID: IMP-20260410-01
  카테고리: agent | 우선순위: P1
  → A-Team improvements/pending.md에 기록됨
  💡 A-Team에서 `/improve apply`로 반영하세요
```

---

## 조회 모드 (`/improve list`)

A-Team `improvements/pending.md`를 읽고 현재 대기 중인 항목을 요약 표시:

```
📋 Pending Improvements (N건)
  P0: X건  P1: Y건  P2: Z건

  [IMP-20260410-01] agent/P1 — 오케스트레이터 타임아웃 (connectome)
  [IMP-20260409-03] lib/P2 — analytics에 세션 시간 추적 추가 (video-studio)
  ...
```

항목이 0건이면: "✨ 대기 중인 개선사항이 없습니다."

---

## 반영 모드 (`/improve apply`)

> ⚠️ A-Team 프로젝트 내에서만 실행 권장. 다른 프로젝트에서도 가능하지만 A-Team 파일 수정이 필요.

### Step 1 — pending 목록 표시
조회 모드와 동일하게 목록 출력 후: "어떤 항목을 반영할까요? (번호 또는 all)"

### Step 2 — 선택된 항목 구현
각 항목에 대해:
1. 카테고리에 맞는 파일을 읽고 수정 계획 수립
2. 수정 실행 (agent .md, command .md, lib .ts, governance 등)
3. 빌드/테스트 검증 (`npm run build && npm run test`)
4. 실패 시 롤백 + 해당 항목 skip 알림

### Step 3 — 상태 업데이트
반영 완료된 항목을:
1. `pending.md`에서 제거
2. `done.md`에 이동 (반영일 + 커밋 해시 추가)

### Step 4 — 결과 보고
```
✅ 개선사항 반영 완료
  반영: N건 | 스킵: M건
  [IMP-20260410-01] ✅ orchestrator.md 수정 — 타임아웃 가드 추가
  [IMP-20260409-03] ⏭️ 스킵 — 추가 설계 필요
```

---

## 원칙
- 등록은 어떤 프로젝트에서든 가능 (글로벌 커맨드)
- 반영은 A-Team 프로젝트에서 실행 권장
- 하나의 개선사항 = 하나의 원자적 변경 (거대 항목은 분할 권장)
- P0은 즉시 반영, P2는 배치 처리 가능

$ARGUMENTS
