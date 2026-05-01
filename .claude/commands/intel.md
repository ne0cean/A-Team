---
description: 시장·사용자 인텔리전스 수집 (경쟁사/트렌드/페르소나)
---

# /intel — 시장 인텔리전스 커맨드

> Phase 2: 경쟁사 분석, 트렌드 모니터링, 페르소나 연구 자동화

---

## 사용법

```bash
/intel competitor <회사명>     # 경쟁사 가격/기능/포지셔닝 분석
/intel trend <키워드>          # Reddit/X/뉴스 트렌드 수집
/intel persona <타겟>          # JTBD + Pain Points 추출
/intel brief <프로젝트명>      # 마케팅 브리프 생성
```

---

## 서브커맨드

### competitor — 경쟁사 분석

**입력**: 회사명 (예: `stripe`, `vercel`)

**출력**:
- JSON: `.intel/competitors/YYYY-MM-DD-{company}.json`
- 터미널 요약: 가격 범위, 핵심 기능 top 3

**예시**:
```bash
/intel competitor stripe
```

→ 가격 티어 3개 + 기능 8개 + 포지셔닝 분석
→ `.intel/competitors/2026-05-02-stripe.json` 저장

### trend — 트렌드 분석

**입력**: 키워드 (예: `edge computing`, `AI agents`)

**출력**:
- JSON: `.intel/trends/YYYY-MM-DD-{keyword}.json`
- 터미널 요약: 언급 수, 감정 분석, 트렌드 방향

**예시**:
```bash
/intel trend "edge computing"
```

→ 최근 30일 언급 15건, 긍정 60%
→ `.intel/trends/2026-05-02-edge-computing.json` 저장

### persona — 페르소나 정의

**입력**: 타겟 세그먼트 (예: `solo founders`, `marketing agencies`)

**출력**:
- JSON: `.intel/personas/YYYY-MM-DD-{segment}.json`
- 터미널 요약: JTBD top 2, Pain Points top 3

**예시**:
```bash
/intel persona "solo founders"
```

→ JTBD 2개 + Pain Points 5개
→ `.intel/personas/2026-05-02-solo-founders.json` 저장

### brief — 마케팅 브리프 생성

**입력**: 프로젝트명 (예: `new-saas-launch`)

**출력**:
- Markdown: `.context/briefs/YYYY-MM-DD-{project}.md`
- 경쟁사 비교표, 타겟 페르소나, 트렌드 요약 포함

**예시**:
```bash
/intel brief edge-saas-launch
```

→ 기존 `.intel/` JSON 파일 집계
→ Marketing Module 입력용 브리프 생성

---

## 구현

### Step 1: 인자 파싱

```bash
SUBCOMMAND="$1"
ARG="$2"

if [[ -z "$SUBCOMMAND" || -z "$ARG" ]]; then
  echo "❌ 사용법: /intel <competitor|trend|persona|brief> <인자>"
  echo ""
  echo "예시:"
  echo "  /intel competitor stripe"
  echo "  /intel trend 'edge computing'"
  echo "  /intel persona 'solo founders'"
  echo "  /intel brief new-saas-launch"
  exit 1
fi

case "$SUBCOMMAND" in
  competitor|trend|persona|brief)
    # 유효한 서브커맨드
    ;;
  *)
    echo "❌ 알 수 없는 서브커맨드: $SUBCOMMAND"
    echo "지원: competitor, trend, persona, brief"
    exit 1
    ;;
esac
```

### Step 2: intel-analyzer 호출

Task tool로 서브에이전트 실행:

```markdown
Task tool 사용:
- subagent_type: "general-purpose"
- model: "sonnet"
- prompt: "분석 유형: {SUBCOMMAND}\n대상: {ARG}\n\n.claude/agents/intel-analyzer.md의 워크플로우를 따라 분석 수행."
```

**호출 코드**:
```bash
echo "🔍 Intel 분석 시작: $SUBCOMMAND - $ARG"

# Task tool 호출 (Claude가 실행)
# 결과는 JSON 문자열로 반환됨
```

### Step 3: JSON 저장

intel-analyzer가 반환한 JSON을 파일로 저장:

```bash
RESULT_JSON="<intel-analyzer 출력>"
DATE=$(date +%Y-%m-%d)
SLUG=$(echo "$ARG" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-50)

case "$SUBCOMMAND" in
  competitor)
    OUTPUT_FILE=".intel/competitors/$DATE-$SLUG.json"
    ;;
  trend)
    OUTPUT_FILE=".intel/trends/$DATE-$SLUG.json"
    ;;
  persona)
    OUTPUT_FILE=".intel/personas/$DATE-$SLUG.json"
    ;;
  brief)
    OUTPUT_FILE=".context/briefs/$DATE-$SLUG.md"
    ;;
esac

echo "$RESULT_JSON" > "$OUTPUT_FILE"
echo "✅ 저장: $OUTPUT_FILE"
```

### Step 4: 터미널 요약

JSON 파일을 읽어서 3-5줄 요약 출력:

