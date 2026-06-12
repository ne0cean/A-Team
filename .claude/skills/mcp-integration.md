---
name: mcp-integration
description: MCP 서버 통합 패턴 — Telegram 봇, MCP 도구 사용, 권한 설정
tags: [mcp, telegram, bot, integration, tools]
---

# MCP Integration

## 언제 사용

- Telegram 봇 응답 처리 시
- MCP 서버 도구를 Claude Code에서 사용할 때
- MCP 권한 설정 변경 시

## 패턴

### Telegram 봇 응답 규칙

Telegram MCP 사용 시 `reply` 도구만 사용:

```
규칙:
- sendMessage 대신 reply 도구 사용 (스레드 유지)
- 검색 결과: MeiliSearch 우선 → DDG → Groq 종합
- ?키워드 트리거 → MeiliSearch + DDG + Groq 70B 파이프라인
- 응답 길이 제한: Telegram 4096자
```

### MCP 도구 사용 패턴

```javascript
// 설정 파일: .claude/settings.json
{
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["mcp-servers/telegram/index.mjs"],
      "permissions": ["reply", "getUpdates"]
    }
  }
}
```

### 권한 설정 방법

권한 거부 시 추측 금지 → `.claude/settings.json` 먼저 확인:

```bash
# 현재 MCP 권한 확인
cat /Users/noir/Projects/a-team/.claude/settings.json | jq '.mcpServers'
```

권한 수정은 사용자가 IDE에서 직접 수정 선호.
Edit 거부 시 → 코드 블록으로 제공.

### MCP 서버 상태 확인

```bash
# MeiliSearch 상태
curl http://localhost:7700/health

# Telegram MCP 연결 확인
node scripts/test-telegram-mcp.mjs
```

### Cortex 검색 파이프라인

```
?키워드 입력
→ MeiliSearch (port 7700, 1641개 문서)
→ DDG 웹 검색 (fallback)
→ Groq 70B 종합
→ Telegram reply
```

## 주의사항

- MCP 과다 설치 = 전체 작업이 Dumb Zone에서 진행 (context-engineering.md 참조)
- 코드·보안·설계는 Anthropic 모델만, 요약/번역/포맷은 `llm` CLI (Groq 70B 무료)
- MCP 서버 새로 추가 시 `settings.json` 수정 → 사용자 확인 후 진행
- `settings.json` 수정 시도 금지 → 코드 블록으로 제공
