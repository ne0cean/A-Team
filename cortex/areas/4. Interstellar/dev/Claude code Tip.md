---
title: "Claude code Tip"
created: 2025-09-04T07:05:55.951Z
modified: 2025-09-04T07:05:55.951Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
onenote_url: "https://onedrive.live.com/redir.aspx?cid=733661839CC53BA5&page=edit&resid=733661839CC53BA5!7896&parId=733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d&wd=target%281_Projects%2FA%20TEAM.one%7C3beb0a10-2ecc-439f-9ac9-2817aadfad77%2FClaude%20code%20Tip%7C6af096e8-62d5-4b53-b618-b18137d3b7b6%2F%29"
---

<https://vivvers.com/>

  

- 명확한 사양서 작성

  - 프로젝트 시작 전 요구사항과 맥락을 명확히 문서화해 에이전트에게 제공
  - 이를 통해 코드 작성 방향과 범위를 분명히 함
- 프로젝트 구조 문서화

  - 빌드, 린트, 테스트 실행 방법을 포함한 문서를 마련
  - 에이전트가 코드베이스를 더 효과적으로 탐색하고 작업 가능
- 에이전트 코드 리뷰 요청

  - Claude Code에게 생성한 코드를 직접 리뷰하게 하여 예상치 못한 개선점이나 버그를 발견
- 개인 글로벌 가이드 활용

  - 문제 해결 접근, TDD 적용, 단순성·명확성 유지, 시도 횟수 제한(3회) 등 개인 규칙을 담은 ~/.claude/CLAUDE.md를 통해 일관된 개발 프로세스 유지

- AI 생성 코드는 종종 논리적 오류, 성능 저하, 불완전한 테스트 등의 문제가 있음
- 작성자는 모든 코드를 수동으로 검토하고 동작을 확인

  - 누락된 테스트 케이스를 직접 추가
  - 또는 AI에 작성 요청 후 코드·테스트를 다시 검토
- 프로페셔널 환경에서는 PR에 자신의 이름이 들어가는 이상, 최종 품질 책임은 본인에게 있다고 강조

개인 “글로벌” 에이전트 가이드 주요 내용

- 철학과 핵심 원칙

  - 점진적 진행: 작은 단위로 변경, 항상 컴파일과 테스트 통과
  - 기존 코드 학습: 구현 전 코드 패턴 분석 및 계획 수립
  - 실용성 우선: 프로젝트 상황에 맞춘 유연한 접근
  - 명확성 우선: 읽기 쉽고 의도가 분명한 코드, 불필요한 트릭 회피
- 단순성 정의

  - 함수·클래스는 단일 책임
  - 조기 추상화 지양
  - 복잡성 줄이고 설명 필요 없는 코드 지향
- 작업 프로세스

  - 1. 기획 및 단계 설정:

    - 복잡한 작업은 3~5단계로 나눠 IMPLEMENTATION\_PLAN.md에 기록
    - 단계별 목표, 성공 기준, 테스트 케이스, 진행 상태 명시
  - 2. 구현 흐름:

    - 이해 → 테스트 작성(빨강) → 최소 구현(초록) → 리팩토링 → 커밋
  - 3. 3회 시도 제한 후 재평가:

    - 실패 시 시도 내역과 오류, 원인 기록
    - 대안 탐색(2~3가지 접근)
    - 근본적인 설계·문제 분해 재검토
    - 다른 패턴·기능 시도
- 기술 표준

  - 구성(Composition) 우선, 의존성 주입 활용
  - 인터페이스 사용, 테스트 용이성 확보
  - 명시적 데이터 흐름
  - TDD 권장, 테스트 비활성화 금지
- 코드 품질 규칙

  - 모든 커밋은 컴파일 성공, 테스트 통과, 신규 기능 테스트 포함, 코드 스타일 준수
  - 커밋 전 포매터·린터 실행, 변경사항 셀프 리뷰, "왜"를 설명하는 커밋 메시지 작성
- 오류 처리

  - 빠른 실패와 구체적 메시지
  - 디버깅에 필요한 컨텍스트 제공
  - 적절한 레벨에서 예외 처리, 예외 은폐 금지
