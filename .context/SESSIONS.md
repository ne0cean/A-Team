# SESSIONS — A-Team 세션 로그

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
