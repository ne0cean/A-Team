#!/bin/bash
# vibe-toolkit: Context Packager for AI Handoff
# ---------------------------------------------
# 이 스크립트는 현재 프로젝트의 핵심 맥락을 하나의 텍스트 파일로 묶어줍니다.
# 모델 사용량이 소진되어 다른 AI(CLI, Web UI 등)로 전환할 때 
# 이 출력물을 복사하여 붙여넣으면 즉시 맥락 복구가 가능합니다.

OUTPUT_FILE=".context/HANDOFF_PROMPT.txt"

echo "📦 Context Packaging 시작..."

{
  echo "당신은 현재 프로젝트의 맥락을 이어받은 AI 전문 개발자 에이전트입니다."
  echo "아래의 현재 작업 상태와 규칙을 읽고 작업을 계속해 주세요."
  echo ""
  echo "### 1. 현재 작업 현황 (CURRENT.md)"
  cat .context/CURRENT.md
  echo ""
  echo "### 2. 프로젝트 아키텍처 (ARCHITECTURE.md)"
  cat .context/ARCHITECTURE.md
  echo ""
  echo "### 3. 마지막 세션 로그 (SESSIONS.md)"
  tail -n 20 .context/SESSIONS.md
  echo ""
  echo "### 4. 핵심 규칙 (Meta-Rules)"
  cat .agent/rules/vibe-rules.md
  echo ""
  echo "---"
  echo "위 내용을 숙지했다면, CURRENT.md에 정의된 '다음 할 일' 중 첫 번째 항목을 분석하고 진행 방향을 제시해 주세요."
} > "$OUTPUT_FILE"

echo "✅ 패키징 완료: $OUTPUT_FILE"
echo "💡 다른 AI 모델에 이 파일의 내용을 복사해서 전달하면 맥락이 완벽히 이어집니다."
