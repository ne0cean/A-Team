# Phase 1 Insights 에이전트 시스템 설계서

> 작성일: 2026-04-29
> 목적: Claude Code 구현 참조용 계획서

---

## 1. 작업 컨텍스트

### 배경 및 목적

A-Team Phase 0에서 구축한 analytics.jsonl 인프라가 모듈 사용 데이터를 수집하기 시작했다 (현재 40 events — design_audit 위주). 이 데이터를 그냥 쌓아두면 의미가 없다. Phase 1의 첫 과제는 **"쌓인 데이터에서 자동으로 인사이트를 추출해 다음 주 우선순위 결정에 반영"**하는 루프를 만드는 것이다.

이 에이전트는 매주 월요일 analytics.jsonl + friction-log.jsonl + capability-map.json을 읽고, 지난 주에 무슨 일이 있었는지 요약하고, 다음 주에 집중해야 할 것을 제안한다.

### 범위

- 포함:
  - analytics.jsonl 이벤트 집계 (모듈별 사용 횟수, 성공률, 점수 추이)
  - friction-log.jsonl 갭 빈도 집계
  - capability-map.json 커버리지 변화 감지
  - 주간 인사이트 마크다운 리포트 자동 생성
  - `/insights` 슬래시 커맨드 (수동 트리거)
  - launchd 주간 자동 실행 (매주 월요일 09:00 KST)
- 제외:
  - 외부 API 연결 (GA4, Mixpanel) — Phase 1.2 이후
  - 이상 감지 (Anomaly detection) — Phase 1.3
  - 인과 분석 (Causal analysis) — Phase 1.4
  - 슬랙/텔레그램 알림 — Phase 1.5 이후

### 입출력 정의

| 항목 | 내용 |
|------|------|
| **입력** | `.context/analytics.jsonl` (모듈 사용 이벤트), `.context/friction-log.jsonl` (갭 감지), `lib/capability-map.json` (커버리지%) |
| **출력** | `.context/insights/YYYY-WW-insights.md` (주간 리포트), `scripts/insights-aggregate.mjs` 실행 결과 JSON |
| **트리거** | 수동: `/insights`, 자동: launchd 매주 월요일 09:00 KST |

### 제약조건

- analytics.jsonl 이벤트 0건인 주는 "데이터 없음" 리포트 생성 (스킵 금지)
- 리포트 생성 비용: Sonnet 1회 호출 ≤ $0.05 (2000 토큰 이내 프롬프트)
- launchd 실행 시 인터랙티브 없음 — 에러 시 로그 + 종료
- 기존 analytics.jsonl 파싱 로직은 `lib/gap-sensor.ts` 패턴 재사용

### 용어 정의

| 용어 | 정의 |
|------|------|
| 주간 윈도우 | 월요일 00:00 ~ 일요일 23:59 KST |
| 인사이트 | 데이터 기반 관찰 사실 + 다음 행동 제안 1-3개 |
| 모듈 | analytics.jsonl의 `skill` 필드로 식별되는 단위 |
| 커버리지 변화 | capability-map.json의 coverage% 이전 주 대비 diff |

---

## 2. 워크플로우 정의

### 전체 흐름도

```
[트리거: /insights 또는 launchd]
        ↓
[Step 1: 데이터 수집 + 집계]  ← scripts/insights-aggregate.mjs
        ↓
  집계 결과 JSON (aggregate.json)
        ↓
[Step 2: 패턴 감지]  ← scripts/insights-aggregate.mjs (동일 스크립트 2단계)
        ↓
  패턴 플래그 JSON (patterns.json)
        ↓
[Step 3: 인사이트 생성]  ← insights 에이전트 (Sonnet)
        ↓
  마크다운 리포트
        ↓
[Step 4: 저장 + 요약 출력]  ← 스크립트
        ↓
[.context/insights/YYYY-WW-insights.md]
```

### LLM 판단 vs 코드 처리 구분

| LLM이 직접 수행 | 스크립트로 처리 |
|----------------|----------------|
| 이벤트 패턴의 의미 해석 ("A11y 위반이 늘었다 = 리뷰 프로세스 약화") | analytics.jsonl 파싱 + 집계 (이벤트 수, 평균 점수, 성공률) |
| 다음 주 우선순위 제안 (갭 빈도 + 커버리지 종합) | friction-log 빈도 카운트 |
| 리포트 자연어 서술 생성 | capability-map 커버리지 diff 계산 |
| 이상 패턴 서술 ("지난 주 대비 실패율 3배") | YYYY-WW 날짜 계산, 파일 I/O |

