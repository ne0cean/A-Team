# SESSIONS — A-Team 세션 로그

---

## 2026-03-30 외부 레포 4개 차용 + PIOP + lib/ 14모듈 TDD

**완료**:
- 외부 레포 분석 및 차용: gstack(7), harness-diagnostics(2), everything-claude-code(5), cc-mirror(분석만)
- lib/ 14개 TypeScript 모듈 TDD 구현 (116 테스트, 0 failures)
- MoA Multi-Layer Loop + Judge Agent + Stall Detection 통합
- PIOP 5-Phase 프로토콜 생성 + 실전 실행 (연결율 8.6% → 54.3%)
- Ralph Loop 실전 테스트: Pre-check 즉시 완료 + formatLearning() 자율 구현 성공
- 테스트 인프라 부트스트랩: package.json + vitest + tsconfig.json

**이슈**: 없음
**빌드**: ✅ (tsc --noEmit + vitest run 116/116)
**비용**: haiku Ralph $0.16 (formatLearning 태스크)

---

## 2026-03-30 Auto Mode 통합 + 보안 강화

**완료**:
- Anthropic auto mode 딥리서치 (2계층 방어 아키텍처, Sonnet 4.6 분류기, 0.4% FPR)
- `getPermissionMode()` 구현: auto 우선 → 캐시 → 허용목록 검증 → bypassPermissions 폴백
- 전 데몬(Ralph/Research/Dispatch) auto mode 적용 + /vibe 터보모드 통합 (Step 3.7)
- `/review` 적대적 리뷰 실행: CRITICAL 2건(env 미검증, 쉘 인용), HIGH 3건(폴백 불일치, 파이프라인 env 단절, checkCommand 주입) 전량 수정
- 보안 강화: buildClaudeEnv() 위험 env 6개 제거, safePath() 경계 수정, dispatch.sh 변수 인용

**이슈**: auto mode는 Research Preview — 안정성 이슈 보고됨 (GitHub issues)
**빌드**: ✅ (전 파일 구문 검증 통과)

---

## 2026-03-28 Ralph Loop 자율 개발 데몬 구현 + 최적화

**완료**:
- Ralph Loop 조사 (Geoffrey Huntley, 2024~) → A-Team 통합 설계
- `ralph-daemon.mjs`: 5레이어 비용 최적화, 별도 브랜치 안전장치, graceful shutdown
- `ralph-prompts.mjs`: lean context, AGENTS.md 학습, 리서치 노트 주입
- `daemon-utils.mjs`: 공통 유틸 추출 (atomicWriteJSON, findClaude, safePath, buildClaudeEnv)
- `/ralph` 커맨드: start/stop/status/log/notes + 태스크 작성 가이드
- Research → Ralph 파이프라인: `/re pipeline` 원스탑, 리서치 노트 자동 연결
- `/vibe` Step 3.5: 주간 야간 Ralph 태스크 자동 제안
- 코드 리뷰 (reviewer agent): HIGH 3건 + MEDIUM 7건 + LOW 3건 전량 수정

**이슈**:
- 없음 (실전 테스트는 다음 세션)

**빌드**: ✅ (스크립트 전용 — daemon-utils import 검증 통과)

---

## 2026-03-28 A-Team pull 워크플로우 표준화

**완료**:
- `GEMINI_TASKS.md` 내 '각 프로젝트에서 A-Team pull 워크플로우 표준화' 완료
- `CLAUDE.md` 내 업데이트 및 배포 섹션 표준 패턴 적용
- `README.md` 내 빠른 시작 섹션 최신화 및 절대 경로(`~/tools/A-Team`) 표준화

**이슈**:
- 없음

**빌드**: ✅ (문서 전용)

---

## 2026-03-28 훅 계층 재구성 + 토큰 최적화

**완료**:
- SessionStart[startup/resume] 훅 구현 → /vibe + /pickup 수동 입력 자동화
- auto-commit-on-compact.sh 강화 (.compact-state.json 스냅샷)
- auto-resume-after-compact.sh 강화 (compact-state 활용)
- orchestrator.md 70% 축소 (287→87줄), vibe.md 52% 축소 (101→49줄)
- preamble.md에 coding-safety + sync-and-commit + turbo-auto 통합 부록화
- governance/workflows/vibe.md 63% 축소 (43→16줄)
- /vibe Step 3에 태스크별 모델 추천 안내 추가
- docs/21-hook-hierarchy.md 신규 — 5-Tier 자동화 아키텍처 문서
- 모델 자동 전환 실현 가능성 조사 → Hook API read-only 확인, dispatch --model로 해결

**이슈**:
- 컨텍스트 압축 2회 (훅 리서치 + 최적화 작업량)
- Hook API model 필드 read-only → 메인 세션 모델 전환은 수동 유지

**빌드**: ✅ (문서/스크립트 전용)

---

## 2026-03-28 병렬 처리 도구 종합 가이드 작성

**완료**:
- 4개 병렬 리서치 에이전트 실행 (OpenHands/Plandex, Mato/CAO, MCP 인프라, Context Handoff)
- 6개 웹서치로 최신 도구 발굴 (Superset IDE, Claude Squad, ComposioHQ, Multiclaude, Gas Town 등)
- docs/20-parallel-processing-landscape.md 신규 — 5-Tier 분류 + 8개 개발 케이스별 최적 선택 가이드
- INDEX.md 갱신 (doc 20 추가)

**이슈**:
- 컨텍스트 압축 2회 발생 (대량 리서치 에이전트 결과 수집으로 인해)

**빌드**: ✅ (문서 전용)

---

## 2026-03-27 멀티 에이전트 패턴 Phase 1 통합

**완료**:
- /tdd, /craft 누락 커맨드 배포 수정 + orphan 감지 가드 (install-commands.sh)
- 20+ 멀티 에이전트 프레임워크 광범위 리서치 (CrewAI, LangGraph, OpenAI Agents SDK, Swarms, MetaGPT, smolagents 등)
- 7차원 통합 평가 프레임워크 문서화 (docs/17)
- 멀티 에이전트 오케스트레이션 리서치 원본 저장 (docs/18)
- Phase 1 도입 설계 확정 (docs/19): 파일 단위 조치 매핑
- 3-tier Guardrail 규약 신규 (governance/rules/guardrails.md)
- 체크포인팅 규약 신규 (governance/rules/checkpointing.md)
- orchestrator.md MixtureOfAgents 모드 + 체크포인트 관리 추가
- reviewer.md 3-tier 구조 명확화
- docs/08 MoA/SOP 패턴 추가
- templates/PARALLEL_PLAN.md Guardrail + MoA + Checkpoint 섹션 추가
- scripts/checkpoint.sh 신규 (save/load/list/archive)

**이슈**:
- 서브에이전트 WebSearch/WebFetch 권한 거부로 리서치 직접 진행
- /vibe 세션 초기에 wrong project 로드 (active-project 파일 업데이트로 수정)

**빌드**: ✅ (문서/스크립트 전용, 빌드 명령 없음)

**커밋**:
- 45cd5e6 fix: 누락 커맨드 배포 + orphan 감지 가드 추가
- 8d11d21 docs: 통합 평가 프레임워크 추가 (17번 doc)
- 2c0caa3 feat: 멀티 에이전트 패턴 Phase 1 통합 (MoA + Guardrail + Checkpointing)
