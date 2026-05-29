---
description: cortex inbox 파일들을 PARA + 6기둥으로 자동 분류 → 승인 후 이동.
---

> Analytics: `node scripts/log-event.mjs command_start name=tidy-inbox`

`cortex/inbox/` 파일을 스캔하고 적절한 위치로 분류 이동한다.

## 동작

1. `cortex/inbox/*.md` 파일 목록 확인
2. 비어있으면: "inbox가 비어있습니다." 종료
3. 각 파일에 대해:
   a. 내용 읽기
   b. PARA 판정 (Projects / Areas / Resources)
   c. Areas면 6기둥 자동 분류
   d. 태그 생성
   e. 기존 cortex 노트와 관련 있으면 `[[wikilink]]` 삽입
4. **각 항목별 기존 노트 매칭**:
   - 분류 대상 디렉토리에서 동일/유사 주제 노트 검색
   - **매칭 있으면**: "기존 '{노트명}'에 병합" 제안
   - **매칭 없으면**: "신규 파일 생성" 제안

5. 분류 결과 표로 제시:

```
| 항목 | PARA | 기둥/타입 | 액션 |
|------|------|----------|------|
| 미팅 메모 | Areas | 4-interstellar | 기존 'career-plan.md'에 병합 |
| 책 인사이트 | Resources | books | 신규 'titan-tools.md' 생성 |
| 투자 아이디어 | Areas | 6-snowball | 기존 'portfolio.md'에 추가 |
```

6. 사용자에게 확인
7. 승인 시:
   - **병합**: 기존 노트에 새 섹션 append + Updated 날짜 갱신 + version++
   - **신규**: 파일 생성 + frontmatter
   - inbox 당일 파일에서 해당 항목 제거 (또는 ~~취소선~~)

## Cascade Updates (이동 후)

각 이동된 파일에 대해:
1. 이동 대상 디렉토리의 기존 노트와 관련성 스캔
2. 관련 있으면 typed wikilink 자동 삽입 제안 (`[[note|related]]` 등)
3. 기존 노트에도 역방향 백링크 추가 제안

## 규칙
- 사용자 승인 없이 이동하지 않는다.
- 판단 어려운 건 "inbox 유지 (수동 분류 필요)" 표시.
- 이동 후 1줄 요약: "3건 분류 완료 (Areas 2, Resources 1). Cascade: 관련 노트 N건 연결."
