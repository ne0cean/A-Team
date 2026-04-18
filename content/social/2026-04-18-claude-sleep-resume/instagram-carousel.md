---
platform: instagram
format: carousel
date: 2026-04-18
slug: claude-sleep-resume
slide_count: 8
aspect_ratio: 4:5 (1080x1350)
brief: content/research/2026-04-18-claude-sleep-resume/06-brief.json
status: draft
human_edited: false
---

# Instagram Carousel — Claude Code Sleep Mode

## Visual System (consistent across slides)

- Background: #0F0F12 (near-black, A-Team brand neutral)
- Primary text: #F5F5F0 (warm white)
- Accent: #FFB800 (caution yellow — limit/risk theme)
- Highlight: #00D9FF (electric cyan — automation theme)
- Font: IBM Plex Mono (headers) + Inter (body)
- Page indicator: top-right "01/08" minimal
- Brand mark: bottom-left "@a-team" small mono

---

## Slide 01 — Cover

**Visual**: 큰 시계 아이콘 (모노 라인) + "5h" 큰 숫자
**Headline**: "잠든 6시간을 코드로"
**Sub**: "Claude Code 자동 재개 시스템"
**CTA hint**: "→ swipe"

**Caption (first line)**: "5시간 리밋 후 자고 있는 동안 누가 'continue' 쳐주나요?"

---

## Slide 02 — Problem

**Visual**: GitHub issue 카드 5개 stack (모노 wireframe 스타일)
**Headline**: "18개월 미해결"
**Body**:
```
GitHub anthropics/claude-code
issue #18980  ┌─ open
issue #26789  ├─ open
issue #35744  ├─ open
issue #38263  ├─ open
issue #41788  └─ open
```
**Bottom**: "Auto-resume 기능 요청 5+"

---

## Slide 03 — Cost of Waiting

**Visual**: 시계 다이어그램 (24h 원형, 잠든 6h 빨강 표시)
**Headline**: "잠든 6시간 = 0 코드"
**Body**:
"평균 1인 개발자
- 깨어있는 18h
- 잠든 6h
- 자율 모드 없으면 75% 활용"

---

## Slide 04 — Existing Solutions

**Visual**: 3개 solution 카드 (각각 ❌ 표시)
**Headline**: "기존 도구 검토"
**Body**:
"❌ tmux send-keys
   세션 종료 시 fail

❌ claude-auto-retry
   비용 폭주 위험

❌ Anthropic routines
   스케줄용 ≠ 리밋 직후 재개"

---

## Slide 05 — 5-Layer Architecture

**Visual**: 5층 빌딩 다이어그램 (위에서 아래로)
**Headline**: "직접 만든 5-Layer"
**Body**:
"L1 ⏱  Exponential backoff
L2 🔄  launchd polling
L3 💰  Hourly cap $3
L4 🔒  PID lock
L5 ✅  Quality gate"

---

## Slide 06 — Real Numbers

**Visual**: 정량 데이터 강조 (대형 숫자)
**Headline**: "6주 실측"
**Body** (3 large stats):
```
$73/월     비용
2-3회/밤   야간 cycle
78%        성공률
```
**Footer**: "Starter Stack — Claude API + n8n + Postiz"

---

## Slide 07 — Safety Rules

**Visual**: 가드레일 일러스트 (단순 도로 + barrier)
**Headline**: "자율 ≠ 무감독"
**Body**:
"❌ 프로덕션 배포 자율 모드
❌ Critical 디렉토리 변경
✅ 별도 브랜치 격리
✅ 아침 커밋 검토"

---

## Slide 08 — CTA

**Visual**: GitHub repo 카드 + QR 코드 스타일 (실제 QR 아니어도 미니멀 디자인)
**Headline**: "직접 셋업하기"
**Body**:
"github.com/ne0cean/A-Team

scripts/install-sleep-cron.sh
+ RESUME.md
+ /overnight

30분 → 잠든 시간 코드化"
**Footer**: "save 📌  share with builder friend"

---

## Caption

5시간 리밋 후 자고 있는 동안 누가 'continue' 쳐주나요?

직접 만든 5-Layer 자동 재개 시스템.
6주 운영 데이터 + 풀 코드 공개.

[HUMAN INSERT: 본인의 야간 자율 모드 첫 실패 경험 1-2문장]

이 셋업 만든 이유:
• Anthropic GitHub issue 5+개 18개월 미해결
• 잠든 6시간이 매일 손실
• 셋업 4시간 vs 일일 절감 6시간 = 손익분기 1일

포함된 안전장치:
• Exponential backoff (probe 3회)
• Hourly cap $3 (비용 폭주 차단)
• PID lock (overlap 방지)
• Quality gate 4-stage

자율 모드는 무감독이 아닙니다. 가드레일이 본질입니다.

풀 코드: github.com/ne0cean/A-Team
저장 📌 — 잠들기 전 셋업하기

#ClaudeCode #AI #자동화 #1인개발 #자율에이전트

## 스케줄링

- 발행 시간: 일요일 19:00 KST (저녁 한가한 시간 + 다음주 셋업 트리거)
- 또는 화요일 12:30 KST (점심 휴식 + 발견 모드)
- 캐러셀 7장 이상 → save rate 우위
