---
name: context-management
description: 컨텍스트 관리 패턴 — Smart/Dumb Zone, compaction, 서브에이전트 격리, CURRENT.md 갱신
tags: [context, compaction, token, memory, current-md]
---

# Context Management

## 언제 사용

- 컨텍스트 창이 40% 이상 찼을 때
- 긴 세션을 이어가야 할 때
- 탐색 작업과 구현 작업을 분리할 때
- 세션 종료 후 상태를 저장할 때

## 패턴

### Smart Zone vs Dumb Zone

```
Total: 168,000 tokens
├─ Smart Zone (0-40%): 67,200 tokens — 최적 작업 영역
├─ Dumb Zone (40-100%): 100,800 tokens — 성과 저하
└─ Reserved: Output + Compaction
```

| 태스크 난이도 | 권장 임계값 |
|-------------|-----------|
| Easy (버튼 색상 등) | 무관 |
| Medium (3-5 파일 수정) | 40% 엄수 |
| Hard (리팩토링, 신규 기능) | 30% 권장 |

### Compaction 트리거

```
40% 초과 → /compact 또는 새 세션으로 이관
이관 전 CURRENT.md에 진행 상태 저장 필수
```

### 서브에이전트 격리 원칙

```
서브에이전트 = 컨텍스트 격리 (역할 분리가 아니라 컨텍스트 분리)
탐색(researcher) → 결과 요약 → 메인에 전달
메인은 통합만 (직접 탐색 최소화)
```

### CURRENT.md 갱신 타이밍

```bash
# 갱신 시점
- 태스크 완료 후
- 세션 종료 전 (/end 커맨드)
- 컨텍스트 40% 도달 전
- BLOCKED 상태 발생 시
```

CURRENT.md 위치: `/Users/noir/Projects/a-team/.context/CURRENT.md`

### 세션 이관 체크리스트

```
1. CURRENT.md 갱신 (현재 상태, 다음 할 것, 막힌 것)
2. 진행 중인 파일 저장 상태 확인
3. 중요 발견 사항 기록
4. 다음 세션 진입점 명시 (/pickup 또는 /resume)
```

## 예시

```markdown
# CURRENT.md 갱신 예시
## 현재 상태
P0-4 skills 파일 작성 중. 7/10 완료.

## 다음 할 것
- error-recovery.md 완성
- context-management.md 작성
- quality-gate.md / analytics-logging.md 작성

## 막힌 것
없음
```

## 주의사항

- MCP 과다 설치 = 전체 작업이 Dumb Zone (필요한 MCP만 활성화)
- 같은 파일 두 번 읽기 금지 (캐시 신뢰)
- Dumb Zone 진입 후 아키텍처 결정 금지 — Smart Zone에서 설계, Dumb Zone에서 단순 구현만
