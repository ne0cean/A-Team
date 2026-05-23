---
title: "/Users/noir/Desktop/Projects/Vibe"
created: 2026-01-20T13:48:59.041Z
modified: 2026-01-20T13:48:59.041Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
---

/Users/noir/Desktop/Projects/Vibe

폴더에 다시 확실하게 저장했습니다.

  

이제 다음 파일들이 정상적으로 존재합니다:

- VIBE\_MANIFESTO.md
- 01\_README\_GUIDE.md
- 02\_SPEC\_PRD\_GUIDE.md
- 03\_TASK\_EXECUTION\_GUIDE.md
- 04\_VERIFICATION\_LOGS\_GUIDE.md

작성된 Vibe 시스템은 AI와 인간이 가장 적은 시행착오로 협업하기 위한 \*\*'규칙(Constitution)'\*\*과 \*\*'공정(Workflow)'\*\*의 집합입니다. 각 문서의 역할과 사용법을 정리해 드립니다.

  

1. 

VIBE\_MANIFESTO.md (헌법)

- 역할: 프로젝트의 최상위 원칙과 SDD(Spec-Driven Development)의 철학을 규정합니다.
- 구조: S/W 개발 3대 원칙(YAGNI, KISS, DRY) + SDD 7단계 프로세스.
- 사용법: 프로젝트 시작 전 AI에게 이 파일을 읽게 하여, \*\*"우리는 이 원칙을 준수하며 개발할 것"\*\*임을 선언하는 용도입니다. AI가 멋대로 코드를 복잡하게 짜려고 할 때 "Manifesto의 KISS 원칙을 지켜줘"라고 제지할 수 있는 근거가 됩니다.
  

2. 

01\_README\_GUIDE.md (청사진)

- 역할: 프로젝트의 엔트리 포인트를 표준화합니다.
- 구조: 설치법, 실행법 외에 \*\*'설계 결정 사항(Design Decisions)'\*\*과 '트레이드오프(Trade-offs)' 섹션을 포함합니다.
- 사용법: 새 프로젝트의 ￼README.md￼를 작성할 때 이 가이드를 따릅니다. 특히 '왜 이 기술을 선택했는지' 기록함으로써, 나중에 투입된 AI가 기존 로직을 오해해서 뒤엎는 대참사를 방지합니다.

3. 

02\_SPEC\_PRD\_GUIDE.md (명세서 가이드)

- 역할: "무엇을 만들 것인가?"를 명확히 정의하는 단계입니다.
- 구조: Goal, Core Features, User Flow, Success Metrics.
- 사용법: 코드를 한 줄도 짜기 전에 AI와 함께 PRD를 작성할 때 사용합니다. 가이드에 포함된 \*\*'Clarify(명확화) 질문 루프'\*\*를 통해 AI가 모호하게 이해한 부분을 미리 찾아내어 설계 오류를 차단합니다.

4. 

03\_TASK\_EXECUTION\_GUIDE.md (실행 가이드)

- 역할: 확정된 명세를 실제 코드로 바꾸는 '공정'을 관리합니다.
- 구조: 작업 분해(Task Decomposition) 전략 + 구현 순서(의존성 우선).
- 사용법: PRD가 나오면 이를 AI가 한번에 다 짜게 하지 말고, 이 가이드에 따라 \*\*'작업 목록(task.md)'\*\*으로 쪼개게 시킵니다. 작은 단위로 나누어 구현하고 검증(Incremental Verification)하는 것이 성공률을 높이는 핵심입니다.

5. 

04\_VERIFICATION\_LOGS\_GUIDE.md (검증 및 기록)

- 역할: 결과물의 품질을 보증하고 진행 과정을 기록합니다.
- 구조: 테스트 표준(3개 케이스) + CHANGELOG + PROMPTS 기록.
- 사용법: 개발 완료 후 ￼Analyze￼ 단계에서 사용합니다. 또한 ￼PROMPTS.md￼에 AI에게 시킨 핵심 명령어를 기록해둠으로써, 나중에 비슷한 기능을 만들 때 시행착오 없이 '복사-붙여넣기' 수준으로 재현 가능하게 합니다.
  

💡 실제 활용 시나리오 (New Project 시작 시)

- AI에게 Context 주입: ￼Vibe￼ 폴더 전체를 읽게 하고 "이 가이드라인에 따라 [A라는 앱]을 만들 거야"라고 명령합니다.
- 명세(Step 2-3): ￼02\_SPEC\_PRD\_GUIDE￼에 따라 PRD를 먼저 뽑고, 질문 루프를 돌립니다.
- 계획 및 작업(Step 4-5): ￼03\_TASK\_EXECUTION\_GUIDE￼에 따라 task.md를 만들고 구현에 들어갑니다.
- 검증(Step 7): ￼04\_VERIFICATION\_LOGS\_GUIDE￼에 따라 테스트하고 ￼CHANGELOG.md￼를 업데이트하며 마무리합니다.

이 가이드라인은 AI가 "무엇을 해야 할지 모르거나" 혹은 \*\*"제멋대로 판단하는 것"\*\*을 막는 강력한 가드레일이 될 것입니다. 👿🚀