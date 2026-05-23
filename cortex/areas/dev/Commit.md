---
title: "Commit"
created: 2026-01-27T23:53:26.104Z
modified: 2026-01-27T23:53:26.104Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
onenote_url: "https://onedrive.live.com/redir.aspx?cid=733661839CC53BA5&page=edit&resid=733661839CC53BA5!7896&parId=733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d&wd=target%281_Projects%2FA%20TEAM.one%7C3beb0a10-2ecc-439f-9ac9-2817aadfad77%2FCommit%7Ca8aea726-6b07-e64c-b355-fa01ab112b76%2F%29"
---

<https://www.perplexity.ai/search/jib-pceseo-sseudeon-antigeurae-18vlWCDFQb6CRPYwiw_LLg>

  
  
  

1. 직접 실행할 때 (터미널):

   - 터미널에서

   ./scripts/model-exit.sh 라고 입력하고 엔터를 치세요.

   - 입력 즉시: \*\*[최종 커밋 + 맥락 압축 + 클립보드 복사 + 알림]\*\*이 한꺼번에 수행됩니다.
2. 에이전트에게 시킬 때 (채팅):

   - \*\*"/model-switch"\*\*라고 한마디만 하세요. 제가 알아서 스크립트를 실행하고 준비를 마친 뒤 알려드립니다.
3. 에이전트가 먼저 제안할 때 (자동):

   - 제가 판단하기에 사용량이 거의 다 되었거나 맥락이 너무 길어지면 먼저 제안을 드립니다. 그때는 제가 띄워드리는 \*\*명령어를 승인(Accept)\*\*만 하시면 됩니다.

  
  

