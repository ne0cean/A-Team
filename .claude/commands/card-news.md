# /card-news — 인스타그램 카드 뉴스 자동 생성

**용도**: HTML/CSS 기반 인스타그램 카드 뉴스 자동 생성 (AI 이미지 생성 방식 대신)

> **출처**: [짐코딩 - 클로드 코드 스킬로 인스타 카드뉴스 자동 생성](https://www.youtube.com/watch?v=501KRO5QSXM)

## 왜 HTML/CSS 방식인가?

AI 이미지 생성 대신 순수 HTML/CSS로 카드 뉴스를 만드는 이유:

1. **정밀 제어**: 폰트 크기, 컬러, 간격을 1px 단위로 정확히 제어
2. **템플릿화**: 한 번 만들면 100장이든 1000장이든 동일 퀄리티 유지
3. **무료**: Claude Code 구독만으로 무제한 생성 (이미지 생성 API 비용 없음)
4. **일관성**: 브랜드 가이드라인 정확히 준수

## 전제 조건

```bash
# Playwright CLI 설치 (HTML → PNG 캡처용)
npm install -g playwright
npx playwright install chromium
```

## 실행 흐름

### Step 1: 컨텍스트 수집 → 계획 → 구현 워크플로우

**핵심 원칙**: "무엇 무엇 구현해줘" 바로 하지 않음. 항상 3단계:

```
1. 컨텍스트 수집 → 2. 계획 (플랜 모드) → 3. 구현
```

이 워크플로우는 개발뿐만 아니라 **마케팅, 유튜브 콘텐츠 제작, 카드 뉴스 제작 모두 동일**.

#### 1.1 컨텍스트 수집

```bash
# 예시: 블로그 글 또는 뉴스 URL을 한국어로 번역해서 저장
카드 뉴스 제작용 원문 자료를 하려고해.
아래 링크의 글 전체를 한국어로 번역해서 저장해 줘.

원문 URL: [URL]

번역 지침:
- 원문 문장 구조와 순서를 그대로 유지할 것
- 초보자도 이해할 수 있도록 쉽게 번역

# 결과: source/ 디렉터리 하위에 번역 저장
```

**추가 수집 (선택)**:
- 회사 로고 이미지
- 브랜드 컬러 팔레트
- 참고 디자인 스크린샷

#### 1.2 계획 (플랜 모드)

```bash
인스타그램 카드 뉴스 제작을 계획해 줘.

요구사항:
- 4:5 비율 (1080x1350px, 인스타그램 세로)
- 순수 HTML/CSS로 제작
- 한 장의 커버 이미지, N장의 본문 이미지, 한 장의 CTA 이미지 생성
- 카드 뉴스 내용: @source/[파일명] 기반

카드 뉴스 스타일:
[커버 이미지 스크린샷 첨부]
[본문 이미지 스크린샷 여러 개 첨부]
[CTA 이미지 스크린샷 첨부]

--plan
```

**플랜 모드에서 질문 예시**:
- 카드 뉴스 서사를 어떻게 잡을 건지 (문제→해결→CTA 등)
- 총 몇 장으로 구성할지 (권장: 8장 = 커버 1 + 본문 6 + CTA 1)
- HTML 파일만 제작 OR 바로 이미지까지 생성할지

#### 1.3 계획 확인 및 수정

플랜 파일이 `plan.md`로 생성됨:
- macOS: Cmd + 클릭
- Windows: Ctrl + 클릭

계획 파일에서 확인할 사항:
- 레이아웃 구조
- 컬러 토큰
- 폰트 스타일
- 각 카드별 포함 내용

수정이 필요하면 파일 직접 편집 후 저장.

#### 1.4 구현 실행

```bash
--bypass-permission 으로 계획을 진행해 줘.
```

**결과**: `episodes/YYMMDD_[주제]/` 디렉터리에 HTML 파일 생성

### Step 2: HTML 결과 확인 및 조정

#### 2.1 브라우저에서 미리보기

```bash
# 생성된 HTML을 브라우저에서 열어 확인
open episodes/YYMMDD_[주제]/card-01-cover.html
```

#### 2.2 스타일 조정 (두 가지 방법)

**방법 A**: Claude Code에 프롬프트로 요청
```bash
커버 이미지의 타이틀 폰트 크기를 줄여서
줄바꿈이 안 되도록 수정해 줘.
```

**방법 B**: 코드 편집기에서 직접 수정
```html
<!-- 예시: 폰트 크기 조정 -->
.cover-title {
  font-size: 48px; /* 56px → 48px로 변경 */
}
```

**중요**: 마음에 들 때까지 수정. **한 번만 제대로 만들면 템플릿으로 계속 재사용**.

### Step 3: HTML → PNG 이미지 변환

```bash
Playwright CLI를 사용해서
HTML 파일을 이미지로 만들어 줘.

# 결과: episodes/YYMMDD_[주제]/images/ 에 PNG 파일 생성
# - card-01-cover.png
# - card-02-content.png
# - ...
# - card-08-cta.png
```

**검증**: 생성된 이미지 파일을 열어서 1080x1350px 인스타그램 비율 확인.

### Step 4: 스킬로 템플릿화 (선택, 재사용 목적)

#### 4.1 skill-creator 플러그인 설치

```bash
# Claude Code CLI에서:
/plugins

# Marketplace → claude-plugins-official → skill-creator 설치
# Install to: User scope
# Reload plugins
```

#### 4.2 스킬 생성

```bash
/skill-creator

현재 생성된 카드 뉴스 템플릿을 해서
다음 카드 뉴스 제작 시 해당 디자인 스타일에 맞게
제작할 수 있도록 카드 뉴스를 생성하는 스킬을 생성해 달라고 할게요.

설치 위치: project-scope
트리거: "카드 뉴스 제작"

--bypass-permission
```

**결과**: `.claude/skills/card-news-generator.md` 생성

#### 4.3 스킬 사용 (재사용)

```bash
# 새 세션 시작 후
/card-news-generator

해당 내용으로 카드 뉴스를 생성해 줘.
@source/[새 블로그 글]

# HTML 파일까지만 생성
```

생성 후 이미지 변환:
```bash
이미지로 생성해 줘.
```

### Step 5: 프로젝트 구조 리팩토링 (다양한 카드 뉴스 관리)

```bash
프로젝트에서 다양한 카드 뉴스를 생성할 수 있도록 리팩토링 요청.

에피소드라는 디렉터리를 만들어서
YYMMDD_[주제] 디렉터리 하위에서
각각의 주제별 카드를 만들고 관리할 수 있도록
프로젝트 구조를 수정해 달라.

공유 리소스 (card.css, 로고 이미지):
  → 루트 위치에서 공유

각 에피소드별 고유 콘텐츠:
  → 에피소드 디렉터리 내부에서 관리
```

**최종 구조**:
```
card-news-project/
├── shared/
│   ├── styles.css       (공통 스타일)
│   └── logo.png         (브랜드 로고)
├── episodes/
│   ├── 260421_claude-opus-47/
│   │   ├── source.md
│   │   ├── card-01-cover.html
│   │   ├── ...
│   │   └── images/
│   │       ├── card-01-cover.png
│   │       └── ...
│   └── 260425_ai-marketing/
│       ├── source.md
│       ├── ...
│       └── images/
└── CLAUDE.md
```

## 저장 위치

```
episodes/YYMMDD_[slug]/
  ├── source.md            (원본 번역 텍스트)
  ├── card-01-cover.html
  ├── card-02-content1.html
  ├── ...
  ├── card-08-cta.html
  └── images/
      ├── card-01-cover.png     (1080x1350px)
      ├── card-02-content1.png
      ├── ...
      └── card-08-cta.png
```

## 고급 팁

### CLAUDE.md 파일 생성 시점

**질문**: "언제 `/i9` (init) 명령어로 CLAUDE.md를 생성해야 하나?"

**답변**:
- `/i9`는 **현재 프로젝트 구조를 분석**해서 Claude가 따라야 할 규칙 파일 생성
- **프로젝트 막 만들었을 때**: 분석할 구조 없음 → `/i9` 불필요
- **복잡한 작업 OR Claude가 바보될 때**: CLAUDE.md에 맥락 기록 권장
- **간단한 작업** (카드 뉴스 제작): CLAUDE.md 없어도 충분

**과도한 설계 금지**: MD 파일 작성이 부담스러워서 시작 못하는 것보다, 필요할 때만 작성.

### 플랜 모드 vs 바로 구현

**경험 적은 분**: 항상 `--plan` 으로 계획 먼저
**경험 많은 분**: 간단한 작업은 바로 `--bypass-permission` 사용 가능

**울트라 플랜** (최근 추가):
- 복잡한 계획이 필요할 때: 웹에서 더 강력하게 심화 계획 가능

### 터미널 깨짐 현상

플랜 파일을 열었다 끄면 터미널이 깨질 수 있음:
- **해결**: Warp 터미널에서 Claude Code 실행 → 대부분 깨짐 없이 동작

## 다른 스킬과의 연계

```bash
# 1. 원문 수집
/yt https://youtube.com/...  # YouTube 영상에서 자막 추출
# 또는 웹 스크래핑

# 2. 카드 뉴스 제작
/card-news --source @episodes/[slug]/source.md

# 3. 비주얼 최적화 (선택)
/design-audit --file episodes/[slug]/images/

# 4. 인스타그램 발행 (선택, Postiz 연동)
/marketing-publish --platform instagram --content episodes/[slug]/images/
```

## 참고 자료

- **영상 출처**: [짐코딩 YouTube](https://www.youtube.com/@jimcoding)
- **강의**: [인프런 - 클로드코드 완벽 마스터](https://www.inflearn.com/course/claude-code) (영상 설명 참조)
- **관련 커맨드**: `/marketing-social`, `/design-generate`, `/yt`

## 핵심 요약

| 단계 | 명령어 | 설명 |
|------|--------|------|
| 1. 수집 | 번역 + 자료 첨부 | 블로그/뉴스 한국어 번역 + 로고/디자인 참고 이미지 |
| 2. 계획 | `--plan` | 플랜 모드로 레이아웃/컬러/폰트/구조 설계 |
| 3. 구현 | `--bypass-permission` | HTML 파일 생성 (episodes/YYMMDD_[주제]/) |
| 4. 조정 | 프롬프트 OR 직접 편집 | 마음에 들 때까지 스타일 수정 |
| 5. 변환 | Playwright CLI | HTML → 1080x1350px PNG |
| 6. 템플릿화 | `/skill-creator` | 재사용 가능한 스킬로 저장 (선택) |

**철학**: "한 번만 제대로 만들면 템플릿으로 계속 재사용" — 처음만 고생하면 됨.
