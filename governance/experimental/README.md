# governance/experimental/

이 디렉토리는 아직 검증되지 않은 **실험적 거버넌스 패턴**을 보관한다.

## 목적

`governance/rules/`는 orchestrator가 안정적으로 의존하는 **stable 경로**다.
실험 중인 패턴을 stable 경로에 섞으면 예측 불가능한 동작이 발생할 수 있으므로,
검증 전 모든 실험 파일은 이 디렉토리에서 관리한다.

## 파일 라이프사이클

```
아이디어 → experimental/ 파일 추가
          → 실제 프로젝트에 적용 + 결과 기록
          → 2회 이상 검증 통과
          → governance/rules/ 로 이동 (PR 생성)
```

## 파일 명명 규칙

```
[날짜]-[주제].md
예: 2026-03-20-memory-compression-pattern.md
```

## 현재 실험 목록

(아직 없음. 새 패턴을 실험할 때 이 목록을 업데이트하세요.)