[신규 레포 생성](https://www.perplexity.ai/search/antigeuraebitieseo-singyu-peur-juNW2yFWQnWshv9snaqlmQ) #한 줄씩 입력

git init

git remote add origin 복사한 GitHub URL

git add .

git commit -m "Initial commit"

# 성공하면 push

git push -u origin main

  

|  |
| --- |
| ● # ── 1. 프로젝트 폴더 생성 & Git 초기화  ──────────────────  mkdir my-new-project && cd  my-new-project  git init   # ── 2. GitHub 레포 생성 & 연결  ───────────────────────────  gh repo create my-new-project --public  --source=. --remote=origin --push  # private으로 만들려면 --public →  --private   # ── 3. A-Team 클론  ───────────────────────────────────────  git clone  <https://github.com/ne0cean/A-Team>   # ── 4. A-Team 초기화  ─────────────────────────────────────  bash A-Team/templates/init.sh  my-new-project ./A-Team   # ── 5. Claude Code 실행  ──────────────────────────────────  claude .   Claude Code 열리면 /vibe 입력 → 바로  시작. |

  

|  |
| --- |
| 🚀 자주 쓸 명령어   bash  # 새 프로젝트 시작할 때 (모든 것을 한 방에 설치)  bash A-Team/templates/init.sh my-project ./A-Team   # TODO 관리  /todo # 대기 목록 보기  bash A-Team/scripts/todo.sh add "기능 구현" "프로젝트명"  bash A-Team/scripts/todo.sh done "기능 구현"  bash A-Team/scripts/todo.sh stats   # 프로젝트 현황  /prjt # 프로젝트별 요약   # 모델 전환 (토큰 한도 도달 시)  bash A-Team/scripts/model-exit.sh # → 클립보드에 핸드오프 프롬프트 복사   # 모바일에서 접속  # PC에서: claude → /rc → 폰으로 QR 스캔 |

  

#클로드 채널

claude --channels plugin:telegram@claude-plugins-official

  

Tg명령어 설치

⏺ 완료. 다른 기기에서는 이 명령어 하나면 됩니다:

git clone <https://github.com/ne0cean/dotfiles.git> ~/dotfiles &&~/dotfiles/install.sh

Termux도 자동 감지해서 $PREFIX/bin에 설치됩니다.

나중에 스크립트 추가할때는 ~/dotfiles/bin/에 넣고 push하면 끝입니다.

  

\_\_\_\_\_\_\_\_\_\_\_

  

# 프로젝트 처음 가져오기

git clone <https://github.com/ne0cean/longform.git>

  

Pull # 작업 시작

  
  
  
  

Source Control 탭에서 (이미 Stage 준비됨):

1. 커밋 메시지 입력: "Morning updates: logs & frontend tweaks" (또는 Generate AI 추천).​
2. Commit 버튼 클릭 (체크 표시).
3. Sync Changes 클릭 → GitHub 푸시 완료! (클라우드 업로드 확인).
  

Or

  
  
4. 매 작업 끝날 때마다아래 4줄.

git status￼git add .￼git commit -m "메시지"￼git push origin main￼

5. 초보 시: 오타/복붙 실수로 에러 (이번처럼).
6. 익숙해지면: 10초 만에 끝. 파일 추적/히스토리/협업이 강력해 편함.
  

+++

  
  

GitHub 버전으로 강제 덮어쓰기

현재 폴더에서:

  

text

git fetch origin￼git reset --hard origin/main￼

→ 로컬 모든 변경 삭제 → GitHub main 브랜치로 완전 동기화!


  
  
  

🔄 모델 전환 (Handoff) 실행 방법 요약

  
  
  
  
  
  
  
  
  
  

cd "C:\Users\SKTelecom\Desktop\Dev Projects\AI\_Bubble\_Dashboard"

git pull origin main

  

Auto auth pull

git clone <https://github.com/ne0cean/Auto-Auto.git>

cd Auto-Auto

install.bat

  

Commit # 2. 작업 후 퇴근 전

git add .

git commit -m "작업 내용"

git push

  

git add .

git commit -m "작업 내용"

git push

((&& git push)) # PowerShell에서 오류

  

한 줄 마스터 명령 (PowerShell)

git add . ; git commit -m "$(Read-Host '커밋 메시지')" ; git push

  

Antigravity 단축키: Ctrl+Shift+G

변경 파일 + > 메시지 입력 > Commit > Sync Changes￼

  
  
  
  

[자동](https://www.perplexity.ai/search/teugjeong-sigane-jadongeuro-ke-NHO0.JRuQMCeLixfeO4ogQ) 커밋

.\auto-commit.ps1

GITHUB CODE

F41E-1C97

토큰

ghp\_xK9SWmO0EiXTRKTd8aPXzMb3SYfy212mCA2l

PowerShell, CMD, BASH 터미널 차이점 간단 정리:

CMD (명령 프롬프트)

  

text

Win + R > cmd

- Windows 전용 기본 셸
- 배치 파일 (.bat): &&, %변수%, @echo off
- 간단 파일 작업: dir, cd, copy, del
  

text

❌ 1+1 = 오류 (계산 불가)￼❌ git add . && git commit = PowerShell에서 오류￼✅ git 명령은 잘 됨

PowerShell

  

text

Win + X > Windows PowerShell

- Windows 현대 셸 (.NET 기반)
- 강력 스크립트 (.ps1): $변수, ;(명령 연결), if(){}
- 객체 처리: Get-Process, 1+1 = 2
  

text

❌ git add . && git commit = && 오류 (CMD 문법)￼✅ git add . ; git commit -m "test"￼✅ 변수: $name = "test"

BASH (Git Bash)

  

text

Git 설치 > Git Bash

- Linux/Unix 셸 (Windows 에뮬)
- 리눅스 명령: ls, grep, awk, ./script.sh
  

text

✅ git add . && git commit = 완벽 동작￼✅ Linux와 동일: curl, wget, chmod￼✅ 스크립트: #!/bin/bash

- [Code](https://github.com/ne0cean/Trading)
- [Issues](https://github.com/ne0cean/Trading/issues)
- [Pull requests](https://github.com/ne0cean/Trading/pulls)
- [Agents](https://github.com/ne0cean/Trading/agents?author=ne0cean)
- [Actions](https://github.com/ne0cean/Trading/actions)
- [Projects](https://github.com/ne0cean/Trading/projects)
- [Security and quality](https://github.com/ne0cean/Trading/security)
- [Insights](https://github.com/ne0cean/Trading/network/dependencies)
- [Settings](https://github.com/ne0cean/Trading/settings)
![Owner avatar](attachments/c6ef10dc6c63.png)

[Trading](https://github.com/ne0cean/Trading)Private