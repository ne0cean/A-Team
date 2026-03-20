# 10. Claude Code 서브에이전트 운용 가이드

A-Team의 5개 전문 에이전트를 Claude Code 서브에이전트로 구현한 레이어.
**코드 없이, 프롬프트 한 줄로** 멀티에이전트 팀을 즉시 가동한다.

---

## 아키텍처

```
사용자 요청
    ↓
[orchestrator] ← Supervisor 패턴 리더
    ↓              ↓              ↓
[researcher]  [coder]      [reviewer]
(Haiku)       (Sonnet)      (Sonnet)
                  ↑
            [architect]
             (Opus, 설계 시)
```

| 에이전트 | 모델 | 도구 | 역할 |
|----------|------|------|------|
| orchestrator | Sonnet | 전체 | 계획·배분·취합 (Supervisor) |
| researcher | Haiku | 검색+읽기 | 리서치·조사 (읽기전용) |
| coder | Sonnet | 파일+Bash | 구현·수정·빌드 |
| reviewer | Sonnet | 읽기+Bash | 품질 검증·승인 |
| architect | Opus | 읽기+검색 | 설계·아키텍처 결정 |

---

## 설치

```bash
# 신규 프로젝트에 전체 설치
bash A-Team/templates/project-scaffold.sh my-project ./A-Team

# 기존 프로젝트에 에이전트만 설치
mkdir -p .claude/agents
cp A-Team/.claude/agents/*.md .claude/agents/
```

---

## 사용법

### 패턴 1: Orchestrator를 통한 멀티에이전트 실행
복잡하거나 병렬화 가능한 작업:

```
"인증 시스템 전체를 A-Team으로 구현해줘"
"이 버그를 멀티에이전트로 분석하고 수정해줘"
"성능 최적화를 팀으로 진행해줘"
```

→ orchestrator가 자동으로:
1. PARALLEL_PLAN.md 작성
2. 태스크 분해 및 에이전트 배정
3. 병렬/순차 실행 조율
4. 결과 취합 후 구조화 출력

### 패턴 2: 단일 전문 에이전트 직접 호출
단순하고 역할이 명확한 작업:

```
"GitHub Actions 최신 패턴 리서치해줘"  → researcher
"UserCard 컴포넌트 만들어줘"           → coder
"이 PR 리뷰해줘"                       → reviewer
"WebSocket 아키텍처 설계해줘"          → architect
```

### 패턴 3: 순차 파이프라인
단계가 명확한 작업:

```
1. researcher: "이 기능의 베스트 프랙티스 조사해줘"
2. architect:  "조사 결과 기반으로 설계해줘"
3. coder:      "설계서대로 구현해줘"
4. reviewer:   "구현 결과 리뷰해줘"
```

---

## 모델 비용 최적화

```
리서치 태스크          → researcher (Haiku) — 저비용
구현·수정 태스크       → coder (Sonnet) — 중간
품질 검증             → reviewer (Sonnet) — 중간
아키텍처 설계          → architect (Opus) — 고비용, 필요 시만

원칙:
- 리서치는 항상 Haiku (비용 최소화)
- Opus는 설계 결정에만 (주당 1-2회)
- 단순 구현은 Sonnet으로 충분
```

---

## 구조화 출력 규칙

에이전트 간 컨텍스트 전달은 항상 JSON으로:

```json
// 에이전트 → 다음 에이전트 (긴 히스토리 금지)
{
  "task_id": "T-001",
  "status": "completed",
  "summary": "한 문장 요약",
  "evidence": ["확인 가능한 근거"],
  "risks": ["위험 요소"],
  "next_steps": ["다음 작업 제안"]
}
```

---

## Reviewer 자동 트리거 조건

orchestrator가 아래 조건 감지 시 reviewer를 자동 삽입:

```
- 10개 이상 파일 동시 수정
- 보안 관련 코드 (인증/권한/암호화)
- DB 스키마 변경
- 외부 API 스펙 변경
- 코어 비즈니스 로직 변경 (결제, 인증, 데이터 파이프라인)
```

---

## 실전 예시: 신기능 구현

### 요청
```
"소셜 로그인 기능을 A-Team으로 구현해줘"
```

### orchestrator 실행 흐름

```
Phase 1: 컨텍스트 수집
  → .context/CURRENT.md 읽기
  → 관련 파일 5개 읽기

Phase 2: PARALLEL_PLAN.md 작성
  T1 (researcher): OAuth 베스트 프랙티스 조사 [독립]
  T2 (architect):  소셜 로그인 아키텍처 설계 [blocked-by: T1]
  T3 (coder-A):    백엔드 OAuth 콜백 구현 [blocked-by: T2]
  T4 (coder-B):    프론트엔드 버튼 컴포넌트 [blocked-by: T2, 병렬: T3]
  T5 (reviewer):   전체 검증 [blocked-by: T3, T4]

Phase 3: 병렬 실행
  T1 실행 → 완료 → T2 실행 → 완료 → T3, T4 동시 실행 → 완료 → T5

Phase 4: 결과 취합 + CURRENT.md 갱신
```

---

## 파일 소유권 원칙

PARALLEL_PLAN.md에서 에이전트별 파일 소유권 선언 필수:

```
coder-A 소유: server/routes/auth.js, server/middleware/oauth.js
coder-B 소유: client/src/components/SocialLoginButton.jsx
공유 (읽기만): server/app.js → 최종 통합 시 orchestrator가 처리
```

겹치는 파일이 있으면 → orchestrator가 순차 처리로 전환.

---

## ClawTeam과의 조합

```
ClawTeam 있음:
  → 각 에이전트를 별도 tmux 세션으로 스폰
  → git worktree로 완전 격리
  → ~/.clawteam/teams/에 실행 로그 자동 기록

ClawTeam 없음 (현재 기본값):
  → Claude Code 서브에이전트로 순차/백그라운드 실행
  → .context/CURRENT.md로 상태 추적
  → git branch로 수동 격리
```

---

## 안티패턴

| 하지 말 것 | 이유 | 대신 |
|-----------|------|------|
| PARALLEL_PLAN.md 없이 에이전트 스폰 | 파일 충돌, 역할 혼란 | orchestrator가 자동 생성 |
| 긴 히스토리를 다음 에이전트에 전달 | 컨텍스트 오염, 비용 폭발 | 구조화 JSON 요약만 전달 |
| architect를 단순 구현에 사용 | Opus 비용 낭비 | coder로 직접 구현 |
| 검증 없이 배포 | 품질 미보장 | Reviewer 트리거 조건 확인 |
| 무한 재시도 | 비용 폭발 | 최대 2회 → 사람 에스컬레이션 |