### 단계별 상세

#### Step 1: 데이터 수집 + 집계

- **처리 주체**: 스크립트 (`scripts/insights-aggregate.mjs`)
- **입력**: `.context/analytics.jsonl`, `.context/friction-log.jsonl`, `lib/capability-map.json`
- **처리 내용**:
  - 현재 주 범위 계산 (월~일 KST)
  - analytics.jsonl 필터링 → 모듈별 {count, avg_score, pass_rate, fail_count}
  - friction-log 필터링 → capability_path 별 빈도
  - capability-map coverage% snapshot
- **출력**: `{aggregate: {...}, friction: {...}, capability: {...}}` JSON (stdout)
- **성공 기준**: 모든 3개 소스 파싱 완료, JSON 유효
- **검증 방법**: JSON.parse 성공 확인, 필수 키 존재 검사
- **실패 시 처리**: 파일 없음 → 빈 배열로 계속 진행, JSON 파싱 실패 → 에러 로그 + 해당 소스 스킵

#### Step 2: 패턴 감지

- **처리 주체**: 스크립트 (`scripts/insights-aggregate.mjs` 내부 2단계)
- **입력**: Step 1 집계 JSON
- **처리 내용**:
  - 이전 주 인사이트 파일 로드 (있으면) → week-over-week diff
  - 패턴 플래그: `high_failure` (pass_rate < 0.5), `no_usage` (count == 0, 14일 이상), `coverage_drop` (coverage diff < -0.05)
- **출력**: 패턴 플래그 배열 포함 enhanced JSON
- **성공 기준**: 패턴 플래그 배열 존재 (빈 배열도 OK)
- **검증 방법**: 규칙 기반 (숫자 임계값 체크)
- **실패 시 처리**: 이전 주 파일 없음 → WoW diff 생략 + 현재 데이터만으로 진행

#### Step 3: 인사이트 생성

- **처리 주체**: insights 에이전트 (Sonnet, `.claude/agents/insights.md`)
- **입력**: Step 2 JSON (파일로 전달: `.context/insights/.tmp-aggregate.json`)
- **처리 내용**:
  - 집계 데이터 읽기
  - 관찰 사실 3-5개 도출 (숫자 기반)
  - 다음 주 우선순위 1-3개 제안 (gap-priority 순서 반영)
  - 마크다운 리포트 작성 (템플릿 준수)
- **출력**: 리포트 마크다운 문자열
- **성공 기준**: 관찰 ≥ 1개, 제안 ≥ 1개, 총 길이 200-1500자
- **검증 방법**: LLM 자기 검증 (생성 후 길이 + 필수 섹션 확인)
- **실패 시 처리**: 자동 재시도 1회 → 실패 시 "데이터 불충분 — 수동 확인 필요" 리포트 생성

#### Step 4: 저장 + 요약 출력

- **처리 주체**: 스크립트 (`scripts/insights-aggregate.mjs` 또는 에이전트 직접)
- **입력**: 인사이트 마크다운
- **처리 내용**:
  - `.context/insights/` 디렉토리 생성 (없으면)
  - `YYYY-WW-insights.md` 파일 저장
  - 임시 파일 (.tmp-aggregate.json) 삭제
  - 요약 3줄 stdout 출력 (launchd 로그용)
- **출력**: `.context/insights/YYYY-WW-insights.md`, stdout 요약
- **성공 기준**: 파일 존재 + 비어있지 않음
- **검증 방법**: 파일 존재 + wc -c > 0 확인
- **실패 시 처리**: 파일 쓰기 실패 → 에러 로그 (stdout에 리포트 출력해 유실 방지)

### 상태 전이

| 상태 | 전이 조건 | 다음 상태 |
|------|----------|----------|
| idle | `/insights` 호출 또는 launchd 트리거 | aggregating |
| aggregating | 집계 완료 | pattern_detecting |
| aggregating | 3개 소스 모두 빈 경우 | no_data (빈 리포트 생성 후 idle) |
| pattern_detecting | 패턴 감지 완료 | generating |
| generating | LLM 리포트 생성 완료 | saving |
| generating | 생성 실패 2회 | fallback_report |
| saving | 파일 저장 완료 | idle |
| fallback_report | fallback 파일 저장 | idle |

---

## 3. 구현 스펙

### 폴더 구조

