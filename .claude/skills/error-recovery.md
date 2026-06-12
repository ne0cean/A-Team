---
name: error-recovery
description: 에러 복구 패턴 — 3계층 분류, 재시도 전략, 에러 보고 형식
tags: [error, recovery, retry, debugging, escalation]
---

# Error Recovery

## 언제 사용

- 빌드 실패 시
- API 호출 에러 발생 시
- 스크립트 실행 중 예외 발생 시
- 에러 무시 충동이 생길 때

## 패턴

### 3계층 에러 분류

| 계층 | 유형 | 예시 | 전략 |
|------|------|------|------|
| Transient | 일시적 | 네트워크 타임아웃, rate limit | 재시도 (backoff) |
| Budget | 리소스 부족 | D1 용량, API quota | 사용자 알림 + 중단 |
| Semantic | 로직 에러 | 타입 오류, 파싱 실패 | 코드 수정 후 재시도 |

### 재시도 전략 (Transient)

```javascript
// Exponential backoff
const delay = (attempt) => Math.min(1000 * 2 ** attempt, 30000);

for (let i = 0; i < 3; i++) {
  try {
    return await operation();
  } catch (err) {
    if (!isTransient(err) || i === 2) throw err;
    await new Promise(r => setTimeout(r, delay(i)));
  }
}
```

### 빌드 실패 시 프로토콜

```
1. 에러 메시지 전체 읽기 (추측 금지)
2. 에러 분류 (Transient / Budget / Semantic)
3. Semantic이면: 관련 파일 읽고 수정 → 재빌드
4. 최대 2회 재시도
5. 2회 실패 시: 실패 원인 기록 + reviewer 에스컬레이션
```

### 에러 발생 시 보고 형식

```json
{
  "status": "BLOCKED",
  "error_type": "Semantic",
  "error_message": "[전체 에러 메시지]",
  "attempted_fix": "[시도한 수정 내용]",
  "files_examined": ["[관련 파일 경로]"],
  "next_steps": ["[reviewer에게 필요한 정보]"]
}
```

### 에러 무시 금지 원칙

```
절대 금지:
- 에러 catch 후 빈 블록 처리
- console.error만 찍고 계속 진행
- "일단 무시하고 다음 단계" 진행
- 테스트 실패 상태로 완료 선언
```

## 주의사항

- 에러 무시하고 다음 단계 진행 = Truth Contract 위반
- `npm test` 실패 상태 = 완료 선언 불가
- 2회 실패 시 reviewer 에스컬레이션 (무한 재시도 금지)
- 에러 메시지를 요약하지 말고 전체 출력 포함
