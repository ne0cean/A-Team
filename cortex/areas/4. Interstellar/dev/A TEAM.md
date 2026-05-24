---
title: "A TEAM"
created: 2026-03-20T08:41:33.179Z
modified: 2026-03-20T08:41:33.179Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
onenote_url: "https://onedrive.live.com/redir.aspx?cid=733661839CC53BA5&page=edit&resid=733661839CC53BA5!7896&parId=733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d&wd=target%281_Projects%2FA%20TEAM.one%7C3beb0a10-2ecc-439f-9ac9-2817aadfad77%2FA%20TEAM%7C0421cc68-a418-41a7-afe9-4d0d24eb2f9a%2F%29"
---

🏗️ A-Team 브리핑 — 사용자 가이드

  

A-Team이 뭔가요?

AI 에이전트(Claude, Antigravity 등)를 팀처럼 조직해서 프로젝트를 수행하기 위한 프레임워크입니다. 혼자 일하든 여러 에이전트를 돌리든, 이 툴킷이 품질 보장 + 맥락 보존 + 안전 장치를 제공합니다.

  

📌 핵심 3가지 (이것만 기억하세요)

|  |  |  |
| --- | --- | --- |
| 기능 | 하는 일 | 당신이 할 것 |
| 하네스 (Harness) | AI가 위험한 명령 실행 차단, 빌드 안 되면 세션 종료 불가 | 아무것도 안 해도 자동 작동 |
| CC Mirror | 토큰 소진/크래시 시에도 작업 자동 저장 | auto-sync.sh 백그라운드 실행 확인 |
| TODO 시스템 | 프로젝트 간 할 일 통합 관리 | /todo 명령어로 추가/조회 |

  

🚀 자주 쓸 명령어

  

bash

# 새 프로젝트 시작할 때 (모든 것을 한 방에 설치)

bash A-Team/templates/init.sh my-project ./A-Team

  

# TODO 관리

/todo # 대기 목록 보기

bash A-Team/scripts/todo.sh add "기능 구현" "프로젝트명"

bash A-Team/scripts/todo.sh done "기능 구현"

bash A-Team/scripts/todo.sh stats

  

# 프로젝트 현황

/prjt # 프로젝트별 요약

  

# 모델 전환 (토큰 한도 도달 시)

bash A-Team/scripts/model-exit.sh # → 클립보드에 핸드오프 프롬프트 복사

  

# 모바일에서 접속

# PC에서: claude → /rc → 폰으로 QR 스캔

  

🛡️ 자동으로 작동하는 안전 장치

.claude/hooks/에 설치된 4종 훅이 항상 자동 실행됩니다:

- pre-bash.sh — rm -rf \*, git push --force 같은 위험 명령 자동 차단
- pre-write.sh — .env, SSH 키, git 내부 파일 수정 차단
- stop-check.sh — 세션 종료 전 npm run build 강제 실행. 빌드 실패 시 종료 불가
- subagent-dod.sh — 서브에이전트의 완료 기준(DoD) 자동 검증

  

📂 문서 구조 (필요할 때 참조)

|  |  |
| --- | --- |
| 상황 | 읽을 문서 |
| 전체 워크플로우 이해 | PROTOCOL.md (7단계 프로세스) |
| 에이전트 역할 분담 | docs/01 ~ docs/04 |
| 병렬 작업 설계 | docs/08 (오케스트레이션 패턴) |
| 훅/안전장치 상세 | docs/12 (하네스 엔지니어링) |
| 맥락 보존 원리 | docs/13 (CC Mirror 프로토콜) |
| 폰에서 개발하기 | docs/14 (모바일 개발 가이드) |

  

🤖 에이전트 5종 (복잡한 작업 시)

  

"이 작업을 A-Team으로 처리해줘" → orchestrator가 알아서 분배

|  |  |  |
| --- | --- | --- |
| 에이전트 | 역할 | 비용 |
| orchestrator | 총괄 (계획→배분→취합) | Sonnet |
| researcher | 조사 전문 (읽기만) | Haiku (저렴) |
| coder | 구현/수정 | Sonnet |
| reviewer | 품질 검증 | Sonnet |
| architect | 설계/아키텍처 | Opus (고급) |

  

📊 현재 TODO 현황

  

✅ 하네스 엔지니어링 A-TEAM에 반영

✅ 폰에서 클로드와 안티그래비티 사용하는 프로젝트

✅ TODO 시스템 고도화 및 프로젝트 태깅 구현

✅ 15:00 오퍼스 인계 준비 확인

✅ TODO 시스템 기초 구현

⬜ [connectome] 중앙 관리형 TODO 테스트

  

💡 한 줄 요약

A-Team = "에이전트가 망치지 않게 하고 (Harness), 맥락을 잃지 않게 하고 (Mirror), 할 일을 놓치지 않게 하는 (TODO)" 프레임워크.

  
  

완성된 전체 워크플로우

  

아이디어 → /office-hours → /plan-ceo → /plan-eng → /autoplan

→ orchestrator(구현) → /investigate(디버깅)

→ /browse /qa(검증) → /benchmark(성능) → /adversarial → /cso(보안)

→ /doc-sync(문서) → /review → /ship(PR) → /land(배포 확인)

→ /retro(회고)

  

신규 커맨드 4개

- /investigate — 근본 원인 분석 전용. 3가설 실패 → BLOCKED

- /ship — PR 검증 파이프라인 (테스트→리뷰→버전→PR)

- /retro — git 기반 회고 (.context/retros/ 스냅샷)

- /office-hours — 코드 전 아이디어 검증 (스타트업/빌더 모드)

Gstack

[garrytan/gstack: Use Garry Tan's exact Claude Code setup: 15 opinionated tools that serve as CEO, Designer, Eng Manager, Release Manager, Doc Engineer, and QA](https://github.com/garrytan/gstack)

  

하네스 엔지니어링

  

CC [클로드코드 팀](https://news.hada.io/topic?id=25638)

<https://github.com/affaan-m/everything-claude-code>

MoA 에이전트 구축