# Verification Gate — FSM 상태 전이 강제

모든 코드 변경은 다음 상태를 순서대로 거쳐야 한다.
스킵은 허용되지 않는다. 위반 시 `/end` Step 3에서 BLOCK.

## 상태 전이도

```
DRAFT → TESTED → VERIFIED → COMMITTED
```

## 상태 정의

| 상태 | 진입 조건 | 스킵 불가 이유 |
|------|----------|--------------|
| DRAFT | 코드 작성 또는 수정 완료 | 출발점 |
| TESTED | 빌드 성공 (`npm test` / `npx tsc --noEmit`) | DRAFT에서 COMMITTED 직행 불가 |
| VERIFIED | 변경 의도와 결과가 일치함을 확인 | TESTED 즉시 push 불가 |
| COMMITTED | `git commit` 실행 | VERIFIED 이후에만 허용 |

## 각 상태의 완료 조건

### DRAFT → TESTED
- `npm test` 통과 **또는** `npx tsc --noEmit` 오류 없음
- 빌드 명령이 없는 순수 문서 변경은 DRAFT → VERIFIED 직행 허용 (단, 명시 필요)

### TESTED → VERIFIED
- 변경한 코드가 원래 의도(요청사항)를 충족하는지 자기 확인
- 다음 체크리스트 중 해당 항목 모두 통과:
  - [ ] 요청된 기능이 구현됐는가
  - [ ] 기존 동작이 깨지지 않았는가 (회귀 없음)
  - [ ] 디버그 코드(`console.log`, `debugger`)가 제거됐는가

### VERIFIED → COMMITTED
- `git commit` 실행
- 커밋 메시지에 NOW/NEXT/BLOCK 구조 포함 (글로벌 CLAUDE.md 포맷)

## 훅 연동

`scripts/orchestration/verification-gate-check.sh` 가 PreToolUse Bash 훅으로 등록되어 있을 때:

- `git commit` 명령 감지 시 직전 `npm test` 실행 기록 확인
- 미실행이면 `additionalContext`로 경고 주입 (차단하지 않음 — advisory 모드)

훅 설치:
```bash
# .claude/settings.json hooks 섹션에 추가
# "PreToolUse": ["bash scripts/orchestration/verification-gate-check.sh"]
```

## 위반 패턴 (금지)

```
# 금지: TESTED 없이 커밋
$ git add . && git commit -m "fix"   # DRAFT → COMMITTED (FSM 위반)

# 금지: 빌드 실패 상태에서 커밋
$ npm test  # FAIL
$ git commit -m "fix"  # TESTED 상태가 아님

# 허용: 순서 준수
$ npm test  # PASS → TESTED
# (의도 확인) → VERIFIED
$ git commit -m "feat: ..."  # COMMITTED
```

## 예외 처리

| 상황 | 처리 |
|------|------|
| 테스트 스위트 없음 | `tsc --noEmit` 또는 `node --check` 로 대체. 없으면 이유 명시 |
| 순수 문서 변경 | DRAFT → VERIFIED 직행 허용. 커밋 메시지에 `[docs-only]` 명시 |
| 긴급 핫픽스 | 동일 절차 준수. 속도는 단계 스킵 이유가 되지 않음 |

## 위반 감지

`/end` 커맨드 Step 3에서 자동 점검:
- 이번 세션에서 `npm test` 실행 없이 `git commit` 이력이 있으면 BLOCK 상태 기록
- `status: BLOCKED` + `risks`에 "TESTED 단계 미통과" 명시
