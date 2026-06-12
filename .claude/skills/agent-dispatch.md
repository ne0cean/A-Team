---
name: agent-dispatch
description: 서브에이전트 디스패치 패턴 — subagent_type 선택, 프롬프트 작성, 결과 통합
tags: [agent, subagent, dispatch, orchestration, parallel]
---

# Agent Dispatch

## 언제 사용

- 독립적으로 실행 가능한 태스크를 병렬 처리할 때
- 컨텍스트 격리가 필요한 탐색/분석 작업 시
- 10개+ 파일 수정처럼 오케스트레이터가 직접 하기 버거운 작업 시

## 패턴

### subagent_type 선택 기준

| type | 용도 | 모델 |
|------|------|------|
| `researcher` | 코드베이스 탐색, 파일 읽기, 분석 | Haiku ($) |
| `coder` | 코드 구현, 수정, 빌드 검증 | Sonnet ($$) |
| `analyst` | 데이터 분석, 요약, 보고서 작성 | Haiku ($) |
| `reviewer` | 코드 리뷰, AC 검증, 품질 체크 | Sonnet ($$) |

Opus 사용 조건: 신규 아키텍처 / 3개+ 옵션 비교 / 5개+ 파일 강한 의존성

### 백그라운드 vs 포어그라운드

```
포어그라운드: 결과가 다음 단계에 즉시 필요할 때
백그라운드:  병렬 실행 가능하고 결과를 나중에 통합할 때
```

### 프롬프트 작성 패턴

서브에이전트 프롬프트는 **독립 컨텍스트**로 작성 (이전 대화 참조 불가):

```
[역할]: 너는 A-Team Coder 에이전트다.
[컨텍스트]: <필요한 배경 정보 전부 인라인으로>
[태스크]: <구체적, 검증 가능한 출력 정의>
[파일]: <절대 경로로>
[출력 형식]: JSON { status, files_modified, build_result }
[제약]: PARALLEL_PLAN.md 파일 소유권 준수
```

### 병렬 디스패치 예시

```javascript
// 독립 태스크 병렬 실행
await Promise.all([
  dispatch('researcher', '파일 A 분석'),
  dispatch('researcher', '파일 B 분석'),
  dispatch('coder', '컴포넌트 C 구현'),
]);
```

### 결과 통합 방식

```
1. 각 에이전트 출력: JSON { status: DONE|BLOCKED, files_modified, evidence }
2. BLOCKED 있으면 오케스트레이터에 에스컬레이션
3. 모두 DONE → 통합 검증 (빌드, 테스트)
4. CURRENT.md 갱신
```

## 주의사항

- 서브에이전트에 현재 대화 컨텍스트 전달 불가 → 필요 정보 전부 프롬프트에 인라인
- 10개+ 파일 동시 수정 시 → reviewer 호출 요청
- 보안 관련 코드 수정 → `DONE_WITH_CONCERNS` + risks 명시
- 모델 미지정 서브에이전트 → enforce-model-param.sh가 deny (governance 규칙)
