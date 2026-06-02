---
name: dashboard-prd
description: 대시보드 PRD 대화형 생성. "대시보드 PRD", "대시보드 기획", "대시보드 설계", "dashboard PRD" 등을 언급하면 자동 실행.
argument-hint: [프로젝트명]
context: fork
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

> Analytics: `node scripts/log-event.mjs command_start name=dashboard-prd` — 실행 시작 시 반드시 호출

# Dashboard PRD Generator

> **Deprecated**: `/prd`로 통합됨. `/prd $ARGUMENTS` 실행.

`/prd $ARGUMENTS` 를 실행하세요. 가치 검증 + 대시보드 PRD를 한 번에 진행합니다.
