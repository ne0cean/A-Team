# Design Pro Stack — $100-150/월

> Starter Stack에서 월 $500+ 수익 달성 후 업그레이드.
> 자동화 + 품질 + 속도 대폭 향상.

## 구성

| 역할 | 도구 | 비용 |
|------|------|------|
| AI 이미지 | Midjourney Standard | $30/월 |
| 디자인 편집 | Figma Professional | $15/월 |
| 자동화 + 템플릿 | Canva Pro | $15/월 |
| 비디오/Reels | Runway ML Basic | $15/월 |
| 인터랙티브 | Claude Code (내장) | $0 추가 |
| 폰트 라이선스 | Adobe Fonts (CC 포함) | $10/월 |
| **합계** | | **$85-110/월** |

## Starter 대비 핵심 차이

### 1. Figma Professional — 브랜드 시스템 관리

Canva는 매번 설정을 다시 해야 함. Figma는:
- **공유 컴포넌트**: 버튼, 카드, 헤더 한 번 만들면 전체 적용
- **스타일 토큰**: 색상/폰트/이펙트를 변수로 관리 → 브랜드 변경이 1분
- **Auto Layout**: 텍스트 길이 변해도 레이아웃 자동 조정
- **디자인 시스템**: 30개 템플릿을 컴포넌트로 → 수정이 즉시 전파

Brand Guide → Figma Variables 변환:
```
Figma: Design → Local Variables → Color + Typography 세팅
→ 모든 컴포넌트에 자동 적용
→ 브랜드 색상 변경 시 전체 자산 1분 내 업데이트
```

### 2. Runway ML — 비디오 자동화

정적 이미지 → 모션 비디오 (Reels/TikTok용):
```
Runway Gen-3:
  입력: 이미지 or 텍스트 프롬프트
  출력: 4-16초 비디오 클립
  
활용:
  - 블로그 썸네일 → 인트로 모션 배경
  - 인포그래픽 → 애니메이션 스토리
  - 제품 → 3D 회전 효과
```

비디오 자동화 파이프라인:
```
1. /design-generate → 정적 이미지 생성
2. Runway Gen-3 → 이미지에 모션 추가 (5-10초)
3. CapCut or DaVinci → 자막 추가 (무료)
4. /marketing-publish → Reels/TikTok/Shorts 동시 배포
```

### 3. Midjourney Standard — 생산성 3×

Standard 플랜:
- 무제한 relaxed 생성 (대기 있음, 비용 추가 없음)
- Fast 생성 시간 15시간/월
- 커스텀 스타일 학습 (`/tune` 커맨드)

스타일 학습 ← 핵심:
```
/tune [스타일 설명]
→ 내 브랜드 특유의 비주얼 스타일 학습
→ 이후 모든 이미지에 --sref [style-code] 추가만 하면 일관성 자동 유지
```

## Figma 브랜드 시스템 셋업 (최초 1회, 4시간)

```
1. 컬러 토큰 설정 (color-palette.json → Figma Variables)
2. 텍스트 스타일 (typography.md → Figma Text Styles)
3. 컴포넌트 라이브러리:
   - 썸네일 템플릿 (YouTube, Blog OG)
   - SNS 템플릿 (Instagram 1:1, 4:5, Story)
   - LinkedIn 카드
   - 이메일 헤더
4. 자산 관리 (Brand Assets page에 로고/아이콘/이미지 모음)
```

셋업 이후 새 비주얼 생성 시간: 10-15분 (이전 30-45분)

## 예상 아웃풋 (월간)

- 정적 이미지: 60-80개
- 모션 비디오 클립: 20-30개
- Figma 컴포넌트 업데이트: 5-10회
- 브랜드 시스템 일관성: >95%

## 일일 워크플로우 (45분 → 20분)

```
오전 10분: /design-brief → 당일 비주얼 방향 (Figma 템플릿 선택)
오전 5분:  Midjourney 생성 시작 (비동기, 다른 작업 병행)
점심 5분:  Figma에서 템플릿에 이미지 배치 + 텍스트 수정
  
Runway 사용 시:
추가 10분: Runway Gen-3로 모션화 → 자막 추가
```
