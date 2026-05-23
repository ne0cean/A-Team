---
title: "Commit"
created: 2026-01-11T04:08:20.823Z
modified: 2026-01-11T04:08:20.823Z
source: onenote
notebook: "InterStellar"
section: "A TEAM"
onenote_url: "https://onedrive.live.com/redir.aspx?cid=733661839CC53BA5&page=edit&resid=733661839CC53BA5!7896&parId=733661839CC53BA5!s702e65de0d614a6cbbd92296ab8dff3d&wd=target%281_Projects%2FA%20TEAM.one%7C3beb0a10-2ecc-439f-9ac9-2817aadfad77%2FCommit%7Ca8aea726-6b07-e64c-b355-fa01ab112b76%2F%29"
---

3️⃣ Trunk-Based Dev → 혼자 쓰는 실전 커밋 & 개발 루틴

🎯 사용 타이밍

- 매일 개발 시작/종료 시
- “브랜치 파야 하나?” 고민될 때
  

🌳 Solo Trunk Rule (절대 규칙 5개)

- main(trunk)은 항상 실행 가능
- 작업은 최대 1~2시간 단위
- 커밋은 기능 하나 or 수정 하나
- 테스트 없는 커밋 금지
- 깨질 것 같으면 → 로컬에서만 실험
  

🧾 커밋 전 프롬프트 (필수)

  

다음 변경사항이 trunk에 바로 들어가도 되는지 평가해라.￼

- 기존 기능을 깨는가?￼- 테스트로 검증 가능한가?￼- 되돌리기 쉬운가?￼- 커밋 메시지가 한 문장으로 설명되는가?￼

→ YES 4개면 바로 커밋￼→ 아니면 더 쪼개라￼

  

🏁 커밋 메시지 템플릿

  

<type>: <무엇을 왜 했는지>￼

예)￼feat: add local storage for notes to persist data￼fix: handle empty input to prevent crash￼refactor: extract parsing logic into separate module￼