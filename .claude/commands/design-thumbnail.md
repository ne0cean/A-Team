# /design-thumbnail — 썸네일 원스탑 생성

**용도**: 블로그/YouTube 썸네일 즉시 생성. `/design-generate --type thumbnail` 단축버전.
콘텐츠 제목만 있으면 Art Direction → 프롬프트 → 체크리스트까지 5분 완료.

## 실행 흐름

```
사용법:
  /design-thumbnail "제목 or URL"
  /design-thumbnail --title "AI 마케팅 완전 가이드" --platform youtube
  /design-thumbnail --file content/drafts/2026-04-18-post.md

플래그:
  --title     썸네일 제목 (없으면 파일/URL에서 추출)
  --file      콘텐츠 파일 (제목 + 핵심 포인트 자동 추출)
  --platform  youtube(기본) / blog / newsletter / linkedin
  --brand     브랜드 가이드 경로 (기본: content/brand/)
  --fast      아트 디렉션 스킵, 프롬프트 즉시 출력
```

### Step 1: 제목 분석

제목에서 추출:
- 핵심 감정 (호기심/놀람/공포/검증)
- 비주얼 메타포 (추상 개념 → 시각화)
- 텍스트 후보 3개 (3-5단어)

### Step 2: Art Direction (--fast 없을 시)

`governance/skills/design/prompts/thumbnail.md` Phase 1 실행:
- 감정 훅 + 비주얼 메타포 결정
- 구도 + 색상 전략
- Midjourney vs DALL-E 3 선택

### Step 3: 즉시 사용 가능한 출력

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ 썸네일 브리핑 — "{TITLE}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 감정 훅: {PRIMARY_EMOTION}
## 비주얼 전략: {STRATEGY}

━━━ Midjourney 프롬프트 (복사) ━━━
{PROMPT_A}
--ar 16:9 --style raw --no text

━━━ DALL-E 3 대안 ━━━
{PROMPT_B}

━━━ 텍스트 옵션 (Canva에서 추가) ━━━
A: "{TEXT_OPTION_A}"
B: "{TEXT_OPTION_B}" ← 권장
C: "{TEXT_OPTION_C}"

━━━ Canva 설정 ━━━
폰트: {FONT} Bold
색상: {TEXT_COLOR} on {BACKGROUND}
위치: {PLACEMENT}

━━━ AI 냄새 체크 (생성 후) ━━━
□ 중앙 배치 아님
□ 색상 과포화 아님
□ 그레인 있거나 추가 예정
□ 텍스트 명확하게 읽힘 (120px에서도)

생성 후: /design-audit --file [이미지경로] --quick
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: 저장

```
content/visuals/YYYY-MM-DD-{slug}/
  ├── thumbnail-brief.md
  └── prompts.txt
```
