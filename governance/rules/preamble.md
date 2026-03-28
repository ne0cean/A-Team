# PREAMBLE — A-Team 공통 원칙

모든 에이전트 Phase 0 필독. A-Team 단일 진실 공급원.

---

## 1. 완료 상태 코드

| 코드 | 의미 | 필수 포함 |
|------|------|-----------|
| `DONE` | 완전 완료 (모든 DoD + 빌드 통과) | summary, evidence |
| `DONE_WITH_CONCERNS` | 완료, 주의사항 있음 | summary, risks[] |
| `BLOCKED` | 진행 불가 | blocked_reason, attempts, escalation_ask |
| `NEEDS_CONTEXT` | 정보 부족 | missing, options[] |

## 2. 에스컬레이션 프로토콜

| 에이전트 | 재시도 한계 | BLOCKED 시 |
|----------|-----------|-----------|
| coder | 빌드 2회 실패 | → reviewer 호출 요청 |
| reviewer | REJECTED 2사이클 | → 사람 에스컬레이션 |
| researcher | 소스 3개 상충 | → 가장 신뢰 소스 명시 |
| architect | 요구사항 불명확 1회 | → NEEDS_CONTEXT |

**절대 규칙**: 한계 초과 시 무한 재시도 금지. 즉시 BLOCKED.

## 3. Repo Ownership Mode

`git log --format='%ae' | sort -u | wc -l` → 2 이상이면 `collaborative`.
- `solo`: 범위 밖 이슈도 직접 수정
- `collaborative`: 범위 밖 이슈는 플래그만

## 4. 6가지 자동 결정 원칙

판단 필요 시 아래 원칙 먼저 적용. 해결 안 되는 "취향 결정"만 AskUserQuestion.

1. **완전성 우선** — 80% < 100%, AI 비용 ≈ 0
2. **보이면 고친다** — 수정 비용 < 1일이면 한 번에 처리 (solo)
3. **실용 선택** — 결과 같으면 단순한 옵션
4. **DRY** — 기존 구현 재사용 우선
5. **명시적 > 영리** — 추상화보다 직접 해법
6. **행동 편향** — 검토 < 실행+검증

## 5. 프로젝트 설정

CLAUDE.md에서 빌드/테스트 명령 추출. 없으면 `npm run build` / `npm test`.

---

## 부록: 코딩 안전 + 커밋 + 자율 실행

### 코딩 안전 (coding-safety)
- 파일 전체 정독 후 수정 (부분 이해 금지)
- 존재하지 않는 심볼 참조 금지, 데드 코드 남기지 않음
- 수정 후 빌드 검증 필수
- 프론트엔드: 브라우저로 시각 검증 + URL 보고

### 커밋 형식 (sync-and-commit)
```
[type]: 요약
NOW: 완료 내용 / NEXT: 다음 작업 / BLOCK: 미해결 / FILE: 수정 파일
```
- auto-sync 커밋(`sync:`)은 유효한 맥락으로 인정
- 30턴 이상 / 느려짐 감지 → 모델 전환 제안 (`model-exit.sh`)

### 자율 실행 (turbo-auto)
- 탐색/상태 확인/테스트 등 위험도 낮은 명령은 승인 없이 실행
- [분석 → 수정 → 검증] 연속 호출로 워크플로우 가속
- 실패 시 즉시 질문 않고 원인 파악 → 최소 2회 재시도
