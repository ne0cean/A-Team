# PREAMBLE — A-Team 공통 원칙

모든 에이전트와 스킬이 Phase 0에서 반드시 읽는 공유 블록.
이 파일이 A-Team 전체의 단일 진실 공급원(single source of truth)이다.

---

## 1. 완료 상태 코드 (Terminal Status Codes)

모든 에이전트 출력의 `status` 필드는 아래 4개 코드 중 하나만 사용한다.
다른 표현("completed", "failed", "done" 등)은 금지.

| 코드 | 의미 | 언제 사용 |
|------|------|-----------|
| `DONE` | 완전 완료 | 모든 DoD 체크리스트 통과, 빌드 통과 |
| `DONE_WITH_CONCERNS` | 완료, 단 주의사항 있음 | 완료됐으나 risks 배열에 명시할 항목 존재 |
| `BLOCKED` | 진행 불가, 에스컬레이션 필요 | 최대 재시도 초과, 정보 부족으로 진행 불가 |
| `NEEDS_CONTEXT` | 정보 부족 | 진행 전 사람의 판단/정보가 필요한 경우 |

### BLOCKED 출력 필수 포함 항목
```json
{
  "status": "BLOCKED",
  "blocked_reason": "[막힌 구체적 이유]",
  "attempts": "[시도한 내용 목록]",
  "escalation_ask": "[사람에게 필요한 것]"
}
```

### NEEDS_CONTEXT 출력 필수 포함 항목
```json
{
  "status": "NEEDS_CONTEXT",
  "missing": "[무엇이 필요한가]",
  "options": ["[선택지 A]", "[선택지 B]"]
}
```

---

## 2. 에스컬레이션 프로토콜 (에이전트별 재시도 한계)

| 에이전트 | 재시도 한계 | 트리거 조건 | 결과 |
|----------|-------------|-------------|------|
| coder | 2회 | 빌드 실패 2회 연속 | BLOCKED → orchestrator에게 reviewer 호출 요청 |
| reviewer | 2회 | REJECTED 사이클 2회 | BLOCKED → 사람 에스컬레이션 |
| researcher | 3회 | 교차 검증 소스 3개가 모두 상충 | BLOCKED + 가장 신뢰할 소스 명시 |
| investigator | 3회 | 가설 3개 모두 반증됨 | BLOCKED + "아키텍처 문제 가능성" 명시 |
| architect | 1회 | 요구사항 불명확 | NEEDS_CONTEXT (코딩 시작 전 확인 필수) |

**절대 규칙**: 한계 초과 시 무한 재시도 금지. 즉시 BLOCKED 반환.

---

## 3. Repo Ownership Mode

프로젝트 시작 시 모드를 확인한다. 기본값: `solo`.

| 모드 | 감지 조건 | 동작 차이 |
|------|-----------|-----------|
| `solo` | 커밋 author가 1명 | 담당 범위 밖 이슈도 직접 수정 |
| `collaborative` | 커밋 author 2명 이상 | 담당 범위 밖 이슈는 AskUserQuestion으로 플래그 |

감지 명령:
```bash
git log --format='%ae' | sort -u | wc -l
```
2 이상이면 `collaborative` 모드.

---

## 4. 6가지 자동 결정 원칙 (Auto-Decision Principles)

판단이 필요한 상황에서 사람에게 묻기 전, 아래 원칙으로 먼저 자동 결정 시도.
원칙으로 해결 안 되는 "취향 결정(taste decision)"만 AskUserQuestion.

1. **완전성 우선** — AI 비용이 거의 제로일 때, 80%짜리 구현보다 100% 구현을 선택
2. **보이는 건 고친다** — 수정 비용 < 1일이면 관련된 모든 이슈 한 번에 처리
3. **실용적 선택** — 결과가 같다면 더 단순하고 깔끔한 옵션 선택
4. **DRY 강제** — 기존 구현이 있으면 새로 만들지 않고 재사용
5. **명시적 > 영리한** — 추상화보다 명확하고 직접적인 해법 선호
6. **행동 편향** — 긴 검토 사이클보다 빠른 실행과 검증 선호

---

## 5. 프로젝트 설정 읽기

거버넌스 로드 시 `CLAUDE.md`를 읽어 아래 항목을 추출한다. 없으면 기본값 사용.

```
빌드 명령: npm run build (기본)
테스트 명령: npm test (기본)
프레임워크: (CLAUDE.md에서 추출)
보안 트리거 키워드: auth, crypto, sql, token, password, session
```

**거버넌스 객체에서 하드코딩된 `npm run build`는 CLAUDE.md 값으로 대체.**

---

## 6. 완성도 원칙 (Completeness Principle)

> "보일러 레이크(Boil the Lake)": AI가 한계 비용을 거의 제로로 만든 지금,
> 부분 구현은 완전 구현과 노력 차이가 없다. 항상 완전한 것을 선택한다.

- "나중에" 미루지 않는다 — 지금 할 수 있는 건 지금 완료
- 발견한 이슈는 범위 밖이어도 플래그 (solo 모드면 직접 수정)
- 검증 없는 "완료" 선언 금지 — 빌드 통과 + 동작 확인 필수
