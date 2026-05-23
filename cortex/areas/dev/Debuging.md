---
title: "Debuging"
created: 2025-07-08T11:17:13.872Z
modified: 2025-07-08T11:17:13.872Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
onenote_url: "https://onedrive.live.com/redir.aspx?cid=733661839CC53BA5&page=edit&resid=733661839CC53BA5!7896&parId=733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d&wd=target%281_Projects%2FA%20TEAM.one%7C3beb0a10-2ecc-439f-9ac9-2817aadfad77%2FDebuging%7C9c5b0842-359a-4cb9-8b13-ee3f4f5d18da%2F%29"
---

'겹겹이 쌓인 잘못된 코드'는 금물!

- 수정을 반복하다 보면 기존에 잘 작동하던 기능까지 망가지는 경우도 있어, 신중한 조정과 재확인이 필요
- 한 문제를 여러 프롬프트로 반복 요청하다 보면, AI가 이전 오류 코드 위에 새로운 코드를 덧대는 식으로 누적된 오류가 생겨요.
- 이런 경우에는 get reset --hard 명령으로 깔끔하게 되돌리고, 가장 잘된 결과만 다시 넣어서 시작하는 게 좋습니다.
  
- 단순한 유닛 테스트보다는 실제 사용자의 클릭 흐름을 따라가는 \*\*통합 테스트(Integration Test)\*\*가 훨씬 효과적이에요.
  
출처: <<https://javaexpert.tistory.com/1222>> 
  
- rubber duck debugging prompts￼→ 문제를 AI(또는 가상의 오리)에게 상세히 설명하도록 강제하는 프롬프트로, 말하는 과정에서 스스로 논리 오류·가정·누락을 발견하게 만드는 디버깅 기법.
- error budget for side projects￼→ 사이드 프로젝트에서 허용 가능한 버그·실패·불완전함의 총량을 미리 정해두고, 그 범위 내에서는 속도를 우선하고 초과 시에만 안정화에 집중하는 운영 기준.
- trunk-based development for solo dev￼→ 혼자 개발할 때도 브랜치를 최소화하고 하나의 메인(trunk)에 짧고 자주, 테스트된 커밋을 병합해 복잡성과 병합 비용을 줄이는 개발 방식.
  

1️⃣ Rubber Duck Debugging → AI 디버깅 강제 사고 프롬프트

🎯 사용 타이밍

- “왜 안 되는지 모르겠다”라고 느끼는 모든 순간
- 에러가 재현되지만 원인이 불명확할 때
  

🧠 Rubber Duck Debugging Prompt (표준형)

  

너는 고무 오리다. 해결책을 바로 제시하지 말고,￼내 설명에서 논리적 비약, 가정, 누락을 찾아라.￼

1. 내가 하려는 목표는 무엇인가?￼2. 현재 실제로 일어나는 동작은 무엇인가?￼3. 기대한 동작과 다른 지점은 정확히 어디인가?￼4. 내가 암묵적으로 가정한 조건들은 무엇인가?￼5. 그 가정 중 검증되지 않은 것은 무엇인가?￼6. 로그/출력/재현 코드 중 불충분한 것은 무엇인가?￼

해결책은 맨 마지막에,￼원인 후보를 최소 3개 제시한 뒤에만 말해라.￼

  

✅ 디버깅 체크리스트 (통과 기준)

- “아마 ~일 것”이라는 말이 로그/출력으로 검증됨
- 재현 코드(MRE)가 30줄 이하
- 원인과 증상을 문장으로 구분 가능
- 같은 버그를 잡는 테스트가 추가됨

🔑 이걸 통과 못하면 절대 다음 기능으로 넘어가지 않는다

  

  
  
출처: <<https://javaexpert.tistory.com/1222>> 
  
trunk-based development for solo dev￼→ 혼자 개발할 때도 브랜치를 최소화하고 하나의 메인(trunk)에 짧고 자주, 테스트된 커밋을 병합해 복잡성과 병합 비용을 줄이는 개발 방식.

[Code reivew](https://news.hada.io/topic?id=25625&utm_source=discord&utm_medium=bot&utm_campaign=280)