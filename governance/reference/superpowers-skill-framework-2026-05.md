# Superpowers — Composable Skill Framework

> 출처: https://aitoolly.com/ai-news/article/2026-05-15-superpowers-a-new-composable-skill-framework-and-methodology-for-ai-programming-agents
> GitHub: github.com/obra/superpowers (trending 2026-05-15)
> 수집일: 2026-05-16

## 개요

'obra' (Jesse Vincent)가 만든 오픈소스 Claude Code 스킬 프레임워크.
AI 프로그래밍 에이전트를 위한 **모듈형 스킬 조합** 방법론.

## 핵심 개념

### 1. Composable Skills (조합 가능한 스킬)
- 단일 모놀리식 프롬프트 대신 **재사용 가능한 이산 스킬 라이브러리** 구축.
- 각 스킬은 독립적으로 작동하며, 프로젝트 요구사항에 따라 조합.
- A-Team의 `.claude/commands/` 구조와 동일한 방향성 — 이미 이 패턴 채택 중.

### 2. Initial Instructions (초기 지시)
- 에이전트 행동을 시작부터 구조화된 가이드라인으로 방향 설정.
- A-Team의 `CLAUDE.md` + 거버넌스 규칙 레이어와 동일한 개념.

### 3. Task-Specific Configuration
- 특정 SDLC 태스크에 맞춤형 역량 제공.
- A-Team의 역할별 에이전트 (researcher.md, designer.md 등)와 일치.

## A-Team 현황 비교

| Superpowers 개념 | A-Team 현재 구현 | 갭 |
|-----------------|-----------------|-----|
| Composable Skills | `/` 커맨드 53개+ | 없음 |
| Initial Instructions | CLAUDE.md 거버넌스 | 없음 |
| Agent Library | `.claude/agents/` | 없음 |
| Skill Recipes | `recipe-` prefix 패턴 | 미채택 |

## 적용 가능한 패턴

### recipe- prefix 네이밍 컨벤션
Superpowers는 커맨드에 `recipe-` prefix를 사용해 지식 스킬과 실행 레시피를 구분.
탭 자동완성으로 `/recipe-` 입력 시 모든 실행형 커맨드 목록 표시.

**A-Team 적용 검토**: 현재 커맨드 네이밍은 혼재. 실행형 vs 정보형 분리 기준 정의 가능.
→ YELLOW 검토 사항 (커맨드 구조 변경이므로 의장 승인 필요).

## 결론

A-Team은 이미 Superpowers와 동일한 철학을 독립적으로 구현 중.
차별점은 A-Team이 **인프라 레이어 (analytics, anomaly detection, roadmap)** 를 추가로 보유.
Superpowers의 `recipe-` prefix 패턴은 향후 커맨드 정리 시 참고할 만한 UX 패턴.
