# Research Integration — 외부 리서치 반영 추적

> **목적**: 외부 리서치(웹, 논문, 도구)로 가져온 코드/패턴 적용 시 출처 추적 + 검증 의무화.

## 트리거 조건

- researcher 에이전트 결과 → 코드/설계 적용 시
- "~에서 참고", "외부 예제", "검색해서 가져온" 패턴 감지 시
- WebSearch/WebFetch 결과를 구현에 직접 반영 시

## 의무 사항

### 1. AC에 Source 필드 추가

```
TASK: [태스크 이름]
Source: https://... ([방법론/패턴 이름])
AC:
  - [ ] 구현이 소스에서 주장한 동작과 일치하는가?
```

### 2. .research/notes/ 저장

연구 노트 파일명: `YYYY-MM-DD-[주제].md`
내용: 원본 URL + 핵심 인사이트 1-3줄 + A-Team 적용 방법

### 3. Vigil 자동 검증 항목 추가

Source가 있는 AC에 vigil이 자동으로 추가하는 체크:
```
- [ ] 소스 주장 검증: 구현이 Source에서 설명한 동작과 일치하는가?
```

## ateam-first 우선순위

외부 리서치 전에 A-Team 내부 자원 먼저 확인:
```bash
grep -r "키워드" governance/ .claude/agents/ .research/
```
동일 패턴이 이미 있으면 외부 리서치 불필요 → 내부 자원 재사용.

## 면제

- 공식 라이브러리 문서 직접 참조 (API 사용법)
- 단순 버그 수정용 StackOverflow 코드 스니펫 (5줄 이하)

---

**연관 규칙**: `ateam-first.md`, `task-ac.md`, `truth-contract.md`
**Last updated**: 2026-06-04
