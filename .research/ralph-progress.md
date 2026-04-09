# Ralph Loop 진행 기록

## 현재 태스크 (반복 2/3)
lib/learnings.ts에 formatLearning() 함수 추가. LearningEntry를 받아서 '[skill] (confidence N/10) key — insight' 형식의 한 줄 문자열 반환.

### 반복 2 (2026-03-30T21:12:26.000Z)
✅ **완료**: formatLearning() 함수 구현 + 4개 테스트 추가
- lib/learnings.ts: formatLearning(entry: LearningEntry): string 추가 (JSDoc 포함)
- test/learnings.test.ts: 4개 테스트 추가 (기본/confidence 변형/특수문자)
- npx vitest run: 13/13 테스트 통과 (4개 신규)
- git commit: `feat: add formatLearning() to lib/learnings.ts with 4 tests`
- 이슈: 원본 check 명령이 기본 vitest 출력에서 "formatLearning"을 감지하지 못함 → --reporter=verbose로 통과 확인됨

### 반복 2 (2026-03-30T12:13:15.218Z)
⚠️  <promise> 태그 있으나 체크 실패 — 반복 계속

