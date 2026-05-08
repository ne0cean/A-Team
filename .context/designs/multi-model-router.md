# Multi-Model Router 설계

> **Status**: 별도 추진 (A-Team 본류와 분리)
> **Owner**: noir
> **Created**: 2026-05-08

## 현재 환경

- Claude Code Pro 계정
- Claude Code Max 계정
- Google One (Antigravity)
- macOS (ARM)

## 목표 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Planner (Opus)                          │
│  - 요구사항 해석, 시스템 설계, 작업 분기                │
│  - PRD, 리팩터링 전략, 멀티파일 구조 변경               │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Router (LiteLLM / Claude Code Router)      │
│  - 작업 난이도 판정 → 모델 선택                         │
│  - Rate limit fallback                                  │
│  - 비용/지연 추적                                       │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Worker-Local│   │ Worker-Mid  │   │ Worker-Top  │
│ Ollama      │   │ OpenRouter  │   │ Opus        │
│ Qwen/Llama  │   │ Sonnet급    │   │ escalate    │
└─────────────┘   └─────────────┘   └─────────────┘
```

## 라우팅 규칙

| 키워드/패턴 | Lane | 모델 |
|-------------|------|------|
| 설계, 기획, 아키텍처, 전략, 판단 | Opus | Claude Opus |
| 구현, 코딩, 버그수정, 테스트 | Mid | Sonnet / DeepSeek |
| 요약, 정리, 포맷, 타입수정, 로그해석 | Local | Ollama Qwen 14B |
| 대용량 배치, 반복 변환 | Cheap | OpenRouter 저가 |

## Fallback 체인

```
Local 실패 (1회) → Mid Cloud
Mid 실패 (1회) → Opus
Anthropic 한도 → OpenRouter 대체
```

## Phase 1: 로컬 서빙 (Ollama)

### 설치
```bash
brew install ollama
ollama serve  # 백그라운드 실행
```

### 추천 모델
```bash
# Fast (7B, 요약/정리용)
ollama pull qwen2.5-coder:7b

# Strong (14B-32B, 코딩용)
ollama pull qwen2.5-coder:14b
ollama pull deepseek-coder-v2:16b

# 대형 (선택, M2 Pro 이상)
ollama pull qwen2.5-coder:32b
```

### 메모리 가이드
- 7B: ~4GB VRAM
- 14B: ~8GB VRAM
- 32B: ~20GB VRAM (M2 Pro+ 권장)

## Phase 2: 라우터 (LiteLLM)

### 설치
```bash
pip install litellm[proxy]
```

### 설정 (config.yaml)
```yaml
model_list:
  - model_name: planner
    litellm_params:
      model: claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: coder
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: local-fast
    litellm_params:
      model: ollama/qwen2.5-coder:7b
      api_base: http://localhost:11434

  - model_name: local-strong
    litellm_params:
      model: ollama/qwen2.5-coder:14b
      api_base: http://localhost:11434

  - model_name: openrouter-fallback
    litellm_params:
      model: openrouter/anthropic/claude-3.5-sonnet
      api_key: os.environ/OPENROUTER_API_KEY

router_settings:
  routing_strategy: "usage-based-routing"
  enable_pre_call_checks: true

general_settings:
  master_key: "sk-your-key"

litellm_settings:
  drop_params: true
  set_verbose: false
