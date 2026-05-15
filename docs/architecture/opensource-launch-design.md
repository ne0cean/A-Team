# A-Team 오픈소스 런칭 설계 결정 (ADR)

**작성일**: 2026-05-15
**상태**: PROPOSED
**작성자**: Architect Agent

---

## 배경

A-Team은 1인 + AI 팀이 대기업 수준의 마케팅/디자인/QA/분석을 대체하는 글로벌 툴킷이다.
현재 비공개 운영 중이며, 이사회 결의(2026-05-13)로 "제품 출시" 가 High Priority로 지정됐다.
SuperClaude(22.8k stars), BMAD(47k stars), spec-kit(90k stars)가 이미 시장을 선점한 상황에서
A-Team만의 차별화 전략과 런칭 형태를 결정해야 한다.

---

## 현재 코드베이스 분석

### 규모

```
.claude/commands/    71개 슬래시 커맨드
.claude/agents/      29개 서브에이전트
governance/          규칙/워크플로우/스킬 레이어 (~80개 파일)
lib/                 29개 TypeScript 모듈 (530+ 테스트 PASS)
scripts/             29개 자동화 스크립트 (.mjs + .sh)
templates/           프로젝트 스캐폴드 + 법률 문서 + 훅
```

### 핵심 인프라 (공개 가치가 높은 것)

| 레이어 | 내용 | 공개 적합성 |
|--------|------|------------|
| 슬래시 커맨드 | /vibe, /pickup, /end, /zzz, /blueprint, /intel, /board 등 | 높음 |
| 서브에이전트 | orchestrator, coder, reviewer, architect, designer, cso 등 | 높음 |
| 훅 시스템 | PreToolUse/PostToolUse/Stop 자동화 hooks | 높음 (차별점) |
| lib/ TypeScript | circuit-breaker, analytics, gap-sensor, quality-gate 등 | 중간 |
| governance/ | 규칙/워크플로우/스킬 (내부 운영 규범 포함) | 선별 필요 |
| scripts/ | 자동화 유틸리티 (일부 개인 종속) | 선별 필요 |
| templates/ | 프로젝트 스캐폴드, 법률 문서 | 높음 |

### 내부 전용 (공개 제외 대상)

```
.context/            — 개인 세션 상태 (CURRENT.md, SESSIONS.md, 인텔 데이터)
.intel/              — 개인 경쟁사 데이터
.autoresearch/       — 개인 실험 로그
content/             — 개인 마케팅 콘텐츠 초안
scripts/auto-switch/ — OAuth 계정 자동 전환 (개인 계정 종속)
governance/rules/auto-switch-protocol.md — 동상
lib/capability-map.json — 개인 역량 현황 데이터
```

---

## 요구사항

### 기능적
- Claude Code 사용자가 A-Team을 자신의 프로젝트에 설치할 수 있어야 한다
- 설치 후 /vibe, /pickup, /end 등 핵심 커맨드가 즉시 작동해야 한다
- 기존 프로젝트에 침투적이지 않아야 한다 (기존 CLAUDE.md 손상 금지)
- 커스터마이징이 가능해야 한다 (전체 복사본이 아닌 선택적 설치)

### 비기능적
- 설치 복잡도 최소화 (한 줄 설치 이상적)
- 의존성 최소화 (node_modules 없이 동작 가능해야 함)
- Claude Code SDK 버전 독립성 (마크다운 기반이라 자연스럽게 충족)
- 문서가 코드와 동일한 파일 (마크다운 = 실행 단위)

---

## 옵션 분석

### Option 1: CLAUDE.md + Commands + Agents 패키지 (SuperClaude 방식)

```
배포 방식: git clone / curl 한 줄 설치
구조:
  install.sh → ~/.claude/commands/ 에 커맨드 복사
             → CLAUDE.md 에 거버넌스 규칙 주입
```

**장점**
- 구현 복잡도 낮음 (현재 구조 그대로 공개)
- Claude Code 사용자가 즉시 이해 가능 (마크다운)
- SuperClaude가 검증한 시장 수요 (22.8k stars)
- 업데이트 = git pull (단순)
- lib/TypeScript 모듈 공개 불필요 (마케팅 커맨드만으로도 충분)

**단점**
- SuperClaude와 포지셔닝 겹침 위험
- 단순 커맨드 모음으로 인식될 수 있음 (깊이 미전달)
- 71개 커맨드 전체 공개 시 압도감 (UX 문제)

**구현 난이도**: 낮음
**시간 추정**: 1-2일 (정리 + README + install.sh)
**복잡도**: low

