---
description: 세션 종료 — 컨텍스트 업데이트, 빌드 검증, 커밋
---

다음 순서대로 세션을 마무리하세요:

1. `.context/CURRENT.md`를 갱신합니다:
   - In Progress Files → (없음) 으로 비우기
   - Last Completions → 방금 완료한 작업 추가
   - Next Tasks → 다음 할 일 업데이트
   - Blockers → 현재 막힌 점 기록

2. `.context/SESSIONS.md`에 오늘의 세션 로그를 추가합니다:
   - 날짜, 완료 내역, 발생한 이슈

3. 빌드 검증을 실행합니다 (프로젝트 빌드 커맨드에 맞게):
   - Node.js: `npm run build`
   - Python: `pytest`
   - Rust: `cargo test`
   - 빌드 커맨드가 없으면 정적 분석 또는 린트 실행

4. 빌드가 성공하면 커밋합니다. 메시지 형식:
   ```
   [type]: 요약

   NOW: 방금 완료한 것
   NEXT: 다음 할 일
   BLOCK: 막힌 점 (없으면 없음)
   ```

5. 프론트엔드 작업이 있었다면 브라우저에서 최종 화면을 확인하고 URL을 보고합니다.

6. (선택) Research Mode 활성화:
   자리를 오래 비울 예정이면 Research Mode 데몬을 시작할지 물어보세요.
   시작 명령: `/research start`