```
/a-team
  ├── .claude/
  │   ├── agents/
  │   │   └── insights.md          # Insights 에이전트 (Sonnet)
  │   └── commands/
  │       └── insights.md          # /insights 슬래시 커맨드
  ├── scripts/
  │   └── insights-aggregate.mjs   # 집계 + 패턴 감지 스크립트
  ├── governance/
  │   └── skills/insights/
  │       └── report-template.md   # 리포트 마크다운 템플릿
  └── .context/
      └── insights/                # 주간 리포트 저장 디렉토리
          └── YYYY-WW-insights.md
```

### CLAUDE.md 핵심 섹션 목록

- Phase 1 Insights 에이전트: analytics.jsonl 집계 → 주간 인사이트 리포트 생성 파이프라인 설명

### 에이전트 구조

**구조 선택**: 멀티 에이전트 (오케스트레이터 커맨드 + Insights 서브에이전트)

**선택 근거**: 데이터 집계는 결정론적 스크립트, 인사이트 생성은 Sonnet LLM — 두 책임이 명확히 분리됨. 커맨드가 오케스트레이터 역할로 스크립트 실행 → 에이전트 호출 → 저장 순서 관리.

#### 메인 오케스트레이터 (`.claude/commands/insights.md`)
- **역할**: 전체 파이프라인 조율 (스크립트 실행 → 에이전트 호출 → 결과 저장)
- **담당 단계**: Step 1 트리거, Step 4 저장

#### 서브에이전트 목록

| 이름 | 역할 | 트리거 조건 | 입력 | 출력 | 참조 스킬 |
|------|------|-----------|------|------|----------|
| `insights` | analytics 집계 데이터 → 주간 인사이트 마크다운 생성 | /insights 커맨드에서 집계 완료 후 | `.context/insights/.tmp-aggregate.json` | 마크다운 리포트 문자열 | `governance/skills/insights/report-template.md` |

### 스킬/스크립트 목록

| 이름 | 유형 | 역할 | 트리거 조건 |
|------|------|------|-----------|
| `scripts/insights-aggregate.mjs` | 스크립트 | analytics.jsonl + friction-log + capability-map 집계 + 패턴 감지 → JSON 출력 | `/insights` 커맨드 Step 1 |
| `governance/skills/insights/report-template.md` | 참조 문서 | insights 에이전트가 사용하는 리포트 마크다운 템플릿 | insights 에이전트 로드 시 |
| `scripts/install-sleep-cron.sh` | 스크립트 (기존) | launchd 주간 자동 실행 등록 | 최초 1회 설치 |

### A-Team 표준 커맨드 규칙

> 이 설계서에 정의된 모든 커맨드는 A-Team 표준 형식으로 작성할 것.

A-Team 표준 커맨드 규격:
1. 파일 위치: `.claude/commands/<name>.md` (슬래시 커맨드) 또는 `.claude/agents/<name>.md` (서브에이전트)
2. frontmatter: `description:` 1줄 — Claude Code `Skill` tool 자동 등록용
3. 배포: `bash scripts/install-commands.sh` 실행으로 `~/.claude/commands/`에 symlink
4. Progressive disclosure: 커맨드 본문 500줄 이내, 대용량 참조는 `governance/skills/insights/*.md`로 분리
5. 자율 루프 포함 시 `governance/rules/autonomous-loop.md` 6 강제 조항 준수 명시

### 주요 산출물 파일

| 파일 | 형식 | 생성 단계 | 용도 |
|------|------|----------|------|
| `.context/insights/YYYY-WW-insights.md` | Markdown | Step 4 | 주간 인사이트 리포트 (사람이 읽는 것) |
| `.context/insights/.tmp-aggregate.json` | JSON | Step 1-2 | 에이전트에게 집계 데이터 전달 (임시, 실행 후 삭제) |

---

## 4. 리포트 템플릿 구조

```markdown
# 주간 인사이트 — YYYY년 N주차 (MM/DD ~ MM/DD)

## 모듈 사용 현황
| 모듈 | 사용 횟수 | 평균 점수 | 성공률 | 전주 대비 |
|------|---------|---------|-------|---------|

## 주요 관찰
1. [관찰 1: 숫자 기반 사실]
2. [관찰 2]
3. [관찰 3] (선택)

## 다음 주 우선순위 제안
1. [제안 1: 갭/패턴 기반]
2. [제안 2]

## 플래그
- [패턴 플래그 목록 — high_failure, no_usage, coverage_drop]

---
_자동 생성: /insights 에이전트 | 데이터: .context/analytics.jsonl_
```
