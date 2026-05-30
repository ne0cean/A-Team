---
title: "Debuging"
notebook: "InterStellar"
section_group: "1_Projects"
section: "A TEAM"
onenote_id: "0-b9784a2f19954fe88006cf4e279a8cbb!1-733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d"
---

Debuging

&#39;겹겹이 쌓인 잘못된 코드&#39;는 금물!

- 수정을 반복하다 보면 기존에 잘 작동하던 기능까지 망가지는 경우도 있어,&#160;신중한 조정과 재확인이 필요

- 한 문제를 여러 프롬프트로 반복 요청하다 보면, AI가 이전 오류 코드 위에 새로운 코드를 덧대는 식으로&#160;누적된 오류가 생겨요.

- 이런 경우에는&#160;get reset --hard&#160;명령으로 깔끔하게 되돌리고, 가장 잘된 결과만 다시 넣어서 시작하는 게 좋습니다.

- 단순한 유닛 테스트보다는 실제 사용자의 클릭 흐름을 따라가는 **통합 테스트(Integration Test)**가 훨씬 효과적이에요.

출처: &lt;[https://javaexpert.tistory.com/1222](https://javaexpert.tistory.com/1222)&gt;

- rubber duck debugging prompts￼→ 문제를 AI(또는 가상의 오리)에게&#160;상세히 설명하도록 강제하는 프롬프트로, 말하는 과정에서 스스로 논리 오류&#183;가정&#183;누락을 발견하게 만드는 디버깅 기법.

- error budget for side projects￼→ 사이드 프로젝트에서&#160;허용 가능한 버그&#183;실패&#183;불완전함의 총량을 미리 정해두고, 그 범위 내에서는 속도를 우선하고 초과 시에만 안정화에 집중하는 운영 기준.

- trunk-based development for solo dev￼→ 혼자 개발할 때도&#160;브랜치를 최소화하고 하나의 메인(trunk)에 짧고 자주, 테스트된 커밋을 병합해 복잡성과 병합 비용을 줄이는 개발 방식.

1️⃣ Rubber Duck Debugging →&#160;AI 디버깅 강제 사고 프롬프트

&#127919; 사용 타이밍

- “왜 안 되는지 모르겠다”라고 느끼는&#160;모든 순간

- 에러가 재현되지만 원인이 불명확할 때

&#129504; Rubber Duck Debugging Prompt (표준형)

너는 고무 오리다. 해결책을 바로 제시하지 말고,￼내 설명에서 논리적 비약, 가정, 누락을 찾아라.￼

1. 내가 하려는 목표는 무엇인가?￼2. 현재 실제로 일어나는 동작은 무엇인가?￼3. 기대한 동작과 다른 지점은 정확히 어디인가?￼4. 내가 암묵적으로 가정한 조건들은 무엇인가?￼5. 그 가정 중 검증되지 않은 것은 무엇인가?￼6. 로그/출력/재현 코드 중 불충분한 것은 무엇인가?￼

해결책은 맨 마지막에,￼원인 후보를 최소 3개 제시한 뒤에만 말해라.￼

✅ 디버깅 체크리스트 (통과 기준)

- &#160;“아마 ~일 것”이라는 말이&#160;로그/출력으로 검증됨

- &#160;재현 코드(MRE)가 30줄 이하

- &#160;원인과 증상을 문장으로 구분 가능

- &#160;같은 버그를 잡는 테스트가 추가됨

&#128273;&#160;이걸 통과 못하면 절대 다음 기능으로 넘어가지 않는다

출처: &lt;[https://javaexpert.tistory.com/1222](https://javaexpert.tistory.com/1222)&gt;

trunk-based development for solo dev￼→ 혼자 개발할 때도&#160;브랜치를 최소화하고 하나의 메인(trunk)에 짧고 자주, 테스트된 커밋을 병합해 복잡성과 병합 비용을 줄이는 개발 방식.

[Code reivew](https://news.hada.io/topic?id=25625&amp;utm_source=discord&amp;utm_medium=bot&amp;utm_campaign=280)
