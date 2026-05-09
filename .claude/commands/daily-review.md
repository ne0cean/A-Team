---
description: 어제와 오늘의 변경사항 분석 및 Daily Review 생성
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

현재 프로젝트의 어제와 오늘 변경사항을 분석합니다.

**수행할 작업:**

1. **어제 변경된 파일 찾기**
   ```bash
   git log --since="yesterday" --name-only --pretty=format: | sort | uniq
   ```

2. **주요 변경사항 분석**
   - 어떤 폴더/파일이 변경되었는지
   - 어떤 내용이 추가/수정되었는지

3. **CURRENT.md 업데이트**
   - `.context/CURRENT.md` 읽기
   - 변경사항 요약을 Last Completions에 추가

4. **오늘 우선순위 제안**
   - 어제 작업 연속성 기반
   - 미완료 항목 식별

5. **CURRENT.md Next Tasks에 다음 내용 반영:**

   ### 어제 진행 상황
   - [변경된 폴더/파일]: [변경 내용 요약]

   ### 오늘 우선순위 제안
   1. [AI 분석 기반 우선순위]
   2. [미완료 작업 연속성]
   3. [프로젝트 마감일 고려]

   ### 인사이트
   - [패턴 발견]
   - [개선 기회]

6. **사용자에게 확인 요청**
   - 우선순위 조정 필요 여부
   - 추가 컨텍스트 필요 여부
