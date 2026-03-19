# 02. 파일 충돌 방지

두 에이전트가 같은 파일을 동시에 수정하면 한쪽 작업이 사라진다.
이를 막는 세 가지 계층:

---

## 계층 1: 태스크 플랜 파일 소유권 선언

병렬 작업 시작 전, 각 에이전트는 **담당 파일 목록**을 명시한다.

```markdown
## Agent A 파일 소유권
- client/src/hooks/useCanvasInteraction.js  ← 신규 생성
- client/src/pages/SpacePage.jsx            ← 수정
- client/src/pages/RoomPage.jsx             ← 수정

## Agent B 파일 소유권
- server/server.js                          ← 수정
- client/src/components/ConnectionLine.jsx  ← 수정
- scripts/bots.js                           ← 수정
```

겹치는 파일이 있으면 플랜을 수정하거나 직렬 블록으로 분리한다.

---

## 계층 2: 브랜치 격리 (git)

각 에이전트가 별도 브랜치에서 작업하면 로컬 충돌을 피할 수 있다.

```bash
# Agent A 브랜치
git checkout -b agent/claude-architecture

# Agent B 브랜치
git checkout -b agent/gemini-optimization

# 각자 작업 완료 후 main에 merge
git checkout main
git merge agent/claude-architecture  # 먼저 완료된 것
git merge agent/gemini-optimization  # 충돌 검토 후 merge
```

**단, 같은 파일을 수정한 경우 여전히 merge conflict 발생.**
브랜치 격리는 보조 수단이고 파일 소유권 분리가 1차 방어선이다.

---

## 계층 3: 공유 컨텍스트 파일 규칙

`.context/CURRENT.md`는 에이전트 간 유일한 통신 채널이다.

```
쓰기 규칙:
- 에이전트는 자기 작업 완료 시 CURRENT.md의 "Last Completions"에만 추가
- 다른 에이전트의 섹션을 삭제하거나 덮어쓰지 않는다

읽기 규칙:
- 작업 시작 전 CURRENT.md 정독 필수
- 다른 에이전트의 완료 항목이 자기 작업 전제조건인지 확인
```

---

## Merge 전략

```
1. 먼저 완료된 에이전트 브랜치를 main에 merge
2. 두 번째 에이전트 브랜치를 main에 rebase 또는 merge
3. conflict 발생 시 — 도메인 소유권 기준으로 해결
   (해당 파일 소유권을 가진 에이전트의 변경 우선)
4. 최종 빌드 검증 후 커밋
```

---

## 긴급 충돌 발생 시

```bash
# 어느 파일이 충돌했는지 확인
git diff --name-only --diff-filter=U

# 태스크 플랜의 파일 소유권 확인 → 소유 에이전트 버전 선택
git checkout --theirs path/to/file   # 병합되는 브랜치 버전 선택
git checkout --ours   path/to/file   # 현재 브랜치 버전 선택

# 선택 후 add
git add path/to/file
```
