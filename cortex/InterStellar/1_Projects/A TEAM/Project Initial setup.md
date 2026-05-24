---
title: "Project Initial setup"
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-35779557f4e9950011fd3b1cb1b310b7!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

Project Initial setup
		
		
	
	
		
			

			

			
Trinity 아키텍처: 두뇌(Rules), 감각(MCP), 근육(Skills)의 역할 정의를 통해 작업 효율을 극대화
			

			
&#128640; 신규 프로젝트 워크플로우 
			
				
- 복사 및 붙여넣기: 터미널 환경 세팅은 이 한 줄로 끝납니다.
				
새 프로젝트를 만들고 빈 터미널을 여신 다음,
				

				
명령어를 치면, 깃헙에 있는&#160;vibe-toolkit&#160;안의 모든 파일 구조(.agent,&#160;.context,&#160;tasks,&#160;lessons&#160;등)가&#160;다운로드만 쏙 되어서&#160;사용자님의 빈 프로젝트 폴더에 즉시 풀립니다! (기록이나 찌꺼기 없이 파일만 깔끔하게 가져옵니다)
				

				

				
- 세션 시작 시 (작업 시작할 때):
				

				
- 세션 종료 시 (작업을 마치거나 커밋할 때):￼&quot;오늘 작업은 여기까지야.&#160;/session-end&#160;워크플로우(
				
.agent/workflows/session-end.md)를 실행해서 작업 내용 문서화하고 커밋해 줘.&quot;
				

				

				
이미 시작한 기존 프로젝트 적용 시: 기존 프로젝트&#160;고도화 및 업데이트, 필요한 파일만 골라서 업데이트
				

				
curl -sSL [https://raw.githubusercontent.com/ne0cean/vibe-toolkit/main/upgrade.sh](https://raw.githubusercontent.com/ne0cean/vibe-toolkit/main/upgrade.sh) | bash
				
# curl -sSL [URL]: GitHub에 있는&#160;
				
# upgrade.sh&#160;스크립트 파일의 내용을 내려받습니다.
				
#| bash: 내려받은 내용을 그자리에서 즉시&#160;bash&#160;쉘로 실행합니다.
			
			

			
bash
			
npx degit ne0cean/vibe-toolkit ./
			

			

			
그리고 AI(저나 Cursor 등)에게 바로 이렇게 말씀하시면 됩니다.
			
&quot;새 프로젝트야.&#160;@.agent/workflows/session-start.md&#160;실행해줘&quot;
			

			
/vibe&#160;또는&#160;@vibe.md
			
&quot;작업 시작할게. 먼저&#160;/session-start&#160;워크플로우(
			
.agent/workflows/session-start.md)를 실행해서 현재 프로젝트 상태와 이전 맥락을 완벽히 파악해 줘.&quot;
			

			

			

			

		
		
			
터미널
			
[AI 코딩 에이전트 전용 터미널 cmux, 왜 개발자들이 열광할까요? | 신상 터미널입니다](https://m.youtube.com/watch?v=jGj9yCqN08s&amp;pp=ugU)
			
[https://www.cmux.dev/ko](https://www.cmux.dev/ko)