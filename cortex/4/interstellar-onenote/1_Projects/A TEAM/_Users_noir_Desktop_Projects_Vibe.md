---
title: "/Users/noir/Desktop/Projects/Vibe"
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-0b93550555b43b0c2298528d531784de!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

/Users/noir/Desktop/Projects/Vibe
				
&#160;폴더에 다시 확실하게 저장했습니다.
				

				
이제 다음 파일들이 정상적으로 존재합니다:
				
- VIBE_MANIFESTO.md
				
- 01_README_GUIDE.md
				
- 02_SPEC_PRD_GUIDE.md
				
- 03_TASK_EXECUTION_GUIDE.md
				
- 04_VERIFICATION_LOGS_GUIDE.md
				
작성된&#160;Vibe&#160;시스템은 AI와 인간이 가장 적은 시행착오로 협업하기 위한 **&#39;규칙(Constitution)&#39;**과 **&#39;공정(Workflow)&#39;**의 집합입니다. 각 문서의 역할과 사용법을 정리해 드립니다.
				

				
1.&#160;
				
VIBE_MANIFESTO.md&#160;(헌법)
				
- 역할: 프로젝트의 최상위 원칙과 SDD(Spec-Driven Development)의 철학을 규정합니다.
				
- 구조: S/W 개발 3대 원칙(YAGNI, KISS, DRY) + SDD 7단계 프로세스.
				
- 사용법: 프로젝트 시작 전 AI에게 이 파일을 읽게 하여, **&quot;우리는 이 원칙을 준수하며 개발할 것&quot;**임을 선언하는 용도입니다. AI가 멋대로 코드를 복잡하게 짜려고 할 때 &quot;Manifesto의 KISS 원칙을 지켜줘&quot;라고 제지할 수 있는 근거가 됩니다.
				

				
2.&#160;
				
01_README_GUIDE.md&#160;(청사진)
				
- 역할: 프로젝트의 엔트리 포인트를 표준화합니다.
				
- 구조: 설치법, 실행법 외에 **&#39;설계 결정 사항(Design Decisions)&#39;**과&#160;&#39;트레이드오프(Trade-offs)&#39;&#160;섹션을 포함합니다.
				
- 사용법: 새 프로젝트의&#160;￼README.md￼를 작성할 때 이 가이드를 따릅니다. 특히 &#39;왜 이 기술을 선택했는지&#39; 기록함으로써, 나중에 투입된 AI가 기존 로직을 오해해서 뒤엎는 대참사를 방지합니다.
				
3.&#160;
				
02_SPEC_PRD_GUIDE.md&#160;(명세서 가이드)
				
- 역할: &quot;무엇을 만들 것인가?&quot;를 명확히 정의하는 단계입니다.
				
- 구조: Goal, Core Features, User Flow, Success Metrics.
				
- 사용법: 코드를 한 줄도 짜기 전에 AI와 함께 PRD를 작성할 때 사용합니다. 가이드에 포함된 **&#39;Clarify(명확화) 질문 루프&#39;**를 통해 AI가 모호하게 이해한 부분을 미리 찾아내어 설계 오류를 차단합니다.
				
4.&#160;
				
03_TASK_EXECUTION_GUIDE.md&#160;(실행 가이드)
				
- 역할: 확정된 명세를 실제 코드로 바꾸는 &#39;공정&#39;을 관리합니다.
				
- 구조: 작업 분해(Task Decomposition) 전략 + 구현 순서(의존성 우선).
				
- 사용법: PRD가 나오면 이를 AI가 한번에 다 짜게 하지 말고, 이 가이드에 따라 **&#39;작업 목록(task.md)&#39;**으로 쪼개게 시킵니다. 작은 단위로 나누어 구현하고 검증(Incremental Verification)하는 것이 성공률을 높이는 핵심입니다.
				
5.&#160;
				
04_VERIFICATION_LOGS_GUIDE.md&#160;(검증 및 기록)
				
- 역할: 결과물의 품질을 보증하고 진행 과정을 기록합니다.
				
- 구조: 테스트 표준(3개 케이스) + CHANGELOG + PROMPTS 기록.
				
- 사용법: 개발 완료 후&#160;￼Analyze￼&#160;단계에서 사용합니다. 또한&#160;￼PROMPTS.md￼에 AI에게 시킨 핵심 명령어를 기록해둠으로써, 나중에 비슷한 기능을 만들 때 시행착오 없이 &#39;복사-붙여넣기&#39; 수준으로 재현 가능하게 합니다.
				

				
&#128161; 실제 활용 시나리오 (New Project 시작 시)
				
- AI에게 Context 주입:&#160;￼Vibe￼&#160;폴더 전체를 읽게 하고 &quot;이 가이드라인에 따라 [A라는 앱]을 만들 거야&quot;라고 명령합니다.
				
- 명세(Step 2-3):&#160;￼02_SPEC_PRD_GUIDE￼에 따라 PRD를 먼저 뽑고, 질문 루프를 돌립니다.
				
- 계획 및 작업(Step 4-5):&#160;￼03_TASK_EXECUTION_GUIDE￼에 따라&#160;task.md를 만들고 구현에 들어갑니다.
				
- 검증(Step 7):&#160;￼04_VERIFICATION_LOGS_GUIDE￼에 따라 테스트하고&#160;￼CHANGELOG.md￼를 업데이트하며 마무리합니다.
				
이 가이드라인은 AI가&#160;&quot;무엇을 해야 할지 모르거나&quot;&#160;혹은 **&quot;제멋대로 판단하는 것&quot;**을 막는 강력한 가드레일이 될 것입니다. &#128127;&#128640;