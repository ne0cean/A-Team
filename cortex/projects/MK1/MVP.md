---
title: "MVP"
notebook: "InterStellar"
section_group: "1_Projects"
section: "MK1"
onenote_id: "0-3ae15d14bd1e3d0e379f5cee9b3fcccd!1-733661839CC53BA5!7919"
---

MVP
		
		
	
	
		
			
보도자료를 써보라
			
[https://eopla.net/magazines/10491](https://eopla.net/magazines/10491)
			

			
AI 최적화 사이클: 단순하게 시작해서 점진적 개선
			
				
- 일단 돌아가는 걸 먼저 만든다&#160;(비용이 좀 들어도 OK)
				
- 빠르게&#160;배포하고 피드백 수집
				
- 중간급 모델로 전환해 비용 절감
				
- 성능 검증(Eval)으로 품질 유지
				
- 파인튜닝 등으로 추가 비용 절감
				

			
			

			
제품 안에 AI를 녹여 넣기
			
				
- AI는 단순한&#160;챗봇 UI를 넘어, 앱 내부 구성 요소로 자연스럽게 통합돼야 함
				
- 예:&#160;generateText()&#160;같은 함수 한두 줄로&#160;AI 기능을 시스템 레벨로 흡수
				
- 사용자는 AI를 “대화하는 존재”가 아니라, 기능의 일부로 체감해야 진짜 경험이 됨
			
			

			출처: &lt;[https://news.hada.io/topic?id=20439&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280](https://news.hada.io/topic?id=20439&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)&gt; 
			

			

			
1. 개발 환경 설정
			
React + Next.js + Firebase를 사용
			
[Node.js 설치](https://nodejs.org/) - React 프로젝트 실행에 필수적
			
[코드](https://code.visualstudio.com/) 편집기 (VS Code) 설치 - 코드 작성과 실행이 편리합니다.
			
✅ 설치 후 필요한 확장 프로그램 설치:
			
				
- ES7+ React/Redux/React-Native snippets
				
- Prettier - Code formatter
				
- Tailwind CSS IntelliSense (디자인을 Tailwind로 할 경우)
			
			

			

			
2. 프로젝트 생성
			
			
npm install firebase
			

			

			
// Import the functions you need from the SDKs you need
			
import { initializeApp } from &quot;firebase/app&quot;;
			
import { getAnalytics } from &quot;firebase/analytics&quot;;
			
// TODO: Add SDKs for Firebase products that you want to use
			
// [https://firebase.google.com/docs/web/setup#available-libraries](https://firebase.google.com/docs/web/setup#available-libraries)
			

			
// Your web app&#39;s Firebase configuration
			
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
			
const firebaseConfig = {
			
  apiKey: &quot;AIzaSyAd1Z_vKKzlY-CysH8m4ybE6mgDvfZJhBw&quot;,
			
  authDomain: &quot;geo-connectome.firebaseapp.com&quot;,
			
  projectId: &quot;geo-connectome&quot;,
			
  storageBucket: &quot;geo-connectome.firebasestorage.app&quot;,
			
  messagingSenderId: &quot;450279800762&quot;,
			
  appId: &quot;1:450279800762:web:7c0de5e2429acf30072783&quot;,
			
  measurementId: &quot;G-91K13FSZK4&quot;
			
};
			

			
// Initialize Firebase
			
const app = initializeApp(firebaseConfig);
			
const analytics = getAnalytics(app);
			

			

			
클라우드 개발환경 셋팅
			
[https://docs.github.com/ko/codespaces/developing-in-a-codespace/using-github-codespaces-in-visual-studio-code](https://docs.github.com/ko/codespaces/developing-in-a-codespace/using-github-codespaces-in-visual-studio-code)
			

			
[(개발지식) 1 - Github 폴더/파일 한번에 올리기 (Git Bash 이용)](https://hjsong96.tistory.com/43) - [Git bash ](https://git-scm.com/downloads/win)설치
			
[https://steady-eschoi.tistory.com/94](https://steady-eschoi.tistory.com/94)
			
[https://soda-dev.tistory.com/12](https://soda-dev.tistory.com/12) 깃 업로드
			
[깃 업로드(Mac)](https://cocococo.tistory.com/entry/Git-Git%EC%97%90-%ED%8F%B4%EB%8D%94-%EC%97%85%EB%A1%9C%EB%93%9C-%EB%B0%A9%EB%B2%95)
			
[https://github.com/ne0cean/MK1.git](https://github.com/ne0cean/MK1.git) 내 라퍼지토리
		
		
			
참고 서비스들
			
[Linktree](https://linktr.ee/)￼[liinks ](https://eopla.net/magazines/26680#)
			
[Google Earth Studio](https://www.threads.net/@if_youmybest/post/DGkV3fzz_Aw?xmt=AQGz5Mmcn4RUVm1_s1bPmNpvubSmCYd4TnEiQNo49qbJZw)