# Growth Engine — 자율 성장 규칙

> A-Team이 스스로 최신 트렌드를 크롤링하고, 분석하고, 적용하는 자율 성장 엔진의 규칙.

## 크롤링 소스

### Tier 1: 핵심 (매일)
| 소스 | URL/방법 | 수집 대상 |
|------|----------|-----------|
| Claude Code Changelog | `gh release list -R anthropics/claude-code -L 5` | 새 기능, 브레이킹 체인지 |
| Anthropic Blog | WebSearch `site:anthropic.com/blog` | 모델 릴리즈, API 변경 |
| Claude Code GitHub Issues | `gh issue list -R anthropics/claude-code --label enhancement -L 10` | 커뮤니티 요청, 새 패턴 |
| 경쟁사 릴리즈 | `gh release list -R nickbaumann98/super-claude -L 3` 등 | 새 기능, 접근법 |

### Tier 2: 생태계 (주 2회)
| 소스 | 방법 | 수집 대상 |
|------|------|-----------|
| AI Agent 프레임워크 | WebSearch `AI agent framework 2026` | 새 패턴, 아키텍처 |
| Hacker News | WebSearch `site:news.ycombinator.com Claude Code OR AI agent` | 커뮤니티 반응 |
| GitHub Trending | WebSearch `github trending AI agent` | 떠오르는 도구 |
| Indie Hacker Tools | WebSearch `indie hacker AI automation tools` | 1인 기업 도구 |

### Tier 3: 전략 (주 1회)
| 소스 | 방법 | 수집 대상 |
|------|------|-----------|
| AI 코딩 도구 비교 | WebSearch `Cursor vs Windsurf vs Copilot 2026` | 시장 포지셔닝 |
| 마케팅 AI | WebSearch `marketing automation AI 2026` | 새 도구/접근법 |
| 디자인 AI | WebSearch `design AI tools Figma v0 2026` | 디자인 자동화 |

## 적용 안전 등급

### GREEN — 자동 적용 + 커밋

다음에 해당하면 에이전트가 **즉시 수정하고 커밋**:

1. **에이전트 프롬프트 개선** — 새로 발견된 베스트 프랙티스를 기존 에이전트에 반영
   - 조건: 기존 파일의 instruction/rule 추가/수정만. 구조 변경 없음.
   - 예: researcher.md에 새 검색 전략 추가, coder.md에 새 코딩 패턴 추가
2. **Watch topics 갱신** — daily-brief-collect.mjs의 ecosystem.watch_topics 업데이트
3. **경쟁사 정보 갱신** — stars, 새 기능, 버전 업데이트
4. **capability-map.json 갱신** — 새 모듈 추가 시 자동 반영
5. **문서 갱신** — CURRENT.md, capability-map 등 메타데이터 업데이트
6. **governance 참조 문서 추가** — `governance/reference/` 하위에 리서치 노트

커밋 포맷: `growth: [대상] — [변경 내용]`

### YELLOW — 브랜치 생성 + 의장 검토

다음에 해당하면 **growth/ 브랜치에 적용하고 의장에게 보고**:

1. **새 커맨드 추가** — 외부에서 발견한 유용한 패턴을 새 슬래시 커맨드로
2. **기존 커맨드 구조 변경** — Step 추가/삭제, 워크플로우 변경
3. **새 에이전트 추가** — 새 역할의 서브에이전트
4. **스크립트 수정** — 기존 동작 변경
5. **CLAUDE.md 규칙 변경** — 거버넌스 규칙 수정

브랜치: `growth/YYYY-MM-DD-[topic]`

### RED — 보고만 (적용 안 함)

1. **아키텍처 변경** — 디렉토리 구조, 의존성 트리, 빌드 파이프라인
2. **의존성 추가/제거** — npm install, pip install 등
3. **보안 관련** — 인증, 권한, API 키, 암호화
4. **외부 서비스 연결** — 새 API, 새 SaaS 통합
5. **이사회 결의 위반** — 인프라 모라토리엄 기간 중 새 모듈 빌드

## 적용 프로토콜

```
1. 크롤링 → findings[] 수집
2. 각 finding에 대해:
   a. 안전 등급 판정 (GREEN/YELLOW/RED)
   b. GREEN → 즉시 적용 + 커밋
   c. YELLOW → growth/ 브랜치 + 변경 + 커밋 (머지 안 함)
   d. RED → growth-log.jsonl에 기록만
3. 전체 결과 → .context/briefs/YYYY-MM-DD-growth.md 저장
4. 의장 보고:
   - GREEN N건 적용 완료
   - YELLOW M건 검토 대기 (branch: growth/...)
   - RED K건 관찰 기록
```

## 안전 장치

1. **테스트 게이트** — GREEN 적용 후 반드시 `npx vitest run` 실행. 실패 시 revert + YELLOW로 격상
2. **변경 상한** — 1일 GREEN 최대 5건. 초과 시 YELLOW로 격상
3. **롤백** — 모든 growth 커밋은 `growth:` prefix. `git revert` 가능
4. **이사회 결의 존중** — 인프라 모라토리엄 기간엔 GREEN도 문서 갱신만 허용
5. **자율 모드 규칙 준수** — `governance/rules/autonomous-loop.md` 강제 조항 전체 적용
