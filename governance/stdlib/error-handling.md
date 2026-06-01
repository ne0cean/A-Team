# Error Handling — 에러/상태 처리 패턴

## 표준 상태 코드

| 코드 | 의미 | 액션 |
|------|------|------|
| `DONE` | 정상 완료 | 결과 반환, 다음 단계 진행 |
| `DONE_WITH_CONCERNS` | 완료했지만 주의 필요 | 결과 반환 + risks 목록 포함 |
| `BLOCKED` | 외부 의존성으로 진행 불가 | 차단 이유 + workaround 제안 |
| `NEEDS_CONTEXT` | 정보 부족으로 진행 불가 | 필요한 정보 명시 후 중단 |
| `SKIPPED` | 이미 완료된 작업 | 근거 명시 (멱등성 보장) |

## Circuit Breaker 패턴 (자율 모드)

3회 연속 동일 에러 → Circuit Breaker OPEN:

```
상태: CLOSED (정상) → HALF_OPEN (복구 시도) → OPEN (차단)

CLOSED: 정상 실행
  └─ 에러 발생 → 재시도
       └─ 3회 연속 실패 → OPEN

OPEN: 즉시 BLOCKED 반환, 에러 루프 차단
  └─ 5분 후 HALF_OPEN 자동 전환

HALF_OPEN: 1회 시도
  └─ 성공 → CLOSED
  └─ 실패 → OPEN
```

구현: `governance/rules/autonomous-loop.md` 조항 9 참조

## BLOCKED 반환 형식

```json
{
  "status": "BLOCKED",
  "blocked_by": "외부 API 미응답 | 파일 미존재 | 권한 없음 | ...",
  "attempted": ["시도한 것 1", "시도한 것 2"],
  "workaround": "임시 대안 (있으면)",
  "requires": "해제 조건"
}
```

## NEEDS_CONTEXT 반환 형식

```json
{
  "status": "NEEDS_CONTEXT",
  "missing": ["필요한 정보 1", "필요한 정보 2"],
  "partial_result": "지금까지 알아낸 것 (있으면)"
}
```

## 에러 로깅 원칙

1. **즉시 보고**: 백그라운드 프로세스 실패 시 조용히 넘어가지 않는다
2. **근본 원인**: 증상이 아닌 원인을 보고한다 (`file not found` → 왜 없는가)
3. **재현 정보**: 에러 재현에 필요한 컨텍스트 포함 (파일 경로, 입력값 등)
4. **가설 한도**: 3회 연속 가설 반증 → BLOCKED 반환, 추측 계속 금지

## 테스트 실패 처리

```
수정 전: 실패 확인 (red)
수정 후: 통과 확인 (green)
전체 테스트: 사이드 이펙트 없음 확인

테스트 불가 시: "테스트 없음, 이유: [이유]" 명시 필수
완료 선언 = 증거 첨부 (npm test 결과 등)
```
