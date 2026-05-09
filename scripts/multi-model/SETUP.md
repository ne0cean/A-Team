# Multi-Model Router 설정 가이드

## 현재 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Ollama 설치 + qwen2.5-coder | ✅ |
| 2 | LiteLLM Docker 프록시 | ✅ |
| 3 | Groq 무료 fallback | 🔄 API 키 필요 |
| 4 | Claude Code 연결 | ⏳ |
| 5 | 모니터링 + 예산 상한 | ⏳ |

---

## Phase 3: Groq 무료 API 설정

### 1. Groq API 키 발급 (무료)

1. https://console.groq.com 접속
2. Google/GitHub으로 로그인
3. API Keys → Create API Key
4. 키 복사 (gsk_로 시작)

### 2. 환경 변수 등록

```bash
# ~/.zshrc 에 추가
export GROQ_API_KEY="gsk_YOUR_KEY_HERE"

# 적용
source ~/.zshrc
```

### 3. LiteLLM 재시작

```bash
docker restart litellm
```

### 4. 테스트

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-ateam-litellm" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "groq-free",
    "messages": [{"role": "user", "content": "Hello, what model are you?"}]
  }'
```

---

## Groq 무료 티어 제한

| 모델 | RPM | TPM | RPD |
|------|-----|-----|-----|
| llama-3.3-70b-versatile | 30 | 6,000 | 14,400 |
| llama-3.1-8b-instant | 30 | 20,000 | 14,400 |

- RPM: Requests Per Minute
- TPM: Tokens Per Minute
- RPD: Requests Per Day

**권장 용도**: 요약, 분류, 간단한 코드 생성, 빠른 응답 필요 시

---

## 모델별 역할

| 모델명 | 용도 | 비용 |
|--------|------|------|
| `planner` | 설계/기획 | $3/M tok (Sonnet) |
| `coder` | 구현/수정 | $3/M tok (Sonnet) |
| `local-fast` | 요약/정리 | **$0** (Ollama 7B) |
| `local-strong` | 코딩 (오프라인) | **$0** (Ollama 32B) |
| `groq-free` | 빠른 추론 | **$0** (Llama 70B) |
| `groq-fast` | 초고속 응답 | **$0** (Llama 8B) |

---

## 트러블슈팅

### LiteLLM 컨테이너 로그 확인
```bash
docker logs litellm --tail 50
```

### Ollama 상태 확인
```bash
ollama list
curl http://localhost:11434/api/tags
```

### 포트 충돌 시
```bash
lsof -i :4000
docker stop litellm && docker rm litellm
# 위 docker run 명령 재실행
```
