---
description: /ppt — 업무용 PPT 자동 생성. Marp 기반 Gamma 수준 퀄리티. 한글 Pretendard 폰트. PDF/PPTX 출력.
---

# /ppt — 업무용 프레젠테이션 생성

> **엔진**: Marp (Markdown + HTML + CSS) — robonuggets/marp-slides 패턴 기반
> **퀄리티**: Gamma/Genspark 수준 시각 퀄리티 + AI 느낌 없는 한국어 콘텐츠
> **출력**: .pdf (고품질) 또는 .pptx (편집 가능, 텍스트는 이미지 레이어)
> **폰트**: Pretendard — 한글 완전 지원

## 사용법

```
/ppt "Q1 사업 성과 보고"
/ppt "신규 사업 기획안" --theme executive --slides 15
/ppt "팀 교육자료" --theme light
/ppt "투자 제안서" --format pdf
```

## 테마 선택

| 테마 | 배경 | 적합한 상황 |
|------|------|-----------|
| `ko-dark` | 다크 (기본) | 사업 보고, 데이터 대시보드, 전략 발표 |
| `ko-light` | 라이트 | 컨설팅 보고서, 제안서, 내부 공유 |
| `ko-executive` | 다크 레드 | 임원 보고, 투자 제안, 공식 발표 |

## 출력 형식

```bash
# PDF — 최고 퀄리티 (인쇄/공유 권장)
npx @marp-team/marp-cli slides.md --pdf --allow-local-files --theme-set scripts/ppt/themes/

# PPTX — PowerPoint 파일 (슬라이드 이미지 기반)
npx @marp-team/marp-cli slides.md --pptx --allow-local-files --theme-set scripts/ppt/themes/

# HTML — 인터랙티브 (애니메이션 포함)
npx @marp-team/marp-cli slides.md --html --allow-local-files --theme-set scripts/ppt/themes/
```

> **PPTX 텍스트 편집** 필요 시: LibreOffice 설치 후 `--pptx-editable` 플래그

## 워크플로우

### Step 1: 요청 파악
- 주제, 발표 목적, 청중, 슬라이드 수, 테마
- 사용자 제공 데이터 있으면 그대로 사용 (임의 수치 생성 금지)

### Step 2: 마크다운 생성
Agent: `marp-writer`
- 참조: `scripts/ppt/examples/` 예제 덱 2-3개 읽기 후 퀄리티 맞추기
- Anti-AI 라이팅 룰 적용 (`governance/skills/ppt/anti-ai-writing.md`)
- HTML 컴포넌트 활용 (메트릭 카드, SVG 차트, 타임라인 등)

### Step 3: 파일 저장
경로: `content/ppt/YYYY-MM-DD-{slug}/{slug}.md`

### Step 4: 변환 실행
```bash
cd "content/ppt/YYYY-MM-DD-{slug}"
npx @marp-team/marp-cli {slug}.md --pdf --allow-local-files \
  --theme-set ../../../scripts/ppt/themes/ \
  --output {slug}.pdf
```

### Step 5: 결과 안내
파일 경로 + 편집 방법 안내

## 레퍼런스 예제

`scripts/ppt/examples/` 에 포함:
- `marp_comparison.md` — 비교 분석 덱 패턴
- `marp_facebook-ads.md` — 데이터 대시보드 덱 (복잡한 SVG 컴포넌트)
- `marp_sample.md` — 전체 컴포넌트 카탈로그

## 기존 python-pptx 방식

네이티브 편집 가능한 .pptx 필요 시:
```bash
python scripts/ppt/generate.py spec.json --theme consulting
```
spec 포맷: `governance/skills/ppt/slide-spec-template.json`
