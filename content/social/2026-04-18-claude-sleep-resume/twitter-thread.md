---
platform: twitter
format: thread
date: 2026-04-18
slug: claude-sleep-resume
tweet_count: 9
brief: content/research/2026-04-18-claude-sleep-resume/06-brief.json
status: draft
human_edited: false
---

# Twitter Thread — Claude Code Sleep Mode

## Recommended Hook (Variant C ← 권장)

**A** 5/9 stat: "Claude Code 토큰 리밋이 자정에 떨어졌다. 자고 일어났더니 작업이 멈춰 있었다."
**B** 7/9 contrarian: "Claude Code의 가장 큰 약점은 모델이 아니다. 5시간 리밋 후 'continue' 못 치는 사람이다."
**C** 9/9 promise: ← 권장
"Claude Code 5시간 리밋 후, 누가 'continue' 안 쳐도 자동으로 다시 일하게 만들었다.

6주 운영 결과 + 셋업 코드 공개. ↓"

## Thread (9 tweets)

**1/ (Hook — Variant C)**
Claude Code 5시간 리밋 후, 누가 'continue' 안 쳐도 자동으로 다시 일하게 만들었다.

6주 운영 결과 + 셋업 코드 공개. ↓

**2/**
이 기능은 Anthropic GitHub에 5+개 issue로 요청만 있고 미구현이다.

#18980, #26789, #35744, #38263, #41788

수동으로 'continue' 쳐야 한다. 잠든 동안 작업이 멈춘다.

**3/**
기존 워크어라운드:
• tmux send-keys 스크립트 — 세션 종료 시 fail
• claude-auto-retry npm — 무한 retry 가능 (비용 폭주 위험)
• Anthropic routines (2026-03) — 스케줄 기반, 리밋 직후는 아님

다 부족했다.

**4/**
직접 만들었다. 5-Layer 안전장치:

L1: Probe exponential backoff (5s→25s→125s + Retry-After 헤더 파싱)
L2: launchd 매 2분 polling (macOS native, cron 대체)
L3: Hourly cap $3.00 (비용 폭주 차단)
L4: PID lock (병렬 overlap 방지)
L5: Quality gate 4-stage (diff/schema/token/test ratio)

**5/**
실제 sleep-resume.sh 코드 (핵심 부분):

```bash
for delay in 5 25 125; do
  if probe_api; then
    fire_resume && exit 0
  fi
  retry_after=$(parse_header)
  sleep "${retry_after:-$delay}"
done
```

Retry-After 헤더가 있으면 그것 우선. 없으면 backoff.

**6/**
6주 실측:
• 비용: $73/월 (Starter Stack)
• 야간 cycle 평균: 2-3 회/밤
• 성공률: 78% (Quality Gate 통과 기준)
• 실패 모드 1위: 리밋 시작 시점 오인 (23%)

작은 기능이지만 잠든 시간을 코드로 변환한다.

**7/**
중요한 안전 수칙:

❌ 프로덕션 배포는 절대 자율 모드 X
❌ critical 디렉토리 화이트리스트 강제
❌ branch 격리 (ralph/YYYY-MM-DD-slug 자동)
✅ 아침 커밋 검토 = 비협상

자율 ≠ 무감독. 가드레일이 본질이다.

**8/**
누가 '왜 직접 만들었나, 곧 공식 지원될 텐데?'라고 묻는다.

답: GitHub issue들이 18개월째 미해결이다. 그동안 손놓고 기다릴 수 없다.

공식 지원되면 이 셋업은 무용지물이 되겠지만, 그때까지 6+개월 잠든 시간을 산다.

**9/ (CTA)**
풀 코드 + 셋업 가이드:
github.com/ne0cean/A-Team

`scripts/install-sleep-cron.sh` 한 번 실행 + RESUME.md 작성 + /overnight 호출.

질문 댓글로.

이번 주 잠들 때 코드는 짜고 있을지도?

## A/B Test Notes

- 훅 variant 3개 — 팔로워 1000+ 시 thread 분리해서 30일 A/B 테스트 권장
- Tweet 5의 코드 블록은 모바일에서 잘 안 보임 — 이미지로 변환 검토
- Tweet 6의 "78%" 같은 구체 수치가 RT 핵심 트리거

## 스케줄링

- 발행 시간: 화요일 또는 목요일 09:00 KST (개발자 출근길 + 알고리즘)
- 첫 트윗 후 24h 모니터링 → 반응 좋으면 LinkedIn 버전 발행
