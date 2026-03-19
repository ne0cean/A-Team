# 04. 에이전트 간 조율 프로토콜

에이전트 간 실시간 통신은 없다. 모든 조율은 **파일을 통해 비동기로** 이루어진다.

---

## 통신 채널

| 채널 | 목적 | 쓰는 타이밍 |
|------|------|-------------|
| `parallel-task-plan.md` | 역할 분담 선언, 파일 소유권 | 세션 시작 전 (사람이 작성) |
| `.context/CURRENT.md` | 완료 상태, 다음 태스크, 블로커 | 태스크 완료 시마다 |
| `.context/SESSIONS.md` | 세션 전체 로그 | 세션 종료 시 |
| git commit 메시지 | 세부 변경 내역 | 커밋 시 |

---

## 표준 조율 흐름

```
[사람]
  ↓ parallel-task-plan.md 작성
  ↓ Agent A, Agent B에게 각자 섹션 전달

[Agent A]  동시에  [Agent B]
  ↓ 자기 태스크 실행          ↓ 자기 태스크 실행
  ↓ CURRENT.md 갱신           ↓ CURRENT.md 갱신
  ↓ 브랜치 커밋               ↓ 브랜치 커밋

[사람]
  ↓ 두 브랜치 merge
  ↓ 빌드 검증
  ↓ main 커밋
```

---

## 의존성 있는 태스크 처리

Agent B의 태스크가 Agent A의 결과물에 의존하는 경우:

```markdown
## Agent A (먼저 완료해야 함)
- [ ] useStore.js에 gps 액션 추가

## Agent B (Agent A 완료 후 시작)
- [ ] (대기) SpacePage.jsx에서 gps 액션 호출 — Agent A 완료 후 착수
```

Agent A 완료 후 CURRENT.md에 기록:
```markdown
## Last Completions
- [Agent A] useStore.js gps 액션 추가 완료. Agent B 착수 가능.
```

Agent B는 세션 시작 시 CURRENT.md를 확인하고 대기 태스크 착수 여부를 판단한다.

---

## 세션 간 연속성 (에이전트 교체 시)

에이전트가 교체되어도 컨텍스트는 유지된다:

```
새 에이전트 시작 시 필독:
1. parallel-task-plan.md — 내 역할과 파일 소유권 확인
2. .context/CURRENT.md — 현재 진행 상태, 완료된 태스크
3. git log --oneline -10 — 최근 변경 이력

이 세 파일만 읽으면 이전 에이전트가 어디서 멈췄는지 파악 가능.
```

---

## 완료 신호 형식

태스크 완료 시 CURRENT.md 업데이트 포맷:

```markdown
## Last Completions (2026-03-18)
- [Agent A / Claude Sonnet] useCanvasInteraction 훅 추출 완료
  - 영향 파일: hooks/useCanvasInteraction.js (신규), SpacePage.jsx, RoomPage.jsx
  - 빌드 확인: ✓ (npm run build 통과)
  - 다음 담당자 참고: zoom 로직이 훅으로 이동, enableZoom prop으로 제어

## Blockers
- (없음)
```

---

## 충돌 발생 시 에스컬레이션

```
Level 1: 파일 소유권 기준으로 자체 해결
Level 2: CURRENT.md에 블로커 기록 후 사람에게 판단 요청
Level 3: 해당 태스크를 직렬 처리 블록으로 전환
```
