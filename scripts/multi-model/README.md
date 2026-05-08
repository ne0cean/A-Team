# Multi-Model Router

로컬 모델 + 클라우드 모델을 자동 라우팅하여 비용 최적화.

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 요청                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              /auto 또는 Claude 자동 판정                 │
│  - High: Opus (메인)                                    │
│  - Medium: Sonnet (서브에이전트)                         │
│  - Low: Ollama (MCP) → Haiku (fallback)                 │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Ollama      │   │ Anthropic   │   │ OpenRouter  │
│ (localhost) │   │ (direct)    │   │ (fallback)  │
│ 비용: $0    │   │ 비용: $$    │   │ 비용: $     │
└─────────────┘   └─────────────┘   └─────────────┘
```

## 빠른 시작

```bash
# 1. 설치 (1회)
bash ~/Projects/a-team/scripts/multi-model/install.sh

# 2. 환경변수 설정
vim ~/.ateam/multi-model.env
source ~/.ateam/multi-model.env

# 3. 시작
bash ~/Projects/a-team/scripts/multi-model/start.sh

# 4. 상태 확인
bash ~/Projects/a-team/scripts/multi-model/status.sh
```

## MCP 등록 (Claude Code 통합)

`~/.claude/settings.json`에 추가:

```json
{
  "mcpServers": {
    "local-model": {
      "command": "node",
      "args": ["/Users/noir/Projects/a-team/scripts/multi-model/mcp-local-model.mjs"]
    }
  }
}
```

## 사용법

### 자동 (/auto 스킬)

```bash
/auto 이 로그 요약해     # → Ollama (Low)
/auto 버그 고쳐          # → Sonnet (Medium)
/auto 아키텍처 설계      # → Opus (High)
```

### 명시적 (MCP 직접 호출)

Claude 세션에서:
```
로컬 모델로 이 코드 리뷰해줘
→ mcp__local-model__ask_local 자동 호출
```

또는 명시적으로:
```
mcp__local-model__local_status 로 Ollama 상태 확인해
```

## 파일 구조

```
scripts/multi-model/
├── install.sh              # 전체 설치 스크립트
├── start.sh                # 서비스 시작
├── stop.sh                 # 서비스 정지
├── status.sh               # 상태 확인
├── mcp-local-model.mjs     # MCP 서버 (Ollama 연결)
├── claude-integration.md   # Claude Code 통합 가이드
├── README.md               # 이 파일
└── config/
    └── litellm-config.yaml # LiteLLM 라우터 설정
```

## 모델별 용도

| 모델 | 크기 | 용도 | 비용 |
|------|------|------|------|
| qwen2.5-coder:7b | 4GB | 요약, 포맷, 단순 수정 | $0 |
| qwen2.5-coder:14b | 8GB | 코딩, 분석 | $0 |
| qwen2.5-coder:32b | 20GB | 복잡한 코딩 (선택) | $0 |
| claude-3.5-sonnet | - | 구현, 버그 수정 | $$ |
| claude-3-opus | - | 설계, 전략 | $$$ |

## Fallback 체인

```
Ollama 실패 → Haiku
Haiku 실패 → Sonnet
Anthropic 한도 → OpenRouter
```

## 문제 해결

| 문제 | 해결 |
|------|------|
| "Ollama not reachable" | `ollama serve` 실행 |
| "Model not found" | `ollama pull qwen2.5-coder:7b` |
| LiteLLM 연결 실패 | `bash scripts/multi-model/start.sh` |
| MCP 응답 없음 | settings.json 확인 + Claude 재시작 |

## 비용 절감 효과

| 작업 유형 | Opus 직접 | Multi-Model | 절감 |
|-----------|-----------|-------------|------|
| 로그 분석 | $0.15 | $0 (Ollama) | **100%** |
| 코드 요약 | $0.15 | $0 (Ollama) | **100%** |
| 버그 수정 | $0.50 | $0.15 (Sonnet) | **70%** |
| 아키텍처 | $1.00 | $1.00 (Opus) | 0% |

예상 월간 절감: **50-70%** (작업 패턴에 따라)

## 관련 문서

- [LiteLLM Docs](https://docs.litellm.ai/)
- [Ollama Docs](https://ollama.ai/)
- [MCP Protocol](https://modelcontextprotocol.io/)
