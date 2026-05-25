---
title: "WIN - Claude code"
notebook: "InterStellar"
section_group: "1_Projects"
section: "MK1"
onenote_id: "0-c21958319ba20c373162be3a7b09d5e8!1-733661839CC53BA5!7919"
---

WIN - Claude code
		
		
	
	
		
			
[Claude ](https://www.youtube.com/watch?v=E6-Yy-UU1iE)3.7 Sonnet과 Claude Code 발표 + Windows에서 Claude Code 설치 방법 
			
[https://cantips.com/3977](https://cantips.com/3977)
			
[https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode)
			
 a default Unix user account: 109386014
			

			
Ne0cean / 137009
			

			
우분투
			

			
❗ 현재 발생한 문제 요약
			
너는 아마 **WSL(Windows Subsystem for Linux)**이나 Ubuntu 터미널 환경에서 작업 중인 것 같아. 그런데 가상환경을 만들고 활성화하려고 venv\Scripts\activate라고 입력했지?
			
그건 Windows CMD 방식이야.
			
Linux/WSL에서는 다른 경로로 활성화해야 해.
			

			
✅ Linux/WSL에서 가상환경 활성화 방법
			
1. 가상환경 만들기
			

			
bash
			
CopyEdit
			
python3 -m venv venv￼
			
2. 가상환경 활성화
			

			
bash
			
CopyEdit
			
source venv/bin/activate￼
			
&#128260; 그러면 터미널 프롬프트 앞에 (venv)가 붙고, 가상환경 상태가 됨.