---
description: [Turbo] 세션 시작 및 자율 모드 활성화 (One-Stop Start)
---

# Vibe Global Start (Autonomous Mode)

> **자동화**: SessionStart 훅이 새 세션/재개 시 컨텍스트를 자동 주입합니다.
> `/vibe` 수동 실행은 태스크 재분류 또는 컨텍스트 강제 리로드 시에만 필요.

// turbo-all
1. **Context Loading** (SessionStart 훅 자동): CURRENT.md + DECISIONS.md + git status + 리서치 노트
2. **Task Classification**: Next Tasks → Opus/Gemini 분류 → GEMINI_TASKS.md 갱신
3. **Model Recommendation**: 태스크 유형별 추천 모델 안내 (opus/sonnet/haiku)
4. **Execution Mode**: 에이전트 수 분석 → 🟢 단일 / 🟡 A-Team / 🔴 디스패치 / 🟣 MoA
5. **Autonomous Activation**: turbo-auto 규칙 활성화
6. **Immediate Action**: 선택된 모드 + 모델로 최우선 Opus 태스크 즉시 실행
