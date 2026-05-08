#!/usr/bin/env bash
# Multi-Model Router 설치 스크립트
# Usage: bash scripts/multi-model/setup.sh

set -e

echo "=== Multi-Model Router Setup ==="

# Phase 1: Ollama
echo ""
echo "📦 Phase 1: Ollama"
if command -v ollama &>/dev/null; then
  echo "✅ Ollama 설치됨: $(ollama --version)"

  # 필요 모델 확인
  MODELS=$(ollama list 2>/dev/null || echo "")

  if echo "$MODELS" | grep -q "qwen2.5-coder"; then
    echo "✅ qwen2.5-coder 모델 존재"
  else
    echo "⏳ qwen2.5-coder 모델 다운로드..."
    ollama pull qwen2.5-coder:7b
    ollama pull qwen2.5-coder:14b
  fi

  # 서버 확인
  if curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo "✅ Ollama 서버 실행 중"
  else
    echo "⚠️  Ollama 서버 미실행. 시작: ollama serve"
  fi
else
  echo "❌ Ollama 미설치. 설치: brew install ollama"
  exit 1
fi

# Phase 2: LiteLLM
echo ""
echo "📦 Phase 2: LiteLLM"
if python3 -c "import litellm" 2>/dev/null; then
  echo "✅ LiteLLM 설치됨"
else
  echo "⚠️  LiteLLM 미설치. 설치:"
  echo "   pipx install litellm"
  echo "   또는: pip install --user litellm"
fi

# Phase 3: OpenRouter
echo ""
echo "📦 Phase 3: OpenRouter"
if [ -n "$OPENROUTER_API_KEY" ]; then
  echo "✅ OPENROUTER_API_KEY 설정됨"
else
  echo "⚠️  OPENROUTER_API_KEY 미설정"
  echo "   https://openrouter.ai → API Key 발급"
fi

# Config 확인
echo ""
echo "📄 설정 파일"
CONFIG_PATH="$(dirname "$0")/litellm-config.yaml"
if [ -f "$CONFIG_PATH" ]; then
  echo "✅ $CONFIG_PATH"
else
  echo "❌ 설정 파일 없음"
fi

echo ""
echo "=== 실행 방법 ==="
echo "litellm --config scripts/multi-model/litellm-config.yaml --port 4000"
echo ""
echo "=== Claude Code 연결 ==="
echo "export ANTHROPIC_BASE_URL=http://localhost:4000"
