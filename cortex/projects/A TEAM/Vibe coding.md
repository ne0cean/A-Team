---
title: "Vibe coding"
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-07db08141df74c0cbf028e79061ad0ae!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

Vibe coding
		
		
	
	
		
			
				
[Ryan Carson](https://www.lennysnewsletter.com/p/a-3-step-ai-coding-workflow-for-solo)의 [3](https://tilnote.io/pages/68b9d26c1e08f5ca7887b8c2) File system [1](https://github.com/snarktank/ai-dev-tasks) [2](https://lilys.ai/digest/7600493/8327574) [3](https://vibecoders.school/blog/solo-founder-ai-workflow-ryan-carson) - 제품 요구사항(PRD), 작업 리스트(Task 분해), 실행 규칙 파일로 단계적으로 접근
				
[Spec Driven Development](https://news.hada.io/topic?id=22938)([SDD](https://github.com/github/spec-kit/blob/main/spec-driven.md)) [1](https://techbukket.com/blog/spec-driven-development) [2](https://www.youtube.com/watch?v=Ch2dL7i_1pE) [3](https://youtu.be/0h6gfMqpx_0?t=1175)
				
				
TODO PLAN
				
1. PRD(제품 요구사항 문서) create-prd.md : AI가 해당 기능에 대한 제품 요구사항 문서를 생성하도록 안내
				
￼2. PRD를 기반으로 작업 목록 생성 generate-tasks.md: PRD 마크다운 파일을 입력으로 받아 AI가 이를 상세한 단계별 구현 작업 목록으로 분해하도록 가이드
				
3. 할 일 목록을 검토
				

				
4. 작업 지시 및 완료 여부 표시
				
작업 목록의 하위 작업을 하나씩 순차적으로 처리하도록 지시
				
AI 도구에서 AI에게 첫 번째 작업부터 시작하도록 지시하세요(예:&#160;1.1):
				
- 기능정의서 (기능들은 어떻게 작동하는가?) Markdown으로 체크박스 형태로
				
- IA(Information Architecture)와 와이어프레임 (어디에 무엇이 있는가?)
				
[MCPs setup](https://www.youtube.com/watch?v=2epU-ZBTZX8) // [AWS](https://www.youtube.com/watch?v=zRp7o3rcRW0)에서 Antigravity 사용
				

				
&#39;문제 인식, 해결 아이디어 도출, 기획, 디자인, 구현, 테스트, 배포, 홍보, 에러 모니터링, 피드백 수집, 운영…
				
[AI 창작자를 위한 바이브 코딩 커뮤니티](https://vibecode.kr/)
				
					
						
PRD 작성
						
_왜 만드는가￼[ChatPRD](https://www.chatprd.ai/howiai)
						
						
[바이브코딩 시작하는 방법 직접 보여드립니다 (진짜 처음 해본 사람 입장에서)](https://www.youtube.com/watch?v=pJkRenmZXXE)
						
먼저 내가 원하는 기능을 상세히 설명하고 PRD, TRD를 작성해달라고 요청
						
Technical Requirements Document (TRD) 라고 하더라구요 ㅎㅎ 저도 자세히는 모르지만 [vooster.ai](http://vooster.ai/) 에서 보았습니다! 초기 개발 셋업 도와주는 도구예요
						
비개발자를 위한 PRD MAKER [https://idea-to-product-maker.lovable.app/](https://idea-to-product-maker.lovable.app/) Product Requirements Document의 약자로, 제품 요구사항 정의서 
						
(Markdown 형식으로 제작)
						
Google AI studio : [https://aistudio.google.com/prompts/new_chat](https://aistudio.google.com/prompts/new_chat) 챗에서 PRD 만들고
						
					
					
						Pretotyping
						
무료로 Prototyping 테스트
						
Google AI studio : [https://aistudio.google.com/apps](https://aistudio.google.com/apps) 빌드에서 Prototyping
						
(참고는 지우고) 이 PRD를 이용하여 &quot;이터레이션 1: 관리자 페이지&quot;의 프로토타이핑만 먼저 해줘.
						

						
Prototyping 고도화
						
브라우저로 접속해서 대화형 인터페이스와 미리보기를 지원하는 플랫폼:
						
V0 / bolt.new / Replit / Lovable  / firebase studio
						
러버블 [https://lovable.dev/](https://lovable.dev/) - 하루에 5건의 메시지, 한달 최대 30개의 메시지
						
							
- Bolt.new, Replit, Tempo 등은 UI 결과물이 별로
							
- 무료는 아니지만 하루 5번 정도 채팅 사용, UI 잘 만들어주고 수정 쉽고, 슈퍼베이스 같은 DB나 결제 모듈 등을 붙이기에 용이
							
- 러버블 이용한 빌드 사례 [바이브코딩으로 만드는 어썸 데브블로그](https://velog.io/@koeunyeon/%EB%B0%94%EC%9D%B4%EB%B8%8C%EC%BD%94%EB%94%A9%EC%9C%BC%EB%A1%9C-%EB%A7%8C%EB%93%9C%EB%8A%94-%EC%96%B4%EC%8D%B8-%EB%8D%B0%EB%B8%8C%EB%B8%94%EB%A1%9C%EA%B7%B8)
						
						
Replit
						
클라우드 기반의 온라인 IDE로, ‘바이브 코딩’에 최적화된 플랫폼으로 꼽힙니다. Ghostwriter, Agent 등의 AI 도구를 통해 자연어 프롬프트만으로도 앱을 만들 수 있습니다. 복잡한 설정 없이 브라우저에서 바로 개발을 시작할 수 있어 초보자에게도 친숙
						
풀스택 구현에 뛰어남. 네비게이션, 데이터 지속성, 시각화를 포함한 거의 출시 준비가 된 앱을 구축
						
강점: 웹 프런트엔드 개발에 특화되어 있으며, 실시간 협업과 쉬운 배포 기능을 제공
						
추천 환경: 기술 팀이 없는 초기 스타트업, 교육 기관, 완전한 비개발자 팀이 빠른 MVP 구축을 원하는 경우
						

						
					
					
						
TODOs.md
						
&amp; 
						
시스템 프롬프트(Cursor Rules 등)
						
												
							
1/ 스펙을 쪼개서 이터레이션 3단계로 쪼개고
							
2/ TO-DO를 통해서 누락된 것이 없도록 점검하도록 지시 
							
내가 업로드한 PDR과 구현된 내용을 비교해서 구현 완료된 것과 구현 완료되지 않은 것을 TODOs.md에 저장해주고 PRD도 MD파일에 저장해줘. 그 다음 PRD도 별도의 MD 파일에 저장해줘.
							

							
								
- 파악한 기술 키워드나 데이터 흐름을 시스템 프롬프트(Cursor Rules 등)로 AI에게 알려주는 것
								
- 나의 개입 횟수를 줄이고, AI의 코드가 내 마음에 더 들게 하려면 크게 두 가지가 필요함. 제약조건과 문서화에 대한 지침임
								
- 
제약조건 지침은 AI가 더 일관된 코드를 쓰도록 도움. 예를 들어:
								
									
- 기술 스택: NextJS app router 써라, Tailwind와 ShadCN으로 스타일링해라, 아이콘은 Lucid만 써라, 결제는 Stripe 써라 등
									
- 구조와 패턴: 폴더는 이렇게 구성해라, 파일명은 이렇게 지어라, UI 스타일은 Material처럼 해라 등
									
- (실행 환경에 따른) 출력 형식: Electron Fiddle을 쓸 거니까 그에 맞춰 파일 4개를 줘, CodePen을 쓸 거니까 HTML, CSS, JS를 하나씩 줘 등
								
								
								
- 
문서화 지침은 AI의 집중력과 기억력을 향상시키도록 도움. 두 가지 아이디어가 아주 유용했음
								
									
- [Cline의 메모리 뱅크](https://cline.bot/blog/memory-bank-how-to-make-cline-an-ai-agent-that-never-forgets): 한 일과 할 일들을 파일에 기록하며 작업하는 워크플로우를 정의
									
- [강동윤님의 프롬프트 컨텍스트](https://kdy1.dev/2025-3-12-prompt-context-kr): 전체 프로젝트에 대한 지침을 최상위 폴더에 길게 남기는 대신 폴더별로 지침을 만듦
								
								
								
- 메모리 뱅크는 현재 무슨 일이 일어나는지 관찰과 학습이 쉬워지니, 비개발자에게 특히 추천
							
							

							
기능이 스펙대로 동작한다?
							

							
- 
기능이 스펙대로 동작하게 만드는 가장 좋은 전략은&#160;테스트 통과하면 커밋이라고 생각
							
								
- &quot;X를 구현해줘. 테스트 먼저 작성하고, 코딩한 다음, 테스트를 돌려보고, 통과할 때까지 계속 코드를 수정해줘.&quot;
							
							
							
- 그렇게 테스트를 통과하면 커밋 메시지를 제안받아서, 테스트 코드와 기능 코드를 함께 커밋하면 됨. 나는 커밋을 직접 하지만 에이전트가 자동 커밋도 가능
							
- 유닛 테스트뿐 아니라 통합 테스트, E2E 테스트도 AI가 짜고, 실행하고, 알아서 고치게 할 수 있음 (참고:&#160;[Cursor + Playwright 자동화 테스트](https://devocean.sk.com/blog/techBoardDetail.do?ID=167378))
							
- 이 모든 게&#160;&#39;스펙대로 개별 기능이 구현되고, 전체 앱이 PRD대로 동작하는가&#39;&#160;를 바이브 코더와 AI 양측이 더 쉽게 확인하도록 만들어주는 전략임
							
- 바이브에 완전히 몸을 맡기기보다는 (메모리 뱅크, 테스트 코드 등을 통해) AI가 생성해주는 문서들을 보며 코딩 자체도 공부하길 권함. 개발자에게 코칭도 받아보고.
							

							
&#160;[특정 문제를 탁월하게 해결하는 작고 빠르며 유용한 도구](https://www.stdy.blog/the-most-amazing-ai-demo-in-2025) (예시)
							출처: &lt;[https://news.hada.io/topic?id=20476](https://news.hada.io/topic?id=20476)&gt; 
							

							
UX/UI 디자인시스템 정의 [AI](https://www.youtube.com/watch?v=RnJkhxFMWDY)로 디자인 진짜 잘하는법
							

							

						
						

						
AI가 더 똑똑해진다?
						

						

						

						출처: &lt;[https://news.hada.io/topic?id=20476](https://news.hada.io/topic?id=20476)&gt; 
						

						

						
						

						
					
					
						
Prototyping &amp;
						
MVP
						
						
실제 작동하는 제품 만들어서 운영
						
Cursor, Windsurf, Claude Code처럼 좀 더 고도화된 개발 도구를, Kiro [https://kiro.dev/](https://kiro.dev/)
						
특히 백엔드 로직이나 전체 시스템 구조를 짜는 데 강력한 성능
						
But, 커서나 윈드서프, 코파일럿 같은 제품은 애시당초 로컬에서 동작
						

						
러버블 코드를 다운 받아서 커서에 입력 
						
커서는 가격이었어요. (+ 웹기반 바이브코딩 툴은 MCP 연동도 없었고요.) Bolt, Lovable은 100-150회당 20달러 수준인데, Cursor나 Windsurf는 500회에 15-20달러￼
						
웹기반 바이브코딩 툴(Bolt, Lovable, Tempo)은 전부 Next.js 기반 웹앱을 만드는 데 최적화된 반면, Cursor는 안드로이드, iOS 앱을 만드는 것도 꽤 지원이 잘되어 있었어요.
						
					
					
						배포
						
바이브코딩으로 만든 사이트 배포
						
[https://replit.com/](https://replit.com/) or 버셀
						
					
				
				

				
요즘 바이브코딩 프로세스
				
1. PRD 작성 - 이것도 AI한테 시킴, 3줄정도로만 크게 던지고 PRD 읽으면서 필요없는거 지우고 이상한 내용 수정 - 무조건 읽어야함
				
2. TaskMaster로 테스크 분리 - TaskMaster MCP로 퍼플렉시티 API 통해 복잡도 측정 - 6점 이상 복잡도 서브 테스크로 확장
				
3. 최적화&amp;SEO 테스크 제외하고 프론트, 백엔드, UI&amp;UX 디자인 에이전트 통해 개발 - 사용한 프롬프트 &quot;UI&amp;UX 디자인 에이전트랑 프론트 엔드 개발 에이전트를 통해서 퍼블리싱 부분만 개발하고 개발이 다 완료되면 playwright MCP 통해서 모든 페이지들이 버그가 안나는지 검수까지해줘 만약 중간에 개발자만이 할수있는 작업있으면 멈춰서 자세히 세팅하는 방법에 대해서 알려줘&quot; - 웹 개발인경우 playwright MCP 검수 요청까지하면 에러 없이 페이지 개발함
				
4. SuperClaude를 통해 세세하게 수정 또는 직접 코드 수정
				
[https://www.threads.com/@_ju_tiger_lee_/post/DNkQeCryPQu?xmt=AQF0ap2pw2b_gFw2y2b0b7xvTVZruzQKdspWC_cNXPZjXA](https://www.threads.com/@_ju_tiger_lee_/post/DNkQeCryPQu?xmt=AQF0ap2pw2b_gFw2y2b0b7xvTVZruzQKdspWC_cNXPZjXA)
				

				
- 
				
				

				
-  0 to 1 방 대 한 요 구 사 항 을 시 각 화 하 고 정 리 하 기 위 함 
둘 다 -> 실 제 프 롬 프 트 가 있 음 
한 명 령 으 로 정 리 
- 어 떤 회 사 가 금 융 회 사 인 지 알 고 있 음 -> 이 정 보 줘 야 함 
행 동 들 
- /docs/PRD.nd 를 넣 어 줘 
- TODOs.md 를 분 해 해 서 /docs/iterations/ 에 넣 어 줘 
- 금 융 회 사 들 의 프 롬 프 트 제 목 목 록 에 서 괜 찮 아 보 이 는 걸 찾 아 서 
- /docs/iterations/1.md 
보 고 , 일 부 를 복 사 해 옴 
- 이 렇 게 했 는 데 도 아 이 디 어 가 부 족 하 다 고 생 각 
- 검 색 된 프 롬 프 트 양 이 부 족 함 (3 개 이 하 ) 
- /docs/PRD.md 는 knowledge file 에 넣 기 
그 다 음 
- 프 롬 프 트 가 내 상 황 과 부 합 되 는 지 여 부 
- 파 일 삭 제 
충 분 히 얘 기 를 나 눴 으 면 코 딩 에 이 전 트 가 구 현 . 
Lovable 에 서 그 계 획 을 가 져 온 다 음 
마 크 다 운 문 서 로 만 들 어 줘 
- 이 계 획 대 로 구 현 해 주 는 데 , 계 획 은 /docs/iterations/q.md 에 넣 어 줘 
- 그 계 획 대 로 구 현 해 줘 " width="480" height="225" src="https://graph.microsoft.com/v1.0/users('realpage@naver.com')/onenote/resources/0-a940bf056a17350600fa78871ca4b750!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d/$value" data-src-type="image/png" data-fullres-src="https://graph.microsoft.com/v1.0/users('realpage@naver.com')/onenote/resources/0-a940bf056a17350600fa78871ca4b750!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d/$value" data-fullres-src-type="image/png" />
				
				
- [바이브코딩으로 대충 말고, 제대로 된 서비스 만드려면 꼭 알아야 할 포인트 짚어드립니다](https://www.youtube.com/watch?v=XWQdTbAtfLw)
				
- ￼각종 프롬프트 엔지니어링 가이드를 보면 공통적으로 언급하는 게 프롬프트 안에 역할(Role), 맥락(Context), 작업(Task)을 잘 정의하라는 것
				
역할, 맥락, 작업
				
- 
바이브 코딩에서 &#39;역할&#39;은 엄청 중요하지 않음
				
					
- 코딩 에이전트들에 이미 적절한 역할이 정의되어 있어서 꼬일 수 있고
					
- 코딩이 중요한 벤치마크라서인지 LLM에서도 역할 부여 없이 코딩 잘 하기 때문
					
- 물론 내가 만들려는 앱이 특별하다면 적절한 역할을 주는 것도 좋음
				
				
				
- &#39;맥락&#39;은 PRD 잘 만들었으면 충분
				
- 
&#39;작업&#39;은 목표와 완료기준을 잘 정하는 것. 완료기준은
				
					
- 프롬프트 내에 명시되어있을 수도 있고([few-shot 프롬프팅](https://www.promptingguide.ai/techniques/fewshot))
					
- 외부 파일이나 코드에 정의되어있을 수도 있고(TODOs.md&#160;나 테스트 코드)
					
- 내 머릿속에만 있을 수도 있음(이 스타일은 예쁘지 않아)
				
				
				
- 
바이브 코딩의 궁극적 목표는&#160;AI가 잘 코딩하도록 지시해서 PRD대로 동작하는 앱을 빠르게 만드는 것. 이를 위해선 3가지 중간목표를 삼는 게 좋음
				
					
- 내가 더 똑똑해진다
					
- AI가 더 똑똑해진다
					
- 기능이 스펙대로 동작한다
				
				
				

				출처: &lt;[https://news.hada.io/topic?id=20476](https://news.hada.io/topic?id=20476)&gt; 
				

				
Cursor terminal에서 Cursor Agent를 같이 쓰는데 각각의 용도가 있어 맞춰 사용하면 아주 편리 합니다 ~~거기에 검증용, 반복수정지옥에서 탈출 하기 위한 수단으로 chatGPT Opus4이 멍청해질때가 있어서 open AI cotext등등으로 썩어 쓰면 직원3명 고용한 효과가 납니다~~Supabase는 Auth기능 까지 있어 좋지만 저는 결국 AWS RDS My SQL로 터닝했습니다.
				

				출처: &lt;[https://www.threads.com/@sihyun_adventure/post/DL47sadyNtG?xmt=AQF0Z_XsDlUvuNkDxAMyQcaGQajdifn32Cf0mRMtBPvMQg](https://www.threads.com/@sihyun_adventure/post/DL47sadyNtG?xmt=AQF0Z_XsDlUvuNkDxAMyQcaGQajdifn32Cf0mRMtBPvMQg)&gt; 
				

				
검색 대신 ChatGPT와 AI IDE(Windsurf, Cursor 등)에 먼저 묻고,
				
나온 코드를 바로 돌려본 뒤 프롬프트로 수정&#183;재시도를 반복하는&#160;대화 중심&#160;방식이 기본이 됐어요.
				
&#160;
				
‘검색 중심 → 대화 중심’ &#160;전환은,&#160;생각했던 것보다 더 ‘지식 노가다’ 입니다.
				

				

				
하나의 Task가 끝나면
				
md 문서에 기록하거나 노션에 내용을 정리해두고,
				
CursorRules에도 Brand Identity 내용을 명시해뒀어요.
				
&#160;
				
그리고 제 제품에 브랜드 컬러를 자동으로 맞춰주는 기능까지 넣어서,
				
색상 구현이 필요할 때 마다 직접 HEX 코드를 전달
				

				
설계, 아키텍쳐 구조를 만들지 않고 코드부터 짰더니 프로젝트가 산으로 가더라구요.
				

				
이제는 Claude Code와 긴 대화를 먼저 합니다.
				

				
“어떤 컴포넌트가 필요한지, 데이터는 어떻게 흘러가는지, 폴더 구조는 어떻게 가져갈지”
				

				
 
				

				
아키텍처 설계를 문서로 먼저 정리하고 시작했죠.
				

				
그랬더니 결과는 달라졌어요.
				

				
 
				

				
components, hooks, services, types, utils처럼 구조가 체계적으로 나뉘니까,
				

				
새로운 기능을 붙여도 기존 코드가 깨지지 않았습니다.
				

				
AI도 명확한 가이드라인 안에서 일관성 있게 응답했어요.
				

				
[https://eopla.net/magazines/33674#](https://eopla.net/magazines/33674#)
				

				

				

				
[https://news.hada.io/topic?id=22882&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=22882&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)
				

				
[Vibe coding tools](https://www.instagram.com/reel/DGO-IW_NWuD/?igsh=eWdvM2hyM3lkODM1)
				
[바이브 코딩 툴](https://www.perplexity.ai/search/hyeon-sijeom-vive-cordingeul-w-zXRlq0f7QACDcud.DQ3rew)
				
[커서 할인](https://www.perplexity.ai/search/keoseo-ai-muryo-gudog-hogeun-h-SQvkZOMHQbG.TLi00UnNRw)
				
[커서](https://apidog.com/kr/blog/free-cursor-ai-kr/) 무료 사용
				
[딸깍](https://www.instagram.com/reel/DKOlsWit-fu/?igsh=MTk0OTdvOWhjaGIxYw==)-디자인: 구글 스티치
				

				
퍼플렉시티 기획 - 볼트 - 커서
				
크리에터 헌트, Build in public 
				

				
레플릿/볼트 - MVP 제작
				

				
개발 경험이 풍부하고 복잡한 서비스를 원하며 모든 과정을 컨트롤하고 싶다면 VS Code나 Cursor, Windsurf와 같은 로컬 IDE 환경을, 비개발자이거나 코딩에 능숙하지 않다면 Replit이나 러바블과 같은 클라우드 IDE 환경을 추천
				

				
PRD(제품 요구 사항 문서)와 와이어프레임을 먼저 만들고, 이를 바탕으로 Replit에 요청하면 더 좋은 결과물을 얻을 수 있습니다.
				

				
- 바이브 코딩에서는 TDD 방식(테스트 주도 개발)을 통해 모듈을 만들어 기능을 테스트하고, 이를 조합하는 형태로 진행한다. 이는 LM이 제대로 동작할 수 있도록 기반을 마련하는 과정이다. 
				
- 레플릿은 문제 발생 시 즉각적인 백업과 롤백을 강조하며, 앤드류 응 교수님의 조언을 인용하여, 테스트 과정에서 스크린샷을 통해 구축된 내용을 점검하는 방식이 다른 도구와 차별화
				
커서는 사용자가 중간에 개입할 수 있는 기능을 제공하며, 이를 통해 코드 초안 작성과 수정이 용이하다 .
				

				
digList
				
젠스파크는 초보자 가이드를 만드는 데 활용되며, 콘텐츠를 미리 작성해 배포하는 데 용이한 도구로 평가된다 .
				

				
파이어베이스 스튜디오는 주로 서버 배포에 사용되며, 비개발자도 부담없이 사용할 수 있는 강력한 무료 티어를 제자 가이드를 만드는 데 활용되며, 콘텐츠를 미리 작성해 배포하는 데 용이한 도구로 평가된다 .
				

				
파이어베이스 스튜디오는 주로 서버 배포에 사용되며, 비개발자도 부담없이 사용할 수 있는 강력한 무료 티어를 제공
				

				

				
뷸안정한 코드의 축적이 위험하다는 점을 강조하며, 이를 방지하기 위해 개발 진행 시 틀린 부분에서 바로 이어지는 것이 아닌 이전 상태에서 시작하는 방식이 효과적
				

				출처: &lt;[https://lilys.ai/digest/4261407/3191162](https://lilys.ai/digest/4261407/3191162)&gt; 
				

				

				

				

				
[바이브코딩](https://www.instagram.com/reel/DJrWWQZphsP/?igsh=MTIzN3BzaThyM2djeA==) 
				

				
[https://www.instagram.com/reel/DJq8yX6Rq35/?igsh=MWI1MGZwcnUyc3pmaQ==](https://www.instagram.com/reel/DJq8yX6Rq35/?igsh=MWI1MGZwcnUyc3pmaQ==)
				

				
[https://www.instagram.com/reel/DHqyMH9MPnP/?igsh=MWdpbG44cW9meGhjNQ==](https://www.instagram.com/reel/DHqyMH9MPnP/?igsh=MWdpbG44cW9meGhjNQ==)
				

				
[https://youtu.be/yj5E6K7OXeI](https://youtu.be/yj5E6K7OXeI)
				

				
[https://www.threads.com/@choi.openai/post/DJ4w0HQzAOg?xmt=AQF0Cf5xDdsyFGlUffg6beeFXjK1ROMiG1Rz6Nteyw_NwA](https://www.threads.com/@choi.openai/post/DJ4w0HQzAOg?xmt=AQF0Cf5xDdsyFGlUffg6beeFXjK1ROMiG1Rz6Nteyw_NwA)
				

				
[▲](http://javascript:vote(18523,%20%22up%22);)[소프트웨어 개발을 위한 생성형 AI 강좌](https://www.deeplearning.ai/courses/generative-ai-for-software-development/)
				
&#160;출처: &lt;[https://news.hada.io/topic?id=18523&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=18523&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
				

				
[▲](http://javascript:vote(19859,%20%22up%22);)[GN⁺: AI Blindspots – AI 코딩 중에 발견한 LLM의 맹점들](https://ezyang.github.io/ai-blindspots/)
				\출처: &lt;[https://news.hada.io/topic?id=19859&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=19859&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
				

				
[▲](http://javascript:vote(18523,%20%22up%22);)[소프트웨어 개발을 위한 생성형 AI 강좌](https://www.deeplearning.ai/courses/generative-ai-for-software-development/)
				
&#160;(deeplearning.ai)
				출처: &lt;[https://news.hada.io/topic?id=18523&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=18523&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
				

				
[https://news.hada.io/topic?id=20056&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=20056&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)
				

				
v0와 같은 AI 코드 빌더 시장은 급속도로 성장하고 있다. Lovable, webflow, bolt.new 등
				

				출처: &lt;[https://brunch.co.kr/@moomb/25](https://brunch.co.kr/@moomb/25)&gt; 
				

				
2️⃣&#160;Text-to-Web App 플랫폼&#160;: 비개발자도 사용할 수 있는 도구(예:&#160;[Bolt](https://bolt.new/)&#160;#48,&#160;[Lovable](https://lovable.dev/))
				

				출처: &lt;[https://eopla.net/magazines/27256#](https://eopla.net/magazines/27256#)&gt; 
				

				
[https://news.hada.io/topic?id=20505&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=20505&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)
				

				
[Cursor, V0, ChatGPT ](https://www.youtube.com/watch?v=4RCBcV2Ucpo)조합이면 코딩 시간 절반으로 줄일 수 있습니다.
				

				
패캠 바이브코딩 강의
				
[https://fastcampus.co.kr/data_online_vibecoding](https://fastcampus.co.kr/data_online_vibecoding)
				
______________
				

				
최종 실행 단계
				
모든 파일을 저장한 후, 다음 명령으로 프론트엔드 애플리케이션을 실행합니다:
				

				
bash
				
복사
				
cd /Users/noir/Desktop/cerebro-project/frontend￼npm start
				

				
[https://news.hada.io/topic?id=20068&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=20068&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)
				

				
코디움 윈드 서프
				

				
AI 웹사이트 빌더 도구별 체험 결과
				
Cursor
				
					
- Cursor 앱 설치 및 GitHub 연결 필요
					
- 명령어 실행과 Git 연동 등&#160;기술적인 작업이 많음
					
- 외부 링크를 통해 미리보기 제공
					
- 결과물은 기존 구성요소를 재배치한 수준으로&#160;창의적 제안은 부족
					
- 간단한 웹페이지 제작에는 너무 복잡한 설정 필요
				
				
v0 by Vercel
				
					
- UI가 세련되고 사용하기 쉬움
					
- 프로젝트 히스토리 저장 및 전환 기능 제공
					
- 채팅 중&#160;실시간 미리보기&#160;제공, 변경사항에 잘 반응함
					
- 공유 링크 기능이 있어&#160;피드백 수집이 쉬움
					
- 다양한 앱과 컴포넌트 라이브러리도 제공 (테스트에선 미사용)
				
				
Lovable
				
					
- 매우 간단한 인터페이스 (채팅창 + 미리보기)
					
- 직접적인 컨트롤은 제한적이지만,&#160;최소 입력으로도 고품질 콘텐츠 생성
					
- 메시징 능력에서 가장 인상적인 결과
				
				
Bolt.new
				
					
- Lovable과 유사한 UI지만&#160;결과물이 더 단순
					
- 디자인이나 콘텐츠 품질이 떨어지며&#160;뛰어난 점은 없음
					
- 실시간 미리보기는 가능하지만&#160;창의성, 품질 모두 부족
				
				

				
					
- Cursor를 제외한 도구들은 모두&#160;비개발자도 쉽게 사용 가능
					
- 결과물은 대부분&#160;전문적이지만 단조로움, 더 구체적인 프롬프트를 주면 나아질 가능성 있음
					
- AI 환각 없음, 생성된 내용은 모두 논리적이고 적절함
					
- 모든 플랫폼에서&#160;코드 확인 및 수정 가능, 개발 협업에 유리
				
				
					
- Cursor: 개발자 친화적이지만 간단한 웹사이트 제작엔 과함
					
- v0 by Vercel: 최고의 UX와 실용성, 향후에도 실험해보고 싶은 도구
					
- Lovable: 메시징 중심 콘텐츠 생성에 강점
					
- Bolt.new: 단순함 이상의 가치를 주지 못함
				
				

				
&#160;Vercel 등과 같은 플랫폼과의 연동을 통해 배포 과정도 훨씬 간편
				

				
빠른 프로토타이핑과 초기 검증에는 바이브 코딩을 활용하고, 방향이 확정되면, 즉 프로덕트 딜리버리 관점에서 확신이 생기면 핵심 기능은 전통적인 개발 방식으로 재구성하는 하이브리드 전략
				

				
최근 실제로 AI 기반 바이브 코딩만으로 SaaS 서비스를 구축한 창업자가 구독 시스템 우회, API 키 남용 등의 문제를 겪으면서 제품이 다운되는 사례가 있었다. 엔지니어링 배경이 없는 창업자였고, 기본적인 인증 및 보안 개념에 대한 이해 없이 AI가 생성한 코드를 배포한 상태였다.
				
제가 바이브 코딩으로 만든 프로토타입도 같이 공유해봅니다 :)
				
- PM을 위한 프롬프트 모음:&#160; [https://pm-prompt.vercel.app/](https://pm-prompt.vercel.app/)&#160;(Vercel의 V0와 Cursor로 만든 프로토타입)
				
- 키즈 퀴즈, 어린이를 위한 퀴즈:&#160; [https://kiz-quiz.vercel.app/](https://kiz-quiz.vercel.app/)&#160;(Vercel의 V0 모바일 버전으로 만든 프로토타입)
				
- 이밖에 AI Book Writing Assistant 및 CrewAI 기반 AI Agent 등 몇가지 프로토타입을 시도해봤습니다.
				
Links&#160;
				
- Linkedin:&#160; [https://www.linkedin.com/in/yongjinjin/](https://www.linkedin.com/in/yongjinjin/)
				
- Instagram:&#160; [https://www.instagram.com/pm.lens](https://www.instagram.com/pm.lens)
				
- NewLetter:&#160;[https://maily.so/7ish](https://www.youtube.com/redirect?event=video_description&amp;redir_token=QUFFLUhqbDFQMVRkRDRSSGdaZzZ5UmlTZDUwbEo2WXlVd3xBQ3Jtc0tuRk8tdHJQZ2FLeEJya3VjN3l6VW1FOVFvQWZQYk1yQXcxVXZYTkJ4UU9pdTZDVklMT1BjVzhfWlN5SUUyS0tIRFZNamNURWFLa0Nha0RhMFZONWZDSDd3NjlBdlVJZnQ0NWJ0dFg0bTdJYndkQm9wcw&amp;q=https%3A%2F%2Fmaily.so%2F7ish&amp;v=lQ2Fn7D7fs0)&#160;
				

				
[Replit](https://replit.com/)  써보기
			
			
왜 이 제품을 만드는가? 무엇을, 누구를 위해, 그리고 왜 만드는지
			
Use @create-prd.md
			
Here&#39;s the feature I want to build: [Describe your feature in detail]
			
Reference these files to help you: [Optional: @file1.py @file2.ts]
			
PRD 초안(예:&#160;MyFeature-PRD.md)이 작성되면 다음 단계는 AI 개발자를 위한 상세하고 단계별 구현 계획을 수립
			
Now take @MyFeature-PRD.md and create tasks using @generate-tasks.md
			
(참고:&#160;@MyFeature-PRD.md1단계에서 생성한 PRD 파일의 실제 파일 이름으로 변경
			

			

			
Please start on task 1.1 from the generated task list.
			

			

			

			

			

			

			출처: &lt;[https://news.hada.io/topic?id=20476](https://news.hada.io/topic?id=20476)&gt; 
			

			

			출처: &lt;[https://www.threads.com/@sihyun_adventure/post/DL47sadyNtG?xmt=AQF0Z_XsDlUvuNkDxAMyQcaGQajdifn32Cf0mRMtBPvMQg](https://www.threads.com/@sihyun_adventure/post/DL47sadyNtG?xmt=AQF0Z_XsDlUvuNkDxAMyQcaGQajdifn32Cf0mRMtBPvMQg)&gt; 
			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			

			출처: &lt;[https://lilys.ai/digest/4261407/3191162](https://lilys.ai/digest/4261407/3191162)&gt; 
			

			

			

			

			

			

			

			

			

			

			\출처: &lt;[https://news.hada.io/topic?id=19859&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=19859&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
			

			출처: &lt;[https://news.hada.io/topic?id=18523&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=18523&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
			

			

			

			출처: &lt;[https://brunch.co.kr/@moomb/25](https://brunch.co.kr/@moomb/25)&gt; 
			

			

			출처: &lt;[https://eopla.net/magazines/27256#](https://eopla.net/magazines/27256#)&gt; 
			

			

			

			

			

			

			

			

			
&#128161;&#160;개발자 중심, GitHub 연동 강점
			
&#128161;&#160;가장 우수한 사용자 경험과 기능 제공
			
&#128161;&#160;콘텐츠 생성 및 메시지 전달력 뛰어남
			
&#128161;&#160;가장 간단하지만 결과물은 가장 미흡
			

			
전반적인 소감
			
최종 평가 요약
			

			

			

			

		
		
			
				
					Codex
					

					
				
				
					Lovable
					Bolt.new, Replit, Tempo 등은 UI 결과물이 별로
				
				
					Cursor
					

					
				
			
			

			
1. 커서 준비물 등록 - 문서, MCP, Cursor Rule
			

			
우선 Cursor는 사전에 여러 준비물이 필요하더라고요. 그 중 가장 좋은 것은, 역시 Supabase MCP와 Docs
			

			
커서 룰(Rule)이나 참고 문서(Docs)를 세팅해주면 좋더라고요. AI가 코딩할 때 미리 참고할 수 있도록, 개발에 필요한 api나 문서를 등록해주어 빠르고 쉽게 개발할 수 있도록 도와주는 사전 대비가 중요
			

			
2. 기획 / PRD(요구사항 기획서) 커서에 등록시키기
			
처음 Lovable이나 Replit으로 바이브코딩 할 때는 &#39;그냥 이거 만들어줘&#39;하며 대화 형태로 전부 구축했는데요. 사실 이는 올바른 접근 방법은 아니었습니다.
			
전체적인 서비스 구조를 아주 기본적으로라도 미리 설정하고 가는것이 훨씬 빠른 길이었어요. 뼈대 없이 시작하면 굉장히 빈약한 서비스로 마무리 되는 경험을 자주 했거든요.&#160;그래서 이 부분은 ChatGPT와 함께 IA(정보 구조)를 빠르게 만들고, PRD 문서를 만들어 커서에 문서로 만들어(prd.md 파일 생성) 참조시켜 서비스를 만들었습니다.
			
			
ChatGPT가 파일 구조, 개발 순서도 전부 짜주었습니다. 편했어요.
			

			
3. 디자인 / 피그마 + ShadCN 활용
			
저는 전문 디자이너이기에, 전체 디자인을 AI에게 맡길 수 없었어요. 디자인만큼은 묘하게 타협할 수가 없겠더라고요. 그래서 피그마로 실제 앱에 들어갈 화면을 간단하게 디자인했죠. PC 웹, 모바일 앱을 구분하여 제작했습니다.
			
			
직접 제작한 모바일 버전 앱 디자인
			

			
정말 간단하고 디자인이 굳이 필요없는 화면은 ShadCN이나, Tremor 등의 UI 라이브러리를 가져오면 편했습니다. 
			

			
4. 프론트엔드 / Dev mode의 코드 붙여넣기 + Builder.io
			
Figma MCP로 프론트엔드 바로 가능할까? 싶었는데요. 생각보다 별로였어요.&#160;어떻게 할까 고민하다가, 그냥 Figma Dev mode에 있는 코드를 Ctrl+V하여 넣어버렸습니다. 코드에 더해, &#39;완성된 스크린샷&#39;을 피그마에서 더해 맥락을 강화시켜주었습니다. 잘 되더라고요.
			
			
Figma Dev mode의 코드를 Cursor에 붙여넣었어요.
			

			이후엔, Builder.io라는 플러그인을 발견하였는데요. 아주 편하더라고요. 이미지도 svg로 다 잘 뽑아주고요. 그래서일까, 프론트엔드가 생각보다 어렵지 않았습니다.
			
			
Builder.io로 피그마에서 커서로 쉽게 프론트엔드 코드 변환
			
&#160;
			

			
5. 백엔드 / Supabase MCP
			
디자이너인 제게 가장 큰 문제는 백엔드, 결제연동 등이었습니다. 기획, 디자인, 마케팅만 잘해왔던 제게 백엔드는 아주 생소한 영역이었는데요. 사실 이것도 크게 고민할 필요가 없었어요.
			
Supabase가 기본 DB를 전부 설계해주었고, Auth(로그인)도 아주 빠르게 해결해주었기 때문이죠. 카카오 로그인까지 지원한다는 게 정말 대단히 편리하더라고요.
			
			
다만 Supabase를 활용하더라도, DB/테이블 관리 및 설계 지식이 필요하다는 것을 절감했습니다.&#160;어떻게 관리하고 설계하는지 가장 좋을지, 주변 백엔드 개발자 분들께 배우고 있는 과정이랍니다.
			
			
Supabase에서 데이터 DB 구조를 시각화해서 보고, 수정도 다 가능하더라고요.
			

			
6. 해외 결제 구현 / Polar.sh
			
결제는 Polar를 활용해보았습니다. 해외 결제는 Stripe가 안되니 Polar로 우회해보고 있는데요. 수수료가 좀 비싸요.&#160;제가 비개발자라 연동 과정이 쉽지만은 않았는데, 절차를 ‘완벽하게 지킬 것’을 AI에게 주문하니 잘 연동시켜주었어요. 문서도 잘 학습시켜주었죠. 한 3-4시간을 쩔쩔 매다가, 결제가 돌아가는 것을 보니 &#39;아름답다&#39;고 느꼈습니다.
			
			
polar.sh로 구현한 결제화면
			
&#160;
			
Polar는 연동 직후 본사 직원이 &#39;이거 무슨 서비스인가요?&#39; 하면서 이메일이 오더라고요.&#160;결제는 연동만해도 가능했는데, 한국에 송금을 하는 것은 심사가 필요했습니다. 이 부분은 나중에 자세히 더 풀어볼게요!
			
			
Polar에서 온 검증 메일
			

			
6. 배포 / Vercel로 바로 배포
			
그렇게 잘 만든 서비스는 Vercel로 쉽게 배포하였어요.&#160;Vercel이 기본적으로 Cursor와 찰떡 궁합이기 때문에, 굳이 Github를 연동하지 않고도 빠른 빌드가 가능했습니다.&#160;버전 관리를 하려면 당연히 깃헙을 연결해야겠지만, 당장은 하지 않아도 라이브로 서비스를 이용할 수 있었어요.
			
			
저는 비개발자라 &#39;그냥 vercel로 배포해&#39;라고 하니 알아서 이것저것 해주었고, 배포를 빠르게 했어요.
			

			출처: &lt;[https://eopla.net/magazines/29583#](https://eopla.net/magazines/29583#)&gt; 
		
		
			
[프로젝트](https://jjeongil.tistory.com/2949#google_vignette) 폴더 정리
		
		
			
[구글](http://14만원에 구글 AI Pro 1년) 구독