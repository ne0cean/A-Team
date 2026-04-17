# /marketing-analytics — 성과 분석

**용도**: 발행된 콘텐츠의 성과 수집 + 인사이트 생성 + 프롬프트 개선 제안.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /marketing-analytics                     (전체 리포트)
  /marketing-analytics --slug {slug}       (특정 콘텐츠)
  /marketing-analytics --period 7d         (최근 7일)
  /marketing-analytics --period 30d        (최근 30일)
  /marketing-analytics --compare           (이전 기간 비교)

플래그:
  --slug      특정 콘텐츠 분석
  --period    분석 기간 (기본: 7d)
  --compare   이전 동일 기간과 비교
  --export    CSV로 내보내기
  --suggest   프롬프트 개선 제안 포함 (기본: on)
```

### Step 1: 데이터 수집

MCP 사용 가능 시 (1ClickReport 또는 Mirra):
```
각 플랫폼에서 수집:
  - 노출수 (impressions)
  - 참여율 (engagement rate)
  - 클릭률 (CTR)
  - 팔로워 증가
  - 공유/저장 수
  - 댓글 수
```

MCP 미설정 시 → 수동 입력 요청:
```
플랫폼별 주요 지표를 입력해주세요:

Twitter 스레드:
  노출수: _____
  참여율: ____%
  클릭: _____

LinkedIn 포스트:
  노출수: _____
  참여율: ____%

(데이터 없으면 Enter로 건너뛰기)
```

### Step 2: 성과 분석 (Claude)

수집된 데이터를 분석:

```markdown
## 성과 분석 리포트 — {날짜}

### 상위 20% 콘텐츠 (무엇이 잘 됐나)
- {콘텐츠}: {지표}
- 패턴: {공통점}

### 하위 20% 콘텐츠 (무엇이 안 됐나)
- {콘텐츠}: {지표}
- 실패 원인 가설: {원인}

### 플랫폼별 인사이트
- Twitter: {인사이트}
- LinkedIn: {인사이트}
- 이메일: {인사이트}

### 다음 주 전략 제안
1. {제안 1}
2. {제안 2}
3. {제안 3}
```

### Step 3: 프롬프트 개선 제안

성과 데이터 기반으로 프롬프트 수정 제안:

```markdown
## 프롬프트 개선 제안

### blog.md 수정 제안
현재: "..."
제안: "..."
근거: {성과 데이터}

### social-twitter.md 수정 제안
현재: "..."
제안: "..."
근거: {성과 데이터}

적용하시겠습니까? [y/N]
→ y: 해당 prompts/ 파일 자동 업데이트 + git commit
→ N: 제안만 저장 (content/analytics/prompt-suggestions.md)
```

### Step 4: 리포트 저장

```
content/analytics/
  ├── YYYY-MM-DD-weekly-report.md
  ├── prompt-suggestions.md
  └── performance-log.csv
```

## 핵심 지표 기준 (AI vs 인간 비교)

| 지표 | 인간 평균 | AI 목표 | 비고 |
|------|---------|--------|------|
| Twitter 참여율 | 1-3% | 3%+ | 20% 인간 편집 시 |
| LinkedIn 참여율 | 2-5% | 5%+ | 전문가 인사이트 포함 시 |
| 이메일 오픈율 | 20-25% | 30%+ | 제목 A/B 테스트 시 |
| 이메일 CTR | 2-3% | 5%+ | |
| 블로그 SEO 랭킹 | - | Top 10 (3개월) | 20% 편집 필수 |

## 자동화 트리거

`/marketing-loop` 에서 주간 자동 실행됨.
수동 실행도 언제든 가능.
