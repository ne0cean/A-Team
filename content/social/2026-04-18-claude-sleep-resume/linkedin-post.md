---
platform: linkedin
format: long-post
date: 2026-04-18
slug: claude-sleep-resume
word_count: 1450
brief: content/research/2026-04-18-claude-sleep-resume/06-brief.json
status: draft
human_edited: false
---

# LinkedIn Post — Claude Code Sleep Mode

## Hook (첫 줄 — "더 보기" 클릭 유도)

Claude Code의 5시간 리밋 후 누가 "continue" 안 쳐도 자동으로 다시 코드를 작성하게 만들었다.

6주 운영 결과를 공유합니다.

## 본문

[HUMAN INSERT: 시작 동기 — 본인이 처음 야간 자율 모드 실패한 경험을 1-2 문장으로]
(예: "어느 새벽 자고 일어났더니 자정에 멈춰 있었다. 그날 5시간을 잃었다.")

---

**문제는 명확합니다**

Claude Code Pro 플랜은 5시간 rolling window 리밋, Max 플랜은 주간 리밋 dual-layer 구조입니다. 리밋에 도달하면 세션이 멈추고, 사용자가 직접 'continue'를 입력해야 재개됩니다.

이게 잠든 시간엔 작동하지 않습니다.

Anthropic GitHub에는 이 기능 요청 issue가 18개월째 5개 이상 열려 있습니다 (#18980, #26789, #35744, #38263, #41788). 우선순위에 들어가긴 한 것 같지만, 그동안 기다리기만 할 수는 없었습니다.

---

**기존 솔루션의 한계**

세 가지 워크어라운드를 검토했습니다:

1️⃣ **tmux send-keys 스크립트** — 단일 머신 의존, 세션 종료 시 실패
2️⃣ **claude-auto-retry npm 패키지** — 무한 retry 가능, 비용 폭주 위험 (한 번 본 적 있음 — Boucle case가 24시간에 $48 돌파)
3️⃣ **Anthropic routines (2026-03 출시)** — 스케줄 기반, 리밋 직후 자동 재개는 별개 기능

기존 도구를 그대로 쓰는 대신, 5-layer 안전장치를 직접 만들었습니다.

---

**5-Layer Architecture**

**Layer 1 — Probe Exponential Backoff**
5s → 25s → 125s 지수적 대기 + Retry-After 헤더 파싱.
Anthropic SDK + frankbria/ralph-claude-code + LiteLLM 패턴 통합.

**Layer 2 — launchd Polling**
macOS native (cron 대신). 매 2분 probe → 리밋 풀린 즉시 재개.
Cross-platform 확장 시 systemd로 대체 가능.

**Layer 3 — Hourly Cap $3.00**
시간당 비용 상한. 폭주 사고 방지.
하루 최대 $48 (Boucle case)를 막는 실제 가드레일.

**Layer 4 — PID Lock**
launchd 2-min interval과 prev instance overlap 차단.
실전에서 발견된 race condition 후 추가됨.

**Layer 5 — Quality Gate (4-Stage)**
- Stage 1: Diff sanity (의도된 파일만 수정?)
- Stage 2: JSON schema validation
- Stage 3: Token budget check
- Stage 4: Test ratio (테스트 코드 비율)

PASS/BLOCK/WARN 3-단계 exit code. 실패하면 재시도 안 함.

---

**6주 실측 데이터**

[HUMAN INSERT: 본인의 실제 사용 패턴 — 어떤 작업을 자율 모드로 돌리는지 구체적으로]
(예: "주로 테스트 추가, 문서 sync, 작은 리팩토링. 새 기능 추가는 자율 모드 X")

| 지표 | 값 |
|------|-----|
| 월 비용 (Starter Stack) | $73 |
| 야간 cycle 평균 | 2-3 회/밤 |
| Quality Gate 통과율 | 78% |
| 가장 큰 실패 모드 | 리밋 시작 시점 오인 (23%) |
| 두 번째 실패 모드 | Schema validation 실패 (8%) |

작은 기능이지만, 잠든 6시간을 매일 코드 작성 시간으로 전환합니다.

---

**중요한 안전 수칙**

자율 ≠ 무감독. 다음은 절대 비협상:

- ❌ 프로덕션 배포는 자율 모드에서 절대 X
- ❌ Critical 디렉토리 화이트리스트 강제
- ✅ 별도 브랜치 격리 (ralph/YYYY-MM-DD-slug 자동 생성)
- ✅ 아침 커밋 로그 검토 (절대 스킵 X)

[HUMAN INSERT: 본인의 morning ritual 또는 가까운 fail 경험]

---

**왜 만들었나**

"곧 Anthropic이 공식 지원할 텐데, 왜 직접 만들었어요?"라는 질문을 받습니다.

답: 그동안 6+개월간 잠든 시간이 손실됩니다. 공식 지원되는 날 이 셋업이 무용지물이 되어도, 그동안의 ROI가 셋업 시간보다 큽니다.

빌드 vs 기다림 결정 프레임:
- 셋업 비용: 4-6시간 1회
- 일일 절감: 6+ 시간 (잠자는 동안)
- 손익분기: 1일

기다림의 비용을 정량화하면 보통 빌드의 답이 나옵니다.

---

**전체 코드 + 셋업 가이드**

GitHub: github.com/ne0cean/A-Team

`scripts/install-sleep-cron.sh` 실행 + `RESUME.md` 작성 + `/overnight` 호출. 30분이면 셋업 완료입니다.

같은 페인 겪으신 분 계시면 댓글로 워크어라운드 공유해주세요. 같이 정리하고 싶습니다.

#ClaudeCode #AI #자동화 #1인개발

## 스케줄링

- 발행 시간: 화-목 오전 9시 (LinkedIn 알고리즘 + B2B 오디언스)
- Twitter thread 발행 24h 후 (반응 데이터 활용)
- 댓글 첫 30분 적극 응답 (LinkedIn 알고리즘 boost)

## 비주얼

- OG 이미지: 5-layer 다이어그램 (HTML/CSS 직접 생성 권장)
- 위치: content/visuals/2026-04-18-claude-sleep-resume/og-linkedin.png
