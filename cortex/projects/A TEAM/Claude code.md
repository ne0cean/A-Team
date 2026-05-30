---
title: "Claude code"
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-d5d9724138e44f1dae5f4713f13fafb6!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

Claude code

[Claude Code creator Boris shares his setup with 13 detailed steps](https://www.reddit.com/r/ClaudeAI/comments/1q2c0ne/claude_code_creator_boris_shares_his_setup_with/) _ [Geek news](https://news.hada.io/topic?id=25570)

[https://vivvers.com/](https://vivvers.com/)

- [https://youtu.be/Ek_I0iFyyZU](https://youtu.be/Ek_I0iFyyZU)

- [https://www.instagram.com/reel/DVB8pLsDRet/?utm_source=ig_web_copy_link&amp;igsh=MzRlODBiNWFlZA==](https://www.instagram.com/reel/DVB8pLsDRet/?utm_source=ig_web_copy_link&amp;igsh=MzRlODBiNWFlZA==)

API for free

[https://www.instagram.com/reel/DVUJeahgMMe/?utm_source=ig_web_copy_link&amp;igsh=MzRlODBiNWFlZA==](https://www.instagram.com/reel/DVUJeahgMMe/?utm_source=ig_web_copy_link&amp;igsh=MzRlODBiNWFlZA==)

Agents Team

[https://www.instagram.com/p/DVDElnhksHh/?utm_source=ig_web_copy_link&amp;igsh=MzRlODBiNWFlZA==](https://www.instagram.com/p/DVDElnhksHh/?utm_source=ig_web_copy_link&amp;igsh=MzRlODBiNWFlZA==)

# Claude.md

- [https://www.threads.com/@leehc_09/post/DU2qIQCkSJg?xmt=AQF0Eut90Qivy80NU8AGqfBi2yVzWbGoLhCx_VvMtJemHq3QL9ry60G91kJs9KgYuwFT3-ot&amp;slof=1](https://www.threads.com/@leehc_09/post/DU2qIQCkSJg?xmt=AQF0Eut90Qivy80NU8AGqfBi2yVzWbGoLhCx_VvMtJemHq3QL9ry60G91kJs9KgYuwFT3-ot&amp;slof=1)

- [Setup](https://tech.hyperithm.com/claude_code_guides)

-
Claude code를 하루에 12~16시간씩 사용한 경험자로서, 다음과 같은 팁들을 발견함:

- 실행하자마자 sonnet 모델로 교체하기(opus와는 퀄리티 차이가 큼)

- compacting(대화 로그 압축)은 진행 중에 품질이 크게 떨어지니, 최적 시점을 잡아야 함

- 첫 프롬프트가 대단히 중요하고 세션의 성격이 여기서 정해짐 만약 Claude 인스턴스가 주저하거나 불친절해지면 그냥 세션을 끝내고 새로 여는 게 나음

- “이거 별로인 의견일 수 있지만 ~을 구현하고 싶어요”처럼 공손하게 부탁하면 훨씬 적극적으로 도와주는 경향이 있음

- 도커 오케스트레이션을 Claude에게 맡기니 생산성이 10배는 뛴 느낌임 컨테이너 새로 띄우기, 오류 로그 확인, 삭제/재빌드 등 전체 플로우를 Claude에게 맡겨 한 번의 프롬프트로 서비스 전체를 띄울 수 있게 됨

- 5번은 도커 외에도 playwright MCP 서버와 연동하면 UI 및 요청도 바로바로 확인하게 만들 수 있음 6. 계획 모드(plan mode)로 시작해서 계획이 마음에 들 때까지 반복 수정 7. 슬래시 커맨드(/커맨드) 기능을 적극적으로 활용해 미니 프롬프트로 지속적인 개선과 컨텍스트 제공, gh 등 외부 툴 활용 지시까지 포함 compacting은 반드시 0%에서 갑자기 하지 말고, 적절한 중간에 적용하는 것이 좋음 1번(sonnet 추천)은 동의하지 않을 수도 있음

- 도커를 피하려는 성향이 있지만, 5번 팁(Claude로 도커 오케스트레이션하기)이 매우 궁금함 어떤 프롬프트 포맷을 사용하는지 알고 싶음

- 아주 상세한 plan.md 파일(시스템 간 연결, 전체 구성 등)부터 만들어서 claude-loop( [https://github.com/DeprecatedLuke/claude-loop](https://github.com/DeprecatedLuke/claude-loop)) 같은 툴로 밤새 돌려놓고, 아침에 수동 패치하는 방식도 성공적으로 써봤음

- Claude Code를 하루 16시간씩 어떻게 쓰는지 궁금함

- 가끔 Claude가 컨테이너 내부를 너무 들쑤실 때가 있음 단지 코드 이해만 시키고 싶었는데 컨테이너 안에서 수많은 방식으로 코드를 실행시키려 해서 오히려 이상해진 적도 있음 예전에 파일을 cli 명령어로 파이프해서 아무 동작도 안 하는 행동도 했었지만, 뭔가 집착적으로 실행하려는 경향이 있다는 예시임

출처: &lt;[https://news.hada.io/topic?id=22375](https://news.hada.io/topic?id=22375)&gt;

Claude Code로 프로토타입을 빠르게 만들고 개선하는 방법1. 원칙: 계획 → 작게 구현 → 즉시 데모 → 피드백 루프를 반복 2. 계획 우선: 기능 한 줄 요약, 입&#183;출력/완료조건/테스트 기준을 먼저 확정 3. 작업 단위: 30–90분 태스크로 쪼개 한 번에 하나만 처리4/ 데모: 결과물은 Artifacts로 바로 실행&#183;공유해 빠른 검증 5. 세션/모델: claude -r &lt;session&gt;로 맥락 유지, /model 또는 --model로 전환 6. 슬래시 커맨드: /plan(계획) → /build(구현) → /refactor(리팩터) → /security-review(보안 점검)7. 품질 보증: 자동 보안 리뷰 + 유닛/통합 테스트 생성, 최종은 사람 리뷰 8. 문맥 연결: 리포지토리&#183;문서&#183;외부 시스템을 MCP/커넥터로 연결해 사실 기반 작업 9. 리소스 관리: 길이/비용 한도 고려, 캐시&#183;RAG로 효율화

출처: &lt;[https://news.hada.io/topic?id=22375](https://news.hada.io/topic?id=22375)&gt;

[클로드](https://www.youtube.com/watch?v=rNtpNY41h5o) 스킬
