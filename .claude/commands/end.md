---
description: 세션 종료 — 상태 갱신, 로그 기록, 빌드 검증, 커밋
---

1. `.context/CURRENT.md` 갱신 — 완료한 작업, 현재 활성 URL(있으면), 다음 할 일
2. `.context/SESSIONS.md` 에 오늘 세션 로그 추가 (날짜, 완료 내역, 이슈/막힌 점)
3. 빌드 스크립트(`npm run build` / `pytest` / `cargo test` 등) 실행하여 기존 기능 검증
4. 빌드 성공 시 커밋 — 메시지에 NOW/NEXT/BLOCK 구조 포함
5. 프론트엔드 작업이었으면 최종 화면 URL 제공 또는 브라우저에서 확인
