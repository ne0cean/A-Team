# 개념별 역인덱스 (Concept Reverse Index)

> **용도**: 개념이 어디에 정의(SSOT)되고, 어디서 상세 설명되고, 어디서 단순 참조되는지 한눈에 파악.
> 중복 제거 시 이 인덱스를 기준으로 SSOT 외 중복(DUP)만 참조로 대체한다.
> `grep -i "키워드" A-Team/docs/CONCEPT-INDEX.md`

---

## 파일 소유권 / PARALLEL_PLAN
- **SSOT**: `02:L8-L46` — 충돌 방지 메커니즘 + 소유권 선언 규칙
- Detail: `01:L50-L59` — 직렬 처리 블록 패턴 (분리 불가 파일)
- Detail: `06:L82-L90` — Phase 2 격리 전략에서 소유권 선언 절차
- Detail: `08:L50-L58` — 2축 분류 격리 수준 테이블 (파일소유권 레벨)
- Ref: `00:L121`, `10:L161`

## Supervisor 패턴
- **SSOT**: `08:L21-L24` — 패턴 1 정의 + 다이어그램 ("2025년 이후 사실상 표준")
- Detail: `08:L170-L179` — Supervisor vs MoA 선택 기준 테이블
- Ref: `10:L24` (에이전트 모델표에서 Supervisor 언급)

## MoA (MixtureOfAgents)
- **SSOT**: `08:L159-L168` — 패턴 4 정의 + 다이어그램
- Detail: `19:L62-L87` — MoA 모드 구현 상세설계 (Supervisor→MoA 전환 기준)
- Ref: `20:L103` (케이스 가이드에서 추천)

## 2축 분류 (조율 × 격리)
- **SSOT**: `08:L39-L68` — 축 1(조율) + 축 2(격리) 테이블 + 6가지 패턴
- Detail: `20:L27-L38` — 동일 6패턴을 케이스 선택 맥락에서 참조
- Ref: `06:L150-L167` (의사결정 트리에서 패턴 선택)

## 6가지 실전 패턴 (❶~❻)
- **SSOT**: `08:L59-L68` — 패턴 정의 테이블 (이론)
- Detail: `08:L70-L78` — 자동 선택 결정 트리
- Detail: `20:L29-L36` — 케이스별 실전 추천 맥락 (도구 카탈로그 관점)
- **주의**: 08=패턴 이론, 20=도구별 실전 적용 → 맥락 다름, 중복 아님

## 하네스 / Hook
- **SSOT**: `12:L1-L39` — 하네스 정의 + 아키텍처 (5가지 훅 이벤트)
- Detail: `12:L43-L98` — 구현된 훅 상세 (pre-bash, pre-write, stop-check, notify-log)
- Detail: `21:L8-L100` — 훅 계층 구조 (Tier 0~4), 12와 상호보완
- Ref: `13:L20-L30` — 하네스 역할 요약 (사전방지 + 세션종료검사)

## 모델 선택 기준
- **SSOT**: `03:L7-L31` — 모델별 강점 + 태스크→모델 배정표
- Detail: `06:L71-L78` — 역할별 모델 배정 (Leader/Architect/Optimizer/Researcher)
- Ref: `10:L16-L24` (에이전트별 모델)

## CURRENT.md 갱신 규칙
- **SSOT**: `04:L12-L96` — CURRENT.md 역할 + 갱신 포맷 + 에스컬레이션
- Detail: `06:L99-L133` — Phase별 CURRENT.md 사용 흐름
- Detail: `02:L52-L60` — 유일한 통신채널 원칙
- Ref: `08:L109`

## 5-Phase 라이프사이클
- **SSOT**: `06:L7-L21` — Phase 0~5 전체 흐름 정의
- Detail: `06:L25-L180` — 각 Phase 상세 절차

## TDD
- **SSOT**: `15:L1-L91` — 판단기준 + Red-Green-Refactor + Superpowers 패턴
- Detail: `15:L7-L32` — 효과적/역효과 케이스 (50줄+ AND API/로직)
- Ref: `00:L29-L84` (Tier별 TDD 강제 수준)

## Tier 시스템 (NANO / STANDARD / PRO)
- **SSOT**: `16:L1-L145` — 3개 Tier 정의 + 구조 + 활성도구
- Detail: `16:L105-L118` — Tier별 기능 대조표
- Detail: `16:L121-L145` — 업그레이드 경로

## 체크포인팅
- **SSOT**: `19:L119-L143` — 정의 + 파일형식 + orchestrator 활용
- Ref: `08:L190`

## 3-tier Guardrail
- **SSOT**: `19:L91-L116` — Tier 1(Input)/2(Tool)/3(Output) 정의
- Ref: `governance/rules/guardrails.md`

## TAO 루프
- **SSOT**: `08:L11-L15` — Thought→Action→Observation 정의

## SOP 워크플로우
- **SSOT**: `08:L185-L199` — 패턴 5 정의 + workflows 매핑
- Detail: `19:L146-L150` — SOP 강화 원칙

## CC Mirror / 컨텍스트 보존
- **SSOT**: `13:L1-L79` — 3중 레이어 미러 아키텍처
- Detail: `13:L12-L48` — 컨텍스트 아키텍처 + 하네스 + CC Mirror
- Detail: `13:L51-L69` — 지속성 워크플로우 + 토큰소진 복구
- Ref: `05:L42`

## ClawTeam
- **SSOT**: `07:L1-L100` — 설치 + 핵심명령 + 통신
- Detail: `06:L41-L127` — ClawTeam 사용 워크플로우
- Detail: `07:L165-L177` — ClawTeam vs 수동조율 비교

## 프레임워크 비교 (CrewAI, LangGraph 등)
- **SSOT**: `17:L3-L142` — 7차원 평가 프레임워크 (도입 검토 기준)
- Detail: `09:L1-L125` — 실전 운영 전략 + 선택 가이드
- Detail: `20:L66-L75` — 비교 매트릭스 (토큰/복원력/거버넌스)
- **주의**: 17=평가기준, 09=운영전략, 20=도구카탈로그 → 각각 다른 관점

## git worktree 격리
- **SSOT**: `06:L82-L91` — 격리 전략 선택 기준
- Detail: `08:L50-L58` — 격리 수준 테이블 (4단계)
- Ref: `20:L113` (Agentmaxxing 트렌드)

## 에이전트 역할 분할
- **SSOT**: `01:L1-L70` — 레벨분리 + 도메인분리 원칙
- Detail: `08:L88-L105` — Step 2 역할정의 + 입출력스키마
- Ref: `06:L71-L78` (역할별 모델 배정)

---

## 문제 → 해결 매핑

| 증상 | 해결 위치 |
|------|----------|
| 에이전트가 같은 파일 수정 | `02:L8` → 소유권 선언 |
| 토큰 소진 후 복구 불가 | `13:L51` → 장애복구 절차 |
| 어떤 패턴 쓸지 모름 | `08:L70` → 자동 선택 트리 |
| Hook 작동 안 함 | `21:L10` → 계층별 우선순위 |
| MoA vs Supervisor 고민 | `08:L170` → 선택 기준 테이블 |
| 새 도구 도입 검토 | `17:L3` → 7차원 평가 |
| 프로젝트 규모 선택 | `16:L1` → Tier 정의 |
| TDD 적용 여부 | `15:L7` → 판단 기준 |
| 빌드 실패 | `06:L137`, `12:L43` |
| 모바일 개발 | `14:L1` |
