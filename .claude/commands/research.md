---
description: Cortex Research Gateway — 개인화+복리 검색. 퍼플렉시티 대신 여기로. 검색 과정·결과가 Cortex에 축적돼 다음 검색이 더 좋아진다.
---

> Analytics: `node scripts/log-event.mjs command_start name=research` — 실행 시작 시 반드시 호출

상세 플레이북: `.claude/skills/research/SKILL.md`

## 실행

1. Analytics 로깅(위)
2. 개인화 맥락 + 웹 결과 수집:
   ```bash
   npx tsx scripts/research/research.mjs --q="<사용자 질의>" --synth=raw --json
   ```
3. 출력의 grounding(사용자 프로필·과거 리서치·Cortex 노트)에 따라 **인용 포함 개인화 답을 직접 합성**한다. 일반론 금지 — 이 사용자 상황에 특화된 시사점.
4. `deposited`가 `✓`이면 이번 검색이 `.context/research/memory.jsonl`에 적립됨(복리). 다음 연관 검색이 이를 회상.

## 옵션
- `--dry-run`: Exa 없이 루프 검증(복리·개인화 동작 확인)
- `--synth=groq`: Groq `llm`로 자동 합성(스킬 모드보다 품질 낮음)
- 키 미설정 시: https://exa.ai 무료 발급 → `.env`에 `EXA_API_KEY=...` (`.gitignore` 등록됨)

핵심 로직: `lib/research-gateway.ts` · 데이터 보호: 기존 D1/메모리 덮어쓰기 없이 append만.
