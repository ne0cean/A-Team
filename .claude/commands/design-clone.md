---
name: design-clone
description: 실제 사람이 만든 레퍼런스를 찾고 해부해서 모사 기반 디자인 브리핑을 생성한다. AI 냄새 제거가 아닌 인간 산출물 모사. 프레토타입/문짝 테스트/랜딩에 특화.
argument-hint: "[hunt 키워드] 또는 [레퍼런스 URL]"
---

# /design-clone — 벤치마크 모사 디자인 모듈

> AI 냄새 지우기 ❌ → 사람이 만든 걸 먼저 찾고 그걸 모사 ✅
> "어설퍼도 진심이 느껴지는" 결과물을 만든다.

---

## 모드 판별

`$ARGUMENTS` 파싱:

- 인자 없음 또는 키워드 → **PRESET 모드** (라이브러리에서 즉시 꺼내기, 기본)
- `hunt [키워드]` → **HUNT 모드** (프리셋에 없을 때만 웹 사냥)
- URL 포함 → **DISSECT 모드** (특정 페이지 해부 + 클론)

---

## PRESET 모드 — 사전 해부된 벤치마크 즉시 적용 (기본, 가장 빠름)

### Step 1: 프리셋 매칭

`.design-clone/presets/` 에서 가장 가까운 프리셋을 찾는다.

| 키워드 | 프리셋 |
|--------|--------|
| 문짝, 랜딩, pretotype, 검증, 대기자, waitlist | pretotype-landing.md |
| 카페, 바, 이벤트, 밋업, 모임, 파티 | local-event.md |
| 앱, 소셜, 커뮤니티, flair, connectome | community-app.md |
| SaaS, 사이드프로젝트, 인디 | indie-saas.md |

### Step 2: 프리셋 로드 + .design-override.md 즉시 생성

프리셋의 해부 결과를 `.design-override.md`에 `mode: clone`으로 주입.
사용자에게 한 줄 확인: "pretotype-landing 프리셋으로 적용합니다. OK?"

### Step 3: 프리셋에 없으면 HUNT 제안

"이 유형의 프리셋이 없습니다. `/design-clone hunt [키워드]`로 레퍼런스를 찾을까요?"

---

## HUNT 모드 — 레퍼런스 사냥

### Step 1: 검색

키워드 기반으로 "사람이 직접 만든" 페이지를 찾는다.

검색 전략:
- `[키워드] site:notion.site` — Notion으로 만든 랜딩 (1인 운영 전형)
- `[키워드] "powered by carrd"` — Carrd로 만든 1페이지
- `[키워드] site:typedream.com` — 노코드 랜딩
- `[키워드] landing page indie maker` — 인디 메이커 랜딩
- Product Hunt에서 초기 랜딩 검색
- `[키워드] 이벤트 페이지` (한국어)

우선순위:
1. 1인/소규모 팀이 직접 만든 것 (가장 가치 있음)
2. 노코드 도구로 만든 것 (Carrd, Notion, Typedream)
3. 초기 스타트업 랜딩 (v1 느낌)
4. 로컬 비즈니스 실제 페이지

제외:
- 에이전시가 만든 세련된 페이지
- 템플릿 그대로 쓴 것 (구분 가능한 경우)
- 대기업 페이지

### Step 2: 후보 제시

3-5개 후보를 제시:
```
1. [URL] — 설명 한 줄
2. [URL] — 설명 한 줄
3. [URL] — 설명 한 줄
```

사용자가 선택하면 DISSECT 모드로 진입.

### Step 3: 라이브러리 저장

```bash
mkdir -p .design-clone/references
```

선택된 레퍼런스 메타데이터를 저장:
```
.design-clone/references/[slug].md
```

---

## DISSECT 모드 — 레퍼런스 해부

URL 또는 라이브러리에서 선택된 레퍼런스를 분석.

### Step 1: 페이지 접근

WebFetch로 페이지 로드. 접근 불가 시 사용자에게 스크린샷 요청.

### Step 2: 해부 분석

다음 7개 축으로 분석:

