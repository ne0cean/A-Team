# 무정지 야간 자율 실행 + 토큰 리셋 자동 재시작 — 외부 구현 심층 리서치

**Date**: 2026-04-15
**Context**: A-Team 자체 구현(/sleep + launchd + sleep-resume.sh) 외 **외부 참고 자료** 심층 조사. 최근 2026-04-15 "14시간 손실" 사건 재발 방지를 위한 아키텍처 교차 검증.

---

## 🔑 가장 중요한 발견

### **Claude Code Routines (Anthropic 공식, 2026-04-14 출시)**
**URL**: https://code.claude.com/docs/en/routines
**상태**: 연구 미리보기

**핵심**: Anthropic 공식으로 **클라우드 인프라에서 직접 실행** — 노트북 닫혀있어도 동작.
- 트리거 3가지: Schedule / HTTP API / GitHub webhook
- Pro/Max/Team/Enterprise 전 요금제 지원
- **한계**: 하루 호출 수 제한 (Pro 5/day, Max 15/day)

**A-Team 관점**: 로컬 launchd 구현은 "Routines 미출시 시대 우회"였음. 지금은 2-tier 전략 가능:
1. **Routines** (공식, 제한 있음) — 예측 가능한 정기 작업 (주간 absorb 등)
2. **로컬 launchd** (A-Team) — 무제한 반복, rate limit 감지 폴링 필요한 야간 dev

---

## Top 10 외부 구현체 비교 요약

| # | 프로젝트 | 핵심 기여 | A-Team과의 관계 | 별점 |
|---|---|---|---|---|
| 1 | **Claude Code Routines** (공식) | Cloud-native, laptop-off OK | 로컬 대체 아님, 보완 | ⭐⭐⭐⭐ |
| 2 | **ClaudeNightsWatch** | 5시간 윈도우 감지 + task 실행 | `--dangerously-skip-permissions` 버그 공유 | ⭐⭐⭐ |
| 3 | **frankbria/ralph-claude-code** | Bash 기반 Ralph 566 tests | A-Team ralph-daemon.mjs와 거의 동일 | ⭐⭐⭐⭐⭐ |
| 4 | **ARIS** (Auto-research-in-sleep) | 리서치 특화, multi-model | Research daemon 개념 유사 | ⭐⭐⭐⭐ |
| 5 | **Autoclaude** (henryaj) | tmux + 자동 "continue" | 대화형 (headless 아님) | ⭐⭐⭐⭐ |
| 6 | **Vercel ralph-loop-agent** | AI SDK 래퍼, stop conditions | 영감은 같으나 상태 지속 부족 | ⭐⭐⭐ |
| 7 | **alfredolopez80/multi-agent-ralph** | MemPalace + 4-stage gates | 여러 개념 가장 정교 | ⭐⭐⭐⭐⭐ |
| 8 | **opencode-scheduler** | Cross-platform scheduler | launchd/systemd/cron 자동 선택 | ⭐⭐⭐⭐ |
| 9 | **LiteLLM** | Multi-LLM proxy, rate limit tiers | Anthropic 단일에 과도 | ⭐⭐⭐ |
| 10 | **LangGraph Time Travel** | Node-level checkpoint | 아이디어만 차용 가능 | ⭐⭐⭐⭐ |

---

## 🎯 A-Team 즉시 흡수 Top 3

### 1. frankbria/ralph-claude-code — 3-layer API limit detection (1순위)
**현재 A-Team**: stream-json 파싱만.
**개선**: timeout guard + regex fallback + structured JSON 3층 방어.
**파일**: `scripts/ralph-daemon.mjs` `spawnClaudeProcess()`

```javascript
// 추가: hourly cap (현재 iteration budget만)
const CONFIG = {
  maxBudgetPerIter: '0.50',
  maxBudgetPerHour: '3.00',   // NEW
  stallThreshold: 2,
};
```