---

### Option 2: CLI 도구 (npm install -g a-team)

```
배포 방식: npm publish
구조:
  a-team init          → 프로젝트 초기화
  a-team add <cmd>     → 커맨드 선택 설치
  a-team update        → 업데이트
```

**장점**
- 전문적 인상 (CLI 도구 = 진지한 제품)
- 버전 관리 체계 (semver)
- 선택적 설치 가능 (a-team add marketing)

**단점**
- 구현 복잡도 높음 (CLI 빌드 + npm 배포 파이프라인)
- A-Team의 핵심(마크다운 커맨드)을 CLI로 래핑하는 것은 불필요한 추상화
- Claude Code 훅이 CLI와 충돌 가능성
- node.js 의존성 강제 (일부 사용자 마찰)
- 유지보수 부담 증가

**구현 난이도**: 높음
**시간 추정**: 1-2주
**복잡도**: high

---

### Option 3: 프로젝트 스캐폴더 (npx create-a-team)

```
배포 방식: npx
구조:
  npx create-a-team my-project
  → 새 프로젝트 디렉토리 생성 + A-Team 설치
```

**장점**
- 새 프로젝트 시작 시 최고의 경험
- create-react-app 패턴 (익숙)
- 첫 경험에서 완전한 셋업 가능

**단점**
- 기존 프로젝트에 추가 불가 (신규 프로젝트 전용)
- 실제 사용자의 대다수는 기존 프로젝트에 추가를 원함
- Option 2와 동일한 구현 복잡도
- templates/init.sh 가 이미 이 역할을 함

**구현 난이도**: 높음
**시간 추정**: 1주
**복잡도**: high

---

### Option 4: SaaS (웹 대시보드 + API)

```
배포 방식: 웹 서비스
구조:
  app.a-team.dev → 대시보드
  API → Claude Code와 연동
```

**장점**
- 수익 모델 직접 연결
- 데이터 수집 가능 (사용 패턴)

**단점**
- 구현 복잡도 매우 높음
- A-Team의 가치(로컬 에이전트 자율화)와 SaaS 모델 불일치
- 이사회 결의 "인프라 모라토리엄" 위반 리스크
- MVP 이전에 과도한 투자

**구현 난이도**: 매우 높음
**시간 추정**: 2-3개월
**복잡도**: high

---

## 권장안

### Option 1 — CLAUDE.md + Commands + Agents 패키지 (변형)

단, 단순 복사본이 아닌 **계층형 설치 구조**로 차별화한다.

**선택 이유**

1. 현재 구조가 이미 배포 가능한 형태다. install-commands.sh가 존재하고, templates/init.sh 가 스캐폴딩을 담당한다. 신규 추상화 없이 정리만으로 런칭 가능하다.

2. SuperClaude와의 차별점이 "커맨드 수"가 아니라 "인프라 레이어"에 있다. SuperClaude에는 없는 것: 훅 시스템(PreToolUse/PostToolUse), analytics, anomaly detection, circuit-breaker, growth engine, 자율 루프(/zzz). 이것을 전면에 내세운다.

3. YAGNI 원칙. CLI나 SaaS는 지금 필요하지 않다. 커맨드 패키지로 시작해서 수요를 확인한 후 확장한다.

**수용한 트레이드오프**
- SuperClaude와 표면적 유사성 → "AI 운영체제" 포지셔닝으로 차별화
- 71개 커맨드 전체 공개의 압도감 → 진입 계층 구분으로 해소

---

## 핵심 가치 제안 (Value Prop)

### 경쟁사 분석

| | SuperClaude | BMAD | spec-kit | A-Team |
|--|------------|------|----------|--------|
| 핵심 | Claude Code 강화 커맨드 | Agile LLM 개발 방법론 | 스펙 주도 개발 | AI 운영 인프라 |
| 훅 시스템 | 없음 | 없음 | 없음 | PreToolUse/PostToolUse |
| 자율 루프 | 없음 | 없음 | 없음 | /zzz + growth-engine |
| Analytics | 없음 | 없음 | 없음 | anomaly detect + weekly report |
| 에이전트 수 | ~10 | ~5 | ~3 | 29 |
| 테스트 | 없음 | 없음 | 없음 | 530 PASS |

### "왜 A-Team이어야 하는가" — 한 줄

> **"커맨드 모음이 아닌 AI 운영 인프라 — 수면 중에도 팀이 돌아간다."**

