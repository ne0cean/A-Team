# Pro Stack — $200-300/월

> Starter Stack에서 검증된 수익 $500+/월 달성 후 업그레이드.
> 자동화 깊이 + 분석 정밀도 + 배포 커버리지 대폭 확장.

## 구성

| 역할 | 도구 | 비용 |
|------|------|------|
| AI 엔진 | Claude API (Opus 4.7 + Sonnet 4.6 혼합) | ~$100/월 |
| 워크플로우 | Make.com (Pro, 10,000 ops) | $29/월 |
| SNS 배포 | Postiz Cloud (22+ 플랫폼) | $29/월 |
| 이미지 생성 | Midjourney Basic | $10/월 |
| SEO 분석 | Ahrefs Starter | $29/월 |
| 이메일 | ConvertKit Creator | $29/월 |
| 분석 | GA4 + Hotjar Basic | $32/월 |
| **합계** | | **$258/월** |

## Starter 대비 차이점

### 1. Make.com → n8n 대체

Make.com은 n8n 대비:
- 시각적 디버깅 우수
- 수백 개 앱 즉시 연결 (API 코딩 불필요)
- 안정성 + 유지보수 시간 절감

n8n 셀프호스팅 유지가 부담이 될 때 전환.

### 2. Ahrefs 추가 — 리서치 품질 도약

`/marketing-research` 파이프라인에서 웹 검색 추정 대신 정확한 데이터:
- 실제 월간 검색량 (추정 아닌 수치)
- 키워드 난이도 정밀 측정
- 경쟁사 백링크 분석
- Content Gap (우리가 없고 경쟁사가 있는 키워드)

Ahrefs API 연동:
```bash
# .env
AHREFS_API_KEY=your-key

# marketing-research.md Phase 1에서 자동 사용
# Phase 2-A SERP 데이터를 Ahrefs 실측값으로 보강
```

### 3. Midjourney — 썸네일/인포그래픽 자동화

블로그 발행 시 자동 썸네일 생성 플로우:
```
Make.com:
  1. marketing-generate 완료 감지
  2. 포스트 제목 → Midjourney 프롬프트 생성 (Claude)
  3. Midjourney API → 이미지 4장 생성
  4. 최적 이미지 자동 선택 (비율/구성 기준)
  5. WordPress에 업로드 + 포스트 연결
```

### 4. ConvertKit — 이메일 자동화 강화

Starter의 수동 이메일 발송 → 완전 자동화:
- RSS-triggered 뉴스레터 (발행 즉시 발송)
- 독자 태깅 (클릭한 토픽 기반)
- 세그먼트별 자동 시퀀스
- A/B 제목 테스트 내장

## 예상 아웃풋 (월간)

- 블로그: 15-25개
- 소셜 포스트: 300-500개
- 이메일: 8-12개 (뉴스레터 4 + 시퀀스 4-8)
- 커버 플랫폼: 22개 (Postiz Cloud 한도)
- 이미지: 60-100개 (Midjourney)

## 일일 워크플로우 (2-3시간)

```
오전 30분: CEO Agent 브리핑 확인 + 우선순위 조정
오전 1시간: 초안 20% 편집 (인간 필수 구간)
오후 30분: 이미지 선택/승인
저녁 30분: 배포 확인 + 성과 스캔
```

## 업그레이드 시점

월 수익이 $2,000+ 되면 Enterprise Stack 고려.