### 2. alfredolopez80/multi-agent-ralph — 4-stage quality gates (2순위)
**현재 A-Team**: probe + real invocation 2단계 (조항 7).
**개선**: correctness → quality → security → consistency 4단계.
**파일**: `governance/rules/quality-gates.md` 신규 + ralph-daemon 통합

### 3. LiteLLM / Anthropic SDK — Exponential backoff (3순위)
**현재 A-Team**: probe 실패 시 즉시 exit → cron 2분 대기.
**개선**: Retry-After 헤더 파싱 + exponential backoff 5s → 25s → 125s.
**파일**: `scripts/sleep-resume.sh` probe 블록

```bash
probe_with_backoff() {
  local attempts=(5 25 125)  # seconds
  for wait in "${attempts[@]}"; do
    PROBE_OUT=$(claude -p --model haiku "ok" 2>&1)
    [ $? -eq 0 ] && return 0
    if echo "$PROBE_OUT" | grep -q "Retry-After: "; then
      sleep "$(echo "$PROBE_OUT" | grep -oP 'Retry-After:\s*\K\d+')"
    else
      sleep "$wait"
    fi
  done
  return 1
}
```

---

## ⚠️ 회피해야 할 8개 함정 (실패 사례 중심)

1. **Probe 성공 = 본작업 성공 착각** (A-Team 2026-04-15 사건) → **조항 7** 이미 추가됨
2. **Infinite retry loop** (AutoGPT, Nightcrawler) → `MAX_CONSECUTIVE_TIMEOUTS` 추가 필요
3. **Context bloat** (Boucle, $48/day 사건) → RESUME.md 주간 archive 자동화 필요
4. **Rate limit false positives** (frankbria v0.11.4) → regex whitelist 기반 + 공식 error code 우선
5. **Single model blindness** (ARIS 레슨) → cross-model validation 고려 (비용 부담)
6. **Session state loss on crash** (Vercel, Cline) → atomic state.json + git commit 이미 대응
7. **Opaque SDK retry** (Anthropic SDK 자동 retry) → stream-json에서 retry count 추출 로깅
8. **Multiple API key rotation 착각** (org-level rate limit) → 도움 안 됨, 다중 team 필요

---

## 참고 URL (전체)

### Top 10 프로젝트
- https://code.claude.com/docs/en/routines (Anthropic 공식)
- https://github.com/frankbria/ralph-claude-code
- https://github.com/alfredolopez80/multi-agent-ralph-loop
- https://github.com/aniketkarne/ClaudeNightsWatch
- https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep
- https://github.com/henryaj/autoclaude
- https://github.com/vercel-labs/ralph-loop-agent
- https://github.com/BerriAI/litellm
- https://github.com/different-ai/opencode-scheduler
- https://python.langchain.com/ (LangGraph checkpoint)

### 기술 레퍼런스
- https://platform.claude.com/docs/en/api/rate-limits
- https://deepwiki.com/anthropics/anthropic-sdk-python/4.5-request-lifecycle-and-error-handling
- https://www.agentpatterns.tech/en/failures/infinite-loop
- https://eunomia.dev/blog/2025/05/11/checkpointrestore-systems-evolution-techniques-and-applications-in-ai-agents/
- https://fast.io/resources/ai-agent-rate-limiting/
- https://dev.to/boucle2026/how-to-run-claude-code-as-an-autonomous-agent-with-a-cron-job-hec

---

## 실행 로드맵

### 단기 (이번 주)
- [ ] `scripts/sleep-resume.sh` — probe exponential backoff + Retry-After 파싱
- [ ] `scripts/ralph-daemon.mjs` — MAX_CONSECUTIVE_TIMEOUTS + hourly cap

### 중기 (1-2주)
- [ ] `governance/rules/quality-gates.md` 신규 (4-stage)
- [ ] RESUME.md 주간 archive 자동화
- [ ] Anthropic stream-json retry count 파싱

### 장기 (1개월+)
- [ ] Claude Code Routines 파일럿 (정기 작업: /absorb weekly → Routines로 이관 검토)
- [ ] LangGraph Time Travel 아이디어 적용 (`.context/CHECKPOINTS.jsonl`)