```yaml
reference:
  url: "[URL]"
  type: "[1인 운영/소규모 팀/인디 메이커/로컬 비즈니스]"
  tool_guess: "[Carrd/Notion/WordPress/커스텀/불명]"

font:
  heading: "[폰트명 또는 시스템 폰트]"
  body: "[폰트명]"
  sizes: "[사용된 크기 2-3개]"
  특징: "[페어링 없음 / 1종 통일 / 등]"

color:
  palette: ["#hex1", "#hex2", "#hex3"]
  accent: "#hex"
  background: "#hex"
  특징: "[3색 이하 / 그라디언트 없음 / 등]"

layout:
  구조: "[1단 세로 / 2단 / 등]"
  섹션수: N
  특징: "[좌우 불균형 / 패딩 불규칙 / 등]"

copy_tone:
  언어: "[한국어/영어/혼합]"
  스타일: "[구어체/격식체/혼합]"
  인칭: "[1인칭/2인칭/3인칭]"
  특징: "[이모지 사용/불완전 문장/등]"

imagery:
  유형: "[사진/일러스트/아이콘/이모지/없음]"
  특징: "[해상도 불균일/직접 촬영 느낌/등]"

imperfections:
  - "[구체적 불완전함 1]"
  - "[구체적 불완전함 2]"
  - "[구체적 불완전함 3]"
  - "[구체적 불완전함 4]"
```

**imperfections가 가장 중요한 축.** AI가 절대 만들지 않는 종류의 불규칙성을 캡처한다.

흔한 인간적 불완전함 패턴:
- 패딩/마진 불균일 (위아래 다름)
- 폰트 사이즈 종류가 2-3개로 제한적
- 이미지 크기/비율 통일 안 됨
- 하단에 불필요한 빈 공간
- 버튼 스타일 미통일
- 저작권/footer 누락 또는 최소
- 한 줄짜리 소개로 시작
- 로고 대신 텍스트
- favicon 미설정
- 모바일 대응 불완전

### Step 3: 가장 가까운 tone 매핑

해부 결과를 `governance/design/tone-first.md`의 11 tone 중 가장 가까운 것에 매핑.
정확히 일치하지 않아도 됨 — "이 레퍼런스에 가장 가까운 tone"으로.

### Step 4: .design-override.md 생성

```markdown
---
design: on
mode: clone
clone_source: "[URL]"
clone_type: "[유형]"
tone: [매핑된 tone]
a11y_level: AA
---

## Clone Source Analysis

[해부 결과 전문 — yaml 형태]

## Intentional Imperfections (빌드 시 반영 필수)

- [해부에서 발견된 불완전함 목록]
- [각 항목은 "왜 이게 인간적으로 느껴지는가" 한 줄 설명]

## Clone Build Guide

### DO (모사할 것)
- [레퍼런스에서 가져올 구체적 패턴]

### DON'T (하지 말 것)
- 그라디언트 추가하지 않는다
- 그림자 추가하지 않는다
- 카드 레이아웃으로 바꾸지 않는다
- 폰트를 3종 이상 쓰지 않는다
- 모든 요소를 정렬하지 않는다
- 아이콘 라이브러리를 쓰지 않는다 (이모지로 대체)
```

### Step 5: 라이브러리에 저장

```bash
# .design-clone/references/[slug].md 에 해부 결과 영속 저장
```

---

## 레퍼런스 라이브러리

축적형. 프로젝트마다 레퍼런스가 쌓임.

```
.design-clone/
  references/
    cafe-event-landing.md
    indie-saas-v1.md
    local-community-app.md
    ...
  INDEX.md  ← 자동 생성, 카테고리별 정리
```

다음 프레토타입에서 "전에 찾은 카페 랜딩 스타일로" 바로 재사용 가능.

---

## design-auditor 연동

`.design-override.md`에 `mode: clone`이면 design-auditor가:
- Anti-generic 룰 중 일부를 완화 (의도적 불완전함 허용)
- imperfections 목록에 있는 패턴은 위반으로 카운트하지 않음
- 단, a11y(접근성)는 여전히 강제

---

## 원칙

- 레퍼런스 없이 빌드하지 않는다 — "그냥 만들어줘"는 거부
- AI가 "개선"하려는 충동을 억제한다 — 레퍼런스보다 세련되면 실패
- 불완전함은 의도적이다 — 버그가 아님
- 카피는 구어체 — 마케팅 용어 금지
- 사진은 직접 찍은 느낌 — 스톡 이미지 금지
- 코드 작성 금지 (이 스킬은 브리핑까지만)
