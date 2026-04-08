---
name: UI Inspect
description: Playwright CLI 기반 토큰 효율적 브라우저 자동화. MCP 없이 Bash 서브프로세스로 스크린샷+ARIA+바운딩박스를 캡처하여 UI 문제를 진단. PostToolUse 훅으로 자동 트리거됨.
---

# UI Inspect Skill

## Core Features
1. **자동 Before/After 캡처**: PreToolUse/PostToolUse 훅이 UI 파일 수정 시 자동 실행
2. **픽셀 diff + 좌표 추출**: 변경된 영역과 요소의 정확한 바운딩박스 제공
3. **토큰 최적화**: MCP 대비 93% 토큰 절감 (스키마 오버헤드 0, 파일 기반 I/O)
4. **additionalContext 주입**: 검증 결과가 Claude 컨텍스트에 자동 삽입

## Architecture

```
PreToolUse(Edit|Write)  →  Before 스크린샷 캡처 (백그라운드)
         ↓
      Edit 실행
         ↓
PostToolUse(Edit|Write) →  After 캡처 + Diff + 보고서 생성
         ↓                      ↓
   additionalContext 주입    /tmp/ui-inspect/ 에 파일 저장
         ↓
   Claude가 diff 이미지 Read → 판정 (PASS/WARNING/FAIL)
```

## Token Budget (vs MCP)

| 항목 | MCP Playwright | UI Inspect Skill |
|------|---------------|-----------------|
| 도구 스키마 | 13,700 tok | 0 |
| 페이지 스냅샷 | 15,000 tok | ~500 tok (파일 Read) |
| 10단계 워크플로우 | 114,000 tok | ~6,000 tok |

## Setup

```bash
# 최초 1회 실행
bash ~/Projects/a-team/A-Team/scripts/browser/install.sh

# 프로젝트에 훅 등록 (settings.json에 추가)
# templates/settings.json 참조
```

## Environment Variables

```
UI_INSPECT_URL=http://localhost:3000
UI_INSPECT_VIEWPORT=375x812
UI_INSPECT_HMR_WAIT=2
UI_INSPECT_ENABLED=true
```

## Scripts

| Script | Purpose | Typical Tokens |
|--------|---------|---------------|
| `snapshot.js` | 전체 페이지 캡처 + ARIA + boxes | ~406 tok (375x812) |
| `diff.js` | Before/After 픽셀 비교 | ~500 tok (diff image) |
| `element.js` | CSS 셀렉터 요소만 캡처 | ~54-200 tok |
| `flow.js` | 멀티스텝 자동화 | ~1,000 tok/step |
| `report.js` | 보고서 생성 | ~200 tok (text) |

## Notes
- Playwright 미설치 시 훅이 자동으로 graceful skip
- Dev server 미실행 시에도 graceful skip (에러 없음)
- `/tmp/ui-inspect/` 내 10분 이상 된 파일은 자동 삭제
