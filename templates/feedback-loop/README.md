# User Feedback Loop Template

> 사용자 피드백 수집 → 분석 → 백로그 반영 자동화 패턴.
> NPS/CSAT + 정성 피드백 → Claude 분석 → 기능 요청 추출.

## 추천 스택 (서베이 검증)

| 기능 | 도구 | 비용 | 근거 |
|------|------|------|------|
| NPS 설문 | Tally.so | $0 (무료) | 무제한 폼, 무제한 응답 |
| 대안 설문 | Typeform | $0 (10응답/월) | 더 예쁨, 무료 제한적 |
| 피드백 위젯 | Canny | $0 (100포스트) | 기능 요청 투표 |
| 분석 | Claude API / llm CLI | $0 (Groq) | 정성 피드백 → 테마 추출 |
| 저장 | Supabase / Google Sheets | $0 | |

## NPS (Net Promoter Score)

```
질문: "이 제품을 동료에게 추천할 가능성은? (0-10)"

NPS = % Promoters (9-10) − % Detractors (0-6)
범위: -100 ~ +100
좋음: 30+, 훌륭함: 50+, 세계적: 70+
```

### 수집 타이밍
- 가입 후 14일 (첫 인상)
- 매월 1회 (기존 사용자)
- 주요 기능 출시 후 (변화 측정)

## 피드백 → 백로그 파이프라인

```
1. 피드백 수집 (Tally/Typeform/인앱)
     ↓
2. 저장 (Supabase/Sheets)
     ↓
3. 주간 배치 분석 (Claude/Groq)
   - 정성 피드백 → 테마 클러스터링
   - 감정 분석 (긍정/부정/중립)
   - 기능 요청 추출
     ↓
4. RICE 스코어링 (/prioritize)
     ↓
5. CURRENT.md Next Tasks 반영
```

### Claude 분석 프롬프트

```
다음 사용자 피드백을 분석해:

[피드백 목록]

출력:
1. 테마 클러스터 (유사한 피드백 그룹)
2. 각 테마의 빈도와 감정 (긍정/부정)
3. 기능 요청 추출 (구체적 기능명 + 요청 횟수)
4. 긴급 이슈 (부정 감정 + 높은 빈도)
5. 권장 조치 (RICE 입력값 포함)
```

## n8n 자동화 워크플로우

```
Trigger: Tally webhook (새 응답)
  → Supabase에 저장
  → NPS 점수 계산 (Detractor면 Slack 알림)
  → 주간 배치: 모든 응답 → Claude 분석 → 리포트 생성
```

## 참고
- [Tally.so](https://tally.so/) — 무료 폼 빌더, 무제한
- [Canny](https://canny.io/) — 기능 요청 보드 + 투표
- [NPS 벤치마크](https://www.retently.com/blog/good-net-promoter-score/)
