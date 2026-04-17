# Design Starter Stack — $30-50/월

> 1인 운영, 월 30-50개 비주얼 에셋 생성 가능.
> 기술 없어도 운영 가능. AI 냄새 방지 기법 포함.

## 구성

| 역할 | 도구 | 비용 |
|------|------|------|
| AI 이미지 생성 | Midjourney Basic | $10/월 |
| 디자인 편집 | Canva Pro | $15/월 |
| 고급 이미지 | DALL-E 3 via ChatGPT Plus | $20/월 |
| 인터랙티브 | Claude Code (내장) | $0 추가 |
| **합계** | | **$30-45/월** |

> 참고: Midjourney OR ChatGPT Plus 중 하나만 선택하면 $15-25/월 가능.

## 워크플로우

### 1. 브리핑 → 생성 → 편집 3-Step

```
Step 1 (5분): /design-brief --type thumbnail --title "..."
              → Art Director가 정확한 프롬프트 제공

Step 2 (10분): Midjourney Discord 또는 DALL-E 3에 프롬프트 붙여넣기
              → 4개 이미지 중 최적 선택

Step 3 (10분): 선택한 이미지를 Canva에 업로드
              → 텍스트 + 브랜드 요소 추가
              → 플랫폼별 크기로 내보내기
```

### 2. AI 냄새 제거 핵심 Canva 기법

**색상 보정** (Midjourney 과포화 제거):
```
Canva → 이미지 편집 → 색상 조정
- 채도(Saturation): -20 ~ -30
- 선명도(Clarity): +10 ~ +20
- 밝기(Brightness): ±5 범위 내 조정
```

**그레인 추가** (AI 과잉 완벽함 제거):
```
Canva → 앱 → Pixelify (또는 외부 grain 이미지 오버레이)
- 그레인 강도: 10-20%
- 이미지 블렌드 모드: Overlay
```

**구도 수정** (중앙 배치 탈출):
```
AI 이미지 중앙에 주체 있을 때:
- Canva 크롭 도구로 3분의 1 지점으로 이동
- 반대쪽에 텍스트 배치 → 자연스러운 균형
```

## 예상 아웃풋 (월간)

- 블로그 썸네일: 8-15개
- Instagram 비주얼: 20-30개
- LinkedIn 이미지: 10-15개
- 인터랙티브 차트 (Claude 직접 생성): 제한 없음

## 일일 비주얼 워크플로우 (45분)

```
오전 15분: /design-brief → 당일 콘텐츠 비주얼 방향 결정
오전 20분: Midjourney/DALL-E → 이미지 생성 (동시에 다른 작업)
오후 10분: Canva 편집 + /design-audit 체크
```

## Midjourney 설정 (AI 냄새 감소)

```
기본값에서 바꿀 설정:
/settings 에서:
- Stylize: 100 이하 (기본 100, 낮출수록 덜 AI스러움)
- Style: RAW (raw photographic, less fantasy)
- Version: Latest (품질 최신)

프롬프트 접미사 (매번 추가):
--style raw --no text, watermark, logo, stock photo look
```

## ChatGPT Plus (DALL-E 3) 팁

사람 포함 이미지에 더 적합:
```
프롬프트 구조:
"Photographic portrait of [description], 
shot on [camera], [lighting], [composition],
editorial magazine style, no text"

팁: 구체적 카메라 모델 명시 → 품질 향상
예: "shot on Hasselblad X2D" → 중형 카메라 느낌
```