SuperClaude/BMAD는 "Claude를 더 잘 쓰는 방법"이다.
A-Team은 "Claude가 스스로 성장하고 운영되는 시스템"이다.
유일한 차별점: 자율 루프(/zzz) + 자가 성장 엔진(growth-engine) + 운영 인프라(analytics/anomaly).

---

## MVP 범위

### Must-Have (런칭 시 포함)

**Tier 1 — 핵심 워크플로우 (즉시 가치)**
```
커맨드: /vibe, /pickup, /end, /zzz, /blueprint, /review, /ship, /prd
에이전트: orchestrator, coder, reviewer, architect, researcher, qa
훅: settings.json (PreToolUse/PostToolUse 템플릿)
```

**Tier 2 — 마케팅/인텔리전스 (차별화)**
```
커맨드: /intel, /insights, /board, /daily-brief, /marketing-generate
에이전트: intel-analyzer, insights, growth-engine, daily-brief
```

**Tier 3 — 품질/보안 (신뢰)**
```
커맨드: /cso, /adversarial, /tdd, /investigate
에이전트: cso, adversarial, design-auditor, guardrail
```

**인프라**
```
scripts/install-commands.sh  (개인 경로 제거 후 범용화)
templates/init.sh            (기존 프로젝트 onboarding)
templates/settings.json      (훅 템플릿)
governance/rules/            (핵심 규칙 선별 공개)
```

### Nice-to-Have (런칭 후)

```
lib/ TypeScript 모듈 (analytics, circuit-breaker 등)
scripts/anomaly-detect.mjs, weekly-report.mjs
PPT 엔진 (scripts/ppt/)
Autoresearch 시스템
Multi-model router 설계
```

### 제외 (내부 전용 — 절대 공개 금지)

```
.context/                    개인 세션 상태
.intel/                      개인 경쟁사 데이터
.autoresearch/               개인 실험 로그
content/                     개인 마케팅 초안
scripts/auto-switch/         개인 OAuth 계정 전환
governance/rules/auto-switch-protocol.md
lib/capability-map.json      개인 역량 현황
.context/designs/            내부 설계 메모
docs/research/               내부 리서치
```

---

## 패키징 구조 제안

```
a-team/                          (GitHub 공개 레포)
├── README.md                    (설치 가이드 + 가치 제안)
├── install.sh                   (한 줄 설치 스크립트)
│
├── .claude/
│   ├── commands/                (71개 → 공개용 선별 ~50개)
│   │   ├── core/                [NEW] 계층 분리
│   │   │   ├── vibe.md
│   │   │   ├── pickup.md
│   │   │   ├── end.md
│   │   │   └── zzz.md
│   │   ├── dev/
│   │   │   ├── blueprint.md
│   │   │   ├── review.md
│   │   │   └── ship.md
│   │   ├── marketing/
│   │   │   ├── intel.md
│   │   │   └── marketing-generate.md
│   │   └── ops/
│   │       ├── board.md
│   │       └── insights.md
│   └── agents/
│       ├── orchestrator.md
│       ├── coder.md
│       ├── reviewer.md
│       └── ...
│
├── governance/
│   ├── rules/                   (개인 종속 규칙 제거 후 공개)
│   └── skills/                  (마케팅/디자인 스킬)
│
├── templates/
│   ├── init.sh                  (새 프로젝트 스캐폴딩)
│   ├── settings.json            (훅 설정 템플릿)
│   ├── CLAUDE.md.template       (프로젝트 거버넌스 템플릿)
│   └── legal/                   (법률 문서)
│
├── lib/                         (Nice-to-have, Phase 2 공개)
│   ├── analytics.ts
│   ├── circuit-breaker.ts
│   └── ...
│
└── docs/
    ├── getting-started.md
    ├── commands-reference.md
    └── architecture/
```

### 설치 방법 (3단계)

```bash
# 방법 1: 새 프로젝트
git clone https://github.com/[org]/a-team
bash a-team/templates/init.sh my-project ./a-team

# 방법 2: 기존 프로젝트에 추가
curl -fsSL https://raw.githubusercontent.com/[org]/a-team/main/install.sh | bash

# 방법 3: 글로벌 커맨드만
bash install.sh --commands-only
```

### 커스터마이징

```bash
# 선택적 설치 (기존 install-commands.sh 확장)
bash install.sh --tier core           # 핵심 4개만
bash install.sh --tier dev            # 개발 워크플로우
bash install.sh --tier full           # 전체
bash install.sh --add marketing       # 카테고리 추가

# 프로젝트별 오버라이드
# .claude/commands/custom/ → 기존 커맨드보다 우선 적용
```

