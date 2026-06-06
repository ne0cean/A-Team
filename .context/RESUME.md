---
mode: zzz
entered_at: 2026-06-06T00:00:00+0900
status: needs_input
session_goal: "T33A USB 분리 복구 시간 150s→35s 수정 완료. 복귀 후 위젯 탭 1회로 적용."
---

## In Progress
- (없음)

## Completed This Session
- [x] T33A 실패 근본 원인 분석 → POSTMORTEM-2026-06-06.md
- [x] 테스트 2건 수정: scheduled-reviews.json 복구, benchmark-corpus.mjs 중복 import 제거
- [x] Cortex Dashboard a11y 수정: aria-label 14개 추가, SW v26 bump, 라이브 배포 완료
- [x] T33A "USB 빼면 안됨" 진짜 원인 파악 + 수정 배포
  - 원인: 구 watchdog tick=60 + threshold=90s = 최대 150s 복구 지연
  - 수정: boot.sh tick=15 + relay_hb(1s) + "already alive" 스킵 → max 35s
  - 수정: start.sh 위젯 탭 시 구 watchdog 종료 → 새 watchdog 즉시 교체
  - 폰에 15:40 auto_pull 배포 완료 (commit 92abcd6)
  - Shizuku 미설치 확인 → USB-independent는 여전히 불가

## Next Immediate Step (복귀 후 딱 1가지)
**T33A 위젯 탭 1회** (USB 연결 중)
→ 구 watchdog(PID 18015, tick=60) 종료 + 새 watchdog(tick=15) 시작
→ 이후 USB 제거 → 35초 내 자동 복구 확인

## Files Touched
- /Users/noir/Projects/t33a-remapper/scripts/t33a_boot.sh
- /Users/noir/Projects/t33a-remapper/scripts/t33a_start.sh
- /Users/noir/Projects/t33a-remapper/.context/POSTMORTEM-2026-06-06.md
