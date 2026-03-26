# 05. 멀티 에이전트 MCP 서버 가이드

멀티 에이전트 구조에서 에이전트 능력을 확장하는 MCP 서버 선별 목록.
Anthropic이 2025년 12월 MCP를 Linux Foundation에 기증 후 OpenAI/Google도 채택 — 사실상 표준.

---

## 카테고리별 핵심 서버

### 오케스트레이션 / 에이전트 조율

| 서버 | 저장소 | 멀티 에이전트 활용 |
|------|--------|-------------------|
| **mcp-agent** | [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) | Anthropic "Building Effective Agents" 패턴 구현체. Orchestrator/Swarm/Router/Parallel 패턴, Temporal 기반 내구성 워크플로우 |
| **Network-AI** | [jovancoding/network-ai](https://github.com/jovancoding/network-ai) | 레이스 컨디션 안전 공유 블랙보드. 에이전트 스폰/종료, FSM 전환, 예산·토큰 관리, 감사 로그 (20+ 도구) |
| **Magg** | [sitbon/magg](https://github.com/sitbon/magg) | 메타-MCP 서버. LLM이 자율로 다른 MCP 서버를 발견/설치/조율 |
| **ruflo** | [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | Claude 전용 오케스트레이션. 멀티 에이전트 스웜, RAG 통합, Claude Code 네이티브 |

### 컨텍스트 최적화 ⭐ (A-Team 글로벌 설치 권장)

| 서버 | 설치 | 용도 |
|------|------|------|
| **context-mode** | `npm install -g context-mode` | 툴 출력을 SQLite FTS5에 샌드박스 격리 → 컨텍스트 98% 압축. 세션 30분 → 3시간 연장. BM25 검색. |

**전역 등록 (Windows)**:
```bash
npm install -g context-mode
npx context-mode doctor   # 진단
# .claude.json에 MCP 서버 수동 등록 (claude mcp add가 /c를 경로로 파싱하는 버그 있음)
node -e "
const fs = require('fs');
const p = require('os').homedir() + '/.claude.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
d.mcpServers = d.mcpServers || {};
d.mcpServers['context-mode'] = { type: 'stdio', command: 'cmd', args: ['/c', 'context-mode'], env: {} };
fs.writeFileSync(p, JSON.stringify(d, null, 2));
"
claude mcp list  # ✓ Connected 확인
```

**핵심 도구**: `ctx_execute`, `ctx_search`, `ctx_index`, `ctx_fetch_and_index`, `ctx_stats`
**CC Mirror와 시너지**: CC Mirror가 "무엇이 일어났는지" 추적 → Context Mode가 원본 데이터 컨텍스트 잠식 방지

---

### 메모리 / 지식 관리

| 서버 | 설치 | 용도 |
|------|------|------|
| **memory** (공식) | `npx -y @modelcontextprotocol/server-memory` | 지식 그래프 기반 영속 메모리. 세션 간 컨텍스트 유지 |
| **sequential-thinking** (공식) | `npx -y @modelcontextprotocol/server-sequential-thinking` | 단계적 사고 프로세스. 복잡한 문제 분해, 반복 정제 |
| **MAS Sequential Thinking** | [FradSer/mcp-server-mas-sequential-thinking](https://github.com/FradSer/mcp-server-mas-sequential-thinking) | Agno 프레임워크 기반 다중 전문 에이전트 순차 분석 |

### 코드 / 파일 시스템

| 서버 | 설치 | 용도 |
|------|------|------|
| **filesystem** (공식) | `npx -y @modelcontextprotocol/server-filesystem <path>` | 안전한 로컬 파일 I/O (허용 경로 제한) |
| **git** (공식) | `npx -y @modelcontextprotocol/server-git` | 저장소 읽기, diff, log |
| **github** (공식) | `npx -y @modelcontextprotocol/server-github` | 저장소 관리, 이슈, PR. 에이전트 자율 커밋 가능 |

### 브라우저 / 웹

| 서버 | 설치 | 용도 |
|------|------|------|
| **puppeteer** (공식) | `npx -y @modelcontextprotocol/server-puppeteer` | 브라우저 자동화, 스크린샷, JS 실행 |
| **fetch** (공식) | `npx -y @modelcontextprotocol/server-fetch` | 웹 콘텐츠 가져오기, HTML→Markdown 변환 |

### 데이터베이스

| 서버 | 설치 | 용도 |
|------|------|------|
| **postgres** (공식) | `npx -y @modelcontextprotocol/server-postgres <conn>` | DB 쿼리 실행, 스키마 탐색 |
| **sqlite** (공식) | `npx -y @modelcontextprotocol/server-sqlite <path>` | 로컬 SQLite + 비즈니스 인텔리전스 |

### 게이트웨이 / 엔터프라이즈

| 서버 | 특징 |
|------|------|
| **neurolink** ([juspay/neurolink](https://github.com/juspay/neurolink)) | 12개 공급자 / 100+ 모델 통합, HITL 워크플로우, 가드레일, 컨텍스트 요약 |
| **ultimate_mcp_server** ([Dicklesworthstone](https://github.com/Dicklesworthstone/ultimate_mcp_server)) | 다중 LLM 위임 + 브라우저 + 문서 처리 + 벡터 + 인지 메모리 통합 |

---

## 스택 추천 조합

### 최소 구성 (로컬 에이전트 2개)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### 풀 오케스트레이션 구성

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>" }
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

---

## 에이전트 역할별 MCP 배정

```
[Orchestrator Agent]  → memory + sequential-thinking + filesystem
[Code Agent A]        → filesystem + github + git
[Code Agent B]        → filesystem + github + git
[Research Agent]      → fetch + puppeteer + memory
[DB Agent]            → postgres / sqlite + filesystem
```

에이전트마다 필요한 MCP만 주면 컨텍스트 오버로드 방지.

---

## 참고 리소스

- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — 공식 저장소
- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — 커뮤니티 큐레이션
- [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) — 커뮤니티 큐레이션
- [mcpservers.org](https://mcpservers.org) — 디렉토리
- [claudemcp.org](https://www.claudemcp.org) — Claude 전용 디렉토리