```bash
if [[ "$SUBCOMMAND" == "competitor" ]]; then
  # jq로 JSON 파싱
  COMPANY=$(jq -r '.company' "$OUTPUT_FILE")
  PRICING=$(jq -r '.pricing.tiers | length' "$OUTPUT_FILE")
  FEATURES=$(jq -r '.features | length' "$OUTPUT_FILE")
  QUALITY=$(jq -r '.dataQuality' "$OUTPUT_FILE")

  echo ""
  echo "📊 $COMPANY 분석 완료"
  echo "   가격 티어: $PRICING개"
  echo "   핵심 기능: $FEATURES개"
  echo "   데이터 품질: $QUALITY"

elif [[ "$SUBCOMMAND" == "trend" ]]; then
  KEYWORD=$(jq -r '.keyword' "$OUTPUT_FILE")
  MENTIONS=$(jq -r '.mentions' "$OUTPUT_FILE")
  TREND=$(jq -r '.trend' "$OUTPUT_FILE")
  SENTIMENT=$(jq -r '.sentiment.positive' "$OUTPUT_FILE")

  echo ""
  echo "📈 $KEYWORD 트렌드 분석"
  echo "   언급: $MENTIONS건 (최근 30일)"
  echo "   트렌드: $TREND"
  echo "   긍정도: $(echo "$SENTIMENT * 100" | bc)%"

elif [[ "$SUBCOMMAND" == "persona" ]]; then
  SEGMENT=$(jq -r '.segment' "$OUTPUT_FILE")
  JTBD_COUNT=$(jq -r '.jtbd | length' "$OUTPUT_FILE")
  PAIN_COUNT=$(jq -r '.painPoints | length' "$OUTPUT_FILE")
  CONFIDENCE=$(jq -r '.confidence' "$OUTPUT_FILE")

  echo ""
  echo "👥 $SEGMENT 페르소나 분석"
  echo "   JTBD: $JTBD_COUNT개"
  echo "   Pain Points: $PAIN_COUNT개"
  echo "   신뢰도: $CONFIDENCE"

elif [[ "$SUBCOMMAND" == "brief" ]]; then
  PROJECT=$(basename "$OUTPUT_FILE" .md | cut -d'-' -f4-)

  echo ""
  echo "📝 $PROJECT 마케팅 브리프 생성"
  echo "   위치: $OUTPUT_FILE"
  echo "   다음 단계: /marketing-generate --input $OUTPUT_FILE"
fi
```

---

## brief 서브커맨드 세부 로직

### 집계 스크립트 호출

```bash
if [[ "$SUBCOMMAND" == "brief" ]]; then
  # Node.js 스크립트로 .intel/ 전체 집계
  node scripts/intel-aggregate.mjs "$ARG" > /tmp/intel-aggregated.json

  # intel-analyzer에게 브리프 생성 요청
  # 입력: /tmp/intel-aggregated.json
  # 출력: Markdown 브리프
fi
```

### 브리프 템플릿

```markdown
# {프로젝트명} 마케팅 브리프

> 생성일: {DATE}
> 데이터 소스: {N}개 분석 결과

## 경쟁사 분석

| 회사 | 가격 (월) | 핵심 기능 | 포지셔닝 |
|------|----------|---------|---------|
| {company} | ${price} | {features[0..2]} | {positioning} |

## 타겟 페르소나

### {segment}

**JTBD**:
- {jtbd[0].job}
- {jtbd[1].job}

**Pain Points**:
- {painPoints[0].pain} (카테고리: {painPoints[0].category})
- {painPoints[1].pain}

## 트렌드 요약

- **{keyword}**: {trend} 트렌드, 언급 {mentions}건
- 핵심 주제: {topics[0]}, {topics[1]}

---

**다음 단계**: `/marketing-generate --input .context/briefs/{file}.md`
```

---

## 에러 처리

### 스키마 검증 실패

```bash
if ! jq empty "$OUTPUT_FILE" 2>/dev/null; then
  echo "⚠️  JSON 형식 오류 — 원시 파일 저장: ${OUTPUT_FILE}.raw"
  mv "$OUTPUT_FILE" "${OUTPUT_FILE}.raw"
  exit 1
fi
```

### Paywalled 전부 실패

```bash
QUALITY=$(jq -r '.dataQuality' "$OUTPUT_FILE")

if [[ "$QUALITY" == "low" ]]; then
  echo "⚠️  데이터 품질 낮음 — Paywalled 우회 실패 가능성"
  echo "   수동 검토 권장: $OUTPUT_FILE"
fi
```

### 데이터 0건 (트렌드 dormant)

```bash
if [[ "$SUBCOMMAND" == "trend" ]]; then
  TREND=$(jq -r '.trend' "$OUTPUT_FILE")

  if [[ "$TREND" == "dormant" ]]; then
    echo "ℹ️  트렌드 dormant — 최근 언급 없음"
    echo "   다른 키워드 시도 권장"
  fi
fi
```

---

## 제약사항

- **WebSearch 미국 전용**: VPN 고려 (현재 미구현)
- **실시간 모니터링 없음**: 수동 호출, Visualping 병행
- **토큰 비용**: competitor ~$0.10, trend ~$0.05, persona ~$0.08 (RTK 적용 시 60% 절감)

---

## 다음 단계

1. 파일럿 실행: `/intel competitor vercel`
2. Phase 2 Gate: 브리프 생성 → 마케팅 콘텐츠 작성
3. analytics.jsonl 이벤트: `{event: "intel_analysis", type: "competitor", target: "vercel"}`

---

## 참고

- 타입 정의: `lib/intel-types.ts`
- 분석 엔진: `.claude/agents/intel-analyzer.md`
- 저장소: `.intel/` (gitignored)
- 집계 스크립트: `scripts/intel-aggregate.mjs`
