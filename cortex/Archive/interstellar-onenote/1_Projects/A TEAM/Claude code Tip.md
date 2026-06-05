---
title: "Claude code Tip"
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-0a3c20adf42040f3bb7b915eae4d2a73!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

Claude code Tip
		
		
	
	
		
			
				
[https://vivvers.com/](https://vivvers.com/)
				

				
					
- 
명확한 사양서 작성
					
						
- 프로젝트 시작 전 요구사항과 맥락을 명확히 문서화해 에이전트에게 제공
						
- 이를 통해 코드 작성 방향과 범위를 분명히 함
					
					
					
- 
프로젝트 구조 문서화
					
						
- 빌드, 린트, 테스트 실행 방법을 포함한 문서를 마련
						
- 에이전트가 코드베이스를 더 효과적으로 탐색하고 작업 가능
					
					
					
- 
에이전트 코드 리뷰 요청
					
						
- Claude Code에게 생성한 코드를 직접 리뷰하게 하여 예상치 못한 개선점이나 버그를 발견
					
					
					
- 
개인 글로벌 가이드 활용
					
						
- 문제 해결 접근, TDD 적용, 단순성&#183;명확성 유지, 시도 횟수 제한(3회) 등 개인 규칙을 담은&#160;~/.claude/CLAUDE.md를 통해 일관된 개발 프로세스 유지
					
					
				
				
					
- AI 생성 코드는 종종&#160;논리적 오류,&#160;성능 저하,&#160;불완전한 테스트&#160;등의 문제가 있음
					
- 
작성자는 모든 코드를&#160;수동으로 검토하고 동작을 확인
					
						
- 누락된 테스트 케이스를 직접 추가
						
- 또는 AI에 작성 요청 후 코드&#183;테스트를 다시 검토
					
					
					
- 프로페셔널 환경에서는 PR에 자신의 이름이 들어가는 이상,&#160;최종 품질 책임은 본인에게 있다고 강조
				
				
개인 “글로벌” 에이전트 가이드 주요 내용
				
					
- 
철학과 핵심 원칙
					
						
- 점진적 진행: 작은 단위로 변경, 항상 컴파일과 테스트 통과
						
- 기존 코드 학습: 구현 전 코드 패턴 분석 및 계획 수립
						
- 실용성 우선: 프로젝트 상황에 맞춘 유연한 접근
						
- 명확성 우선: 읽기 쉽고 의도가 분명한 코드, 불필요한 트릭 회피
					
					
					
- 
단순성 정의
					
						
- 함수&#183;클래스는 단일 책임
						
- 조기 추상화 지양
						
- 복잡성 줄이고 설명 필요 없는 코드 지향
					
					
					
- 
작업 프로세스
					
						
- 
1.&#160;기획 및 단계 설정:
						
							
- 복잡한 작업은 3~5단계로 나눠&#160;IMPLEMENTATION_PLAN.md에 기록
							
- 단계별 목표, 성공 기준, 테스트 케이스, 진행 상태 명시
						
						
						
- 
2.&#160;구현 흐름:
						
							
- 이해 → 테스트 작성(빨강) → 최소 구현(초록) → 리팩토링 → 커밋
						
						
						
- 
3.&#160;3회 시도 제한 후 재평가:
						
							
- 실패 시 시도 내역과 오류, 원인 기록
							
- 대안 탐색(2~3가지 접근)
							
- 근본적인 설계&#183;문제 분해 재검토
							
- 다른 패턴&#183;기능 시도
						
						
					
					
					
- 
기술 표준
					
						
- 구성(Composition) 우선, 의존성 주입 활용
						
- 인터페이스 사용, 테스트 용이성 확보
						
- 명시적 데이터 흐름
						
- TDD 권장, 테스트 비활성화 금지
					
					
					
- 
코드 품질 규칙
					
						
- 모든 커밋은 컴파일 성공, 테스트 통과, 신규 기능 테스트 포함, 코드 스타일 준수
						
- 커밋 전 포매터&#183;린터 실행, 변경사항 셀프 리뷰, &quot;왜&quot;를 설명하는 커밋 메시지 작성
					
					
					
- 
오류 처리
					
						
- 빠른 실패와 구체적 메시지
						
- 디버깅에 필요한 컨텍스트 제공
						
- 적절한 레벨에서 예외 처리, 예외 은폐 금지
					
					
					
- 
의사결정 기준
					
						
- 1. 테스트 용이성
						
- 2. 6개월 후에도 이해 가능한 가독성
						
- 3. 프로젝트 패턴과의 일관성
						
- 4. 단순함
						
- 5. 변경 용이성
					
					
					
- 
프로젝트 통합
					
						
- 유사 기능 3개 이상 분석
						
- 기존 패턴&#183;라이브러리 재사용
						
- 동일한 테스트 유틸리티 사용
						
- 새 도구 도입 시 강력한 이유 필요
					
					
					
- 
품질 게이트
					
						
- 모든 테스트 통과
						
- 프로젝트 규칙 준수
						
- 린터 경고 없음
						
- 커밋 메시지 명확
						
- 구현이 계획과 일치
						
- TODO에 이슈 번호 포함
					
					
					
- 
테스트 지침
					
						
- 구현이 아닌&#160;동작&#160;중심 테스트
						
- 가능하면 테스트당 하나의 단언
						
- 시나리오를 설명하는 명확한 이름
						
- 기존 테스트 유틸리티 재사용
						
- 테스트는 결정론적이어야 함
					
					
					
- 
절대 금지
					
						
- --no-verify로 훅 우회
						
- 테스트 비활성화
						
- 컴파일 안 되는 코드 커밋
						
- 검증 없는 추측
					
					
					
- 
반드시 수행
					
						
- 점진적 커밋
						
- 문서 지속 업데이트
						
- 기존 구현에서 학습
						
- 3회 실패 후 접근 재평가
					
					
				
				
					
- HTML/XML 인식 리버스 프록시 ([cdzombak/xrp](https://github.com/cdzombak/xrp))
					
- VS Code Solarized 테마(라이트/다크) ([cdzombak/dzsolarized-vscode](https://github.com/cdzombak/dzsolarized-vscode))
					
- Flickr 포토스트림 RSS 생성기 ([cdzombak/flickr-rss](https://github.com/cdzombak/flickr-rss))
					
- Lychee 사진 라이브러리 메타데이터 툴 ([cdzombak/lychee-meta-tool](https://github.com/cdzombak/lychee-meta-tool))
					
- macOS 스크린락 상태 MQTT 보고 ([cdzombak/macos-screenlock-mqtt](https://github.com/cdzombak/macos-screenlock-mqtt))
					
- Lychee Bird Buddy 사진 제목 자동 설정 ([cdzombak/lychee-birb-title](https://github.com/cdzombak/lychee-birb-title))
					
- 로컬 LLM 기반 사진 자동 분류 ([cdzombak/lychee-ai-organizer](https://github.com/cdzombak/lychee-ai-organizer))
					
- macOS용 소프트웨어 일괄 설치 자동화 ([cdzombak/mac-install](https://github.com/cdzombak/mac-install))
					
- RSS 서비스 프로젝트 ([cdzombak/rss.church](https://github.com/cdzombak/rss.church))
					
- Flickr 사진 전체/선택적 내보내기 및 메타데이터 보존 ([cdzombak/flickr-exporter](https://github.com/cdzombak/flickr-exporter))
					
- 정적 HTML 갤러리 생성기 ([cdzombak/gallerygen](https://github.com/cdzombak/gallerygen))
				
				

				출처: &lt;[https://news.hada.io/topic?id=22425&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=22425&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
				

				

				
[(](https://www.youtube.com/watch?v=2epU-ZBTZX8)구글 AI 코딩 신 등극) 제미나이가 미쳐 날뛰는 MCP 세팅법, 안티그래비티 업그레이드
				

				
				

				
&#128313; Context7 (디자인/컨텍스트): [https://context7.com/](https://context7.com/) API Key: ctx7sk-6a22037e-c7ad-43c9-a04b-b360ce4e13dc
				
&#128313; Sequential Thinking (로직 강화): [https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking)
				
&#128313; [Testsprite](https://www.testsprite.com/?via=asit&amp;gad_source=1&amp;gad_campaignid=23373399082&amp;gbraid=0AAAAA9oNCxseTQNCHfBzVAGneXwjnJoyo&amp;gclid=CjwKCAiAjojLBhAlEiwAcjhrDtuBFqSP2ozuBSfJQkF67CtI0I7Q11b2FgD_XqNpVQxPKHrdy0FhjBoCsRQQAvD_BwE) (디버깅): API Key: sk-user-MxVLle3Us3EuiWGdf-0PY9bk4dRy5L5O2QhlEuoPVOzV6zJFWO5-noswByTtmfrqiybyJHs8Zn2pHj1r68Uat3bVVGDYN19gbmanliBQpKSuc2OD56hRJ2fXfoyC-rLnMkY
				

				
					
- Next.js
					
- Mantine
				
				

				
context7 에서 next.js 와 mantine UI 를 확인해서 애플 느낌의 아이폰17 판매 웹사이트를 만들어줘
				
Sequential Thinking 을 사용해서 디테일을 놓치지말고 만들어줘
				

				
-
				

				
현재 내 웹사이트에 필요한 이미지들이
				
어디에, 어떤 사이즈로 필요한지 그리고 각각 이미지마다 어떤 프롬프트로 생성 가능한지 리스트를 알려줘
				
-&gt; 나온 output을 나노바나나로 생성
				

				
-
				

				
1/ 이 웹사이트의 프론트엔드 부분을 디버깅을 하려고하는데 어떤 부분들을 내가 디버깅해야될까?
				
Testsprite 쓰지 말고 자세하게 리스트업 해줘 
				
-&gt; 결과물 메모장에 복사
				

				
2/ Testsprite에 가서 조건 설정 후 리스트 업로드
				
-&gt; agent로 돌아와서 
				
Testsprite를 사용해서 이 프로젝트를 테스트해줘
				

				
[바이브코딩](https://www.youtube.com/watch?v=5GMZgBHwoGY) 6계명 | 효율에 미친 비개발자가 직접 배운 모든 것을 공유합니다
				

				
				
exe파일조차도 리버스 엔지니어링 가능
				
				

				
				
*S/W 개발 3대 원칙
				
YAGNI - You Ain&#39;t Gonna Need It 원칙
				
KISS - Keep It Simple Stupid!
				
DRY(Don&#39;t Repeat Yourself)원칙 = SSOT(Single Source of Truth) 원칙,  
				
= WET(We Enjoy Typing, Write Everything Twice) 안티패턴을 준수하라.
				
				

				
				

				
				

				
AI 기반 개발 안전 운영 가이드 (최종본 v1.0)
				
목적
				
AI로 개발하면서 발생하는
				
- 불필요한 파일 수정
				
- 맥락 붕괴
				
- 토큰 낭비
				
- 롤백 사고￼를&#160;사전에 차단 + 즉시 복구 가능하게 만드는 운영 체계
				

				
&#129504; 기본 철학 (가장 중요)
				
AI는&#160;똑똑한 인턴이다
				
- 일을 빨리 한다
				
- 전체 영향은 모른다
				
따라서
				
“잘 시키는 것”보다 “언제든 되돌릴 수 있게 만드는 것”이 핵심
				

				
&#128737;️ 전체 구조 개요 (한 눈에)
				

				
[0단계] 컨텍스트 고정￼   ↓￼[1단계] 수정 통제 (프롬프트)￼   ↓￼[2단계] 변경 검증 (Diff)￼   ↓￼[3단계] 백업 &amp; 롤백￼
				

				
0️⃣ 컨텍스트 고정 단계 (사고의 70% 예방)
				
핵심 문제
				
- 대화가 길어질수록 AI는:
				
- 앞부분 규칙을 잊고
				
- 프로젝트 구조를 추측함
				
해결 원칙
				
맥락은 대화가 아니라 문서로 고정한다
				
필수 고정 문서 (권장)
				
- PROJECT_CONTEXT.md
				
- AI_RULES.md
				
최소 포함 내용
				

				
- 프로젝트 목적￼- 현재 상태 요약￼- SSoT 위치￼- 수정 허용 영역￼- 수정 금지 영역￼
				
&#128073;&#160;새 세션 시작 시 항상 제공
				

				
1️⃣ 수정 통제 단계 (AI 사고의 핵심 차단선)
				
1-1. 수정 범위 명시 (무조건)
				

				
[목표]￼- 로그인 에러 처리 개선￼
				
[수정 허용 파일]￼- src/auth/login.ts￼
				
[읽기 전용]￼- src/config/*￼- src/shared/*￼- package.json￼
				
[금지]￼- 리팩토링￼- 스타일 변경￼- 타입 재정의￼
				
❗ 이 포맷 없이 AI에게 코드 맡기지 말 것
				

				
1-2. 변경 전 요약 → 승인 → 적용 (2단계)
				
AI 과잉 수정 방지의&#160;가장 강력한 장치
				

				
지금은 코드를 수정하지 말고￼- 변경될 파일 목록￼- 각 파일 변경 요약￼- 위험도 (HIGH / MED / LOW)￼만 작성해라￼
				
→ 승인 후 실제 수정
				

				
2️⃣ 구조 규칙 단계 (규모 커질수록 필수)
				
2-1. 2,000줄 / 대규모 변경마다 세션 리셋
				
- 대화 누적 = 사고 확률 증가
				
- 요약 → 새 세션이 정답
				

				
2-2. 1,500줄 이상이면 SSoT + DRY 강제
				
규칙
				
- 설정, 정책, 상수는&#160;단일 파일
				
- AI에게 명시
				

				
Single Source of Truth:￼- API routes → api.routes.ts￼- Auth policy → auth.policy.ts￼
				
중복 생성 금지￼
				
&#128073; 중복 코드 / 엉뚱한 새 파일 생성 방지
				

				
3️⃣ 백업 &amp; 롤백 단계 (최종 안전망)
				
⚠️&#160;AI 개발에서 롤백은 실패가 아니라 정상 흐름
				

				
&#129351; 1단계 백업: Git (가장 중요)
				
필수 습관
				

				
git status￼git commit -am &quot;pre-ai-change: login error handling&quot;￼
				
추천 패턴
				
- AI 작업 = 1 커밋
				
- 또는 AI 전용 브랜치
				

				
git checkout -b ai/login-fix￼
				
문제 시:
				

				
git checkout main￼git branch -D ai/login-fix￼
				

				
&#129352; 2단계 백업: IDE / 로컬 히스토리
				
목적
				
- Git 커밋 이전 단계 복구
				
도구
				
- VS Code Timeline / Local History
				
- Cursor 파일 변경 이력
				
&#128073; “아까 그 상태로만” 되돌릴 수 있음
				

				
&#129353; 3단계 백업: 파일 시스템 스냅샷
				
macOS 예시
				

				
rsync -av ./project ./_backup/project_$(date +%Y%m%d_%H%M)￼
				
또는
				
- Time Machine에&#160;개발 폴더 포함
				
&#128073; Git까지 망가졌을 때 최후 수단
				

				
4️⃣ 변경 검증 단계 (눈으로 확인)
				
AI 적용 후&#160;반드시 수행
				

				
git diff --stat￼git diff￼
				
또는 AI에게:
				

				
- 변경된 파일 목록￼- 각 파일 변경 요약 3줄￼- 위험 요소 지적￼
				

				
5️⃣ AI 개발 체크리스트 (실전용)
				

				
□ 컨텍스트 문서 최신화￼□ 수정 허용 파일 명시￼□ 변경 요약 먼저 요청￼□ git pre-commit 완료￼□ diff 확인￼□ 테스트 통과￼□ 커밋￼
				

				
&#128282; 최종 요약 (이 문서의 결론)
				
AI 개발의 본질은
				
“완벽하게 짜는 것”이 아니라
				
“언제든 10초 안에 되돌릴 수 있는 구조를 만드는 것”이다
				
이제 이 문서는:
				
- 단순 메모 ❌
				
- AI와 개발할 때의 운영 매뉴얼 ✅
				

				

				
AI_RULES.md
				

				
# AI_RULES.md
				
AI-Assisted Development Rules
				

				
## 목적
				
이 문서는 AI와 함께 개발할 때 발생하는
				
- 불필요한 파일 수정
				
- 맥락 붕괴
				
- 중복 코드 생성
				
- 롤백 사고
				
를 **사전에 방지**하기 위한 필수 규칙을 정의한다.
				

				
AI는 이 문서의 규칙을 **항상 최우선으로 준수**해야 한다.
				

				
---
				

				
## 1. 기본 원칙 (Non-Negotiable)
				

				
- AI는 **명시적으로 허용된 파일만 수정**한다.
				
- 명시되지 않은 파일은 **읽기 전용(Read-only)** 으로 간주한다.
				
- AI는 추측으로 구조를 변경하지 않는다.
				
- 안전하지 않은 변경은 항상 **사전 요약 → 승인 → 적용** 순서를 따른다.
				

				
---
				

				
## 2. 프로젝트 컨텍스트 요약
				

				
### 2.1 프로젝트 목적
				
- (여기에 프로젝트 한 줄 설명)
				

				
### 2.2 현재 상태
				
- (기능 구현 단계 / 리팩토링 중 / 유지보수 등)
				

				
---
				

				
## 3. Single Source of Truth (SSoT)
				

				
아래 항목들은 **유일한 기준 파일**이며,
				
중복 정의 또는 새로운 파일 생성을 **금지**한다.
				

				
- Auth 정책: `src/auth/auth.policy.ts`
				
- API Route 정의: `src/api/api.routes.ts`
				
- 전역 상수: `src/config/constants.ts`
				

				
⚠️ 위 항목과 동일한 역할의 코드 생성 금지
				

				
---
				

				
## 4. 수정 허용 / 금지 규칙
				

				
### 4.1 수정 허용 영역 (Editable)
				
- `src/feature/*`
				
- (필요 시 추가)
				

				
### 4.2 읽기 전용 영역 (Read-only)
				
- `src/config/*`
				
- `src/shared/*`
				
- `package.json`
				
- `tsconfig.json`
				
- `.env*`
				

				
### 4.3 명시적 금지 사항
				
- 무단 리팩토링
				
- 스타일 통일 목적의 수정
				
- 타입 재정의
				
- 파일 이동 / 삭제
				
- 테스트 코드 변경 (허용되지 않은 경우)
				

				
---
				

				
## 5. 표준 작업 프로세스 (필수)
				

				
### Step 1. 변경 계획 제시 (코드 수정 ❌)
				
AI는 먼저 아래 항목만 작성한다.
				
- 변경될 파일 목록
				
- 각 파일의 변경 요약
				
- 변경 위험도 (HIGH / MED / LOW)
				

				
### Step 2. 승인 후 적용
				
명시적 승인 이후에만 실제 코드 수정 수행
				

				
---
				

				
## 6. 세션 &amp; 토큰 관리 규칙
				

				
- 대화 누적이 많아질 경우 **요약 후 새 세션 시작**
				
- 대규모 변경 또는 코드 2,000줄 이상 시 세션 리셋
				
- 새 세션 시작 시 반드시 제공:
				
  - 프로젝트 목적
				
  - 현재 상태 요약
				
  - 수정 허용 / 금지 파일
				

				
---
				

				
## 7. 테스트 &amp; 검증 규칙
				

				
- 기존 테스트는 기본적으로 **변경 금지**
				
- 테스트 통과가 최우선 목표
				
- 변경 후 반드시 diff 확인을 전제로 한다.
				

				
---
				

				
## 8. Git &amp; 롤백 전제
				

				
- AI 작업 전 반드시 커밋 수행
				
- AI 작업 = 1 커밋 또는 1 브랜치
				
- 롤백은 실패가 아니라 **정상적인 개발 흐름**
				

				
---
				

				
## 9. 최종 원칙 선언
				

				
&gt; AI는 생산성을 높이는 도구이지,
				
&gt; 프로젝트의 최종 책임자가 아니다.
				

				
이 문서의 규칙을 위반하는 제안은
				
**자동으로 무효**로 간주한다.
				

				
1. 큰 문제를 작게 쪼개라 로그인 페이지 하나를 &quot;만들어줘&quot; 하면 안 된다. → DB 스키마 → 마이그레이션 → UI → API → 테스트 순으로 쪼개서 각 단계마다 검증. AI 오류는 쪼갤수록 줄어든다. 한번에 시키면 어디서 틀렸는지 찾기도 어렵다2. 컨텍스트는 &quot;신선한 우유&quot;다 대화가 길어지면 성능이 **최대 39% 하락**한다. 여러 주제를 한 대화에 섞으면 더 심하다. - 한 대화 = 한 목표 - 길어지면 HANDOFF.md로 요약 → 새 세션에 넘기기 - `/compact`로 컨텍스트 강제 압축
				

				
3. 몰라서 못 쓰는 단축키 — 생산성 2배| 단축키 | 기능 | 효과 | | `!git status` | !로 즉시 실행 | 토큰 낭비 없이 bash 실행, 결과만 컨텍스트에 | | `Shift+Tab` &#215;2 | Plan 모드 | 코드 분석+계획만, 승인 전까지 수정 안 함. **Ado는 업무 90%를 이 모드로 처리** | | `Esc Esc` | 되감기(Rewind) | 최근 수정을 안전하게 롤백 | | `Ctrl+R` | 역방향 검색 | 과거 프롬프트/명령어 검색 | | `Ctrl+S` | 프롬프트 임시저장 | 초안 저장 → 다른 거 보내고 → 자동 복원 | | `Alt+P` | 모델 전환 | Opus ↔ Sonnet ↔ Haiku 즉시 전환 | | `Ctrl+O` | Verbose 모드 | 상세 출력 | | `Tab` / `Enter` | 후속 제안 수락 | Claude가 예측한 다음 질문 즉시 실행 |
				

				
4. 음성 코딩 — 타이핑보다 4배 빠르다로컬 음성 전사 도구(SuperWhisper, Parakeet 등)로 말하면: - 타이핑 대비 **4배 속도** - AI가 오타/불완전한 문장 알아서 보정 - 특히 길고 복잡한 지시에 효과적5. [CLAUDE.md](http://claude.md/) — 프로젝트의 헌법CLAUDE.md는 Claude가 **최우선으로 참고**하는 파일이다.**ykdojo의 조언**: 처음엔 비워라. 반복되는 지시사항이 생기면 그때 추가.넣어야 할 것: - 기술 스택 (Python 3.11, FastAPI, PostgreSQL...) - 코딩 스타일 (함수명 snake_case, 인라인 주석 한국어...) - 금지 사항 (console.log 남기지 마, 테스트 없이 커밋 금지...) - 프로젝트 구조 요약
				

				
6. Git Worktree — 병렬 작업의 끝판왕브랜치 전환(`git checkout`) 없이 여러 브랜치를 **동시에** 작업할 수 있다. ```bash git worktree add ../feature-login feature/login git worktree add ../bugfix-auth bugfix/auth ``` 각 디렉토리에서 별도 Claude 세션을 열면 → 병렬 개발. Claude Code가 worktree 생성/관리를 자동으로 해준다.�7. 시스템 프롬프트 최적화 — 토큰을 아껴라ykdojo는 시스템 프롬프트를 **58개 패치**로 최적화해서 19K → 10K 토큰으로 줄였다. 9K 토큰 절약 = 더 긴 대화 + 더 높은 성능.방법: - 불필요한 기본 지시 제거 - 중복 규칙 통합 - 핵심만 남기기
				

			
			

			
Claude Code 활용 전략
			
LLM 작성 코드 검증
			
해당 가이드는&#160;~/.claude/CLAUDE.md&#160;파일로 관리함
			
Claude Code로 제작한 오픈소스 프로젝트
			

			출처: &lt;[https://news.hada.io/topic?id=22425&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=22425&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
			

			

			

			

			

			
[https://context7.com/](https://context7.com/)