- 의사결정 기준

  - 1. 테스트 용이성
  - 2. 6개월 후에도 이해 가능한 가독성
  - 3. 프로젝트 패턴과의 일관성
  - 4. 단순함
  - 5. 변경 용이성
- 프로젝트 통합

  - 유사 기능 3개 이상 분석
  - 기존 패턴·라이브러리 재사용
  - 동일한 테스트 유틸리티 사용
  - 새 도구 도입 시 강력한 이유 필요
- 품질 게이트

  - 모든 테스트 통과
  - 프로젝트 규칙 준수
  - 린터 경고 없음
  - 커밋 메시지 명확
  - 구현이 계획과 일치
  - TODO에 이슈 번호 포함
- 테스트 지침

  - 구현이 아닌 동작 중심 테스트
  - 가능하면 테스트당 하나의 단언
  - 시나리오를 설명하는 명확한 이름
  - 기존 테스트 유틸리티 재사용
  - 테스트는 결정론적이어야 함
- 절대 금지

  - --no-verify로 훅 우회
  - 테스트 비활성화
  - 컴파일 안 되는 코드 커밋
  - 검증 없는 추측
- 반드시 수행

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

  
출처: <<https://news.hada.io/topic?id=22425&utm_source=discord&utm_medium=bot&utm_campaign=280>> 
  
  

