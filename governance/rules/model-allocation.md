# Model Allocation — 자동 모델 적정성 룰

> **원칙**: 모든 작업을 메인 세션 Opus로 처리하지 않는다. 작업 복잡도별로 자동 위임/추천한다.

## 핵심 룰

### 1. 메인 세션 모델 자동 평가 (SessionStart + 매 사용자 메시지)

매 사용자 요청 직후, Claude는 **첫 행동 전에** 다음 4단계 자가평가:

```
1. 이 작업이 진짜 Opus 필요한가?
   - 새 시스템 아키텍처 설계 / 옵션 비교 / 멀티에이전트 오케스트레이션 / 성능 최적화 전략 → YES
   - 그 외 → NO

2. NO면 → 두 옵션 중 하나 즉시 실행:
   a) 사용자에게 1줄 push: "이 작업은 Sonnet으로 충분합니다. /model sonnet 전환 권장 (Opus 비용 ~3-5x)."
   b) 또는 내부적으로 적절한 서브에이전트(Sonnet/Haiku)에 위임

3. 사용자가 명시적으로 "Opus로 해" 또는 모드 유지 의사 표현 시 → 그대로 진행, 재추천 금지 (한 세션 내)

4. 자율 모드(/zzz, /ralph)에서는 추천 메시지 생략 — 서브에이전트 위임으로 대체
```

### 2. 작업 유형별 모델 권장표

| 작업 | 권장 모델 | 이유 |
|------|----------|------|
| 새 시스템/아키텍처 설계 | **Opus** | 다중 옵션 비교 + 장기 영향 추론 |
| MoA 충돌 해소 (judge) | **Opus** | 복수 응답 평가 |
| 복잡 멀티에이전트 오케스트레이션 (5+ 에이전트, 강한 의존성) | **Opus** | 전체 흐름 추론 |
| 보안 감사 (CSO) — 새로운 위협 모델링 | **Opus** | 적대적 추론 |
| 구현/리팩토링/버그픽스 | **Sonnet** | 도구 호출 정확도 우수, 비용 1/3-1/5 |
| 단일 파일 수정 / 마크다운 문서 추가 | **Sonnet** | 압도적 가성비 |
| 영상/문서 분석 + 요약 | **Sonnet** | 충분한 추론력 |
| 통합 영향 분석 (PMI) | **Sonnet** | 패턴 매칭 위주 |
| 리서치/조사/검색 | **Haiku** 또는 Gemini 위임 | 토큰 최소 |
| 분류/필터/판정 (pre-check, scope-validator) | **Haiku** | 단순 결정 |
| 디자인 tone 결정, 정적 룰 critique | **Haiku** | 룰 매칭 |

### 3. 메인 세션 Opus 유지 정당화 조건

다음 중 하나라도 해당하지 않으면 Sonnet 전환을 능동 추천:

- 사용자가 "옵션 비교/대안 검토/설계해줘" 등 명시 요청
- 5개 이상 파일에 걸친 동시 수정 + 강한 의존성
- 새 거버넌스/룰 시스템 설계
- 자율 모드 진입 직전 (zzz/ralph 시작 시 분배 결정)

**관성으로 Opus 유지 금지**. "이미 Opus로 시작했으니까" 는 정당화 아님.

### 4. 위임 우선 원칙 (Opus 유지 시)

메인이 Opus여도 실제 작업의 80%+는 서브에이전트에 위임:
- 영상/문서 추출/분석 → researcher (Haiku)
- 코드 수정/구현 → coder (Sonnet)
- 검증/리뷰 → reviewer (Sonnet)
- UI 진단 → ui-inspector (Sonnet)

메인 세션은 **분배 + 결과 통합 + 사용자 대화**만.

### 5. 자가 위반 감지

Claude는 매 5턴마다 자가 점검:
- 이번 5턴이 전부 단순 파일 수정/문서 추가였나?
- 그렇다면 → 다음 응답 시작에 1줄: "지난 5턴 작업이 단순 작업이었습니다. /model sonnet 전환 검토 권장."

## 적용 지점

- `vibe.md` Step 3 — 세션 시작 시 모델 적정성 평가 강화
- `CLAUDE.md` (a-team) — 핵심 원칙 1-2줄 명시
- `orchestrator.md` Phase 2.1 — 서브에이전트 라우팅 시 모델 명시
- 자율 모드 (`zzz.md`, `ralph.md`) — 자율 진입 시 분배 검증

## Override

- 사용자가 "Opus로 계속 해" 명시 → 룰 무시
- 사용자가 "/model" 명령 직접 사용 → 그 모델 유지
- `.context/MODEL_PIN.md` 파일 존재 → 해당 모델 고정

---

## LiteLLM 프록시 연동 (Multi-Model Router)

> **설정 파일**: `scripts/multi-model/litellm-config.yaml`
> **목표**: Opus는 기획/아키텍처만, 하위 작업은 로컬/저가 모델 자동 분기

### 모델 라우팅 테이블

| LiteLLM 모델명 | 실제 모델 | 용도 | 비용 |
|---------------|----------|------|------|
| `planner` | Claude Sonnet 4 | 설계/기획/복잡한 판단 | $3/M tok |
| `coder` | Claude Sonnet 4 | 구현/수정 | $3/M tok |
| `local-fast` | Ollama qwen2.5-coder:7b | 요약/정리/포맷 | **$0** |
| `local-strong` | Ollama qwen2.5-coder:32b | 코딩 (오프라인) | **$0** |
| `groq-free` | Groq Llama 3.3 70B | 빠른 추론 (무료) | **$0** |

### 자동 라우팅 규칙 (향후 구현)

```yaml
routing_rules:
  - pattern: "요약|정리|포맷|번역"
    model: local-fast

  - pattern: "구현|수정|리팩토링|버그"
    model: coder
    fallback: local-strong

  - pattern: "설계|아키텍처|비교|전략"
    model: planner

  - pattern: "분류|판정|필터"
    model: groq-free  # 무료 + 빠름
```

### LiteLLM 프록시 실행

```bash
# Docker 컨테이너 (권장)
docker run -d --name litellm \
  -p 4000:4000 \
  -v $(pwd)/scripts/multi-model/litellm-config.yaml:/app/config.yaml \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e GROQ_API_KEY=$GROQ_API_KEY \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml

# API 호출 예시
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-ateam-litellm" \
  -d '{"model": "local-fast", "messages": [{"role": "user", "content": "요약해줘"}]}'
```

### 현재 상태

- Phase 1-2: ✅ Ollama + LiteLLM Docker 가동
- Phase 3: 🔄 Groq 무료 fallback 추가 중
- Phase 4: ⏳ Claude Code 에이전트 연결
- Phase 5: ⏳ 자동 라우팅 + 예산 모니터링
