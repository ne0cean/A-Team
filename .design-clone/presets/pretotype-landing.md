# Preset: Pretotype Landing — 문짝 테스트 / 가짜 랜딩

> 수요 검증용. "이 제품이 존재한다면" 느낌. 1인 개발자가 주말에 만든 수준.

## 대표 레퍼런스 패턴

| 출처 유형 | 예시 | 왜 효과적인가 |
|----------|------|-------------|
| Carrd 1페이지 | 인디 해커 대부분 | 극도로 단순, 한 화면에 끝남 |
| Notion 공개 페이지 | 초기 스타트업 | "만드는 중" 느낌, 진정성 |
| Google Form 임베드 | MVP 대기자 | 기능 0, 의도만 전달 |
| Linktree/bio 페이지 | 크리에이터 | 링크 나열, 설명 최소 |

## 해부 결과 (공통 패턴)

```yaml
font:
  heading: "시스템 폰트 (Apple SD Gothic, Pretendard, -apple-system)"
  body: "heading과 동일"
  sizes: [24px, 16px]  # 딱 2종
  weight: [700, 400]   # bold + regular만
  특징: "폰트 페어링 없음. Google Fonts 로드 없음."

color:
  palette: ["#1a1a1a", "#ffffff", "#e55"]
  총 색수: 3 이하
  accent: "빨강 또는 파랑 계열 1개"
  background: "#fff 또는 #fafafa"
  특징: "그라디언트 없음. 투명도 없음. 그림자 없음."

layout:
  구조: "1단 세로 스크롤, 센터 정렬"
  max-width: "600px 이하"
  섹션: 3-5개
  전형적 순서:
    1: "한 줄 헤드라인 (제품이 뭔지)"
    2: "2-3줄 설명 (왜 필요한지)"
    3: "CTA 버튼 1개 또는 이메일 입력"
    4: "(선택) 스크린샷 또는 목업 1장"
    5: "(선택) FAQ 또는 한 줄 testimonial"
  특징: "카드 없음. 그리드 없음. 리스트만."

copy_tone:
  스타일: "구어체"
  인칭: "1인칭 (나/우리) 또는 2인칭 (당신/너)"
  길이: "한 문장이 2줄 넘지 않음"
  특징: |
    - 마케팅 용어 금지 (revolutionize, seamless, cutting-edge)
    - "~하는 앱입니다" 보다 "~할 수 있어요"
    - 이모지 1-2개 허용 (과하지 않게)
    - 불완전한 문장 허용 ("곧 출시. 기다려주세요.")

imagery:
  유형: "이모지로 아이콘 대체 / 스크린샷 1장 / 없음"
  특징: |
    - 스톡 이미지 절대 금지
    - 일러스트 절대 금지 (사람이 안 그림)
    - 있다면 폰 목업 캡처 또는 실제 스크린샷
    - hero image 없음 — 텍스트만으로 시작

cta:
  버튼수: 1개
  텍스트: "알림 받기 / 써보기 / 시작하기"
  스타일: "배경색 + 흰 글자, 라운드 적당히 (8px)"
  특징: "호버 효과 최소 또는 없음"
```

## Intentional Imperfections (의도적 불완전함)

```yaml
필수 반영:
  - padding 위아래 불균일 (상 40px, 하 24px 같은 식)
  - 버튼과 입력 필드 높이 미세하게 다름 (버튼 44px, 입력 40px)
  - 모바일에서 좌우 패딩 16px로 좁음
  - footer에 "© 2026" 한 줄만 또는 아예 없음
  - favicon 기본값 또는 이모지
  - 메타 태그 / OG 이미지 미설정
  - 로고 대신 텍스트 (볼드체 프로젝트명)
  - 페이지 타이틀이 "프로젝트명" 한 단어

선택 반영 (1-2개):
  - 스크롤 시 약간 잘리는 요소
  - 링크 색상 기본 파란색 (#0066cc)
  - 입력 placeholder가 "이메일 주소"처럼 평범
  - 한글 영어 혼용 ("Sign up for 알림")
```

## Anti-Pattern (이렇게 하면 AI 티 남)

```yaml
절대 하지 말 것:
  - hero 섹션에 큰 배경 이미지
  - 3-column feature grid
  - 아이콘 + 제목 + 설명 카드 반복
  - gradient 배경/버튼
  - "Trusted by 100+ companies" 같은 social proof
  - 애니메이션 (fade-in, slide-up)
  - 뉴스레터 + 이름 + 회사 다중 필드 폼
  - 쿠키 배너 / 팝업
  - 일관된 디자인 시스템 (오히려 의심)
```

## 즉시 사용 가능한 HTML 골격

```
구조만 (스타일은 인라인 최소):
<body style="max-width:560px;margin:40px auto;padding:0 20px;font-family:system-ui">
  <h1>프로젝트명</h1>
  <p>한 줄 설명</p>
  <p>2-3줄 왜 필요한지</p>
  <form>
    <input type="email" placeholder="이메일">
    <button>알림 받기</button>
  </form>
  <p style="margin-top:60px;color:#999;font-size:12px">© 2026</p>
</body>
```