---

## 이름/포지셔닝

### "A-Team" 이름 유지 권장

변경 불필요. 이유:
1. GitHub 레포 이미 존재 (ne0cean/A-Team)
2. 에이전트 팀 개념을 직관적으로 전달
3. SuperClaude/BMAD와 명확히 다른 네이밍 공간

단, GitHub org를 `ne0cean`에서 제품 전용 org로 이전 검토 필요 (브랜드 분리).

### 태그라인 3개

**옵션 A (자율성 강조)**
> "The AI team that works while you sleep."
> 수면 중에도 돌아가는 AI 팀.

**옵션 B (인프라 강조)**
> "Not a prompt library. An AI operating system for your projects."
> 프롬프트 모음이 아니다. 프로젝트를 위한 AI 운영체제.

**옵션 C (결과 강조)**
> "Enterprise-grade marketing, design, and QA. Team size: 1."
> 대기업급 마케팅/디자인/QA. 팀원 수: 1명.

권장: **옵션 A** (가장 기억에 남고, /zzz 기능과 직결, 경쟁사가 없는 포지션).

---

## 구현 가이드 (Coder 착수 기준)

### Phase 1 — 정리 및 분리 (1일)

**목표**: 공개용 레포를 만들기 위한 내부/외부 분리

수정 파일:
- `.gitignore` — 내부 전용 디렉토리 추가 (.context/, .intel/, .autoresearch/, content/, scripts/auto-switch/)
- `scripts/install-commands.sh` — 하드코딩된 `~/Projects/a-team` 경로 제거, 상대 경로로 범용화

생성 파일:
- `install.sh` — curl 한 줄 설치 지원 (글로벌 커맨드 + init 선택)
- `.github/workflows/ci.yml` — 이미 존재하므로 확인 후 퍼블릭 레포 맞게 조정

agent: coder

### Phase 2 — README + 문서 (1일)

**목표**: 첫 방문자가 5분 안에 설치 완료

생성 파일:
- `README.md` — 가치 제안 + 설치 가이드 + 커맨드 카테고리 + 스크린샷
- `docs/getting-started.md` — 상세 설치 가이드
- `docs/commands-reference.md` — 커맨드 전체 목록 + 설명

agent: coder (Haiku로 충분)

### Phase 3 — GitHub 준비 (0.5일)

**목표**: 오픈소스 표준 충족

생성 파일:
- `LICENSE` — MIT (이미 templates/legal/ 에 법률 문서 있음, 확인 필요)
- `CONTRIBUTING.md` — 기여 가이드
- `.github/ISSUE_TEMPLATE/` — 버그/기능 요청 템플릿

agent: coder

### Phase 4 — 런칭 (별도 세션)

**목표**: 첫 공개 + 초기 트래픽

작업:
- GitHub 레포 public 전환
- Postiz를 통한 소셜 발행 (Twitter/LinkedIn)
- Hacker News / Reddit r/ClaudeAI 포스팅
- 브랜딩 확정 (이사회 결의 대기 중)

agent: 사용자 직접 실행

---

## 리스크

1. **내부 데이터 유출 위험**: .context/, .intel/, .autoresearch/ 디렉토리가 실수로 공개될 수 있다. Phase 1에서 .gitignore 강화가 최우선이다.

2. **auto-switch 코드 공개 불가**: scripts/auto-switch/는 개인 OAuth 계정 정보와 결합되어 있다. 반드시 제외. 해당 기능을 README에서 언급할 때 "Pro 기능" 또는 "사용자 설정 필요"로 안내.

3. **71개 커맨드의 압도감**: 일반 사용자에게 71개는 과하다. 계층(Tier) 구조로 진입 장벽을 낮춘다. README에는 핵심 8개만 소개.

4. **BMAD/SuperClaude 사용자 전환 마찰**: 기존 사용자는 CLAUDE.md 충돌을 두려워한다. install.sh에 --dry-run 옵션과 기존 파일 백업 로직 필수.

5. **한국어 문서**: 현재 거의 모든 내부 문서가 한국어다. 공개용 README/docs는 영어로 작성해야 글로벌 접근 가능. 거버넌스 규칙 내부 주석은 번역 생략 가능.

---

## 성공 기준

- 설치 완료까지 10분 이내 (첫 사용자 기준)
- GitHub stars 첫 달 100+
- install.sh 실행 오류율 0% (dry-run 포함 E2E 테스트)
- 내부 데이터 유출 0건
- 기여자 첫 PR 수령 (커뮤니티 시그널)
