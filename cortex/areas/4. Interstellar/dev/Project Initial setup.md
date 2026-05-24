---
title: "Project Initial setup"
created: 2026-03-07T00:38:40.557Z
modified: 2026-03-07T00:38:40.557Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
onenote_url: "https://onedrive.live.com/redir.aspx?cid=733661839CC53BA5&page=edit&resid=733661839CC53BA5!7896&parId=733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d&wd=target%281_Projects%2FA%20TEAM.one%7C3beb0a10-2ecc-439f-9ac9-2817aadfad77%2FProject%20Initial%20setup%7C009bd437-7f72-e147-b3e3-5caa536d50ac%2F%29"
---

Trinity 아키텍처: 두뇌(Rules), 감각(MCP), 근육(Skills)의 역할 정의를 통해 작업 효율을 극대화

  

🚀 신규 프로젝트 워크플로우

1. 복사 및 붙여넣기: 터미널 환경 세팅은 이 한 줄로 끝납니다.

새 프로젝트를 만들고 빈 터미널을 여신 다음,

  

명령어를 치면, 깃헙에 있는 vibe-toolkit 안의 모든 파일 구조(.agent, .context, tasks, lessons 등)가 다운로드만 쏙 되어서 사용자님의 빈 프로젝트 폴더에 즉시 풀립니다! (기록이나 찌꺼기 없이 파일만 깔끔하게 가져옵니다)

  
  
2. 세션 시작 시 (작업 시작할 때):
  
3. 세션 종료 시 (작업을 마치거나 커밋할 때):￼"오늘 작업은 여기까지야. /session-end 워크플로우(

.agent/workflows/session-end.md)를 실행해서 작업 내용 문서화하고 커밋해 줘."

  
  

이미 시작한 기존 프로젝트 적용 시: 기존 프로젝트 고도화 및 업데이트, 필요한 파일만 골라서 업데이트

  

curl -sSL <https://raw.githubusercontent.com/ne0cean/vibe-toolkit/main/upgrade.sh> | bash

# curl -sSL [URL]: GitHub에 있는 

# upgrade.sh 스크립트 파일의 내용을 내려받습니다.

#| bash: 내려받은 내용을 그자리에서 즉시 bash 쉘로 실행합니다.


  

bash

npx degit ne0cean/vibe-toolkit ./

  
  

그리고 AI(저나 Cursor 등)에게 바로 이렇게 말씀하시면 됩니다.

"새 프로젝트야. @.agent/workflows/session-start.md 실행해줘"

  

/vibe 또는 @vibe.md

"작업 시작할게. 먼저 /session-start 워크플로우(

.agent/workflows/session-start.md)를 실행해서 현재 프로젝트 상태와 이전 맥락을 완벽히 파악해 줘."

터미널

[AI 코딩 에이전트 전용 터미널 cmux, 왜 개발자들이 열광할까요? | 신상 터미널입니다](https://m.youtube.com/watch?v=jGj9yCqN08s&pp=ugU)

<https://www.cmux.dev/ko>