[(](https://www.youtube.com/watch?v=2epU-ZBTZX8)구글 AI 코딩 신 등극) 제미나이가 미쳐 날뛰는 MCP 세팅법, 안티그래비티 업그레이드

  
![디 자 인 
컨 텍 스 트 
MCP 서 버 
MCP 서 버 
바 이 브 코 딩 
MCP 서 버 
MCP 서 버 
디 버 깅 
로 직 ](attachments/a9ddf1cc7a29.png)
  

🔹 Context7 (디자인/컨텍스트): <https://context7.com/> API Key: ctx7sk-6a22037e-c7ad-43c9-a04b-b360ce4e13dc

🔹 Sequential Thinking (로직 강화): <https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking>

🔹 [Testsprite](https://www.testsprite.com/?via=asit&gad_source=1&gad_campaignid=23373399082&gbraid=0AAAAA9oNCxseTQNCHfBzVAGneXwjnJoyo&gclid=CjwKCAiAjojLBhAlEiwAcjhrDtuBFqSP2ozuBSfJQkF67CtI0I7Q11b2FgD_XqNpVQxPKHrdy0FhjBoCsRQQAvD_BwE) (디버깅): API Key: sk-user-MxVLle3Us3EuiWGdf-0PY9bk4dRy5L5O2QhlEuoPVOzV6zJFWO5-noswByTtmfrqiybyJHs8Zn2pHj1r68Uat3bVVGDYN19gbmanliBQpKSuc2OD56hRJ2fXfoyC-rLnMkY

  

- Next.js
- Mantine

  

context7 에서 next.js 와 mantine UI 를 확인해서 애플 느낌의 아이폰17 판매 웹사이트를 만들어줘

Sequential Thinking 을 사용해서 디테일을 놓치지말고 만들어줘

  

-

  

현재 내 웹사이트에 필요한 이미지들이

어디에, 어떤 사이즈로 필요한지 그리고 각각 이미지마다 어떤 프롬프트로 생성 가능한지 리스트를 알려줘

-> 나온 output을 나노바나나로 생성

  

-

  

1/ 이 웹사이트의 프론트엔드 부분을 디버깅을 하려고하는데 어떤 부분들을 내가 디버깅해야될까?

Testsprite 쓰지 말고 자세하게 리스트업 해줘

-> 결과물 메모장에 복사

  

2/ Testsprite에 가서 조건 설정 후 리스트 업로드

-> agent로 돌아와서

Testsprite를 사용해서 이 프로젝트를 테스트해줘

  

[바이브코딩](https://www.youtube.com/watch?v=5GMZgBHwoGY) 6계명 | 효율에 미친 비개발자가 직접 배운 모든 것을 공유합니다

  
![1. 구 현 을 원 하 는 기 능 이 포 함 됐 거 나 비 슷 한 오 픈 소 스 파 일 찾 아 서 해 체 분 석 하 기 
바 이 브 코 딩 을 하 다 보 면 이 미 잘 구 현 되 어 있 는 컴 포 넌 트 나 라 이 브 러 리 를 사 용 하 면 안 정 적 이 고 빠 른 개 발 이 가 능 한 데 
클 로 드 코 드 가 오 버 엔 지 니 어 링 하 거 나 엄 격 하 게 정 석 적 으 로 만 드 는 경 우 가 존 재 
타 인 의 클 론 코 딩 프 로 젝 트 들 을 참 조 하 거 나 오 픈 소 스 프 로 젝 트 를 분 석 하 고 리 버 스 엔 지 니 어 링 으 로 기 능 구 현 방 법 학 습 ](attachments/ebdb48039b29.png)

exe파일조차도 리버스 엔지니어링 가능

![2. 반 복 되 는 문 제 는 학 습 자 료 로 만 들 어 서 개 념 · 원 리 익 혀 두 기 
바 이 브 코 딩 을 하 면 서 처 음 들 어 보 는 단 어 와 개 념 이 많 이 등 장 
학 습 자 료 로 따 로 만 들 어 달 라 고 요 청 을 하 고 프 린 트 해 서 틈 틈 히 공 부 ](attachments/0e0d57c02fec.png)
  
![파 일 이 너 무 길 어 전 체 를 확 인 할 수 없 습 니 다 . 이 파 일 은 2000 줄 이 넘 어 한 번 에 모 두 읽 을 수 없 습 니 다 . 
다 음 과 같 은 방 법 으 로 파 일 을 확 인 할 수 있 습 니 다 . 
● ● 중 요 규 칙 
2,000 줄 에 근 접 하 게 된 다 면 ? 
■ 표 # \ 파 일 크 기 제 한 및 모 를 화 원 직 (SSoT & DRY) 
-* 핵 심 원 칙 : 1500 호 제 한 으 로 중 복 방 지 및 코 드 피 학 원 이 성 확 보 ** 
Claude 가 파 일 을 읽 을 때 2800 중 래 지 가 능 하 지 만 , 1580 중 용 초 과 하 면 전 체 맥 락 파 우 
Yourself) 원 칙 을 지 키 기 위 해 1500 줄 제 한 을 영 수 합 니 다 . 
1. 
offset/limit 파 라 미 터 로 파 일 의 부 분 만 읽 음 
■ 매 크 로 1. 엄 격 한 1500 일 제 한 대 상 
2. 
컨 텍 스 트 윈 도 우 를 과 도 하 게 소 모 
다 음 파 일 들 은 반 드 시 1500 층 이 하 로 유 지 : 
- React 컴 포 넌 트 (.tsx, -jsx) 
3. 
전 체 를 한 번 에 파 악 하 지 않 아 맥 락 이 해 도 ↓ 
유 틸 리 티 함 수 모 음 (utils/, 11b/) 
비 즈 니 스 로 직 (services/, hooks/) 
4. 
파 일 전 체 를 읽 지 못 해 이 미 작 성 된 코 드 를 
API 라 우 트 핸 들 러 (app/apl/ ** /route.ts) 
•• 문 제 시 나 리 오 ( 금 지 ): ** 
개 선 하 지 않 고 중 복 으 로 재 작 성 
*** typescript 
// components/Dashboard.ESx (18008) 
5. 
기 존 변 수 / 함 수 / 테 이 블 을 중 복 으 로 새 로 
If Line 50 
const VIDEO_ UPLOAD_ ENDPOINT = '/apl/upload" 
작 성 하 는 일 이 빈 번 
const VIDEO_ENDPOINT = '/ap\/upload' // 중 복 ! 하 지 만 Claude 가 발 건 못 함 
1/ Line 3500 
6. 
SSOT 와 DRY 원 칙 위 반 
■ 요 금 을 2. 예 외 허 용 조 건 (1500 원 초 과 가 능 ) 
다 음 조 건 을 모 두 만 족 하 는 경 우 에 만 예 외 허 용 : 
** 허 용 되 는 파 일 유 형 : ** 
타 입 정 역 파 열 (types/database.ts 등 ) 
, 센 서 별 로 명 확 히 구 조 화 된 성 적 파 일 
3. 1,500 줄 이 되 지 않 도 록 SSOT, DRY 원 칙 강 요 하 기 
1500 줄 로 제 한 하 게 되 면 컨 텍 스 트 소 모 량 도 줄 고 사 람 이 한 눈 에 파 악 하 기 에 도 용 이 
CLAUDE.md 에 1500 줄 제 한 과 SSOT/DRY 원 칙 을 중 요 도 높 게 명 시 
모 듈 화 가 잘 되 어 있 는 경 우 에 만 1,500 줄 이 상 을 허 용 하 고 SSOT 와 DRY 원 칙 을 철 저 히 준 수 하 고 ](attachments/62ab42c01035.png)

\*S/W 개발 3대 원칙

YAGNI - You Ain't Gonna Need It 원칙

KISS - Keep It Simple Stupid!

DRY(Don't Repeat Yourself)원칙 = SSOT(Single Source of Truth) 원칙,

= WET(We Enjoy Typing, Write Everything Twice) 안티패턴을 준수하라.

![4. 1,500 줄 이 상 의 코 드 는 리 팩 토 링 으 로 모 듈 화 해 두 기 
코 드 가 안 정 적 으 로 작 동 하 거 나 명 확 한 구 조 와 주 석 , 목 차 가 포 함 됐 거 나 , 섹 션 별 네 이 밍 이 철 저 하 다 면 리 팩 토 링 X 
해 당 파 일 에 서 문 제 가 계 속 발 생 하 고 스 파 게 티 코 드 처 럼 되 었 다 면 파 일 명 . 확 장 자 .bak 으 로 백 업 파 일 을 반 드 시 생 성 하 고 
리 팩 토 링 설 계 문 서 를 만 들 어 아 주 신 중 하 게 진 행 , 리 팩 토 링 이 후 백 업 파 일 과 1:1 비 교 검 사 를 통 해 누 락 이 있 는 지 확 인 ](attachments/e2a2a94a2877.png)
  
![5. 구 체 적 이 고 규 칙 이 있 는 명 명 규 칙 
토 큰 을 조 금 더 소 비 하 더 라 도 , 중 복 코 드 로 인 한 
디 버 깅 시 간 을 줄 이 는 것 이 훨 씬 효 율 적 이 라 고 판 단 
새 로 작 성 하 는 파 일 명 , 변 수 명 , 함 수 명 , 테 이 블 명 은 
Glob/Grep 으 로 중 복 검 사 를 먼 저 수 행 
[ 도 메 인 / 위 치 ]-[ 대 상 ]-[ 동 작 / 상 태 ] 구 조 를 따 라 명 명 하 도 록 claude.md 기 록 
이 에 다 른 페 이 지 에 서 유 사 한 기 능 이 추 가 되 더 라 도 중 복 이 발 생 하 지 않 도 록 관 리 
예 를 들 어 , ConnectButton 이 아 닌 YouTubeChannelConnectButton 처 럼 
명 확 하 게 작 성 ](attachments/e48cb35e495b.png)
  
![6. Test 페 이 지 적 극 활 용 
대 규 모 기 능 개 선 이 나 ui ux 변 경 이 있 을 때 test 폴 더 에 원 하 는 기 능 들 을 먼 저 구 현 해 서 테 스 트 한 뒤 
실 제 메 인 페 이 지 에 적 용 
크 롬 의 탭 그 룹 기 능 으 로 도 구 , 로 컬 페 이 지 , 테 스 트 페 이 지 등 구 분 하 여 사 용 ](attachments/2c4be748bf1b.png)
  

AI 기반 개발 안전 운영 가이드 (최종본 v1.0)

목적

AI로 개발하면서 발생하는

- 불필요한 파일 수정
- 맥락 붕괴
- 토큰 낭비
- 롤백 사고￼를 사전에 차단 + 즉시 복구 가능하게 만드는 운영 체계
  

🧠 기본 철학 (가장 중요)

AI는 똑똑한 인턴이다

- 일을 빨리 한다
- 전체 영향은 모른다

따라서

“잘 시키는 것”보다 “언제든 되돌릴 수 있게 만드는 것”이 핵심

  

🛡️ 전체 구조 개요 (한 눈에)

  

[0단계] 컨텍스트 고정￼ ↓￼[1단계] 수정 통제 (프롬프트)￼ ↓￼[2단계] 변경 검증 (Diff)￼ ↓￼[3단계] 백업 & 롤백￼

  

0️⃣ 컨텍스트 고정 단계 (사고의 70% 예방)

핵심 문제

- 대화가 길어질수록 AI는:
- 앞부분 규칙을 잊고
- 프로젝트 구조를 추측함

해결 원칙

맥락은 대화가 아니라 문서로 고정한다

필수 고정 문서 (권장)

- PROJECT\_CONTEXT.md
- AI\_RULES.md

최소 포함 내용

  

- 프로젝트 목적￼- 현재 상태 요약￼- SSoT 위치￼- 수정 허용 영역￼- 수정 금지 영역￼

👉 새 세션 시작 시 항상 제공

  

1️⃣ 수정 통제 단계 (AI 사고의 핵심 차단선)

1-1. 수정 범위 명시 (무조건)

  

[목표]￼- 로그인 에러 처리 개선￼

[수정 허용 파일]￼- src/auth/login.ts￼

[읽기 전용]￼- src/config/\*￼- src/shared/\*￼- package.json￼

[금지]￼- 리팩토링￼- 스타일 변경￼- 타입 재정의￼

❗ 이 포맷 없이 AI에게 코드 맡기지 말 것

  

1-2. 변경 전 요약 → 승인 → 적용 (2단계)

AI 과잉 수정 방지의 가장 강력한 장치

  

지금은 코드를 수정하지 말고￼- 변경될 파일 목록￼- 각 파일 변경 요약￼- 위험도 (HIGH / MED / LOW)￼만 작성해라￼

→ 승인 후 실제 수정

  

2️⃣ 구조 규칙 단계 (규모 커질수록 필수)

2-1. 2,000줄 / 대규모 변경마다 세션 리셋

- 대화 누적 = 사고 확률 증가
- 요약 → 새 세션이 정답
  

2-2. 1,500줄 이상이면 SSoT + DRY 강제

규칙

- 설정, 정책, 상수는 단일 파일
- AI에게 명시
  

Single Source of Truth:￼- API routes → api.routes.ts￼- Auth policy → auth.policy.ts￼

중복 생성 금지￼

👉 중복 코드 / 엉뚱한 새 파일 생성 방지

  

3️⃣ 백업 & 롤백 단계 (최종 안전망)

⚠️ AI 개발에서 롤백은 실패가 아니라 정상 흐름

  

🥇 1단계 백업: Git (가장 중요)

필수 습관

  

git status￼git commit -am "pre-ai-change: login error handling"￼

추천 패턴

- AI 작업 = 1 커밋
- 또는 AI 전용 브랜치
  

git checkout -b ai/login-fix￼

문제 시:

  

git checkout main￼git branch -D ai/login-fix￼

  

🥈 2단계 백업: IDE / 로컬 히스토리

목적

- Git 커밋 이전 단계 복구

도구

- VS Code Timeline / Local History
- Cursor 파일 변경 이력

👉 “아까 그 상태로만” 되돌릴 수 있음

  

🥉 3단계 백업: 파일 시스템 스냅샷

macOS 예시

  

rsync -av ./project ./\_backup/project\_$(date +%Y%m%d\_%H%M)￼

또는

- Time Machine에 개발 폴더 포함

👉 Git까지 망가졌을 때 최후 수단

  

4️⃣ 변경 검증 단계 (눈으로 확인)

AI 적용 후 반드시 수행

  

git diff --stat￼git diff￼

또는 AI에게:

  

- 변경된 파일 목록￼- 각 파일 변경 요약 3줄￼- 위험 요소 지적￼

  

5️⃣ AI 개발 체크리스트 (실전용)

  

□ 컨텍스트 문서 최신화￼□ 수정 허용 파일 명시￼□ 변경 요약 먼저 요청￼□ git pre-commit 완료￼□ diff 확인￼□ 테스트 통과￼□ 커밋￼

  

🔚 최종 요약 (이 문서의 결론)

AI 개발의 본질은

“완벽하게 짜는 것”이 아니라

“언제든 10초 안에 되돌릴 수 있는 구조를 만드는 것”이다

이제 이 문서는:

- 단순 메모 ❌
- AI와 개발할 때의 운영 매뉴얼 ✅
  
  

AI\_RULES.md

  

# AI\_RULES.md

AI-Assisted Development Rules

  

## 목적

이 문서는 AI와 함께 개발할 때 발생하는

- 불필요한 파일 수정

- 맥락 붕괴

- 중복 코드 생성

- 롤백 사고

를 \*\*사전에 방지\*\*하기 위한 필수 규칙을 정의한다.

  

AI는 이 문서의 규칙을 \*\*항상 최우선으로 준수\*\*해야 한다.

  

---

  

## 1. 기본 원칙 (Non-Negotiable)

  

- AI는 \*\*명시적으로 허용된 파일만 수정\*\*한다.

- 명시되지 않은 파일은 \*\*읽기 전용(Read-only)\*\* 으로 간주한다.

- AI는 추측으로 구조를 변경하지 않는다.

- 안전하지 않은 변경은 항상 \*\*사전 요약 → 승인 → 적용\*\* 순서를 따른다.

  

---

  

## 2. 프로젝트 컨텍스트 요약

  

### 2.1 프로젝트 목적

- (여기에 프로젝트 한 줄 설명)

  

### 2.2 현재 상태

- (기능 구현 단계 / 리팩토링 중 / 유지보수 등)

  

---

  

## 3. Single Source of Truth (SSoT)

  

아래 항목들은 \*\*유일한 기준 파일\*\*이며,

중복 정의 또는 새로운 파일 생성을 \*\*금지\*\*한다.

  

- Auth 정책: `src/auth/auth.policy.ts`

- API Route 정의: `src/api/api.routes.ts`

- 전역 상수: `src/config/constants.ts`

  

⚠️ 위 항목과 동일한 역할의 코드 생성 금지

  

---

  

## 4. 수정 허용 / 금지 규칙

  

### 4.1 수정 허용 영역 (Editable)

- `src/feature/\*`

- (필요 시 추가)

  

### 4.2 읽기 전용 영역 (Read-only)

- `src/config/\*`

- `src/shared/\*`

- `package.json`

- `tsconfig.json`

- `.env\*`

  

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

  

## 6. 세션 & 토큰 관리 규칙

  

- 대화 누적이 많아질 경우 \*\*요약 후 새 세션 시작\*\*

- 대규모 변경 또는 코드 2,000줄 이상 시 세션 리셋

- 새 세션 시작 시 반드시 제공:

- 프로젝트 목적

- 현재 상태 요약

- 수정 허용 / 금지 파일

  

---

  

## 7. 테스트 & 검증 규칙

  

- 기존 테스트는 기본적으로 \*\*변경 금지\*\*

- 테스트 통과가 최우선 목표

- 변경 후 반드시 diff 확인을 전제로 한다.

  

---

  

## 8. Git & 롤백 전제

  

- AI 작업 전 반드시 커밋 수행

- AI 작업 = 1 커밋 또는 1 브랜치

- 롤백은 실패가 아니라 \*\*정상적인 개발 흐름\*\*

  

---

  

## 9. 최종 원칙 선언

  

> AI는 생산성을 높이는 도구이지,

> 프로젝트의 최종 책임자가 아니다.

  

이 문서의 규칙을 위반하는 제안은

\*\*자동으로 무효\*\*로 간주한다.

  

1. 큰 문제를 작게 쪼개라 로그인 페이지 하나를 "만들어줘" 하면 안 된다. → DB 스키마 → 마이그레이션 → UI → API → 테스트 순으로 쪼개서 각 단계마다 검증. AI 오류는 쪼갤수록 줄어든다. 한번에 시키면 어디서 틀렸는지 찾기도 어렵다2. 컨텍스트는 "신선한 우유"다 대화가 길어지면 성능이 \*\*최대 39% 하락\*\*한다. 여러 주제를 한 대화에 섞으면 더 심하다. - 한 대화 = 한 목표 - 길어지면 HANDOFF.md로 요약 → 새 세션에 넘기기 - `/compact`로 컨텍스트 강제 압축

  

3. 몰라서 못 쓰는 단축키 — 생산성 2배| 단축키 | 기능 | 효과 | | `!git status` | !로 즉시 실행 | 토큰 낭비 없이 bash 실행, 결과만 컨텍스트에 | | `Shift+Tab` ×2 | Plan 모드 | 코드 분석+계획만, 승인 전까지 수정 안 함. \*\*Ado는 업무 90%를 이 모드로 처리\*\* | | `Esc Esc` | 되감기(Rewind) | 최근 수정을 안전하게 롤백 | | `Ctrl+R` | 역방향 검색 | 과거 프롬프트/명령어 검색 | | `Ctrl+S` | 프롬프트 임시저장 | 초안 저장 → 다른 거 보내고 → 자동 복원 | | `Alt+P` | 모델 전환 | Opus ↔ Sonnet ↔ Haiku 즉시 전환 | | `Ctrl+O` | Verbose 모드 | 상세 출력 | | `Tab` / `Enter` | 후속 제안 수락 | Claude가 예측한 다음 질문 즉시 실행 |

  

4. 음성 코딩 — 타이핑보다 4배 빠르다로컬 음성 전사 도구(SuperWhisper, Parakeet 등)로 말하면: - 타이핑 대비 \*\*4배 속도\*\* - AI가 오타/불완전한 문장 알아서 보정 - 특히 길고 복잡한 지시에 효과적5. [CLAUDE.md](http://claude.md/) — 프로젝트의 헌법CLAUDE.md는 Claude가 \*\*최우선으로 참고\*\*하는 파일이다.\*\*ykdojo의 조언\*\*: 처음엔 비워라. 반복되는 지시사항이 생기면 그때 추가.넣어야 할 것: - 기술 스택 (Python 3.11, FastAPI, PostgreSQL...) - 코딩 스타일 (함수명 snake\_case, 인라인 주석 한국어...) - 금지 사항 (console.log 남기지 마, 테스트 없이 커밋 금지...) - 프로젝트 구조 요약

  

6. Git Worktree — 병렬 작업의 끝판왕브랜치 전환(`git checkout`) 없이 여러 브랜치를 \*\*동시에\*\* 작업할 수 있다. ```bash git worktree add ../feature-login feature/login git worktree add ../bugfix-auth bugfix/auth ``` 각 디렉토리에서 별도 Claude 세션을 열면 → 병렬 개발. Claude Code가 worktree 생성/관리를 자동으로 해준다.�7. 시스템 프롬프트 최적화 — 토큰을 아껴라ykdojo는 시스템 프롬프트를 \*\*58개 패치\*\*로 최적화해서 19K → 10K 토큰으로 줄였다. 9K 토큰 절약 = 더 긴 대화 + 더 높은 성능.방법: - 불필요한 기본 지시 제거 - 중복 규칙 통합 - 핵심만 남기기

  

  

Claude Code 활용 전략

LLM 작성 코드 검증

해당 가이드는 ~/.claude/CLAUDE.md 파일로 관리함

Claude Code로 제작한 오픈소스 프로젝트

  
출처: <<https://news.hada.io/topic?id=22425&utm_source=discord&utm_medium=bot&utm_campaign=280>> 
  
  
  
  
  

<https://context7.com/>