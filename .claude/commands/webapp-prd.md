---
name: webapp-prd
description: 본인의 니즈에 맞는 웹앱 PRD 대화형 생성. "웹앱 PRD", "웹앱 기획", "앱 설계", "webapp PRD", "웹앱 만들고 싶어" 등을 언급하면 자동 실행.
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

> Analytics: `node scripts/log-event.mjs command_start name=webapp-prd` — 실행 시작 시 반드시 호출

# Web Application PRD Generator

> **Deprecated**: `/prd`로 통합됨. `/prd $ARGUMENTS` 실행.

`/prd $ARGUMENTS` 를 실행하세요. 가치 검증 + 웹앱 PRD를 한 번에 진행합니다.
