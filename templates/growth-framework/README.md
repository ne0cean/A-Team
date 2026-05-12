# Growth Engineering Framework

> A/B 테스트 + SEO + 퍼널 최적화 패턴.
> 제품 출시 후 적용. 서베이 검증 도구 + 자동화 워크플로우.

## SEO 스택 (서베이 검증)

| 도구 | 비용 | 용도 |
|------|------|------|
| Google Search Console | $0 | 순위 추적, 인덱싱 상태 |
| Google Keyword Planner | $0 (Ads 계정 필요) | 키워드 볼륨, 경쟁도 |
| Searlo API | $0 (3K 크레딧/90일) | SERP 추적 자동화 |
| Plausible | $0 (자체호스팅) | 트래픽 분석, GDPR 준수 |
| Ubersuggest | $0 (3회/일) | 키워드 리서치 |

### SEO 자동화 파이프라인

```
주간 배치 (n8n cron):
1. Searlo API → 타겟 키워드 순위 조회
2. 순위 변화 감지 (상승/하락)
3. 하락 키워드 → Claude 분석 ("왜 떨어졌나? 개선 방안?")
4. 콘텐츠 업데이트 제안 → /marketing-generate 연동
5. 결과 → Supabase 저장 → Metabase 대시보드
```

### Programmatic SEO

데이터 기반 대량 페이지 자동 생성:

```
데이터 소스 (CSV/API/DB)
  → 템플릿 (Next.js getStaticPaths)
  → 페이지 생성 (키워드별 고유 콘텐츠)
  → 빌드/배포

주의: 키워드 치환만으로는 thin content 패널티.
각 페이지에 고유 가치(데이터, 분석, 비교) 필수.
```

## A/B Testing

### 무료 자체 구현 패턴

```javascript
// Feature flag 기반 A/B 테스트
const variant = getUserVariant(userId, 'pricing-test');
// variant: 'control' | 'variant-a' | 'variant-b'

// 이벤트 추적
trackEvent('pricing_page_view', { variant });
trackEvent('signup_complete', { variant });

// 분석 (주간 배치)
// χ² 검정으로 통계적 유의성 확인
```

### 도구 (규모에 따라)

| 규모 | 도구 | 비용 |
|------|------|------|
| 월 1K 방문 | 자체 feature flag | $0 |
| 월 10K 방문 | PostHog (자체호스팅) | $0 |
| 월 100K+ | Optimizely / VWO | $$$ |

### A/B 테스트 자동화

```
1. 가설 생성 (Claude): "CTA 버튼 색상 변경 → 전환율 5% 향상"
2. 실험 설정: 50/50 트래픽 분할
3. 데이터 수집: 최소 2주 또는 통계적 유의성 달성
4. 결과 분석 (Claude/Groq): χ² 검정 + 실질적 유의성
5. 승자 배포 + 다음 실험 제안
```

## 퍼널 분석

```
방문 → 가입 → 활성화 → 결제 → 유지

각 단계 전환율 추적:
- 방문→가입: 2-5% (일반적)
- 가입→활성화: 20-40%
- 활성화→결제: 5-15%
- 월간 유지율: 95%+ (목표)

이탈 구간 식별 → A/B 테스트 → 개선
```

## /growth 커맨드 (추후 구현)

```
/growth report    — 주간 성장 지표 리포트
/growth seo       — SEO 순위 변화 + 개선 제안
/growth test      — A/B 테스트 설계 도우미
/growth funnel    — 퍼널 전환율 분석
```

## 참고
- [Searlo SERP API](https://searlo.tech/) — 3K 무료 크레딧
- [PostHog](https://posthog.com/) — 오픈소스 제품 분석
- [Programmatic SEO Guide](https://inblog.ai/blog/programmatic-seo-for-marketers)
- 벤치마크: A/B 테스트 자동화로 설정 시간 주 → 시간, 33% 빠른 실행 (Kameleoon)
