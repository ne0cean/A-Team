---
title: "Basic "
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-932a39ad35cc433db362e69facfa8231!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

Basic 
		
		
	
	
		
			
Git clone 깃헙 주소
			

			
				
					단축키
					설명
				
				
					Ctrl + C
					현재 입력 또는 Claude가 생성 중인 아웃풋을 즉시 중단
				
				
					Ctrl + D
					Claude Code 세션 종료
				
				
					Ctrl + L
					대화는 유지하면서 사용자 입력창 내용 전체 삭제
				
				
					위/아래 방향키
					이전에 실행했던 메시지 히스토리 조회
				
				
					Esc + Esc
					직전 메시지로 회귀 (해당 시점으로 대화 포크)
				
				
					⌘/Ctrl + Enter
					메시지 창에서 줄바꿈 (대부분 터미널 공통)
				
				
					Option + Enter
					macOS 기본 줄바꿈 단축키
				
				
					Shift + Enter
					/terminal-setup 이후 줄바꿈
				
				
					# [메시지]
					CLAUDE.md에 빠르게 기억할 요소 추가
				
				
					/ [명령어]
					슬래시 명령어 실행
				
			
			

			
/shift tab 자동수정모드/플래낭모드/일반 모드 전환
			

			
/btw
			

			
cd[경로]: 다른 디렉토리로 리동
			
Cd..: 상위 디렉토리로 이동
			
Cd ~: 홈 디렉토리로 이동(~는 홈 의미)
			
Cd /: 루트 디렉토리로 이동
			
Cd -: 이전 위치로 돌아가기
			

			
Mkdir[디렉토리명]: 현재위치에 새 디렉토리 생성
			

			
Mv[현재경로][이동할 경로]: 파일이나 디렉토리의 경로 변경
			

			
Touch: 빈 파일 생성(touch memo.txt)
			

			
cmd + L: 화면 클리어
			
cmd + C: 명령 종료
			
cmd + J: 줄 바꿈
			

			
Pwd: 현재 위치 확인
			

			
npm update 최신버전 업데이트
			

			
/help: 
			
/clear:
			
/quit: 종료
			
/chat save 태그: 대화 저장
			
/chat resume 태그: 대화 불러오기
			
/chat list: 대화 리스트 불러오기
			

			
# 컨텍스트 관리
			
/memory show 모든 컨텍스트 한 번에 확인
			
/memory refresh 컨텍스트 파일 다시 읽고 갱신
			
/ memory add &lt;텍스트&gt; 글로벌 컨텍스트 파일에 명령어 추가
			

			
# 대화 요약
			
/compress
			

			
/copy 결과물 클립보드에 복사
			

			
! 셸 모드 전환, 터미널 명령어 직접 실행
			
!를 다시 누르거나 ESC로 out
			

			
&#39; &#39; 인라인 코드 1줄
			
&#39;&#39;&#39;
			
  여러줄의 코드
			
&#39;&#39;&#39;
			

			
링크 [ ]( )
			
이미지 ![ ]( )
			

			
*기울임*
			
**볼드**
			
~~취소선~~
			
&lt;!-- 임시 메모 작성 --&gt;
			

			
--- context form: …. Xxx.md ---
			

			
# 본문
			

			
## 작성
			

			
--- end of context form: …. Xxx.md ---
			

			
/init 현 디렉터리 분석 후 컨텍스트 문서(md) 자동 생성
			

			
#컨텍스트 작성 가이드
			
• 제미나이 CLI :bit.ly/46mLKZB
			
• 코덱스 : bit.ly/41YUbzz
			
• 클로드 코드 : bit.ly/410XHN7
			

			

			
옵션
			
설명
			
-d, --debug
			
디버그 모드로 실행
			
-m, -model
			
사용할 모델 지정
			
-P, -prompt
			
표준 입력에 추가할 프롬프트 지정
			
-, -prompt-interactive
			
주어진 프롬프트를 실행하고, 인터랙티브 모드로 실행
			
-s, --sandbox
			
샌드박스 실행 여부 설정
			
-y, -yolo
			
모든 작업을 자동으로 수락 (yolo 모드)
			
-e, -extensions
			
사용할 익스텐션 설정 (기본값은 모든 익스텐션 사용)
			
-1, - list-extensions
			
설치된 익스텐션 목록 출력
			
-r, -resume
			
이전 채팅 세션에 이어서 작업
			
-0, -output-format
			
CL 출력 형식 설정 (text, json, stream json)
			
-v, -version
			
프로그램 버전 표시
			
-h, -help
			
도움말 메시지 표시
			

			
프롬프트 작성 가이드 TCREL
			
Task, Context, Reference, Evaluate, Lterate
			

			
Task]
			
이메일과 비밀번호 기반의 사용자 로그인 기능을 구현하세요.
			
[Context]
			
• 현재 프로젝트는 Next.js 14와 TypeScript를 사용합니다.
			
• 백엔드는 Prisma ORM과 PostgreSQL을 사용합니다.
			
• 인증은 JWT 토큰 방식으로 구현합니다.
			
• 기존에 User 모델이 이미 정의되어 있습니다.
			
Reference.
			
기존 회원가입 API 코드의 구조를 따라 주세요.
			
•/api/auth/signup.ts 의 에러 핸들링 패턴
			
• 응답 형식은 { success: boolean, data?: any, error? String}
			
[Output]
			
1. 로그인 API 엔드포인트 (api/auth/login.ts)
			
2. 비밀번호 검증 유틸리티 함수
			
3. JWT 토큰 생성 및 쿠키 설정 로직
			
4. 관련 타입 정의