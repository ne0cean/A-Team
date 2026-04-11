# Claude Code Specific Rules
# Claude Code(CLI) 환경에 최적화된 거버넌스 레이어
# 역할: orchestrator가 governance/rules/ 경로에서 로드하는 안정(stable) 거버넌스 규칙.
# 실험적 패턴은 governance/experimental/ 에서 관리하고 충분히 검증된 후 이 파일에 반영한다.

## 1. Memory System (Claude Code 전용)
- 프로젝트 메모리: `memory/MEMORY.md` (매 대화 자동 로드)
- 상세 레퍼런스: `memory/` 하위 토픽별 파일
- 세션 간 컨텍스트 보존은 `.context/CURRENT.md` + `memory/MEMORY.md` 이중 관리
- 신규 패턴 발견 시 즉시 memory 업데이트, 나중에 몰아서 하지 않기

## 2. Context Management
- Claude Code는 대화 압축이 발생함 → 핵심 상태는 항상 CURRENT.md에 외부화
- 긴 탐색 작업은 Explore 서브에이전트 위임 (메인 컨텍스트 보호)
- 독립 작업은 병렬 툴 호출로 처리 (속도 최적화)

### CURRENT.md 갱신 트리거 (핸드오프 복구의 핵심)
토큰 소진이나 갑작스러운 중단 후 다른 AI가 작업을 이어받을 수 있으려면
**CURRENT.md를 자주 갱신해야 한다.** 다음 상황에서 즉시 갱신:

| 트리거 | 갱신 항목 |
|--------|----------|
| 태스크 하나 완료 | `Last Completions` 추가, `In Progress Files` 업데이트 |
| 새 블로커 발견 | `Blockers` 즉시 기록 |
| 파일 수정 시작 | `In Progress Files`에 파일명 + 작업 내용 추가 |
| 접근법 변경 | `Next Tasks`에 변경된 방향 업데이트 |
| 세션 30분 경과 | 중간 체크포인트로 전체 갱신 |

> **왜 중요한가**: `/handoff` 실행 시 CURRENT.md 전체가 새 AI에게 전달된다.
> CURRENT.md가 오래됐으면 새 AI는 중단 지점을 알 수 없다.

## 3. Tool Usage Priority
우선순위 (높음 → 낮음):
1. 전용 도구: Read, Edit, Write, Glob, Grep
2. Agent (서브에이전트): 복잡한 탐색/멀티스텝
3. Bash: 전용 도구로 불가능한 시스템 명령만

## 4. 서브에이전트 활용 패턴
- `Explore` 에이전트: 코드베이스 탐색, 키워드 검색
- `Plan` 에이전트: 구현 전략 설계
- `general-purpose` 에이전트: 복합 멀티스텝 작업
- 에이전트 결과는 메인 컨텍스트로 요약해서 가져오기

## 5. Commit Convention (Claude Code 환경)
- HEREDOC 방식으로 커밋 메시지 작성 (줄바꿈 안전)
- Co-Authored-By 태그 항상 포함
- --no-verify, --force는 사용자 명시 요청 시에만

## 6. 개선사항 발견 시
- `/improve [내용]` 으로 즉시 A-Team에 등록 (어떤 프로젝트에서든 사용 가능)
- 형식: 문제 상황 → 발견한 패턴 → 적용 결과
- A-Team 프로젝트에서 `/improve apply` 로 반영 실행
- `/improve list` 로 대기 중인 항목 조회

## 7. Advisor Tool 사용 규칙 (Layer B 전용)
- **Layer A (Claude Code 서브에이전트)**: advisor tool 직접 사용 금지. MoA + Reviewer 체계 유지.
- **Layer B (Ralph/Research 데몬)**: `callSdkWithAdvisor()` 사용 가능 (opt-in: `useSdkPath=true`).
- **Circuit Breaker**: 실패율 20% 초과 시 `SimpleCircuitBreaker`가 CLI fallback 자동 전환.
- **설정 동기화**: `ADVISOR_TOOL_BREAKER_CONFIG`는 `lib/circuit-breaker.ts` ↔ `scripts/daemon-utils.mjs` 양측 동일 유지. 변경 시 두 파일 모두 업데이트.
- **비용 추적**: advisor 호출 결과는 `cost-tracker`에 `phase: 'exec', advisorCalls: N` 포함해 기록.
- **상세 아키텍처**: `governance/workflows/advisor-architecture.md` 참조.