```

### 실행
```bash
litellm --config config.yaml --port 4000
```

## Phase 3: OpenRouter 백업

### 가입
https://openrouter.ai → API Key 발급

### 환경변수
```bash
export OPENROUTER_API_KEY="sk-or-..."
```

### Provider 우선순위 (OpenRouter 설정)
```json
{
  "provider": {
    "order": ["Anthropic", "AWS Bedrock", "Google"],
    "allow_fallbacks": true
  }
}
```

## Phase 4: Claude Code 연결

### 방법 A: 환경변수 (단순)
```bash
export ANTHROPIC_API_KEY="your-key"
export ANTHROPIC_BASE_URL="http://localhost:4000"  # LiteLLM 프록시
```

### 방법 B: Claude Code Router (권장)
```bash
# https://github.com/musistudio/claude-code-router
npm install -g claude-code-router
claude-code-router config  # 설정
```

## Phase 5: 모니터링

### 간단: LiteLLM 내장
```bash
litellm --config config.yaml --port 4000 --detailed_debug
# http://localhost:4000/ui 에서 usage 확인
```

### 고급: OpenTelemetry + Grafana
```yaml
# config.yaml 추가
litellm_settings:
  success_callback: ["otel"]
  otel_exporter: "otlp"
  otel_endpoint: "http://localhost:4318"
```

## 오버클럭 방지

### 1. 동시성 제한
```yaml
# LiteLLM config
router_settings:
  num_retries: 1
  timeout: 60
  max_parallel_requests: 2  # 동시 요청 제한
```

### 2. 모델 크기 제한
- 동시 실행: 큰 모델 1개 + 작은 모델 1개
- 32B 모델은 단독 실행

### 3. 토큰 예산
```yaml
litellm_settings:
  max_budget: 10.0  # 일일 $10 상한
  budget_duration: "1d"
```

### 4. 자동 강등
```python
# 커스텀 라우팅 규칙 (고급)
if system_load > 80:
    route_to = "local-fast"  # 14B → 7B 강등
```

### 5. Mac 열관리
```bash
# 활동 모니터링 (별도 터미널)
while true; do
  CPU=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | tr -d '%')
  if (( $(echo "$CPU > 90" | bc -l) )); then
    echo "⚠️ CPU $CPU% - 작업 대기 권장"
  fi
  sleep 30
done
```

## 운영 규칙

### 모델 선택 기준
| 조건 | 선택 |
|------|------|
| "설계/기획/복잡한 판단" 포함 | → Opus |
| "수정/요약/정리/테스트" | → Local 우선 |
| Local 실패 1회 | → Mid Cloud |
| Mid 실패 1회 | → Opus |
| Anthropic 한도 경고 | → OpenRouter |

### 병렬 세션 제한
- Planner: 1개
- Worker: 1개
- Batch: 1개 (백그라운드)
- **총 동시 3개 이하**

### 에스컬레이션 타임아웃
- Local: 30초
- Mid: 60초
- Opus: 120초

## 체크리스트

### Phase 1: Ollama
- [x] `brew install ollama` — ✅ 0.23.1 설치됨
- [x] `ollama pull qwen2.5-coder:7b` — ✅ 32b 설치됨 (더 강력)
- [x] `ollama pull qwen2.5-coder:14b` — ✅ 32b로 대체
- [x] `ollama serve` 확인 — ✅ 실행 중

### Phase 2: LiteLLM
- [ ] `pipx install litellm` — Homebrew 권한 복구 필요
- [x] config.yaml 작성 — ✅ `scripts/multi-model/litellm-config.yaml`
- [ ] `litellm --config config.yaml` 실행 확인

### Phase 3: OpenRouter
- [ ] 계정 생성 및 API Key 발급
- [ ] 환경변수 설정
- [ ] fallback 테스트

### Phase 4: 연결
- [ ] Claude Code → LiteLLM 프록시 연결
- [ ] 라우팅 규칙 테스트

### Phase 5: 모니터링
- [ ] usage 대시보드 확인
- [x] 예산 상한 설정 — ✅ config에 $10/day

## 예상 효과

| 지표 | Before | After (예상) |
|------|--------|--------------|
| Opus 사용률 | 100% | 20-30% |
| 토큰 비용 | 기준 | -50~70% |
| 한도 도달 빈도 | 높음 | 낮음 |
| 처리량 | 기준 | 2-3x |

## 참고 자료

- [LiteLLM Docs](https://docs.litellm.ai/)
- [Ollama Docs](https://ollama.ai/)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Claude Code Router](https://github.com/musistudio/claude-code-router)
