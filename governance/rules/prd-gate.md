# PRD Gate — PRD 없이 빌드 금지

> 모든 프로젝트는 `.context/prds/` 또는 프로젝트 루트에 PRD 문서가 있어야 빌드를 시작할 수 있다.
> PRD가 없으면 `/prd`부터 실행한다. 예외 없음.

## 규칙

1. **신규 프로젝트**: 코드 작성 전 반드시 `/office-hours` → `/prd` 실행
2. **기존 프로젝트 (PRD 없음)**: 첫 세션에서 PRD 부재 감지 → `/prd` 실행 제안
3. **A-Team 자체**: `.context/prds/a-team-prd.md` 유지

## PRD 존재 확인 방법

```bash
PRD_EXISTS=$(find . -maxdepth 3 -name "*prd*" -o -name "*PRD*" | grep -iE '\.md$' | head -1)
```

- 있음 → 정상 진행
- 없음 → "이 프로젝트에 PRD가 없습니다. `/prd`로 먼저 정의할까요?" 제안
- 사용자가 거절 → 1회 스킵 허용, 다음 세션에서 재제안

## PRD 최소 요건

- 제품/프로젝트가 해결하는 문제 1문장
- 타겟 사용자
- 성공 기준 (측정 가능)
- 핵심 기능 3개 이내

## 면제 대상

- hotfix / 버그 수정 세션
- 명시적 "PRD 스킵" 선언 (1회성)
- A-Team 내부 인프라 작업 (governance/rules, scripts 등)
